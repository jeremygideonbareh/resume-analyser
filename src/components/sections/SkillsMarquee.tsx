import { InfiniteSlider } from '@/components/motion/InfiniteSlider'
import { ProgressiveBlur } from '@/components/motion/ProgressiveBlur'
import { ScrollBasedVelocity } from '@/components/ui/scroll-based-velocity'

const SKILLS = [
  'React',
  'TypeScript',
  'SQL',
  'Python',
  'Java',
  'Go',
  'AWS',
  'Docker',
  'Kubernetes',
  'Node.js',
  'GraphQL',
  'Figma',
  'PostgreSQL',
  'CI/CD',
  'System Design',
  'Machine Learning',
  'Data Structures',
  'Agile',
  'REST APIs',
  'Microservices',
]

/**
 * SkillsMarquee — honest "what the analyser detects" strip under the hero.
 * Uses the InfiniteSlider + ProgressiveBlur primitives salvaged from
 * ibelick's hero-section-4 (21st.dev). No fake customer logos — this is
 * a new tool, so the marquee shows the skills lexicon instead.
 */
export function SkillsMarquee() {
  return (
    <section
      aria-label="Skills the analyser detects"
      className="border-b border-ink/10 bg-surface/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="mb-5 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Detects 200+ skills — including
        </p>
        <div className="relative">
          <InfiniteSlider duration={40} gap={40}>
            {SKILLS.map((skill) => (
              <span
                key={skill}
                className="whitespace-nowrap rounded-full border border-ink/15 bg-paper px-4 py-1.5 font-mono text-xs text-ink-soft"
              >
                {skill}
              </span>
            ))}
          </InfiniteSlider>
          <ProgressiveBlur
            className="pointer-events-none absolute left-0 top-0 h-full w-16"
            direction="left"
            blurIntensity={1}
          />
          <ProgressiveBlur
            className="pointer-events-none absolute right-0 top-0 h-full w-16"
            direction="right"
            blurIntensity={1}
          />
        </div>
        <div className="mt-8">
          <ScrollBasedVelocity
            text="ATS READY · PRIVACY FIRST · SCORE IT ·"
            default_velocity={5}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
          />
        </div>
      </div>
    </section>
  )
}