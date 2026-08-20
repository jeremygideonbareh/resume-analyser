/**
 * Optional LLM feedback tier (Todo 5.1) — env-gated, default OFF.
 *
 * Gate: `VITE_ENABLE_LLM === 'true'` (set in .env or the shell when running
 * `vite dev` / `vite build`). When disabled:
 *   - the AI section never renders,
 *   - no request is ever made,
 *   - the `/api/analyze` literal is folded out of the production bundle
 *     (QA greps dist for it and expects it absent).
 *
 * The API key lives only server-side (`api/analyze.ts` reads LLM_API_KEY);
 * it is never bundled into the client.
 */
import type { AiFeedback, GrammarIssue } from './llm-types'

export const LLM_ENABLED = import.meta.env.VITE_ENABLE_LLM === 'true'

/**
 * Endpoint literal is derived from the gate so bundlers can constant-fold it
 * to `''` when the tier is disabled — keeping `api/analyze` out of dist.
 */
export const AI_ANALYZE_URL =
  import.meta.env.VITE_ENABLE_LLM === 'true' ? '/api/analyze' : ''

/**
 * Same gate-derived literal for the grammar endpoint (T4.2) — when the tier
 * is disabled the `/api/grammar` literal is folded out of dist too.
 */
export const GRAMMAR_URL =
  import.meta.env.VITE_ENABLE_LLM === 'true' ? '/api/grammar' : ''

const CLIENT_TIMEOUT_MS = 10_000

/**
 * POST the resume text to the serverless function and return typed feedback.
 * Throws on any failure — callers render a friendly fallback.
 */
export async function fetchAiFeedback(text: string): Promise<AiFeedback> {
  if (!LLM_ENABLED) {
    throw new Error('AI feedback tier is disabled')
  }
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  try {
    const res = await fetch(AI_ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`AI feedback request failed with status ${res.status}`)
    }
    return (await res.json()) as AiFeedback
  } finally {
    globalThis.clearTimeout(timer)
  }
}

/**
 * POST the resume text to the grammar endpoint (T4.2) and return the issues.
 * Throws on any failure — callers render a friendly fallback. Returns an
 * empty list when the endpoint responds without issues.
 */
export async function fetchGrammarIssues(text: string): Promise<GrammarIssue[]> {
  if (!LLM_ENABLED) {
    throw new Error('AI feedback tier is disabled')
  }
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  try {
    const res = await fetch(GRAMMAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Grammar request failed with status ${res.status}`)
    }
    const data = (await res.json()) as { issues?: GrammarIssue[] }
    return data.issues ?? []
  } finally {
    globalThis.clearTimeout(timer)
  }
}
