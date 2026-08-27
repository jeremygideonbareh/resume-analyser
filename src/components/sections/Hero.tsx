import { useRef } from 'react'
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'motion/react'
import { cn } from '@/lib/utils'

const VIDEO_SRC =
  'https://res.cloudinary.com/dsuwzuaxp/video/upload/video1_horxtt.mp4'

/** Layered interwoven hero word — passes behind or in front of the central image via z-index. */
function LayeredWord({
  word,
  className,
  style,
}: {
  word: string
  className: string
  style?: MotionStyle
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none font-display font-semibold leading-none tracking-[-0.03em]',
        className,
      )}
      style={style}
    >
      {word}
    </motion.span>
  )
}

/**
 * Hero — interwoven "depth" layout: large typography passes behind and in
 * front of a central image to create a layered 3D effect, with a subtle
 * scroll-driven scrub (video grows, words recede as you scroll past).
 *
 *   z-5   → RESUME (top-left) + LAB (bottom-right) run behind the image.
 *   z-10  → the central video card is the anchor.
 *   z-20  → ANALYSE (middle-right) renders clearly on top of the image.
 *   z-30  → badge widget (left-center) + floating CTA (bottom-right).
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 22 })

  const videoScale = useTransform(p, [0, 0.6], [0.86, 1])
  const videoRadius = useTransform(p, [0, 0.6], ['clamp(1rem,3vw,1.75rem)', 'clamp(0.5rem,1.5vw,0.875rem)'])
  const wordOpacity = useTransform(p, [0, 0.7], [1, 0])
  const wordY = useTransform(p, [0, 0.7], [0, -50])

  const backgroundStyle = {
    opacity: wordOpacity,
    y: useTransform(wordY, (v) => v * 0.6),
  }
  const foregroundStyle: { opacity: MotionValue<number>; y: MotionValue<number> } = {
    opacity: wordOpacity,
    y: wordY,
  }

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative h-[170vh] border-b border-ink/10"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div aria-hidden className="lab-dots absolute inset-0 -z-10" />
        <div aria-hidden className="scanline" />

        {/* Centered wrapper — locks the words + image together on every screen width */}
        <div className="relative mx-auto w-[min(74vw,52rem)]">
          {/* Background word — behind the image, tucked under its top-left corner */}
          <LayeredWord
            word="RESUME"
            className="left-[-2.5rem] top-[-3rem] z-[5] text-[clamp(2.5rem,6vw,5rem)] text-ink"
            style={backgroundStyle}
          />
          {/* Background word — behind the image, tucked under its bottom-right corner */}
          <LayeredWord
            word="LAB"
            className="bottom-[-3rem] right-[-2.5rem] z-[5] text-[clamp(2.5rem,6vw,5rem)] text-ink"
            style={backgroundStyle}
          />

          {/* Central image — the anchor */}
          <motion.div
            className="relative z-10 aspect-video w-full overflow-hidden bg-ink shadow-2xl"
            style={{ scale: videoScale, borderRadius: videoRadius }}
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
            <div aria-hidden className="absolute inset-0 bg-ink/20" />
          </motion.div>

          {/* Foreground word — in front of the image, cutting across its right side */}
          <LayeredWord
            word="ANALYSE"
            className="right-[-3rem] top-[38%] z-20 text-[clamp(3rem,8vw,7rem)] text-paper drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
            style={foregroundStyle}
          />
        </div>

        {/* Left-center widget — badge */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
          className="absolute left-4 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2 rounded-full border border-ink/15 bg-paper/80 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft backdrop-blur sm:inline-flex"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          ATS Resume Analyser — 100% in-browser
        </motion.p>

        {/* Bottom-right floating action — CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
          className="absolute bottom-6 right-4 z-30 flex flex-wrap items-center gap-3 sm:right-6"
        >
          <a
            href="#how-it-works"
            className="text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            How it works
          </a>
          <a
            href="#tool"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-accent-strong"
          >
            Analyse my resume
          </a>
        </motion.div>
      </div>
    </section>
  )
}
