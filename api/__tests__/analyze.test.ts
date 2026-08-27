import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../analyze.js'

const VALID_FEEDBACK = {
  summary: 'Solid resume overall.',
  strengths: ['Clear section headings', 'Strong keyword coverage'],
  improvements: ['Add measurable impact'],
  suggestions: ['Add a professional summary statement'],
}

function makeReq(body: unknown, method = 'POST'): VercelRequest {
  return {
    method,
    headers: {},
    body,
  } as VercelRequest
}

function makeRes() {
  const res: Record<string, unknown> = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as VercelResponse & {
    statusCode: number
    body: unknown
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('api/analyze serverless handler', () => {
  it('rejects non-POST requests with 405', async () => {
    const res = makeRes()
    await handler(makeReq({}, 'GET'), res)
    expect(res.statusCode).toBe(405)
  })

  it('returns 503 when LLM_API_KEY is not configured', async () => {
    const res = makeRes()
    await handler(makeReq({ text: 'resume' }), res)
    expect(res.statusCode).toBe(503)
  })

  it('returns 413 for payloads larger than 100KB', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    const big = JSON.stringify({ text: 'x'.repeat(100 * 1024 + 1) })
    const res = makeRes()
    await handler(makeReq(big), res)
    expect(res.statusCode).toBe(413)
  })

  it('returns 400 for malformed JSON', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    const res = makeRes()
    await handler(makeReq('not-json'), res)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for empty or whitespace-only text', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    const res = makeRes()
    await handler(makeReq({ text: '   ' }), res)
    expect(res.statusCode).toBe(400)
  })

  it('happy path: forwards resume text to the LLM and returns typed feedback', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    const upstream = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(VALID_FEEDBACK) } }],
      }),
    })
    vi.stubGlobal('fetch', upstream)

    const res = makeRes()
    await handler(makeReq({ text: 'My resume body' }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(VALID_FEEDBACK)

    expect(upstream).toHaveBeenCalledTimes(1)
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[1]).toEqual({ role: 'user', content: 'My resume body' })
  })

  it('returns 502 when the upstream LLM returns an error status', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    const res = makeRes()
    await handler(makeReq({ text: 'r' }), res)
    expect(res.statusCode).toBe(502)
    expect((res.body as { status?: number }).status).toBe(429)
  })

  it('returns 502 when the LLM response is not valid JSON feedback', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'not-json' } }] }),
      }),
    )
    const res = makeRes()
    await handler(makeReq({ text: 'r' }), res)
    expect(res.statusCode).toBe(502)
  })

  it('returns 504 when the upstream call exceeds the timeout guard', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    vi.stubEnv('LLM_TIMEOUT_MS', '20')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(
                Object.assign(new Error('The operation was aborted'), {
                  name: 'AbortError',
                }),
              )
            })
          }),
      ),
    )

    const res = makeRes()
    await handler(makeReq({ text: 'r' }), res)
    expect(res.statusCode).toBe(504)
  })

  it('returns 500 for unexpected upstream failures', async () => {
    vi.stubEnv('LLM_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const res = makeRes()
    await handler(makeReq({ text: 'r' }), res)
    expect(res.statusCode).toBe(500)
  })
})
