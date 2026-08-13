import { useEffect, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

/**
 * KineticLoader — per-state loading treatments (Todo 4.4).
 *
 * Every async/transition state in the analyser gets a kinetic treatment:
 *  - ScanSkeleton: idle→parsing — resume-shaped card with a sweeping scan
 *    line, shimmer, and a cycling mono ticker ("Reading headings…").
 *  - AnalyzingSkeleton: parsing→analyzing — scorecard outline whose score
 *    counts 0→100 while category bars fill in sequence and chips pop in.
 *  - ReportReveal: report sections reveal on scroll with a stagger.
 *
 * All animations respect prefers-reduced-motion → static equivalents.
 */

const SCAN_TICKER = [
  'Reading headings…',
  'Extracting skills…',
  'Checking keywords…',
  'Scoring structure…',
]

const CATEGORY_BARS = [
  { label: 'Keywords', width: 88 },
  { label: 'Structure', width: 72 },
  { label: 'Formatting', width: 64 },
  { label: 'Recency', width: 56 },
  { label: 'Contact', width: 48 },
]

const SKILL_CHIPS = ['React', 'TypeScript', 'SQL', 'AWS', 'Python']

/** Cycles through labels; frozen on the first label under reduced motion. */
function useTicker(labels: string[], intervalMs = 650): string {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % labels.length),
      intervalMs,
    )
    return () => window.clearInterval(id)
  }, [labels, intervalMs, reduce])

  return labels[index]
}

/**
 * ScanSkeleton — document "scanning" treatment for the parsing phase.
 * A resume-shaped card with a scan line sweeping top→bottom, shimmer on
 * the header line, and a mono ticker. Reduced motion → static card +
 * static label, no scan line.
 */
export function ScanSkeleton() {
  const reduce = useReducedMotion()
  const ticker = useTicker(SCAN_TICKER)

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-ink/10 bg-paper p-6"
    >
      <div className="relative overflow-hidden rounded-xl border border-ink/10 bg-surface p-5">
        {/* Resume outline — sized to final content (no CLS) */}
        <div className="space-y-2.5">
          <div className="skeleton-shimmer h-3 w-1/3 rounded bg-ink/10" />
          <div className="h-2 w-2/3 rounded bg-ink/10" />
          <div className="h-2 w-3/4 rounded bg-ink/10" />
          <div className="h-2 w-1/2 rounded bg-ink/10" />
          <div className="h-2 w-2/3 rounded bg-ink/10" />
          <div className="h-2 w-1/4 rounded bg-ink/10" />
        </div>

        {/* Scan line — sweeping top→bottom */}
        {!reduce && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 bg-accent/70 shadow-[0_0_12px_rgba(5,150,105,0.55)]"
            initial={{ top: '0%', opacity: 0 }}
            animate={{ top: '100%', opacity: [0, 0.85, 0.85, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        {ticker}
      </p>
    </div>
  )
}

/**
 * AnalyzingSkeleton — scorecard outline for the analyzing phase.
 * Score counts 0→100 (ease-out-quart), category bars fill in sequence
 * (staggered, ease-out-expo), skill chips pop in staggered. Reduced
 * motion → final state rendered instantly (static).
 */
export function AnalyzingSkeleton() {
  const reduce = useReducedMotion()
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (reduce) {
      setScore(100)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 900
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      setScore(Math.round(100 * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduce])

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-ink/10 bg-paper p-6"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-ink">
          {score}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          ATS Score
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {CATEGORY_BARS.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              <span>{bar.label}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
              <motion.div
                className="h-full rounded-full bg-accent/60"
                initial={reduce ? { width: `${bar.width}%` } : { width: '0%' }}
                animate={{ width: `${bar.width}%` }}
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        delay: i * 0.1,
                      }
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {SKILL_CHIPS.map((chip, i) => (
          <motion.span
            key={chip}
            className="rounded-full bg-ink/5 px-3 py-1 text-xs text-ink"
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduce
                ? undefined
                : { duration: 0.3, delay: 0.35 + i * 0.08 }
            }
          >
            {chip}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

/**
 * ReportReveal — reveals a report section once when scrolled into view.
 * transform + opacity only (perf-safe), ease-out-expo. Reduced motion →
 * renders instantly.
 */
export function ReportReveal({
  children,
  delay = 0,
}: {
  children: ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={
        reduce
          ? undefined
          : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }
      }
    >
      {children}
    </motion.div>
  )
}