import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudentProfile, Company } from '../../src/lib/placement-types.ts'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

/**
 * T3.1 — api/chat.ts tests.
 *
 * Cases per the plan: POST-only, auth, eligibility math, prompt contains
 * profile + company facts, persistence called, rate-limit, oversize, timeout
 * fallback, no key leakage.
 */

interface MockOptions {
  user?: { id: string } | null
  authError?: Error | null
  lastMessageAt?: string | null
  profile?: StudentProfile | null
  companies?: Company[]
  insertError?: Error | null
}

function makeMockClient(opts: MockOptions = {}) {
  const inserts: Array<{ table: string; row: unknown }> = []
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user ?? { id: 'user_1' } },
        error: opts.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(() =>
          Promise.resolve(
            table === 'chatbot_messages'
              ? {
                  data: opts.lastMessageAt
                    ? { created_at: opts.lastMessageAt }
                    : null,
                  error: null,
                }
              : table === 'student_profiles'
                ? { data: opts.profile ?? null, error: null }
                : { data: null, error: null },
          ),
        ),
        insert: vi.fn((row: unknown) => {
          inserts.push({ table, row })
          return Promise.resolve({ data: null, error: opts.insertError ?? null })
        }),
        then: (resolve: (v: unknown) => void) =>
          resolve(
            table === 'companies'
              ? { data: opts.companies ?? [], error: null }
              : { data: null, error: null },
          ),
      }
      return builder
    }),
  }
  return { client, inserts }
}

const profile: StudentProfile = {
  id: 'p1',
  created_at: '2026-08-20T00:00:00Z',
  user_id: 'user_1',
  full_name: 'Test Student',
  department: 'CSE',
  semester: 6,
  cgpa: 8.5,
  backlogs: 0,
  skills: ['python', 'java', 'sql'],
  certifications: [],
  programming_languages: ['python'],
  portfolio_url: null,
  github_url: null,
  linkedin_url: null,
  target_role: 'Software Engineer',
  updated_at: '2026-08-20T00:00:00Z',
}

const companies: Company[] = [
  {
    id: 'c1',
    created_at: '2026-08-20T00:00:00Z',
    name: 'IBM',
    min_cgpa: 7.0,
    max_backlogs: 0,
    required_skills: ['python', 'sql'],
    preferred_skills: ['java'],
    description: 'Global tech company',
    recruitment_process: 'OA → tech interview',
    salary_insights: '₹6.5–9 LPA',
  },
  {
    id: 'c2',
    created_at: '2026-08-20T00:00:00Z',
    name: 'Amazon',
    min_cgpa: 8.0,
    max_backlogs: 0,
    required_skills: ['algorithms', 'data structures'],
    preferred_skills: ['aws'],
    description: 'E-commerce and cloud',
    recruitment_process: 'OA → interviews',
    salary_insights: '₹15–25 LPA',
  },
]

async function loadChat() {
  vi.resetModules()
  return await import('../chat.ts')
}

function makeRequest(method: string, body?: unknown, token?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new Request('http://localhost/api/chat', {
    method,
    headers,
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
  vi.stubEnv('SUPABASE_URL', 'https://mhkieytinkgouhvwrmbp.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('api/chat — guards', () => {
  it('rejects non-POST requests with 405', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const chat = await loadChat()
    const res = await chat.default(makeRequest('GET'))
    expect(res.status).toBe(405)
  })

  it('rejects a missing token with 401', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const chat = await loadChat()
    const res = await chat.default(makeRequest('POST', { message: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token with 401', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ authError: new Error('invalid token') }).client as never,
    )
    const chat = await loadChat()
    const res = await chat.default(makeRequest('POST', { message: 'hi' }, 'bad-token'))
    expect(res.status).toBe(401)
  })

  it('rejects an oversized message with 413', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'x'.repeat(3000) }, 'valid-token'),
    )
    expect(res.status).toBe(413)
  })

  it('rejects a message sent within the 2s rate limit with 429', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ lastMessageAt: new Date().toISOString() }).client as never,
    )
    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'hi' }, 'valid-token'),
    )
    expect(res.status).toBe(429)
  })

  it('rejects with 403 when the student has no profile', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile: null }).client as never,
    )
    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'hi' }, 'valid-token'),
    )
    expect(res.status).toBe(403)
  })

  it('returns 504 on an upstream timeout', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile, companies }).client as never,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )
    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'hi' }, 'valid-token'),
    )
    expect(res.status).toBe(504)
  })
})

