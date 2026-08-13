import { useRef } from 'react'
import { motion, useInView, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { SectionReveal, StaggeredReveal } from '@/components/motion/SectionReveal'

/**
 * StatCounter — spring count-up that animates when scrolled into view.
 * Reduced-motion → renders the final value instantly.
 */
function StatCounter({
  value,
  suffix = '',
  label,
  delay = 0,
}: {
  value: number
  suffix?: string
  label: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion()
  const spring = useSpring(0, { stiffness: 50, damping: 14 })
  const display = useTransform(spring, (latest) => Math.floor(latest))

  if (inView && !reduce) {
    spring.set(value)
  } else if (inView && reduce) {
    spring.jump(value)
  }

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center gap-1 text-center"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div className="font-mono text-3xl font-medium tabular-nums text-ink">
        <motion.span>{display}</motion.span>
        <span>{suffix}</span>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </motion.div>
  )
}

const STATS = [
  { value: 78, suffix: '', label: 'ATS Score' },
  { value: 82, suffix: '%', label: 'Keyword match' },
  { value: 4, suffix: '', label: 'Sections found' },
  { value: 90, suffix: '%', label: 'Formatting' },
]

const ATS_RULES = [
  {
    title: 'Single-column, standard headings',
    body: 'Workday and Greenhouse parse best when sections are named Summary, Skills, Experience, Education — creative headings get misread.',
  },
  {
    title: '70% is the pass line',
    body: 'Recruiters commonly filter at a 70%+ keyword match. Our score mirrors that threshold so you know where you stand.',
  },
  {
    title: 'Keywords in the first bullet',
    body: 'ATS ranks exact job-description phrasing — "React.js", not "React". Highest weight goes to your summary and the first bullet of each role.',
  },
  {
    title: 'Company-specific signals',
    body: 'Amazon screens for Leadership Principles and STAR bullets; Google looks for Googleyness; Meta for its five core values.',
  },
]

/**
 * SampleReport — "Sample analysis" case study.
 * Layout pattern adapted from the pasted about-us-section (interior-design
 * services grid → ATS guidance cards + stat counters), content grounded in
 * real 2026 ATS research (Workday/Greenhouse parsing, 70% threshold,
 * Google/Amazon/Meta specifics).
 */
export function SampleReport() {
  return (
    <section id="sample" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — narrative + mock scorecard */}
          <SectionReveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Sample analysis
            </p>
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              What a real ATS{' '}
              <em className="font-normal italic text-accent">sees</em>.
            </h2>
            <p className="mt-4 max-w-md text-ink-soft">
              Every resume is parsed into fields, scored against the job
              description, and ranked — before a recruiter ever opens it. Here
              is what a strong engineering resume scores like.
            </p>

            {/* Mock scorecard */}
            <div className="mt-8 max-w-sm rounded-xl border border-ink/10 bg-paper p-6 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  ATS Score
                </span>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-accent">
                  Passes 70% line
                </span>
              </div>
              <div className="mt-3 font-mono text-6xl font-medium tabular-nums text-ink">
                78
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full w-[78%] rounded-full bg-accent" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs text-ink-soft">
                <span>Keywords · 82%</span>
                <span>Structure · 74%</span>
                <span>Formatting · 90%</span>
                <span>Recency · 70%</span>
              </div>
            </div>
          </SectionReveal>

          {/* Right — ATS guidance cards + stats */}
          <div>
            <StaggeredReveal className="grid gap-4 sm:grid-cols-2">
              {ATS_RULES.map((rule) => (
                <div
                  key={rule.title}
                  className="rounded-xl border border-ink/10 bg-surface p-5"
                >
                  <h3 className="text-sm font-semibold text-ink">{rule.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    {rule.body}
                  </p>
                </div>
              ))}
            </StaggeredReveal>

            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((stat, i) => (
                <StatCounter
                  key={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  delay={i * 0.1}
                />
              ))}
            </div>

            <div className="mt-10">
              <button
                onClick={() =>
                  document
                    .getElementById('tool')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-accent-strong"
              >
                Analyse your resume now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}