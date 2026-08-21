/**
 * Grammar-check endpoint (T4.1) — server-side LLM spelling/grammar check.
 *
 * Request: `{ "text": string }` (≤ 100 KB — same limit as `/api/analyze`).
 * Flow: LLM call with a strict JSON prompt → validate + sanitize the JSON
 * (strip markdown fences) → return `{ issues: [{ message, suggestion, context }] }`.
 *
 * Guards: 405, 413, 504, 500 → friendly fallback; never log resume text;
 * never leak the API key.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { GrammarIssue } from '../src/lib/placement-types.js'

const MAX_BODY_BYTES = 100 * 1024 // 100 KB request body limit
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_TIMEOUT_MS = 10_000

const SYSTEM_PROMPT = `You are a meticulous copy editor. Find spelling, grammar,
punctuation, and awkward-phrasing issues in the resume text provided by the user.
Respond with STRICT JSON only — no prose, no markdown fences — matching exactly:
{"issues": [{"message": string, "suggestion": string, "context": string}]}
- message: a short description of the issue.
- suggestion: the corrected text for that spot.
- context: a short snippet of the original text around the issue.
Return up to 10 issues. If there are none, return {"issues": []}.`

function json(res: VercelResponse, payload: unknown, status: number): void {
  res.status(status).json(payload)
}

/** Strip markdown code fences and surrounding prose from the LLM output. */
export function stripFences(content: string): string {
  const trimmed = content.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) return fenced[1].trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return trimmed.slice(jsonStart, jsonEnd + 1)
  }
  return trimmed
}

/** Validate the LLM output strictly against the GrammarIssue contract. */
export function parseIssues(content: string): GrammarIssue[] | null {
  try {
    const raw = JSON.parse(stripFences(content)) as { issues?: unknown }
    if (!Array.isArray(raw.issues)) return null
    const issues: GrammarIssue[] = []
    for (const item of raw.issues) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as GrammarIssue).message !== 'string' ||
        typeof (item as GrammarIssue).suggestion !== 'string' ||
        typeof (item as GrammarIssue).context !== 'string'
      ) {
        return null
      }
      issues.push({
        message: (item as GrammarIssue).message,
        suggestion: (item as GrammarIssue).suggestion,
        context: (item as GrammarIssue).context,
      })
    }
    return issues
  } catch {
    return null
  }
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
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)

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
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) {
      return json(res, { error: 'llm-upstream-error' }, 502)
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return json(res, { error: 'llm-empty-response' }, 502)
    }

    const issues = parseIssues(content)
    if (!issues) {
      return json(res, { error: 'llm-malformed-response' }, 502)
    }

    return json(res, { issues }, 200)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return json(res, { error: 'timeout' }, 504)
    }
    return json(res, { error: 'internal' }, 500)
  } finally {
    clearTimeout(timer)
  }
}
