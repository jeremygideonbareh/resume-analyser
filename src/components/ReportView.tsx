import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from 'recharts'
import { toast } from 'sonner'
import { Printer, Copy, Check } from 'lucide-react'
import type { AnalysisResult, FeedbackItem } from '@/lib/analysis'
import type { ParsedResume } from '@/lib/parsing'
import {
  scoreBand,
  groupFeedback,
  countWords,
  buildCopySummary,
} from '@/lib/report-format'
import { ReportReveal } from '@/components/KineticLoader'
import { AiFeedbackSection } from '@/components/AiFeedbackSection'
import { AnnotatedResume } from '@/components/AnnotatedResume'
import { LLM_ENABLED } from '@/lib/llm'

/** Animated count-up — ease-out-quart; instant when reduced motion. */
function useCountUp(target: number, duration = 800): number {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(target)

  useEffect(() => {
    if (reduce) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduce])

  return value
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    payload?: { label?: string; earned?: number; weight?: number }
  }>
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-xs text-ink elev-soft">
      <div className="font-medium">{p?.label}</div>
      <div className="text-ink-soft">
        {p?.earned}/{p?.weight} pts
      </div>
    </div>
  )
}

interface ReportViewProps {
  result: AnalysisResult
  parsed?: ParsedResume | null
}

/** Categories shown in the charts (parse-confidence is a modifier, not a sub-score). */
const CHART_CATEGORIES = [
  'keywords',
  'structure',
  'formatting',
  'recency',
  'contact',
] as const

