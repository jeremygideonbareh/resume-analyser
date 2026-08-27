import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { KineticTextReveal } from '@/components/ui/kinetic-text-reveal'
import { cn } from '@/lib/utils'

/**
 * Hero — ResumeLab's "Aalto scroll-expand kinetic" landing, ported from the
 * StudentHub WorkPageHero (jeremygideonbareh/webcmd-hackathon-studenthub).
 *
 * GSAP ScrollTrigger is intentionally NOT used — this repo's convention is
 * `motion/react` (gsap/framer-motion are banned). The scroll-expand effect is
 * recreated with `useScroll` + `useSpring` + `useTransform`:
 *   - the section is ~2.4 screens tall, the inner layer is sticky (pinned);
 *   - a centered video "pill" scales to fullscreen as you scroll (scrubbed);
 *   - kinetic headline words (RESUME / LAB / ANALYSE / byline) blur out as
 *     the pill expands.
 * prefers-reduced-motion → a static, single-screen hero with no pin/scrub.
 */
const VIDEO_SRC =
  'https://res.cloudinary.com/dsuwzuaxp/video/upload/video1_horxtt.mp4'

const KINETIC_WORDS: Array<{ word: string; className: string }> = [
  { word: 'RESUME', className: 'left-6 top-16 text-[clamp(4rem,14vw,11rem)] sm:left-12' },
  { word: 'ANALYSE', className: 'right-4 bottom-16 text-[clamp(4rem,14vw,11rem)] sm:right-8' },
  { word: 'LAB', className: 'left-6 bottom-24 text-[clamp(5rem,16vw,13rem)] sm:left-12' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/** Kinetic headline word — blurs + translates up as the scroll progress grows. */
function KineticHeadlineWord({
  word,
  className,
  opacity,
  blur,
  y,
}: {
  word: string
  className: string
  opacity: MotionValue<number>
  blur: MotionValue<string>
  y: MotionValue<number>
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none font-display font-semibold leading-none tracking-[-0.03em] text-ink',
        className,
      )}
      style={{ opacity, filter: blur, y }}
    >
      {word}
    </motion.span>
  )
}

/** Static hero — used when the user prefers reduced motion. */
function StaticHero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-ink/10"
    >
      <div aria-hidden className="lab-dots absolute inset-0 -z-10" />
      <div aria-hidden className="scanline" />
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-accent"
          />
          ATS Resume Analyser — 100% in-browser
        </p>
        <h1 className="max-w-3xl text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink">
          <KineticTextReveal
            text="Know your score "
            splitBy="words"
            direction="up"
            distance={24}
            stagger={0.06}
            blur
            className="text-ink"
            segmentClassName="text-ink"
            aria-label="Know your score"
          />
          <em className="font-normal italic text-accent">
            <KineticTextReveal
              text="before the robots do."
              splitBy="words"
              direction="up"
              distance={24}
              stagger={0.06}
              delay={0.36}
              blur
              className="text-accent"
              segmentClassName="text-accent"
              aria-label="before the robots do."
            />
          </em>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Upload your resume and get an instant ATS score with a category
          breakdown, detected sections, and actionable feedback — all in your
          browser. Files never leave your browser. Sign in to save results
          to your account.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <MagneticButton
            onClick={() => scrollToId('tool')}
            className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-accent-strong"
          >
            Analyse my resume
          </MagneticButton>
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            How it works
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </div>
        <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <div>PDF · DOCX · TXT</div>
          <div>≤ 5 MB</div>
          <div>100% local parse</div>
        </dl>
      </div>
    </section>
  )
}

/** Kinetic hero — pinned scroll-scrubbed video "pill" + headline words. */
export function Hero() {
  const reduce = useReducedMotion()

  if (reduce) return <StaticHero />

  return <KineticHero />
}

function KineticHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 60, damping: 20 })

  // Headline words fade/blur out over the first ~30% of scroll.
  const wordOpacity = useTransform(p, [0.05, 0.35], [1, 0])
  const wordBlur = useTransform(p, [0.05, 0.35], ['blur(0px)', 'blur(14px)'])
  const wordY = useTransform(p, [0.05, 0.35], [0, -60])

  // The byline/copy first rises slightly, then fades as the pill expands.
  const contentOpacity = useTransform(p, [0, 0.22], [1, 0])
  const contentY = useTransform(p, [0, 0.22], [0, -40])

  // Video pill scales from a small framed card into fullscreen.
  const videoScale = useTransform(p, [0.3, 0.6], [0.62, 1])
  const videoRadius = useTransform(
    p,
    [0.3, 0.6],
    ['clamp(2rem,6vw,3rem)', '0px'],
  )
  const videoOpacity = useTransform(p, [0.28, 0.34], [0.92, 1])
  const dim = useTransform(p, [0.3, 0.75], [0.15, 0.62])

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative h-[260vh] border-b border-ink/10"
    >
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* Backdrop motifs */}
        <div aria-hidden className="lab-dots absolute inset-0 -z-10" />
        <div aria-hidden className="scanline" />

        {/* Expanding video layer (pinned) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            aria-hidden="true"
            className="relative h-[46vh] w-[72vw] overflow-hidden bg-ink shadow-xl"
            style={{ scale: videoScale, borderRadius: videoRadius, opacity: videoOpacity }}
          >
            <video
              className="h-full w-full object-cover"
              src={VIDEO_SRC}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-ink"
              style={{ opacity: dim }}
            />
          </motion.div>
        </div>

        {/* Kinetic headline words */}
        {KINETIC_WORDS.map((w) => (
          <KineticHeadlineWord
            key={w.word}
            word={w.word}
            className={w.className}
            opacity={wordOpacity}
            blur={wordBlur}
            y={wordY}
          />
        ))}

        {/* Copy overlay (badge, headline, CTAs) — fades as the pill expands */}
        <motion.div
          className="pointer-events-none relative z-10 mx-auto flex max-w-6xl flex-1 flex-col justify-center px-4 sm:px-6"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-ink/15 bg-paper/80 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft backdrop-blur">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            ATS Resume Analyser — 100% in-browser
          </p>
          <h1 className="max-w-3xl text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink">
            <KineticTextReveal
              text="Know your score "
              splitBy="words"
              direction="up"
              distance={24}
              stagger={0.06}
              blur
              className="text-ink"
              segmentClassName="text-ink"
              aria-label="Know your score"
            />
            <em className="font-normal italic text-accent">
              <KineticTextReveal
                text="before the robots do."
                splitBy="words"
                direction="up"
                distance={24}
                stagger={0.06}
                delay={0.36}
                blur
                className="text-accent"
                segmentClassName="text-accent"
                aria-label="before the robots do."
              />
            </em>
          </h1>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft"
          style={{ opacity: useTransform(p, [0, 0.15], [1, 0]) }}
        >
          Scroll
        </motion.div>
      </div>
    </section>
  )
}
