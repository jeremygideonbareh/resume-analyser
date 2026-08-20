/**
 * Serverless LLM feedback endpoint (Todo 5.1) — env-gated, key server-side.
 *
 * Runs on both Vercel and Netlify:
 *   - Vercel:  `api/analyze.ts` → default-export Web Request/Response handler
 *   - Netlify: `api/analyze.ts` → default-export async handler (Functions v2)
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
import type { AiFeedback } from '../src/lib/llm-types.ts'

export const config = { runtime: 'nodejs' }

const MAX_BODY_BYTES = 100 * 1024 // 100KB request body limit
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

const SYSTEM_PROMPT = `You are a senior technical recruiter giving concise ATS-resume feedback.
Analyze the resume text provided by the user and respond with STRICT JSON only —
no prose, no markdown fences — matching exactly:
{"summary": string, "strengths": string[], "improvements": string[], "suggestions": string[]}
Summary: 2-3 sentences. Strengths: up to 5 short items. Improvements: up to 5
actionable items phrased as concrete resume edits the student can apply directly
(e.g. "Add metrics to your project bullets", "Move skills above education").
Suggestions: up to 3 general next steps, each phrased as a specific action.`

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'method-not-allowed' }, 405)
  }

  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    return json({ error: 'llm-not-configured' }, 503)
  }

  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL
  const baseUrl = process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 10_000)

  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return json({ error: 'payload-too-large' }, 413)
  }

  let text: string
  try {
    const parsed = JSON.parse(raw) as { text?: unknown }
    text = typeof parsed.text === 'string' ? parsed.text : ''
  } catch {
    return json({ error: 'bad-json' }, 400)
  }
  if (text.trim().length === 0) {
    return json({ error: 'empty-text' }, 400)
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
      return json({ error: 'llm-upstream-error' }, 502)
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return json({ error: 'llm-empty-response' }, 502)
    }

    const feedback = parseFeedback(content)
    if (!feedback) {
      return json({ error: 'llm-malformed-response' }, 502)
    }

    return json(feedback, 200)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return json({ error: 'timeout' }, 504)
    }
    return json({ error: 'internal' }, 500)
  } finally {
    clearTimeout(timer)
  }
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
    return {
      summary: raw.summary,
      strengths: raw.strengths,
      improvements: raw.improvements,
      suggestions: raw.suggestions,
    }
  } catch {
    return null
  }
}
