import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { cn } from '@/lib/utils'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * ParseSection — the one inverted band on an otherwise light page.
 *
 * The argument the whole landing page makes is the gap between how *you* read
 * your resume and how an ATS reads it. That gap is not something to describe
 * in a paragraph; it's something to show. So this section pins and scrubs:
 *
 *   p 0.00 → 0.30   the document, as a person reads it
 *   p 0.30 → 0.62   detected fields light up in place
 *   p 0.62 → 1.00   the document recedes and the parsed record takes over
 *
 * Light means human view, dark means machine view — which is why the page
 * inverts exactly here and nowhere else. Repeating the treatment elsewhere
 * would turn a meaningful switch into decoration.
 *
 * Reduced motion collapses all of it into a static side-by-side: both halves
 * are legible at once with no pin and no scrub, because the comparison is the
 * content and must survive without movement.
 */

type Field = {
  /** Key as the parser reports it. */
  key: string
  /** What the parser pulled out. */
  value: string
  /** Confident, or flagged for the reader's attention. */
  status: 'ok' | 'warn'
}

/** The document, as a person reads it. Line index doubles as the anchor a
 *  highlight box attaches to, so the two views stay in sync. */
const RESUME_LINES: { text: string; field?: string; bold?: boolean }[] = [
  { text: 'PRIYA SHARMA', field: 'name', bold: true },
  { text: 'priya.sharma@email.com · +91 98765 43210', field: 'contact' },
  { text: '' },
  { text: 'EDUCATION', bold: true },
  { text: 'B.Tech Computer Science, VIT Vellore', field: 'education' },
  { text: 'CGPA 8.6 · Graduating 2026' },
  { text: '' },
  { text: 'EXPERIENCE', bold: true },
  { text: 'Software Engineering Intern, Zoho', field: 'experience' },
  { text: 'May 2025 – Jul 2025' },
  { text: '· Built a React dashboard used by 40+ users', field: 'metric' },
  { text: '· Cut API response time by 38% with Redis' },
  { text: '' },
  { text: 'SKILLS', bold: true },
  { text: 'React · TypeScript · Node.js · PostgreSQL', field: 'skills' },
]

const PARSED_FIELDS: Field[] = [
  { key: 'name', value: '"Priya Sharma"', status: 'ok' },
  { key: 'email', value: '"priya.sharma@email.com"', status: 'ok' },
  { key: 'phone', value: '"+91 98765 43210"', status: 'ok' },
  { key: 'education[]', value: '1 entry · CGPA parsed', status: 'ok' },
  { key: 'experience[]', value: '1 role · 2 bullets', status: 'ok' },
  { key: 'quantified[]', value: '2 of 2 bullets', status: 'ok' },
  { key: 'skills[]', value: '4 found · 12 in job description', status: 'warn' },
  { key: 'links[]', value: 'no portfolio or GitHub', status: 'warn' },
]

/** One row of the parsed record, revealed in sequence as the scrub advances. */
function FieldRow({
  field,
  index,
  progress,
  reduce,
}: {
  field: Field
  index: number
  progress: MotionValue<number>
  reduce: boolean | null
}) {
  // Rows resolve one after another between p 0.62 and p 0.95 — the parser
  // filling in its record, not eight things fading in together.
  const start = 0.62 + index * 0.035
  const opacity = useTransform(progress, [start, start + 0.06], [0, 1])
  const x = useTransform(progress, [start, start + 0.06], [-8, 0])

  return (
    <motion.li
      style={reduce ? undefined : { opacity, x }}
      className="grid grid-cols-[7.5rem_1fr] items-baseline gap-x-3 gap-y-1 border-b border-white/10 py-2 last:border-0 sm:grid-cols-[9rem_1fr]"
    >
      <span className="font-mono text-[12px] text-sticker-sky">{field.key}</span>
      <span className="flex items-baseline gap-2 font-mono text-[12px] text-white/90">
        <span className="min-w-0 break-words">{field.value}</span>
        <span
          aria-hidden="true"
          className={cn(
            'ml-auto shrink-0 text-[11px]',
            field.status === 'ok' ? 'text-sticker-green' : 'text-sticker-orange',
          )}
        >
          {field.status === 'ok' ? '●' : '▲'}
        </span>
      </span>
    </motion.li>
  )
}

