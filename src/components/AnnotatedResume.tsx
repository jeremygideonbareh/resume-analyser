import { useRef, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import type { ResumeIssue } from '@/lib/resume-issues'
import { buildAnnotatedLines } from '@/lib/report-format'
import { cn } from '@/lib/utils'

/**
 * Highlight chrome.
 *
 * The text inside a highlight is ALWAYS ink. Severity is carried by a tinted
 * wash and a coloured underline, never by recolouring the words themselves —
 * coloured text on a coloured wash is what made these hard to read, and the
 * dark: variants that used to sit here rendered the annotation at 1.00:1 for
 * anyone whose OS was in dark mode.
 *
 * Washes are deliberately faint (10-14%). The job of the highlight is to say
 * "look here", not to obscure the sentence you are being asked to look at.
 */
const SEVERITY_STYLES: Record<ResumeIssue['severity'], string> = {
  critical: 'bg-danger/10 decoration-danger',
  warning: 'bg-sticker-orange/14 decoration-sticker-orange',
  info: 'bg-accent/10 decoration-accent',
}

const SEVERITY_DOT: Record<ResumeIssue['severity'], string> = {
  critical: 'bg-danger',
  warning: 'bg-sticker-orange',
  info: 'bg-accent',
}

const SEVERITY_LABEL: Record<ResumeIssue['severity'], string> = {
  critical: 'Costs the most',
  warning: 'Worth fixing',
  info: 'Optional',
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

  // Stable 1-based numbering shared by the highlight markers and the list, so
  // a reader can move between "this phrase" and "here is why" without hunting.
  const issueIndex = new Map(issues.map((iss, i) => [issueKey(iss), i]))

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
                    aria-describedby={`issue-${issueKey(seg.issue)}`}
                    className={cn(
                      'rounded-sm px-0.5 text-ink underline decoration-2 underline-offset-[3px]',
                      SEVERITY_STYLES[seg.issue.severity],
                    )}
                  >
                    {seg.text}
                    {/* Footnote marker instead of a title tooltip. A native
                        tooltip takes a second to appear, cannot be styled, and
                        never shows on touch — so the explanation was
                        effectively invisible. The number ties the highlight to
                        the numbered list below, which states the problem and
                        the fix in full. */}
                    <sup className="ml-0.5 font-sans text-[10px] font-semibold text-muted">
                      {(issueIndex.get(issueKey(seg.issue)) ?? 0) + 1}
                    </sup>
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
            {issues.map((issue, i) => (
              <li key={issueKey(issue)}>
                <button
                  type="button"
                  onClick={() => jumpTo(issue.line)}
                  className={cn(
                    'group flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    active === issue.line
                      ? 'border-accent bg-accent-soft'
                      : 'border-hairline bg-surface hover:border-ink/25',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-semibold text-ink"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[issue.severity])}
                        />
                        {/* Severity in words, not only as a coloured dot. */}
                        <span className="text-[12px] font-medium text-ink">
                          {SEVERITY_LABEL[issue.severity]}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-muted">line {issue.line}</span>
                    </span>
                    {/* The id the highlight points at with aria-describedby. */}
                    <span id={`issue-${issueKey(issue)}`} className="mt-1 block">
                      <span className="block text-[13px] leading-snug text-ink-soft">
                        {issue.message}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-ink">
                        {issue.suggestion}
                      </span>
                    </span>
                  </span>
                  <MousePointer2 className="mt-0.5 h-3 w-3 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
