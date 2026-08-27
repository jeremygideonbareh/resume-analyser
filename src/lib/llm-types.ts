/**
 * Shared response shape for the optional LLM feedback tier (Todo 5.1).
 * Both the serverless function (`api/analyze.ts`) and the client
 * (`src/lib/llm.ts`) agree on this contract.
 */
export interface AiFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  suggestions: string[]
  /**
   * Optional per-line issues returned by the LLM tier. Additive — old LLM
   * responses without this field still parse and render.
   */
  lineIssues?: LineIssue[]
}

/**
 * Per-line issue shape for the LLM tier, matching `ResumeIssue` loosely so the
 * ReportView can render them alongside rule-based highlights.
 */
export interface LineIssue {
  /** 1-based line number in the resume text. */
  line: number
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion: string
}

/**
 * Grammar issue shape returned by `POST /api/grammar` (T4.1/T4.2).
 * Additive — existing consumers of `AiFeedback` are unaffected.
 */
export interface GrammarIssue {
  message: string
  suggestion: string
  context: string
}
