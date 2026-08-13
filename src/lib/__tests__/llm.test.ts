import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

/** Re-import the module so `import.meta.env` gates are evaluated fresh. */
async function loadLlm() {
  vi.resetModules()
  return await import('@/lib/llm')
}

describe('LLM tier gate (VITE_ENABLE_LLM)', () => {
  it('is disabled when VITE_ENABLE_LLM is false', async () => {
    vi.stubEnv('VITE_ENABLE_LLM', 'false')
    const llm = await loadLlm()
    expect(llm.LLM_ENABLED).toBe(false)
    expect(llm.AI_ANALYZE_URL).toBe('')
  })

  it('enables when VITE_ENABLE_LLM is true', async () => {
    vi.stubEnv('VITE_ENABLE_LLM', 'true')
    const llm = await loadLlm()
    expect(llm.LLM_ENABLED).toBe(true)
    expect(llm.AI_ANALYZE_URL).toBe('/api/analyze')
  })
})

describe('fetchAiFeedback', () => {
  it('POSTs { text } to /api/analyze and returns parsed feedback', async () => {
    vi.stubEnv('VITE_ENABLE_LLM', 'true')
    const feedback = {
      summary: 'Strong resume.',
      strengths: ['Clear headings'],
      improvements: ['Add metrics'],
      suggestions: ['Add a summary'],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => feedback })
    vi.stubGlobal('fetch', fetchMock)

    const llm = await loadLlm()
    const result = await llm.fetchAiFeedback('My resume text')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/analyze')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ text: 'My resume text' })
    expect(result).toEqual(feedback)
  })

  it('throws when the endpoint responds with an error status', async () => {
    vi.stubEnv('VITE_ENABLE_LLM', 'true')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const llm = await loadLlm()
    await expect(llm.fetchAiFeedback('x')).rejects.toThrow(/failed with status 503/)
  })

  it('throws when the tier is disabled (no request is made)', async () => {
    vi.stubEnv('VITE_ENABLE_LLM', 'false')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const llm = await loadLlm()
    await expect(llm.fetchAiFeedback('x')).rejects.toThrow(/disabled/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
