import { useRef, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import type { ResumeIssue } from '@/lib/resume-issues'
import { buildAnnotatedLines } from '@/lib/report-format'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES: Record<ResumeIssue['severity'], string> = {
  critical:
    'bg-red-200/30 text-red-900 ring-1 ring-red-300/35 dark:bg-red-500/15 dark:text-red-100',
  warning:
    'bg-amber-200/30 text-amber-900 ring-1 ring-amber-300/35 dark:bg-amber-500/12 dark:text-amber-100',
  info: 'bg-sky-200/30 text-sky-900 ring-1 ring-sky-300/35 dark:bg-sky-500/12 dark:text-sky-100',
}

/**
 * Annotated resume preview — renders the resume text line-by-line with
 * severity-coloured highlight spans. Clicking an issue in the list scrolls to
 * and flashes its line; hovering a highlight shows the issue tooltip.
 */
export function AnnotatedResume({
  text,
  issues,
}: {
  text: string
  issues: ResumeIssue[]
}) {
  const lineRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [active, setActive] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)

  const lines = buildAnnotatedLines(text, issues)

  const jumpTo = (line: number) => {
    const el = lineRefs.current.get(line)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setActive(line)
    setFlash(line)
    window.setTimeout(() => setFlash(null), 1200)
  }

  const issueKey = (issue: ResumeIssue) => `${issue.start}:${issue.end}:${issue.category}:${issue.line}`

  return (
    <div className="w-full grid gap-4 lg:grid-cols-[1fr_280px]">
      {/* Resume text with highlights */}
      <div
        aria-label="Resume text with highlighted issues"
        className="min-w-0 max-h-[30rem] overflow-auto rounded-lg border border-hairline bg-surface p-4 font-mono text-[13px] leading-6 text-ink"
      >
        {lines.map((line) => (
          <div key={line.line} className="flex min-h-[1.5rem]">
            <span className="w-8 shrink-0 select-none pr-3 text-right text-[11px] leading-6 text-ink-soft/60">
              {line.line}
            </span>
            <button
              type="button"
              ref={(el) => {
                if (el) lineRefs.current.set(line.line, el)
                else lineRefs.current.delete(line.line)
              }}
              onClick={() => jumpTo(line.line)}
              aria-label={`Jump to line ${line.line}`}
              className={cn(
                'flex-1 rounded px-0.5 text-left transition-colors',
                flash === line.line && 'bg-accent/20 ring-1 ring-accent',
                active === line.line && line.segments.every((s) => !s.issue) && 'outline-none',
              )}
            >
              {line.segments.map((seg, i) =>
                seg.issue ? (
                  <mark
                    key={`${issueKey(seg.issue)}-${i}`}
                    title={`${seg.issue.message}\n${seg.issue.suggestion}`}
                    className={cn(
                      'rounded-sm px-0.5',
                      SEVERITY_STYLES[seg.issue.severity],
                    )}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={`${line.line}-${i}`}>{seg.text}</span>
                ),
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        <p className="text-[13px] text-muted">
          Issues ({issues.length})
        </p>
        {issues.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No line-level issues detected — nice work.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {issues.map((issue) => (
              <li key={issueKey(issue)}>
                <button
                  type="button"
                  onClick={() => jumpTo(issue.line)}
                  className={cn(
                    'group flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                    active === issue.line
                      ? 'border-accent bg-accent-soft ring-1 ring-accent'
                      : 'border-hairline bg-surface hover:border-ink/25',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                      issue.severity === 'critical'
                        ? 'bg-red-500'
                        : issue.severity === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-sky-500',
                    )}
                  />
                  <span className="flex-1">
                    <span className="block text-ink">L{issue.line}</span>
                    <span className="mt-0.5 block leading-snug text-ink-soft">
                      {issue.message}
                    </span>
                    <span className="mt-0.5 block leading-snug text-ink-soft/80">
                      {issue.suggestion}
                    </span>
                  </span>
                  <MousePointer2 className="h-3 w-3 shrink-0 text-ink-soft/60 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