export function ReportView({ result, parsed }: ReportViewProps) {
  const reduce = useReducedMotion()
  const animatedScore = useCountUp(result.score)
  const band = scoreBand(result.score)
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const groups = useMemo(() => groupFeedback(result.feedback), [result.feedback])

  const chartData = useMemo(
    () =>
      result.breakdown
        .filter((c) =>
          CHART_CATEGORIES.includes(c.id as (typeof CHART_CATEGORIES)[number]),
        )
        .map((c) => ({
          id: c.id,
          label: c.label,
          value: Math.round((c.earned / Math.max(c.weight, 1)) * 100),
          earned: c.earned,
          weight: c.weight,
        })),
    [result.breakdown],
  )

  const highlighted = selected
    ? result.feedback.filter((f) => f.category === selected)
    : []

  const handleBarClick = (entry: { id?: string } | null | undefined) => {
    setSelected((prev) => (prev === entry?.id ? null : (entry?.id ?? null)))
  }

  const handleCopy = async () => {
    const text = buildCopySummary(result, parsed)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Summary copied to clipboard')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — clipboard unavailable')
    }
  }

  const hasJd =
    result.presentKeywords.length > 0 || result.missingKeywords.length > 0

  return (
    <div id="report-print" className="space-y-6">
      {/* Toolbar — excluded from print */}
      <ReportReveal delay={0}>
        <div className="no-print flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink/25"
          >
            <Printer className="h-3.5 w-3.5" /> Print report
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm text-ink transition-colors hover:border-ink/25"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy summary
          </button>
        </div>
      </ReportReveal>

      {/* Signature scorecard */}
      <ReportReveal delay={0.1}>
        <div className={`rounded-xl border bg-surface p-6 ${band.accentClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-ink">
                ATS Score
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-ink">
                  {animatedScore}
                </span>
                <span className={`text-sm font-medium ${band.textClass}`}>
                  {band.label}
                </span>
              </div>
            </div>
            <div className="text-right text-[13px] text-muted">
              {parsed && (
                <>
                  <p>{parsed.format.toUpperCase()}</p>
                  <p>{countWords(parsed.text)} words</p>
                </>
              )}
            </div>
          </div>
        </div>
      </ReportReveal>

      {/* Charts */}
      <ReportReveal delay={0.2}>
        <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h3 className="text-[13px] font-semibold text-ink">
            Category profile
          </h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="68%">
                <PolarGrid stroke="var(--color-hairline)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--color-ink-soft)' }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.22}
                  isAnimationActive={!reduce}
                  animationDuration={700}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h3 className="text-[13px] font-semibold text-ink">
            Category scores — click a bar for feedback
          </h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={96}
                  tick={{ fontSize: 11, fill: 'var(--color-ink-soft)' }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  isAnimationActive={!reduce}
                  animationDuration={700}
                  onClick={(entry) => handleBarClick(entry)}
                >
                  {chartData.map((d) => (
                    <Cell
                      key={d.id}
                      fill={
                        selected === d.id
                          ? 'var(--chart-1)'
                          : 'color-mix(in oklch, var(--chart-1) 70%, transparent)'
                      }
                    />
                  ))}
                </Bar>
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'oklch(0.16 0 0 / 0.04)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
      </ReportReveal>

      {/* Sections detected */}
      <ReportReveal delay={0.3}>
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h3 className="text-[13px] font-semibold text-ink">
            Sections detected
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.sections
              .filter((s) => s.present)
              .map((s) => (
                <span
                  key={s.name}
                  className="rounded-full border border-hairline px-3 py-1 text-xs text-ink"
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
      </ReportReveal>

      {/* Skills extracted */}
      <ReportReveal delay={0.45}>
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h3 className="text-[13px] font-semibold text-ink">
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
      </ReportReveal>

      {/* JD keyword match */}
      {hasJd && (
        <ReportReveal delay={0.6}>
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <h3 className="text-[13px] font-semibold text-ink">
              Job description keywords
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-ink-soft">
                  Present ({result.presentKeywords.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {result.presentKeywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-soft">
                  Missing ({result.missingKeywords.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {result.missingKeywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-full border border-hairline px-3 py-1 text-xs text-ink"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ReportReveal>
      )}

      {/* Feedback — grouped by priority, drill-down highlight */}
      <ReportReveal delay={0.75}>
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <h3 className="text-[13px] font-semibold text-ink">
            Feedback
          </h3>

          {selected && (
            <p className="mt-3 text-xs text-ink-soft">
              {highlighted.length > 0
                ? `Drill-down — feedback for "${
                    chartData.find((c) => c.id === selected)?.label ?? selected
                  }":`
                : 'No specific feedback for this category.'}
            </p>
          )}

          {(['high', 'medium', 'low'] as const).map((group) => {
            const items = groups[group]
            if (items.length === 0) return null
            const label =
              group === 'high'
                ? 'High priority'
                : group === 'medium'
                  ? 'Medium'
                  : 'Nice-to-haves'
            return (
              <div key={group} className="mt-4">
                <p className="text-[13px] text-muted">
                  {label}
                </p>
                <ol className="mt-2 space-y-2">
                  {items.map((f: FeedbackItem, i: number) => {
                    const isActive =
                      selected !== null && f.category === selected
                    return (
                      <li
                        key={`${group}-${i}`}
                        className={`flex gap-3 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors ${
                          isActive ? 'bg-accent-soft ring-1 ring-accent' : ''
                        }`}
                      >
                        <span className="font-mono text-xs text-ink-soft">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{f.message}</span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}

          {result.feedback.length === 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              No issues found — nice work.
            </p>
          )}
        </div>
      </ReportReveal>

      {/* Annotated resume preview — line-anchored, rule-based issues */}
      {parsed && parsed.text && (
        <ReportReveal delay={0.8}>
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-ink">
                Inline issue highlights
              </h3>
              <span className="font-mono text-[11px] text-ink-soft">
                {result.issues.length} issue{result.issues.length === 1 ? '' : 's'} found
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Issues are highlighted inline in your resume text. Click a
              highlight or an issue in the list to jump to that line.
            </p>
            <div className="mt-4">
              <AnnotatedResume text={parsed.text} issues={result.issues} />
            </div>
          </div>
        </ReportReveal>
      )}

      {/* Optional AI feedback (beta) — env-gated, key server-side (Todo 5.1) */}
      {LLM_ENABLED && parsed && (
        <ReportReveal delay={0.9}>
          <AiFeedbackSection text={parsed.text} />
        </ReportReveal>
      )}
    </div>
  )
}