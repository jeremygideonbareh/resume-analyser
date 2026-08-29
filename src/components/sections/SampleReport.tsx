import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * SampleReport — the payoff, shown before the ask.
 *
 * Parse showed what the machine extracts and Verdict showed what it costs;
 * this shows the thing you actually receive, so the upload that follows is a
 * known quantity rather than a leap of faith.
 *
 * The old version was four identical rule cards over a row of four count-up
 * stat tiles — the SaaS metric-row cliché — and it opened with the same
 * italic-accent-word headline construction HowItWorks used, so two consecutive
 * sections read as one template applied twice. What replaced it is the actual
 * differentiator: line-level issues with the specific edit to make, which is
 * the part no generic scorer produces.
 */

const CATEGORIES = [
  { label: 'Keyword match', score: 71, weight: 45 },
  { label: 'Structure', score: 88, weight: 17 },
  { label: 'Recency', score: 94, weight: 13 },
  { label: 'Formatting', score: 90, weight: 12 },
  { label: 'Contact info', score: 100, weight: 8 },
  { label: 'Parse confidence', score: 96, weight: 5 },
]

const ISSUES = [
  {
    line: 9,
    severity: 'critical' as const,
    quote: 'Worked on the frontend team for the billing product',
    fix: 'No outcome a reader can weigh. Name the result: "Rebuilt billing checkout, cutting failed payments 23%."',
  },
  {
    line: 14,
    severity: 'warning' as const,
    quote: 'Familiar with React and some backend work',
    fix: 'Hedged phrasing does not match. Filters look for the exact token — write "React", "Node.js", "PostgreSQL".',
  },
  {
    line: 3,
    severity: 'warning' as const,
    quote: 'No portfolio or repository link',
    fix: 'Add a GitHub or portfolio URL beside your email. Engineering screens weight it, and it costs one line.',
  },
]

const SEVERITY = {
  critical: { label: 'Costs the most', dot: 'bg-danger', text: 'text-danger' },
  warning: {
    label: 'Worth fixing',
    dot: 'bg-sticker-orange',
    text: 'text-warning',
  },
}

function CategoryBar({
  category,
  index,
  inView,
  reduce,
}: {
  category: (typeof CATEGORIES)[number]
  index: number
  inView: boolean
  reduce: boolean | null
}) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
      <span className="text-body-sm text-ink-soft">{category.label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={inView || reduce ? { width: `${category.score}%` } : undefined}
          transition={{
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1 + index * 0.07,
          }}
          style={reduce ? { width: `${category.score}%` } : undefined}
          className={cn(
            'h-full rounded-full',
            // Only the weakest category is coloured differently — a chart
            // where every bar is the accent tells you nothing about where
            // to look first.
            category.score < 75 ? 'bg-sticker-orange' : 'bg-accent',
          )}
        />
      </div>
      <span className="text-right font-mono text-[12px] tabular-nums text-muted">
        {category.score}
      </span>
    </div>
  )
}

export function SampleReport() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  return (
    <section
      id="sample"
      aria-labelledby="sample-heading"
      // Sits on white rather than the warm canvas. Four consecutive light
      // sections on one ground read as a single undifferentiated slab; a
      // surface change is enough to tell the eye a new argument has started.
      className="border-b border-hairline bg-surface"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <header className="max-w-2xl">
          <h2 id="sample-heading" className="text-display-2 text-ink">
            Not a grade. A list of edits.
          </h2>
          <p className="measure mt-4 text-body-md text-ink-soft">
            Every score comes with the lines that produced it and the specific
            change to make, ordered by how much each one is costing you.
          </p>
        </header>

        <div
          ref={ref}
          className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8"
        >
          {/* Scorecard */}
          <div className="rounded-xl bg-surface p-6 elev-soft sm:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="font-mono text-[3.5rem] font-medium leading-none tabular-nums text-ink">
                  78
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-muted">
                  Weighted ATS score
                </p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-medium text-link">
                Above the line
              </span>
            </div>

            <div className="mt-7 space-y-3.5">
              {CATEGORIES.map((c, i) => (
                <CategoryBar
                  key={c.label}
                  category={c}
                  index={i}
                  inView={inView}
                  reduce={reduce}
                />
              ))}
            </div>

            <p className="mt-6 border-t border-hairline pt-4 text-body-sm text-muted">
              Weights follow what screening software actually ranks on: keyword
              match carries {CATEGORIES[0].weight}% of the total, which is why
              it is the one category worth fixing first.
            </p>
          </div>

          {/* Line-level issues */}
          <div className="rounded-xl bg-surface p-6 elev-soft sm:p-7">
            <h3 className="text-title text-ink">Three edits, ranked</h3>
            <ul className="mt-5 space-y-5">
              {ISSUES.map((issue) => {
                const sev = SEVERITY[issue.severity]
                return (
                  <li
                    key={issue.line}
                    className="border-b border-hairline pb-5 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-mono text-[12px] text-muted">
                        line {issue.line}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={cn('h-1.5 w-1.5 rounded-full', sev.dot)}
                        />
                        {/* Severity is stated in words, not just coloured. */}
                        <span
                          className={cn('text-[13px] font-medium', sev.text)}
                        >
                          {sev.label}
                        </span>
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[13px] text-ink-soft">
                      &ldquo;{issue.quote}&rdquo;
                    </p>
                    <p className="measure mt-2 text-body-sm text-ink">
                      {issue.fix}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <a
            href="#tool"
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-[16px] font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Run this on my resume
          </a>
        </div>
      </div>
    </section>
  )
}
