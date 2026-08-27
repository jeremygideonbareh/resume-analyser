/**
 * Practice Questions client (T5.2) — thin wrapper around `/api/practice`.
 *
 * `startPractice` generates a new session with 10 questions. `submitAnswer`
 * grades a single answer. `completeSession` returns the final score.
 * All methods POST with the Supabase session JWT in the Authorization header.
 */
import { getSupabase } from '@/lib/supabase'
import type {
  PracticeDifficulty,
  PracticeSession,
  PracticeQuestion,
} from '@/lib/placement-types'

const PRACTICE_URL = '/api/practice'
const CLIENT_TIMEOUT_MS = 15_000

export interface StartResult {
  session: PracticeSession
  questions: PracticeQuestion[]
}

export interface AnswerResult {
  correct: boolean
  correctIndex: number
  explanation: string
  score: number
  completed: number
  total: number
}

export interface CompleteResult {
  scoreSum: number
  totalQuestions: number
  percent: number
}

async function postAction<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')

  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  try {
    const res = await fetch(PRACTICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...body }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const code = (err as { error?: string }).error ?? `status-${res.status}`
      throw new Error(code)
    }
    return (await res.json()) as T
  } finally {
    globalThis.clearTimeout(timer)
  }
}

/** Generate a new 10-question practice session. */
export async function startPractice(
  difficulty: PracticeDifficulty,
): Promise<StartResult> {
  return postAction<StartResult>('start', { difficulty })
}

/** Submit the selected option index for a single question and get graded. */
export async function submitAnswer(
  sessionId: string,
  questionId: string,
  selectedIndex: number,
): Promise<AnswerResult> {
  return postAction<AnswerResult>('answer', { sessionId, questionId, selectedIndex })
}

/** Complete a session and get the final score summary. */
export async function completeSession(
  sessionId: string,
): Promise<CompleteResult> {
  return postAction<CompleteResult>('complete', { sessionId })
}
