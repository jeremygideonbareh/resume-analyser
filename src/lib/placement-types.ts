/**
 * Placement Assistant — shared domain types (Core 4 modules).
 *
 * Client-facing types mirror the Supabase table columns (snake_case) so rows
 * returned by supabase-js map 1:1 with no transformation layer — the same
 * convention as `AnalysisHistoryRow` in `src/lib/history.ts`.
 *
 * Postgres `numeric` columns (`cgpa`, `min_cgpa`) are returned by supabase-js
 * as strings — loaders convert them to `number` at the boundary; savers send
 * plain numbers (PostgREST converts back). `EligibilityResult` and
 * `GrammarIssue` are API wire shapes (camelCase).
 *
 * No runtime code in this file — types only.
 */

export interface StudentProfile {
  id: string
  created_at: string
  user_id: string
  full_name: string | null
  department: string | null
  semester: number | null
  /** 0–10, two decimals. Converted from the Postgres numeric string on load. */
  cgpa: number | null
  /** Non-null with DB default 0 — always present on an existing row. */
  backlogs: number
  skills: string[]
  certifications: string[]
  programming_languages: string[]
  portfolio_url: string | null
  github_url: string | null
  linkedin_url: string | null
  target_role: string | null
  updated_at: string
}

export interface Company {
  id: string
  created_at: string
  name: string
  /** Nullable cutoff — null means no CGPA requirement. */
  min_cgpa: number | null
  /** Nullable limit — null means no backlog restriction. */
  max_backlogs: number | null
  required_skills: string[]
  preferred_skills: string[]
  description: string | null
  recruitment_process: string | null
  salary_insights: string | null
}

export interface ChatMessage {
  id: string
  created_at: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
}

export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected'

export interface Application {
  id: string
  created_at: string
  user_id: string
  company_id: string | null
  /** Free-text fallback when no seeded company is referenced. */
  company_name: string | null
  status: ApplicationStatus
  applied_at: string | null
  notes: string | null
}

/** Wire shape returned by `POST /api/chat` for each evaluated company. */
export interface EligibilityResult {
  company: string
  eligible: boolean
  reasons: string[]
}

/** Wire shape returned by `POST /api/grammar`. */
export interface GrammarIssue {
  message: string
  suggestion: string
  context: string
}

// ---------------------------------------------------------------------------
// Practice Questions (Phase 5)
// ---------------------------------------------------------------------------

export type PracticeDifficulty = 'easy' | 'medium' | 'hard'

export type PracticeQuestionType = 'technical' | 'behavioral'

export interface PracticeQuestion {
  id: string
  seq: number
  type: PracticeQuestionType
  prompt: string
  userAnswer?: string
  feedback?: string
  score?: number
}

export interface PracticeSession {
  id: string
  difficulty: PracticeDifficulty
  totalQuestions: number
  completedQuestions: number
  scoreSum: number
}