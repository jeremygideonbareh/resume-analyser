import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * Hero — the document, whole.
 *
 * This is the first half of the page's one argument, and it only works because
 * ParseSection takes the *same* object apart a screen later: here the resume is
 * yours, intact and legible; there it is a record with gaps. The repetition is
 * the device, not an accident — so the two must stay visually linked (same
 * paper, same lines) while reading completely differently.
 *
 * Replaces the previous stock-video + layered-wordmark treatment. That hero was
 * handsome but said "RESUME ANALYSE LAB" over footage of nothing in particular;
 * it set up no argument for the sections beneath it, and its aesthetic lane
 * (heavy display words over video) fought the quiet paper register everywhere
 * else on the page.
 *
 * The scroll here is a hand-off, not an effect: the sheet lifts and squares up
 * as you approach the parse band, so the object you are about to watch being
 * dismantled is the object you were just looking at.
 */

const RESUME_PREVIEW = [
  { w: '46%', strong: true },
  { w: '68%' },
  { w: '0' },
  { w: '28%', label: true },
  { w: '84%' },
  { w: '72%' },
  { w: '0' },
  { w: '32%', label: true },
  { w: '88%' },
  { w: '76%' },
  { w: '58%' },
  { w: '0' },
  { w: '24%', label: true },
  { w: '80%' },
]

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 24 })

  // Squares up and lifts as the parse band approaches.
  const sheetRotate = useTransform(p, [0, 0.8], [-2.5, 0])
  const sheetY = useTransform(p, [0, 0.8], [0, -40])
  const sheetScale = useTransform(p, [0, 0.8], [1, 1.04])

  const sheetStyle = reduce
    ? undefined
    : { rotate: sheetRotate, y: sheetY, scale: sheetScale }

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-hairline"
    >
      {/* Paper, lit from the side, with the light slowly travelling across it —
          the scan, expressed as daylight rather than a sci-fi laser line. The
          scrim is directional: dense under the headline column on the left,
          nearly clear on the right where the sheet floats, so the texture stays
          at full strength in the half of the frame the eye actually rests on.
          A flat scrim heavy enough to protect the type would wash the image
          back into the blankness this is here to fix. */}
      <MediaBackdrop
        src="hero-paper"
        video="hero-light-sweep"
        scrim={0.9}
        scrimDirection="left"
        eager
      />
      <div aria-hidden="true" className="lab-dots absolute inset-0 opacity-60" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:py-32">
        <div>
          <h1 id="hero-heading" className="text-display-1 text-ink">
            Know your score
            <br />
            <span className="text-link">before they do.</span>
          </h1>

          <p className="measure mt-6 text-body-md text-ink-soft">
            Employers screen resumes with software before a person opens one.
            ResumeLab runs the same weighted checks &mdash; keywords, structure,
            formatting, recency &mdash; and tells you exactly what to change.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="#tool"
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-[16px] font-medium text-surface transition-colors hover:bg-accent-strong"
            >
              Score my resume
            </a>
            <a
              href="#parse"
              className="text-[16px] font-medium text-link underline-offset-4 hover:underline"
            >
              See what the filter sees
            </a>
          </div>

          {/* ink-soft, not muted, and 13px rather than 12. Over flat canvas
              muted clears 6.0:1, but measured against the darkest paper fibres
              under the scrim it falls to 3.44:1 — below AA. This is the line
              carrying the privacy promise, so it is the last one that should
              be hard to read. */}
          <p className="mt-8 font-mono text-[13px] text-ink-soft">
            Runs in your browser · Nothing uploaded · No account needed to score
          </p>
        </div>

        {/* The sheet — the same object ParseSection pulls apart. */}
        <motion.div
          style={sheetStyle}
          className="relative mx-auto w-full max-w-sm rounded-lg bg-surface p-7 elev-raised sm:p-9"
        >
          <p className="sr-only">
            An illustration of a resume page, shown whole before analysis.
          </p>
          <div aria-hidden="true" className="space-y-2.5">
            {RESUME_PREVIEW.map((line, i) =>
              line.w === '0' ? (
                <div key={i} className="h-4" />
              ) : (
                <div
                  key={i}
                  style={{ width: line.w }}
                  className={
                    line.strong
                      ? 'h-3.5 rounded-xs bg-ink'
                      : line.label
                        ? 'h-2 rounded-xs bg-ink/45'
                        : 'h-2 rounded-xs bg-ink/15'
                  }
                />
              ),
            )}
          </div>

          {/* Unscored on purpose: the number is what the page is offering,
              not something to hand over in the first screenful. */}
          <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
            <span className="font-mono text-[12px] text-muted">ATS score</span>
            <span className="font-mono text-[13px] text-ink-faint">
              not yet scored
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