export function ParseSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 26 })

  // The document doesn't vanish — it steps back, so the reader can still see
  // what the record was built from.
  const docOpacity = useTransform(p, [0.62, 0.9], [1, 0.32])
  const docScale = useTransform(p, [0.62, 0.9], [1, 0.94])
  const docX = useTransform(p, [0.62, 0.9], ['0%', '-4%'])
  const highlightOpacity = useTransform(p, [0.3, 0.42, 0.88, 0.96], [0, 1, 1, 0.5])
  const recordOpacity = useTransform(p, [0.58, 0.68], [0, 1])
  const captionOpacity = useTransform(p, [0, 0.12, 0.28], [1, 1, 0])
  const captionY = useTransform(p, [0.12, 0.28], [0, -12])

  // Veo dropped the lattice from the generated clouds entirely, which turned
  // out to be the better outcome: drawn in code it resolves *with* the scrub
  // instead of looping on its own clock, it uses --color-sky exactly rather
  // than whatever the model rendered, and it rhymes with the lab-dots motif
  // already in index.css. It tightens into alignment as the parse advances —
  // the measuring grid finding its registration.
  const latticeOpacity = useTransform(p, [0.12, 0.45, 0.92], [0, 0.5, 0.28])
  const latticeScale = useTransform(p, [0.12, 0.6], [1.18, 1])

  return (
    <section
      id="parse"
      ref={sectionRef}
      aria-labelledby="parse-heading"
      // Height and pinning are driven from JS, not motion-reduce: variants.
      // motion-reduce: and lg: are both media queries at equal specificity, so
      // the winner would depend on CSS emission order rather than intent.
      className={cn(
        'relative bg-night text-white',
        !reduce && 'lg:h-[260vh]',
      )}
    >
      <div
        className={cn(
          'flex items-center overflow-hidden py-16 lg:py-0',
          reduce ? 'static' : 'sticky top-0 min-h-screen',
        )}
      >
        {/* Atmosphere sits inside the pinned layer, not the section, or it
            would scroll away the moment the pin engages. */}
        <MediaBackdrop
          src="parse-atmosphere"
          video="parse-lattice"
          scrim={0.5}
          scrimColor="night"
          scrimDirection="flat"
        />
        <motion.div
          aria-hidden="true"
          // Hidden entirely under reduced motion. The still that replaces the
          // video (parse-atmosphere) already has a lattice baked into it, so
          // drawing this one too would overlay two grids at different pitches.
          // The drawn grid exists to *resolve* with the scrub; with no scrub
          // it has no job to do.
          style={
            reduce
              ? { opacity: 0 }
              : { opacity: latticeOpacity, scale: latticeScale }
          }
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--color-sticker-sky) 1px, transparent 1px), linear-gradient(to bottom, var(--color-sticker-sky) 1px, transparent 1px)',
              backgroundSize: 'clamp(90px, 11vw, 150px) clamp(90px, 11vw, 150px)',
              maskImage:
                'radial-gradient(ellipse at center, black 20%, transparent 78%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at center, black 20%, transparent 78%)',
            }}
          />
        </motion.div>

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <header className="mb-8 max-w-2xl lg:mb-10">
            <h2
              id="parse-heading"
              className="text-display-2 text-white"
            >
              You wrote a document.
              <br />
              <span className="text-sticker-sky">It reads a record.</span>
            </h2>
            <motion.p
              style={reduce ? undefined : { opacity: captionOpacity, y: captionY }}
              className="measure mt-4 text-body-md text-white/70"
            >
              Before a recruiter sees your resume, software flattens it into
              fields. Anything it can&rsquo;t place, it drops. Keep scrolling to
              watch it happen.
            </motion.p>
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            {/* ── Human view ─────────────────────────────────────── */}
            <motion.div
              style={
                reduce
                  ? undefined
                  : { opacity: docOpacity, scale: docScale, x: docX }
              }
              className="origin-left rounded-lg bg-white p-6 text-ink elev-raised sm:p-8"
            >
              <p className="sr-only">
                A sample resume, shown as a person reads it.
              </p>
              <div className="space-y-[3px]">
                {RESUME_LINES.map((line, i) => (
                  <div key={i} className="relative">
                    {line.text === '' ? (
                      <div className="h-3" />
                    ) : (
                      <>
                        {/* The field box sits behind the text, so the words
                            stay fully legible while they're being claimed. */}
                        {line.field && (
                          <motion.span
                            aria-hidden="true"
                            style={
                              reduce ? undefined : { opacity: highlightOpacity }
                            }
                            className="absolute -inset-x-1.5 -inset-y-0.5 z-0 rounded-xs bg-sticker-sky/25 ring-1 ring-sticker-sky/50"
                          />
                        )}
                        <span
                          className={cn(
                            'relative z-10 text-[13px] leading-relaxed',
                            line.bold
                              ? 'font-bold tracking-tight text-ink'
                              : 'text-ink-soft',
                          )}
                        >
                          {line.text}
                        </span>
                        {line.field && (
                          <motion.span
                            aria-hidden="true"
                            style={
                              reduce ? undefined : { opacity: highlightOpacity }
                            }
                            className="pointer-events-none absolute -top-2.5 right-0 rounded-xs bg-night px-1.5 py-0.5 font-mono text-[10px] tracking-[0.02em] text-sticker-sky"
                          >
                            {line.field}
                          </motion.span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Machine view ───────────────────────────────────── */}
            <motion.div
              style={reduce ? undefined : { opacity: recordOpacity }}
              className="glass-dark rounded-lg p-5 sm:p-6"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
                <span className="font-mono text-[11px] text-white/60">
                  parsed_record.json
                </span>
                <span className="font-mono text-[11px] text-sticker-orange">
                  2 gaps
                </span>
              </div>
              <ul>
                {PARSED_FIELDS.map((f, i) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    index={i}
                    progress={p}
                    reduce={reduce}
                  />
                ))}
              </ul>
              <p className="mt-4 text-body-sm text-white/70">
                Four skills matched against twelve the job asked for. That single
                number is what most filters rank on.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
