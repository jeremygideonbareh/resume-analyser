/**
 * Serverless LLM feedback endpoint (Todo 5.1) — env-gated, key server-side.
 *
 * Runs on Vercel (Node.js runtime, `(req, res)` handler signature).
 *
 * Env contract (server-side only, never bundled to the client):
 *   - LLM_API_KEY     required — rejects with 503 when missing
 *   - LLM_MODEL       optional, default "gpt-4o-mini"
 *   - LLM_BASE_URL    optional, default "https://api.openai.com/v1" (OpenAI-compatible)
 *   - LLM_TIMEOUT_MS  optional ops/test knob, default 10000 (10s timeout guard)
 *
 * Guards: 10s abort timeout (504), 100KB body limit (413), POST only (405).
 *
 * Privacy: resume text is used only for the single LLM completion — it is
 * never logged, never persisted, and never echoed back to the client.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AiFeedback } from '../src/lib/llm-types.js'

const MAX_BODY_BYTES = 100 * 1024 // 100KB request body limit
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

const SYSTEM_PROMPT = `You are a senior technical recruiter giving concise ATS-resume feedback.
Analyze the resume text provided by the user and respond with STRICT JSON only —
no prose, no markdown fences — matching exactly:
{"summary": string, "strengths": string[], "improvements": string[], "suggestions": string[], "lineIssues": [{"line": number, "severity": "critical"|"warning"|"info", "message": string, "suggestion": string}]}
Summary: 2-3 sentences. Strengths: up to 5 short items. Improvements: up to 5
actionable items phrased as concrete resume edits the student can apply directly
(e.g. "Add metrics to your project bullets", "Move skills above education").
Suggestions: up to 3 general next steps, each phrased as a specific action.
lineIssues: up to 6 precise, per-line problems detected in the resume. "line" is
the 1-based line number in the resume text. "message" describes the specific
problem on that line, "suggestion" gives a concrete edit. Only list issues you
can confidently attribute to a specific line. If there are no clear line-level
issues, return an empty array.`

function json(res: VercelResponse, payload: unknown, status: number): void {
  res.status(status).json(payload)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, { error: 'method-not-allowed' }, 405)
  }

  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    return json(res, { error: 'llm-not-configured' }, 503)
  }

  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL
  const baseUrl = process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 10_000)

  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return json(res, { error: 'payload-too-large' }, 413)
  }

  let text: string
  try {
    const parsed = JSON.parse(raw) as { text?: unknown }
    text = typeof parsed.text === 'string' ? parsed.text : ''
  } catch {
    return json(res, { error: 'bad-json' }, 400)
  }
  if (text.trim().length === 0) {
    return json(res, { error: 'empty-text' }, 400)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) {
      return json(res, { error: 'llm-upstream-error', status: upstream.status }, 502)
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return json(res, { error: 'llm-empty-response' }, 502)
    }

    const feedback = parseFeedback(content)
    if (!feedback) {
      return json(res, { error: 'llm-malformed-response' }, 502)
    }

    return json(res, feedback, 200)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return json(res, { error: 'timeout' }, 504)
    }
    return json(res, { error: 'internal' }, 500)
  } finally {
    clearTimeout(timer)
  }
}

/** Validate the LLM's JSON output strictly against the AiFeedback contract. */
function parseFeedback(content: string): AiFeedback | null {
  try {
    const raw = JSON.parse(content) as Partial<AiFeedback>
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((item) => typeof item === 'string')
    if (
      typeof raw.summary !== 'string' ||
      !isStringArray(raw.strengths) ||
      !isStringArray(raw.improvements) ||
      !isStringArray(raw.suggestions)
    ) {
      return null
    }
    const lineIssues = normalizeLineIssues(raw.lineIssues)
    return {
      summary: raw.summary,
      strengths: raw.strengths,
      improvements: raw.improvements,
      suggestions: raw.suggestions,
      ...(lineIssues.length > 0 ? { lineIssues } : {}),
    }
  } catch {
    return null
  }
}

/** Accept only well-formed line issues; drop anything malformed. */
function normalizeLineIssues(
  value: unknown,
): NonNullable<AiFeedback['lineIssues']> {
  if (!Array.isArray(value)) return []
  const out: NonNullable<AiFeedback['lineIssues']> = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const i = item as {
      line?: unknown
      severity?: unknown
      message?: unknown
      suggestion?: unknown
    }
    if (
      typeof i.line !== 'number' || !Number.isInteger(i.line) || i.line < 1 ||
      (i.severity !== 'critical' && i.severity !== 'warning' && i.severity !== 'info') ||
      typeof i.message !== 'string' || i.message.trim().length === 0 ||
      typeof i.suggestion !== 'string'
    ) {
      continue
    }
    out.push({
      line: i.line,
      severity: i.severity,
      message: i.message.trim(),
      suggestion: i.suggestion.trim(),
    })
  }
  return out
}
