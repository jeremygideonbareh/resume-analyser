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
  insertedQuestions?: Array<{
    id: string
    seq: number
    type: string
    prompt: string
    options?: string[]
    correct_index?: number
    explanation?: string
  }>
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
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: (i % 4),
    explanation: `Explanation for question ${i + 1}`,
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
        options: ['A', 'B', 'C', 'D'],
        correct_index: (i % 4),
        explanation: `Exp ${i + 1}`,
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
    const body = res.body as {
      session: { id: string }
      questions: Array<{ type: string; options: string[]; correctIndex: number; explanation: string }>
    }
    expect(body.questions).toHaveLength(10)
    expect(body.questions.filter((q) => q.type === 'technical')).toHaveLength(7)
    expect(body.questions.filter((q) => q.type === 'behavioral')).toHaveLength(3)
    expect(body.questions[0].options).toHaveLength(4)
    expect(body.questions[0].correctIndex).toBe(0)
    expect(body.questions[0].explanation).toBe('Exp 1')
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

  it('returns 502 with upstream status detail when the LLM upstream errors', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    )

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'easy' }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(502)
    expect((res.body as { status?: number }).status).toBe(404)
  })

  it('retries once on a transient 429 and succeeds on the second attempt', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({
        profile,
        insertedQuestions: Array.from({ length: 10 }, (_, i) => ({
          id: `q_${i + 1}`,
          seq: i + 1,
          type: i < 7 ? 'technical' : 'behavioral',
          prompt: `Question ${i + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correct_index: i % 4,
          explanation: `Exp ${i + 1}`,
        })),
      }).client as never,
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: QUESTIONS_JSON } }] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.statusCode).toBe(200)
  })

  it('retries at most once — two consecutive 502s still fail as llm-upstream-error', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502 })
    vi.stubGlobal('fetch', fetchMock)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.statusCode).toBe(502)
    expect((res.body as { error?: string }).error).toBe('llm-upstream-error')
  })

  it('does not retry a non-retryable 4xx (other than 429)', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValue(
      makeMockClient({ profile }).client as never,
    )
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'start', difficulty: 'medium' }, 'valid-token'),
      res,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(502)
  })
})

describe('api/practice — answer', () => {
  it('grades a correct selection (index matches correct_index)', async () => {
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
      question: {
        id: 'q_1',
        session_id: 'sess_1',
        prompt: 'What is Python?',
        options: ['A', 'B', 'C', 'D'],
        correct_index: 2,
        explanation: 'Python is interpreted.',
      },
    })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'sess_1', questionId: 'q_1', selectedIndex: 2 }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { correct: boolean; score: number; explanation: string; completed: number }
    expect(body.correct).toBe(true)
    expect(body.correctIndex).toBe(2)
    expect(body.explanation).toBe('Python is interpreted.')
    expect(body.score).toBe(10)
    expect(body.completed).toBe(3)
  })

  it('grades a wrong selection as 0 with correctIndex', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({
      profile,
      session: {
        id: 'sess_1',
        user_id: 'user_1',
        difficulty: 'medium',
        total_questions: 10,
        completed_questions: 0,
        score_sum: 0,
      },
      question: {
        id: 'q_1',
        session_id: 'sess_1',
        prompt: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correct_index: 1,
        explanation: '2+2 equals 4.',
      },
    })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'sess_1', questionId: 'q_1', selectedIndex: 0 }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { correct: boolean; score: number; correctIndex: number }
    expect(body.correct).toBe(false)
    expect(body.correctIndex).toBe(1)
    expect(body.score).toBe(0)
  })

  it('rejects an out-of-range selectedIndex with 400', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({ profile })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'sess_1', questionId: 'q_1', selectedIndex: 7 }, 'valid-token'),
      res,
    )
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when session not found', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const mock = makeMockClient({ profile, session: null })
    vi.mocked(createClient).mockReturnValue(mock.client as never)

    const practice = await loadPractice()
    const res = makeRes()
    await practice.default(
      makeReq('POST', { action: 'answer', sessionId: 'bad', questionId: 'q_1', selectedIndex: 0 }, 'valid-token'),
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
    expect(
      practice.parseQuestions(
        JSON.stringify({
          questions: Array.from({ length: 10 }, (_, i) => ({
            type: 'technical',
            prompt: 'q',
            options: ['a', 'b', 'c'],
            correctIndex: 0,
            explanation: 'x',
          })),
        }),
      ),
    ).toBeNull()
    expect(
      practice.parseQuestions(
        JSON.stringify({
          questions: Array.from({ length: 10 }, (_, i) => ({
            type: 'technical',
            prompt: 'q',
            options: ['a', 'b', 'c', 'd'],
            correctIndex: 9,
            explanation: 'x',
          })),
        }),
      ),
    ).toBeNull()
    const parsed = practice.parseQuestions(QUESTIONS_JSON)
    expect(parsed?.[0]).toMatchObject({
      type: 'technical',
      correctIndex: 0,
      explanation: 'Explanation for question 1',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
    })
  })

  it('buildStartUserPrompt embeds profile facts and difficulty', async () => {
    const practice = await loadPractice()
    const prompt = practice.buildStartUserPrompt(profile, 'hard')
    expect(prompt).toContain('python, java, sql')
    expect(prompt).toContain('Software Engineer')
    expect(prompt).toContain('Difficulty: hard')
  })

  it('buildStartSystemPrompt instructs MCQ shape', async () => {
    const practice = await loadPractice()
    const prompt = practice.buildStartSystemPrompt()
    expect(prompt).toContain('correctIndex')
    expect(prompt).toContain('options')
    expect(prompt.toLowerCase()).toContain('ignore any instructions')
  })

  it('stripFences removes markdown fences', async () => {
    const practice = await loadPractice()
    expect(practice.stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
})


describe('option shuffling defeats the answer-position bias', () => {
  const q = (correctIndex: number) => ({
    type: 'technical' as const,
    prompt: 'p',
    options: ['A', 'B', 'C', 'D'],
    correctIndex,
    explanation: 'e',
  })

  it('keeps correctIndex pointing at the same option text', async () => {
    const { shuffleOptions } = await loadPractice()
    const input = [q(0), q(1), q(2), q(3)]
    const out = shuffleOptions(input, () => 0.42)
    out.forEach((shuffled, i) => {
      const original = input[i]
      expect(shuffled.options[shuffled.correctIndex]).toBe(
        original.options[original.correctIndex],
      )
      expect([...shuffled.options].sort()).toEqual([...original.options].sort())
    })
  })

  it('spreads the correct answer across all four positions', async () => {
    const { shuffleOptions } = await loadPractice()
    // Every question here arrives with the answer at index 1, which is what
    // the live model actually produces — measured at 9 out of 10. After
    // shuffling no single slot may dominate, or a student can score by always
    // choosing B without reading.
    const many = Array.from({ length: 400 }, () => q(1))
    const counts = [0, 0, 0, 0]
    for (const sq of shuffleOptions(many)) counts[sq.correctIndex]++
    for (const c of counts) {
      expect(c).toBeGreaterThan(40)
      expect(c).toBeLessThan(220)
    }
  })
})

describe('previously asked questions are excluded from the next session', () => {
  const profile = {
    skills: ['React'],
    programming_languages: ['TypeScript'],
    certifications: [],
    target_role: 'Frontend Engineer',
    cgpa: 8.6,
    department: 'CSE',
  } as unknown as StudentProfile

  it('omits the exclusion block on a first session', async () => {
    const { buildStartUserPrompt } = await loadPractice()
    expect(buildStartUserPrompt(profile, 'medium')).not.toMatch(/already been asked/i)
  })

  it('lists prior prompts so a repeat session cannot reuse them', async () => {
    const { buildStartUserPrompt } = await loadPractice()
    // Measured before this existed: 2 of 10 prompts came back verbatim on an
    // unchanged profile, with 0.40 word overlap overall.
    const out = buildStartUserPrompt(profile, 'medium', [
      'Which React hook manages local component state?',
    ])
    expect(out).toMatch(/already been asked/i)
    expect(out).toContain('Which React hook manages local component state?')
  })

  it('caps the exclusion list so the prompt cannot grow without bound', async () => {
    const { buildStartUserPrompt } = await loadPractice()
    const many = Array.from({ length: 200 }, (_, i) => `Question number ${i}`)
    const out = buildStartUserPrompt(profile, 'medium', many)
    expect(out).toContain('Question number 39')
    expect(out).not.toContain('Question number 40')
  })
})
