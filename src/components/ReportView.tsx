import type { AnalysisResult } from '@/lib/analysis'
import type { ParsedResume } from '@/lib/parsing'

/**
 * ReportView — renders an AnalysisResult.
 * Todo 3.2: minimal-but-complete render (score, breakdown, sections, skills,
 * JD keywords, feedback). Todo 4.1 upgrades this with Recharts graphs,
 * print/export, and bar→feedback drill-down.
 */

function scoreBand(score: number): { label: string; className: string } {
  if (score >= 70) return { label: 'Strong', className: 'text-emerald-600' }
  if (score >= 40) return { label: 'Needs work', className: 'text-amber-600' }
  return { label: 'Weak', className: 'text-red-600' }
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/)
  return words.length === 1 && words[0] === '' ? 0 : words.length
}

interface ReportViewProps {
  result: AnalysisResult
  parsed?: ParsedResume | null
}

export function ReportView({ result, parsed }: ReportViewProps) {
  const band = scoreBand(result.score)
  const present = result.presentKeywords
  const missing = result.missingKeywords
  const hasJd = present.length > 0 || missing.length > 0

  return (
    <div className="space-y-6">
      {/* Signature scorecard */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              ATS Score
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-ink">
                {result.score}
              </span>
              <span className={`text-sm font-medium ${band.className}`}>
                {band.label}
              </span>
            </div>
          </div>
          <div className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            {parsed && (
              <>
                <p>{parsed.format.toUpperCase()}</p>
                <p>{wordCount(parsed.text)} words</p>
              </>
            )}
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="mt-6 space-y-3">
          {result.breakdown.map((c) => {
            const pct = Math.round(
              (c.earned / Math.max(c.weight, 1)) * 100,
            )
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-soft">{c.label}</span>
                  <span className="font-mono tabular-nums text-ink">
                    {c.earned}/{c.weight}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sections detected */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Sections detected
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.sections
            .filter((s) => s.present)
            .map((s) => (
              <span
                key={s.name}
                className="rounded-full border border-ink/15 px-3 py-1 text-xs text-ink"
              >
                {s.name}
              </span>
            ))}
          {result.sections.filter((s) => s.present).length === 0 && (
            <span className="text-xs text-ink-soft">
              No standard section headings detected.
            </span>
          )}
        </div>
      </div>

      {/* Skills extracted */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Skills extracted ({result.skills.length})
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.skills.map((s) => (
            <span
              key={s}
              className="rounded-full bg-ink/5 px-3 py-1 text-xs text-ink"
            >
              {s}
            </span>
          ))}
          {result.skills.length === 0 && (
            <span className="text-xs text-ink-soft">
              No known skills found.
            </span>
          )}
        </div>
      </div>

      {/* JD keyword match */}
      {hasJd && (
        <div className="rounded-2xl border border-ink/10 bg-paper p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            Job description keywords
          </h3>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-ink-soft">
                Present ({present.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {present.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Missing ({missing.length})</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {missing.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs text-ink"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Feedback
        </h3>
        <ol className="mt-3 space-y-2">
          {result.feedback.map((f, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="font-mono text-xs text-ink-soft">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{f.message}</span>
            </li>
          ))}
          {result.feedback.length === 0 && (
            <li className="text-sm text-ink-soft">
              No issues found — nice work.
            </li>
          )}
        </ol>
      </div>
    </div>
  )
}