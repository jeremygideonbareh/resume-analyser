import { useState } from 'react'
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { LLM_ENABLED, fetchAiFeedback } from '@/lib/llm'
import type { AiFeedback } from '@/lib/llm-types'

type FeedbackState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; feedback: AiFeedback }
  | { status: 'error' }

interface AiFeedbackSectionProps {
  text: string
}

/**
 * "AI Feedback (beta)" card — only renders when the env gate is on
 * (VITE_ENABLE_LLM=true). Never appears or fires requests otherwise.
 */
export function AiFeedbackSection({ text }: AiFeedbackSectionProps) {
  const [state, setState] = useState<FeedbackState>({ status: 'idle' })

  if (!LLM_ENABLED) return null

  const run = async () => {
    if (state.status === 'loading') return
    setState({ status: 'loading' })
    try {
      const feedback = await fetchAiFeedback(text)
      setState({ status: 'done', feedback })
    } catch {
      setState({ status: 'error' })
    }
  }

  return (
    <section
      aria-label="AI feedback"
      className="rounded-2xl border border-ink/10 bg-paper p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI Feedback (beta)
        </h3>
        {state.status === 'idle' && (
          <button
            type="button"
            onClick={() => void run()}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:border-ink/30"
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
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-ink">
            {state.feedback.summary}
          </p>
          <AiFeedbackList
            title="Strengths"
            items={state.feedback.strengths}
            tone="emerald"
          />
          <AiFeedbackList
            title="Improvements"
            items={state.feedback.improvements}
            tone="amber"
          />
          <AiFeedbackList
            title="Suggestions"
            items={state.feedback.suggestions}
            tone="ink"
          />
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
  tone: 'emerald' | 'amber' | 'ink'
}) {
  if (items.length === 0) return null
  const dotClass =
    tone === 'emerald'
      ? 'bg-emerald-600'
      : tone === 'amber'
        ? 'bg-amber-600'
        : 'bg-ink/30'
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
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
