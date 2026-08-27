import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { StudentProfile } from '../../src/lib/placement-types.js'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

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

function makeReq(method: string, body?: unknown, token?: string): VercelRequest {
  const headers: Record<string, string | string[] | undefined> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return { method, headers, body: body === undefined ? undefined : body } as VercelRequest
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
  return res as unknown as VercelResponse & { statusCode: number; body: unknown }
}

function makeMockClient(opts: {
  user?: { id: string } | null
  authError?: Error | null
  profile?: StudentProfile | null
  session?: Record<string, unknown> | null
  sessionErr?: Error | null
  question?: Record<string, unknown> | null
  questionErr?: Error | null
  insertedQuestions?: Array<{ id: string; seq: number; type: string; prompt: string }>
} = {}) {
  const inserts: Array<{ table: string; row: unknown }> = []
  const updates: Array<{ table: string; row: unknown; filter: string }> = []
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user ?? { id: 'user_1' } },
        error: opts.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(() => {
          if (table === 'student_profiles') {
            return Promise.resolve({ data: opts.profile ?? null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }),
        single: vi.fn(() => {
          if (table === 'student_profiles') {
            return Promise.resolve({ data: opts.profile ?? null, error: null })
          }
          if (table === 'practice_sessions') {
            if (opts.sessionErr) return Promise.resolve({ data: null, error: opts.sessionErr })
            return Promise.resolve({ data: opts.session ?? null, error: null })
          }
          if (table === 'practice_questions') {
            if (opts.questionErr) return Promise.resolve({ data: null, error: opts.questionErr })
            return Promise.resolve({ data: opts.question ?? null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }),
        insert: vi.fn((row: unknown) => {
          inserts.push({ table, row })
          if (table === 'practice_sessions') {
            const sessionData = { id: 'sess_1', ...(typeof row === 'object' ? row : {}) }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
              }),
            }
          }
          if (table === 'practice_questions') {
            return {
              select: vi.fn().mockResolvedValue({
                data: opts.insertedQuestions ?? [],
                error: null,
              }),
            }
          }
          return Promise.resolve({ data: null, error: null })
        }),
        update: vi.fn((row: unknown) => {
          updates.push({ table, row, filter: '' })
          return builder
        }),
      }
      return builder
    }),
  }
  return { client, inserts, updates }
}

const QUESTIONS_JSON = JSON.stringify({
  questions: Array.from({ length: 10 }, (_, i) => ({
    type: i < 7 ? 'technical' : 'behavioral',
    prompt: `Question ${i + 1}: ${i < 7 ? 'Explain a concept' : 'Tell me about yourself'}`,
  })),
})

const okUpstream = (content: string) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  })

beforeEach(() => {
  vi.stubEnv('LLM_API_KEY', 'sk-test-secret-key')
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function loadPractice() {
  vi.resetModules()
  return await import('../practice.ts')
}

describe('api/practice — guards', () => {
  it('rejects non-POST with 405', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(makeReq('GET'), res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects missing token with 401', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(makeReq('POST', { action: 'start', difficulty: 'medium' }), res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects no profile with 403', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile: null }).client as never,
    )
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(403)
  })

  it('rejects missing action with 400', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(makeMockClient().client as never)
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('rejects invalid difficulty with 400', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'invalid' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('returns 504 on upstream timeout', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),
    )
    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(504)
  })
})

describe('api/practice — start', () => {
  it('returns 10 questions with correct types (7 technical, 3 behavioral)', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({
      profile,
      insertedQuestions: Array.from({ length: 10 }, (_, i) => ({
        id: `q_${i + 1}`,
        seq: i + 1,
        type: i < 7 ? 'technical' : 'behavioral',
        prompt: `Question ${i + 1}`,
      })),
    })
    vi.mocked(createClient).mockReturnValue(mock.client as never)
    vi.stubGlobal('fetch', okUpstream(QUESTIONS_JSON))

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { session: { id: string }; questions: Array<{ type: string }> }
    expect(body.questions).toHaveLength(10)
    expect(body.questions.filter((q) => q.type === 'technical')).toHaveLength(7)
    expect(body.questions.filter((q) => q.type === 'behavioral')).toHaveLength(3)
  })

  it('returns 502 on malformed LLM response', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    vi.stubGlobal('fetch', okUpstream('not json'))

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'easy' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(502)
  })

  it('never leaks the API key', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    vi.stubGlobal('fetch', okUpstream(QUESTIONS_JSON))

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'hard' }, 'valid-token'),
      res,
    )
    expect(JSON.stringify(res.body)).not.toContain('sk-test-secret-key')
  })
})

describe('api/practice — answer', () => {
  it('grades an answer and returns feedback + score', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({
      profile,
      session: {
        id: 'sess_1',
        user_id: 'user_1',
        difficulty: 'medium',
        total_questions: 10,
        completed_questions: 2,
        score_sum: 14,
      },
      question: { id: 'q_1', session_id: 'sess_1', prompt: 'What is Python?' },
    })
    vi.mocked(createClient).mockReturnValue(mock.client as never)
    vi.stubGlobal('fetch', okUpstream(JSON.stringify({ score: 8, feedback: 'Good answer' })))

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'sess_1', questionId: 'q_1', answer: 'Python is a language' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { feedback: string; score: number; completed: number }
    expect(body.score).toBe(8)
    expect(body.feedback).toBe('Good answer')
    expect(body.completed).toBe(3)
  })

  it('returns 404 when session not found', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({ profile, session: null })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'bad', questionId: 'q_1', answer: 'hi' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(404)
  })
})

describe('api/practice — complete', () => {
  it('returns final score summary', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({
      profile,
      session: {
        id: 'sess_1',
        user_id: 'user_1',
        difficulty: 'medium',
        total_questions: 10,
        completed_questions: 10,
        score_sum: 75,
      },
    })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'complete', sessionId: 'sess_1' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { scoreSum: number; totalQuestions: number; percent: number }
    expect(body.scoreSum).toBe(75)
    expect(body.totalQuestions).toBe(10)
    expect(body.percent).toBe(75)
  })
})

describe('api/practice — pure helpers', () => {
  it('parseQuestions validates shape strictly', async () => {
    const practice = await loadPractice()
    expect(practice.parseQuestions(QUESTIONS_JSON)).toHaveLength(10)
    expect(practice.parseQuestions('not json')).toBeNull()
    expect(practice.parseQuestions('{"questions": []}')).toBeNull()
  })

  it('parseGrade validates score range', async () => {
    const practice = await loadPractice()
    expect(practice.parseGrade(JSON.stringify({ score: 8, feedback: 'Good' }))).toEqual({
      score: 8,
      feedback: 'Good',
    })
    expect(practice.parseGrade(JSON.stringify({ score: 11, feedback: 'Bad' }))).toBeNull()
    expect(practice.parseGrade(JSON.stringify({ score: -1, feedback: 'Bad' }))).toBeNull()
  })

  it('buildStartUserPrompt embeds profile facts and difficulty', async () => {
    const practice = await loadPractice()
    const prompt = practice.buildStartUserPrompt(profile, 'hard')
    expect(prompt).toContain('python, java, sql')
    expect(prompt).toContain('Software Engineer')
    expect(prompt).toContain('Difficulty: hard')
  })

  it('buildGradeSystemPrompt instructs to ignore instructions in answer', async () => {
    const practice = await loadPractice()
    const prompt = practice.buildGradeSystemPrompt()
    expect(prompt.toLowerCase()).toContain('ignore any instructions')
  })

  it('stripFences removes markdown fences', async () => {
    const practice = await loadPractice()
    expect(practice.stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
})