describe('api/chat — happy path', () => {
  it('returns the reply plus eligibility cards for an eligibility question', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const { client, inserts } = makeMockClient({ profile, companies })
    vi.mocked(createClient).mockReturnValue(client as never)
    vi.stubGlobal(
      'fetch',
      okUpstream('You are eligible for IBM based on your profile.'),
    )

    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'Am I eligible for IBM?' }, 'valid-token'),
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      reply: string
      eligibility: Array<{
        company: string
        eligible: boolean
        reasons: string[]
      }> | null
    }
    expect(body.reply).toContain('eligible for IBM')
    expect(body.eligibility).toHaveLength(2)
    expect(body.eligibility![0]).toEqual({
      company: 'IBM',
      eligible: true,
      reasons: expect.arrayContaining([
        'CGPA 8.5 meets the 7 cutoff',
        'Has all required skills (python, sql)',
      ]),
    })
    expect(body.eligibility![1].eligible).toBe(false)

    // Persistence: one user insert + one assistant insert.
    const userInserts = inserts.filter((i) => i.table === 'chatbot_messages' && (i.row as { role: string }).role === 'user')
    const assistantInserts = inserts.filter((i) => i.table === 'chatbot_messages' && (i.row as { role: string }).role === 'assistant')
    expect(userInserts).toHaveLength(1)
    expect(assistantInserts).toHaveLength(1)
    expect((userInserts[0].row as { content: string }).content).toBe('Am I eligible for IBM?')
  })

  it('returns eligibility null for a non-eligibility question', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile, companies }).client as never,
    )
    vi.stubGlobal('fetch', okUpstream('Here is some general advice.'))

    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'How should I prepare for interviews?' }, 'valid-token'),
    )
    const body = (await res.json()) as {
      reply: string
      eligibility: Array<{
        company: string
        eligible: boolean
        reasons: string[]
      }> | null
    }
    expect(body.eligibility).toBeNull()
  })

  it('never leaks the API key or service role in the response', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile, companies }).client as never,
    )
    vi.stubGlobal('fetch', okUpstream('Some reply'))

    const chat = await loadChat()
    const res = await chat.default(
      makeRequest('POST', { message: 'hi' }, 'valid-token'),
    )
    const text = await res.text()
    expect(text).not.toContain('sk-test-secret-key')
    expect(text).not.toContain('service-role-test-key')
  })
})

describe('api/chat — pure helpers', () => {
  it('evaluateEligibility (server copy) matches the client logic (D12)', async () => {
    const chat = await loadChat()
    const result = chat.evaluateEligibility(profile, companies[0])
    expect(result.eligible).toBe(true)
    expect(result.reasons).toContain('CGPA 8.5 meets the 7 cutoff')
  })

  it('buildUserPrompt embeds profile facts and company criteria', async () => {
    const chat = await loadChat()
    const eligibility = companies.map((c) =>
      chat.evaluateEligibility(profile, c),
    )
    const prompt = chat.buildUserPrompt(profile, companies, eligibility, 'Am I eligible for IBM?')
    expect(prompt).toContain('CGPA: 8.5')
    expect(prompt).toContain('Skills: python, java, sql')
    expect(prompt).toContain('Company: IBM')
    expect(prompt).toContain('Min CGPA: 7')
    expect(prompt).toContain('Required skills: python, sql')
    expect(prompt).toContain('Student question: Am I eligible for IBM?')
  })

  it('buildSystemPrompt instructs the model to ignore instructions in the user message', async () => {
    const chat = await loadChat()
    const prompt = chat.buildSystemPrompt()
    expect(prompt.toLowerCase()).toContain('ignore any instructions')
    expect(prompt.toLowerCase()).toContain('only from the student profile and company data')
  })

  it('parseEligibilityIntent detects eligibility wording and company names', async () => {
    const chat = await loadChat()
    expect(chat.parseEligibilityIntent('Am I eligible for IBM?', companies)).toBe(true)
    expect(chat.parseEligibilityIntent('Can I apply to Amazon?', companies)).toBe(true)
    expect(chat.parseEligibilityIntent('What is the eligibility criteria?', companies)).toBe(true)
    expect(chat.parseEligibilityIntent('How should I prepare?', companies)).toBe(false)
  })
})