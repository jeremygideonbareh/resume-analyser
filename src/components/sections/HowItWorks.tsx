import { SectionReveal, StaggeredReveal } from '@/components/motion/SectionReveal'
import { KineticTextReveal } from '@/components/ui/kinetic-text-reveal'

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Drag in a PDF, DOCX, or TXT resume — or paste the text directly. It never leaves your browser.',
  },
  {
    n: '02',
    title: 'Analyse',
    body: 'Our rule-based engine scores structure, keywords, formatting, recency, and contact info.',
  },
  {
    n: '03',
    title: 'Improve',
    body: 'Get a category breakdown, detected sections, and actionable feedback to raise your score.',
  },
]

/**
 * HowItWorks — three editorial steps: Upload → Analyse → Improve.
 * Oversized mono numerals behind, accent top rule, mono step labels.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionReveal>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            How it works
          </p>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            <KineticTextReveal
              text="Three steps to a "
              splitBy="words"
              direction="up"
              distance={24}
              stagger={0.06}
              blur
              className="text-ink"
              segmentClassName="text-ink"
            />
            <em className="font-normal italic text-accent">
              <KineticTextReveal
                text="better"
                splitBy="words"
                direction="up"
                distance={24}
                stagger={0.06}
                delay={0.36}
                blur
                className="text-accent"
                segmentClassName="text-accent"
              />
            </em>
            <KineticTextReveal
              text=" resume."
              splitBy="words"
              direction="up"
              distance={24}
              stagger={0.06}
              delay={0.36}
              blur
              className="text-ink"
              segmentClassName="text-ink"
            />
          </h2>
        </SectionReveal>
        <StaggeredReveal className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="relative overflow-hidden rounded-xl border border-ink/10 bg-paper p-6 pt-7"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-4 select-none font-mono text-6xl font-medium text-ink/10"
              >
                {step.n}
              </span>
              <span className="relative font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                Step {step.n}
              </span>
              <div className="mt-4 border-t-2 border-accent/70 pt-4">
                <h3 className="text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </StaggeredReveal>
      </div>
    </section>
  )
}
