import { useEffect, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * Hero — the machine's world, before you know where you stand.
 *
 * Dark on purpose, and it changes what dark means on this page. Previously the
 * indigo parse band was the single inversion in an otherwise light document.
 * Now the dark is the *machine's domain* and it recurs: the hero opens inside
 * it, every explanatory section is light and human, and the parse band is a
 * return rather than a one-off. Two dark moments that rhyme carry more than
 * one that simply interrupts.
 *
 * Parallax runs on two inputs at once, because either alone reads as a gimmick:
 *
 *   scroll  — the scene sinks and swells while the copy leaves faster, so the
 *             viewer feels depth as they move down the page
 *   pointer — every layer counter-translates by a different amount, which is
 *             what actually sells parallax on a desktop where the reader has
 *             not scrolled yet
 *
 * Layer rates are deliberately unequal (scene 1×, glow 2.2×, copy 3.4×,
 * foreground motes 5×). Equal rates would just slide the whole picture.
 *
 * Reduced motion disables both inputs outright — not damped, disabled. Parallax
 * is vestibular-triggering in a way a fade is not, and there is no version of
 * "gentle parallax" that is safe for someone who asked for none.
 */

/** Pointer position as -1..1 from centre, spring-smoothed. */
function usePointerParallax(enabled: boolean) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 60, damping: 20, mass: 0.6 })
  const y = useSpring(py, { stiffness: 60, damping: 20, mass: 0.6 })

  useEffect(() => {
    if (!enabled) return
    // Guarded rather than called directly: matchMedia is absent in jsdom and
    // in any non-browser render path, and an unguarded call takes the whole
    // hero down with a TypeError rather than merely losing the effect.
    if (typeof window.matchMedia !== 'function') return
    // Coarse pointers have no hover position to track, and listening for
    // pointermove on touch just fires during scroll.
    if (!window.matchMedia('(pointer: fine)').matches) return

    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1)
      py.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled, px, py])

  return { x, y }
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const animate = !reduce

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 26 })
  const pointer = usePointerParallax(animate)

  // Scroll rates — the copy leaves roughly three times faster than the scene.
  const sceneY = useTransform(p, [0, 1], ['0%', '14%'])
  const sceneScale = useTransform(p, [0, 1], [1.08, 1.18])
  const glowY = useTransform(p, [0, 1], ['0%', '26%'])
  const copyY = useTransform(p, [0, 1], ['0%', '-42%'])
  const copyOpacity = useTransform(p, [0, 0.55], [1, 0])
  const moteY = useTransform(p, [0, 1], ['0%', '-60%'])

  // Pointer rates, in px.
  const sceneMx = useTransform(pointer.x, [-1, 1], [16, -16])
  const sceneMy = useTransform(pointer.y, [-1, 1], [10, -10])
  const glowMx = useTransform(pointer.x, [-1, 1], [36, -36])
  const glowMy = useTransform(pointer.y, [-1, 1], [22, -22])
  const copyMx = useTransform(pointer.x, [-1, 1], [-14, 14])
  const moteMx = useTransform(pointer.x, [-1, 1], [-52, 52])
  const moteMy = useTransform(pointer.y, [-1, 1], [-30, 30])

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative flex min-h-[92vh] items-center overflow-hidden bg-night text-white"
    >
      {/* Layer 1 — the scene. Oversized so translation never exposes an edge. */}
      <motion.div
        aria-hidden="true"
        style={animate ? { y: sceneY, scale: sceneScale, x: sceneMx } : undefined}
        className="absolute -inset-[6%]"
      >
        <motion.div
          style={animate ? { y: sceneMy } : undefined}
          className="absolute inset-0"
        >
          {/* Scrim is directional and measured, not eyeballed: against the
              brightest backdrop pixel in the left half — where the copy
              actually sits — a flat 0.42 put body text at 2.65:1. This plate
              is already dark on the left by design, so the gradient mostly
              guards against the glow drifting during parallax.

              No video here on purpose. hero-scene-loop is built and available,
              but its figure and framing diverge from this still and the sheet
              burns rather than dissolving, so the poster would visibly jump on
              load and the claim would harden. Swap it in by adding
              video="hero-scene-loop" if that reads better in place. */}
          <MediaBackdrop
            src="hero-scene"
            scrim={0.85}
            scrimColor="night"
            scrimDirection="left"
            eager
          />
        </motion.div>
      </motion.div>

      {/* Layer 2 — the glow the subject casts. Pure CSS so it costs nothing
          and can be tinted from tokens rather than baked into the plate. */}
      <motion.div
        aria-hidden="true"
        style={animate ? { y: glowY, x: glowMx, translateY: glowMy } : undefined}
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute right-[6%] top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--color-sticker-sky) 42%, transparent) 0%, transparent 62%)',
          }}
        />
      </motion.div>

      {/* Layer 4 — foreground motes, fastest. Three fixed gradients rather than
          a particle system: at this scale and blur nobody can tell, and it
          costs no main-thread work. */}
      <motion.div
        aria-hidden="true"
        style={animate ? { y: moteY, x: moteMx, translateY: moteMy } : undefined}
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(2px 2px at 18% 32%, rgb(255 255 255 / 0.5), transparent 60%)',
              'radial-gradient(3px 3px at 72% 22%, rgb(160 205 247 / 0.45), transparent 60%)',
              'radial-gradient(2px 2px at 58% 74%, rgb(255 255 255 / 0.35), transparent 60%)',
              'radial-gradient(2.5px 2.5px at 33% 82%, rgb(160 205 247 / 0.4), transparent 60%)',
              'radial-gradient(2px 2px at 88% 61%, rgb(255 255 255 / 0.3), transparent 60%)',
            ].join(','),
          }}
        />
      </motion.div>

      {/* Layer 3 — the copy. */}
      <motion.div
        style={animate ? { y: copyY, opacity: copyOpacity, x: copyMx } : undefined}
        className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6"
      >
        <h1 id="hero-heading" className="text-display-1 max-w-2xl text-white">
          Know your score
          <br />
          <span className="font-normal italic text-white/70">
            before they do.
          </span>
        </h1>

        {/* Full-opacity white and capped at max-w-md, not the wider `measure`.
            At white/80 across the full measure this ran to 3.71:1 — the line
            extends far enough right to reach the glow's haze. Narrowing it
            keeps the paragraph inside the dark half rather than fighting the
            subject for the same pixels. */}
        <p className="mt-6 max-w-md text-body-md text-white">
          Employers screen resumes with software before a person opens one.
          ResumeLab runs the same weighted checks &mdash; keywords, structure,
          formatting, recency &mdash; and tells you exactly what to change.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#tool"
            className="inline-flex items-center rounded-full bg-surface px-6 py-3 text-[16px] font-medium text-ink transition-transform hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            Score my resume
          </a>
          <a
            href="#parse"
            className="glass-dark inline-flex items-center rounded-full px-6 py-3 text-[16px] font-medium text-white transition-colors hover:bg-white/10"
          >
            See what the filter sees
          </a>
        </div>
      </motion.div>

      {/* Bottom-left standing note, held out of the parallax so it stays put
          as an anchor while everything above it moves. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <p className="max-w-xs text-[13px] leading-relaxed text-white/80">
            Parsing runs entirely in your browser. Nothing is uploaded, and no
            account is needed to see your score.
          </p>
        </div>
      </div>
    </section>
  )
}
