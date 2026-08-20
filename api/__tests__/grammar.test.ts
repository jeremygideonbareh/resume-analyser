import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * T4.1 — api/grammar.ts tests.
 *
 * Cases per the plan: shape validation, JSON-fence stripping, oversize,
 * timeout, fallback.
 */

async function loadGrammar() {
  vi.resetModules()
  return await import('../grammar.ts')
}

function makeRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/grammar', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const okUpstream = (content: string) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  })

beforeEach(() => {
  vi.stubEnv('LLM_API_KEY', 'sk-test-secret-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('api/grammar — guards', () => {
  it('rejects non-POST requests with 405', async () => {
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('GET'))
    expect(res.status).toBe(405)
  })

  it('rejects an oversized payload with 413', async () => {
    const grammar = await loadGrammar()
    const res = await grammar.default(
      makeRequest('POST', { text: 'x'.repeat(200 * 1024) }),
    )
    expect(res.status).toBe(413)
  })

  it('rejects empty text with 400', async () => {
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 504 on an upstream timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'hello' }))
    expect(res.status).toBe(504)
  })

  it('returns 502 on an upstream error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'hello' }))
    expect(res.status).toBe(502)
  })
})

describe('api/grammar — happy path', () => {
  it('returns parsed issues from a clean JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      okUpstream(
        JSON.stringify({
          issues: [
            {
              message: 'Missing comma',
              suggestion: 'Hello, world',
              context: 'Hello world',
            },
          ],
        }),
      ),
    )
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'Hello world' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      issues: Array<{ message: string; suggestion: string; context: string }>
    }
    expect(body.issues).toEqual([
      {
        message: 'Missing comma',
        suggestion: 'Hello, world',
        context: 'Hello world',
      },
    ])
  })

  it('strips markdown fences around the JSON', async () => {
    vi.stubGlobal(
      'fetch',
      okUpstream('```json\n{"issues": [{"message": "m", "suggestion": "s", "context": "c"}]}\n```'),
    )
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'x' }))
    const body = (await res.json()) as {
      issues: Array<{ message: string; suggestion: string; context: string }>
    }
    expect(body.issues).toEqual([{ message: 'm', suggestion: 's', context: 'c' }])
  })

  it('returns 502 on malformed JSON from the LLM', async () => {
    vi.stubGlobal('fetch', okUpstream('not json at all'))
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'x' }))
    expect(res.status).toBe(502)
  })

  it('returns 502 when an issue item is missing a required field', async () => {
    vi.stubGlobal(
      'fetch',
      okUpstream(JSON.stringify({ issues: [{ message: 'm' }] })),
    )
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'x' }))
    expect(res.status).toBe(502)
  })

  it('never leaks the API key in the response', async () => {
    vi.stubGlobal('fetch', okUpstream('{"issues": []}'))
    const grammar = await loadGrammar()
    const res = await grammar.default(makeRequest('POST', { text: 'x' }))
    const text = await res.text()
    expect(text).not.toContain('sk-test-secret-key')
  })
})

describe('api/grammar — pure helpers', () => {
  it('stripFences removes code fences', async () => {
    const grammar = await loadGrammar()
    expect(grammar.stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
    expect(grammar.stripFences('```\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('stripFences extracts JSON embedded in prose', async () => {
    const grammar = await loadGrammar()
    const input = 'Here is the result: {"issues": []} Hope that helps!'
    expect(grammar.stripFences(input)).toBe('{"issues": []}')
  })

  it('parseIssues validates the shape strictly', async () => {
    const grammar = await loadGrammar()
    expect(grammar.parseIssues('{"issues": []}')).toEqual([])
    expect(grammar.parseIssues('{"issues": [{"message":"m","suggestion":"s","context":"c"}]}')).toEqual([
      { message: 'm', suggestion: 's', context: 'c' },
    ])
    expect(grammar.parseIssues('{"issues": "nope"}')).toBeNull()
    expect(grammar.parseIssues('garbage')).toBeNull()
  })
})