import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const VIDEO_SRC =
  'https://res.cloudinary.com/dsuwzuaxp/video/upload/video1_horxtt.mp4'

/** Layered interwoven hero word — passes behind or in front of the central image via z-index. */
function LayeredWord({
  word,
  className,
}: {
  word: string
  className: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none font-display font-semibold leading-none tracking-[-0.03em]',
        className,
      )}
    >
      {word}
    </span>
  )
}

/**
 * Hero — interwoven "depth" layout: large typography passes behind and in
 * front of a central image to create a layered 3D effect.
 *
 *   z-5   → RESUME (top-left) + LAB (bottom-right) run behind the image.
 *   z-10  → the central video card is the anchor.
 *   z-20  → ANALYSE (middle-right) renders clearly on top of the image.
 *   z-30  → badge widget (left-center) + floating CTA (bottom-right).
 *
 * No scroll pin/scrub — words are static layered type.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden border-b border-ink/10"
    >
      <div aria-hidden className="lab-dots absolute inset-0 -z-10" />
      <div aria-hidden className="scanline" />

      {/* Background words — behind the image */}
      <LayeredWord
        word="RESUME"
        className="left-4 top-16 z-[5] text-[clamp(2.5rem,6vw,5rem)] text-ink sm:left-10"
      />
      <LayeredWord
        word="LAB"
        className="bottom-16 right-4 z-[5] text-[clamp(2.5rem,6vw,5rem)] text-ink sm:right-10"
      />

      {/* Central image — the anchor */}
      <div className="relative z-10 aspect-video w-[min(74vw,52rem)] overflow-hidden rounded-2xl bg-ink shadow-2xl">
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
      </div>

      {/* Foreground word — in front of the image */}
      <LayeredWord
        word="ANALYSE"
        className="-right-[0.15em] top-1/2 z-20 -translate-y-1/2 text-[clamp(3rem,8vw,7rem)] text-paper drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
      />

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
    </section>
  )
}
