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
