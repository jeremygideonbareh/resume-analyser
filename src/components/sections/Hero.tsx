import { SectionReveal } from '@/components/motion/SectionReveal'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { KineticTextReveal } from '@/components/ui/kinetic-text-reveal'

/**
 * Hero — ResumeLab pitch with the "robots' grid" signature moment:
 * a dotted field ripples open on load + a slow emerald scanline.
 * Editorial composition (badge pill → headline → subcopy → CTAs → mono meta row),
 * restyled from the 21st.dev DarkGradientHero structure (larsen66).
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-ink/10"
    >
      {/* Signature motif — the grid the ATS parses */}
      <div aria-hidden className="lab-dots absolute inset-0 -z-10" />
      <div aria-hidden className="scanline" />

      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <SectionReveal>
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
            browser. Nothing is uploaded, nothing is stored.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <MagneticButton
              onClick={() =>
                document
                  .getElementById('tool')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-paper shadow-sm transition-colors hover:bg-accent-strong"
            >
              Analyse my resume
            </MagneticButton>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              How it works
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>
          <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <div>PDF · DOCX · TXT</div>
            <div>≤ 5 MB</div>
            <div>0 uploads · 0 cookies</div>
          </dl>
        </SectionReveal>
      </div>
    </section>
  )
}
