import { useState } from 'react'
import { AlertCircle, Check, Copy, Loader2, Sparkles } from 'lucide-react'
import { fetchAiFeedback, fetchGrammarIssues, LLM_ENABLED } from '@/lib/llm'
import type { AiFeedback, GrammarIssue } from '@/lib/llm-types'

type FeedbackState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; feedback: AiFeedback; issues: GrammarIssue[] }
  | { status: 'error' }

interface AiFeedbackSectionProps {
  text: string
}

/** Copy text to the clipboard with a legacy fallback for older browsers. */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

/**
 * "AI Feedback (beta)" card — only renders when the env gate is on
 * (VITE_ENABLE_LLM=true). Never appears or fires requests otherwise.
 *
 * T4.2 — on "Get AI feedback" it fetches the summary/strengths/improvements
 * AND the grammar issues in parallel, then renders:
 *   - the existing summary + strengths,
 *   - grammar issues as a checklist (context, message, suggestion, Apply),
 *   - improvements + suggestions as actionable "AI-generated resume
 *     improvements" cards with a copy affordance.
 */
export function AiFeedbackSection({ text }: AiFeedbackSectionProps) {
  const [state, setState] = useState<FeedbackState>({ status: 'idle' })
  const [copied, setCopied] = useState<string | null>(null)

  if (!LLM_ENABLED) return null

  const run = async () => {
    if (state.status === 'loading') return
    setState({ status: 'loading' })
    try {
      const [feedback, issues] = await Promise.all([
        fetchAiFeedback(text),
        fetchGrammarIssues(text),
      ])
      setState({ status: 'done', feedback, issues })
    } catch {
      setState({ status: 'error' })
    }
  }

  const applySuggestion = async (issue: GrammarIssue) => {
    const ok = await copyText(issue.suggestion)
    if (ok) {
      setCopied(issue.suggestion)
      window.setTimeout(() => setCopied(null), 2000)
    }
  }

  const copyCard = async (value: string) => {
    const ok = await copyText(value)
    if (ok) {
      setCopied(value)
      window.setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <section
      aria-label="AI feedback"
      className="rounded-xl border border-hairline bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI Feedback (beta)
        </h3>
        {state.status === 'idle' && (
          <button
            type="button"
            onClick={() => void run()}
            className="rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink/25"
          >
            Get AI feedback
          </button>
        )}
      </div>

      {state.status === 'loading' && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-sm text-ink-soft"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing your resume…
        </p>
      )}

      {state.status === 'error' && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-ink-soft"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          AI feedback is temporarily unavailable. Your ATS analysis above is
          unaffected.
        </p>
      )}

      {state.status === 'done' && (
        <div className="mt-3 space-y-5">
          <p className="text-sm leading-relaxed text-ink">
            {state.feedback.summary}
          </p>
          <AiFeedbackList
            title="Strengths"
            items={state.feedback.strengths}
            tone="success"
          />

          {state.issues.length > 0 && (
            <div>
              <p className="text-[13px] text-muted">
                Grammar issues
              </p>
              <ul className="mt-2 space-y-2">
                {state.issues.map((issue, i) => (
                  <li
                    key={`${issue.message}-${i}`}
                    className="rounded-xl border border-hairline bg-surface/60 p-3"
                  >
                    {/* No italic — the loaded Archivo axis is upright only, so
                        it would synthesise an oblique. */}
                    <p className="text-xs text-muted">
                      “{issue.context}”
                    </p>
                    <p className="mt-1.5 text-sm text-ink">{issue.message}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-ink-soft">
                        Suggestion: <span className="text-ink">{issue.suggestion}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => void applySuggestion(issue)}
                        className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/25"
                      >
                        {copied === issue.suggestion ? (
                          <>
                            <Check className="h-3 w-3 text-accent" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Apply
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(state.feedback.improvements.length > 0 ||
            state.feedback.suggestions.length > 0) && (
            <div>
              <p className="text-[13px] text-muted">
                AI-generated resume improvements
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {state.feedback.improvements.map((item, i) => (
                  <ImprovementCard
                    key={`improvement-${i}`}
                    label="Improvement"
                    value={item}
                    copied={copied === item}
                    onCopy={() => void copyCard(item)}
                  />
                ))}
                {state.feedback.suggestions.map((item, i) => (
                  <ImprovementCard
                    key={`suggestion-${i}`}
                    label="Suggestion"
                    value={item}
                    copied={copied === item}
                    onCopy={() => void copyCard(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function AiFeedbackList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'success' | 'amber' | 'ink'
}) {
  if (items.length === 0) return null
  const dotClass =
    tone === 'success'
      ? 'bg-success'
      : tone === 'amber'
        ? 'bg-amber-600'
        : 'bg-ink/30'
  return (
    <div>
      <p className="text-[13px] text-muted">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="flex gap-2.5 text-sm text-ink">
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ImprovementCard({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-hairline bg-surface/60 p-3">
      <div>
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <p className="mt-1 text-sm leading-snug text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/25"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-accent" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}