import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'

/**
 * Hero — fullscreen cinematic video with liquid-glass chrome.
 *
 * Built to the supplied spec, with three deliberate departures, each of which
 * would otherwise have broken something:
 *
 *   Video is self-hosted. The spec pointed at a CloudFront URL, and the app's
 *   CSP is `media-src 'self' https://res.cloudinary.com` — that plays in dev
 *   and is blocked on the live site, the failure mode with no local symptom.
 *   The 14.1MB source is transcoded to 796KB.
 *
 *   Instrument Serif is self-hosted too, for the same reason: `font-src 'self'
 *   data:` blocks a Google Fonts <link>, so the page would have fallen back to
 *   a system serif in production only.
 *
 *   Copy stays careerBoT's. The spec's wordmark and headline belong to a
 *   different product; "Where dreams rise through the silence" above a resume
 *   scorer reads as a template someone forgot to fill in. The *device* is what
 *   carries over — a short line with its second half dropped to muted for
 *   contrast — applied to what this product actually claims.
 *
 * Nav lives here rather than in the shared Header because it is chrome for
 * this surface: transparent, sitting on the video, and gone once you scroll.
 */

const NAV = [
  { label: 'Analyser', href: '#tool' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Sample report', href: '#sample' },
]

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 26 })
  // Kept from the previous hero: the footage drifts and the copy leaves
  // faster, so the section still has depth on scroll. The spec's entrance
  // animation handles arrival; this handles departure.
  const videoScale = useTransform(p, [0, 1], [1.04, 1.14])
  const copyY = useTransform(p, [0, 1], ['0%', '-34%'])
  const copyOpacity = useTransform(p, [0, 0.6], [1, 0])

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative isolate min-h-screen overflow-hidden bg-night"
    >
      {/* Layer 0 — the footage. Everything above reads against it. */}
      <motion.div
        aria-hidden="true"
        style={reduce ? undefined : { scale: videoScale }}
        className="absolute inset-0 z-0"
      >
        <video
          className="h-full w-full object-cover"
          poster={`${import.meta.env.BASE_URL}media/hero-cinematic-poster.webp`}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source
            src={`${import.meta.env.BASE_URL}media/hero-cinematic.webm`}
            type="video/webm"
          />
          <source
            src={`${import.meta.env.BASE_URL}media/hero-cinematic.mp4`}
            type="video/mp4"
          />
        </video>
        {/* The spec asked for no overlay. Over its own footage that was right;
            over this clip it is not. Measured across five frames, the middle of
            frame runs near-white, putting white headline text at 1.30:1 and the
            nav at 2.08:1.

            Shaped scrims were tried first and lost: an ellipse deep enough at
            its centre still failed at its own falloff, exactly where the
            headline's outer words sit. What the measurement actually demands is
            a fairly even ~0.53 across the copy area, so that is what this is —
            an even wash, slightly heavier top and bottom, with a gentle radial
            adding depth rather than doing the work. The footage still reads
            clearly through it; this is the treatment cinematic sites use over
            bright plates, not a compromise. */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 90% 70% at 50% 52%, rgb(0 0 0 / 0.16) 0%, rgb(0 0 0 / 0) 100%)',
              'linear-gradient(to bottom, rgb(0 0 0 / 0.58) 0%, rgb(0 0 0 / 0.50) 22%, rgb(0 0 0 / 0.50) 78%, rgb(0 0 0 / 0.52) 100%)',
            ].join(','),
          }}
        />
      </motion.div>

      {/* Navigation */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <a href="#top" className="tracking-tight text-white">
          <span
            className="text-3xl"
            style={{ fontFamily: 'var(--font-hero)' }}
          >
            careerBoT
            <sup className="text-xs">®</sup>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#tool"
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          Score my resume
        </a>
      </div>

      {/* Hero */}
      <motion.div
        style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
        className="relative z-10 flex flex-col items-center px-6 pb-40 pt-24 text-center sm:pt-32"
      >
        <h1
          id="hero-heading"
          className="animate-fade-rise max-w-5xl text-5xl font-normal leading-[0.95] tracking-[-2.46px] text-white sm:text-7xl md:text-8xl"
          style={{ fontFamily: 'var(--font-hero)' }}
        >
          Know your score{' '}
          <em className="not-italic text-white/60">
            before the software decides.
          </em>
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
          Employers screen resumes with software before a person opens one.
          careerBoT runs the same weighted checks &mdash; keywords, structure,
          formatting, recency &mdash; and tells you exactly what to change.
          Entirely in your browser.
        </p>

        <a
          href="#tool"
          className="liquid-glass animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-white transition-transform hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          Score my resume
        </a>

        <p className="animate-fade-rise-delay-2 mt-10 text-[13px] text-white/70">
          Nothing is uploaded &middot; No account needed to see your score
        </p>
      </motion.div>
    </section>
  )
}
