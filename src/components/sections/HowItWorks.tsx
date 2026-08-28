import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/**
 * HowItWorks — the repair, after the diagnosis.
 *
 * Deliberately NOT three identical cards in a row. The previous version had a
 * mono-caps eyebrow, a ghost numeral behind each card, a coloured rule across
 * the top, and three same-sized boxes — four separate pieces of scaffolding
 * saying "this is a section" instead of saying anything.
 *
 * What's here instead: a sticky rail on the left holding the claim, and the
 * steps running down the right against a single continuous line. The numbers
 * stay because this genuinely is an ordered sequence and the order carries
 * information — not because sections are supposed to have numbers.
 */

const STEPS = [
  {
    n: 1,
    title: 'Hand over the file',
    body: 'PDF, DOCX, or pasted text. Parsing happens in your browser — the file is never uploaded, so there is nothing to leak and nothing to delete later.',
    aside: 'PDF · DOCX · TXT · up to 5MB',
  },
  {
    n: 2,
    title: 'Read it the way software does',
    body: 'The same weighted model an applicant tracking system applies: keyword match against the job description, section structure, formatting, recency, and contact fields.',
    aside: 'Keywords 45 · Structure 17 · Formatting 12',
  },
  {
    n: 3,
    title: 'Fix what actually moves the score',
    body: 'Per-line issues with the edit to make, ranked by how much each one is costing you. Not a list of everything wrong — a list of what to change first.',
    aside: 'Ranked by score impact',
  },
]

function Step({
  step,
  index,
}: {
  step: (typeof STEPS)[number]
  index: number
}) {
  const ref = useRef<HTMLLIElement>(null)
  const reduce = useReducedMotion()
  // Steps arrive as you reach them rather than all at once — the section is a
  // sequence, so the entrance should read as one too.
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' })

  return (
    <motion.li
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      className="relative pb-14 pl-14 last:pb-0 sm:pl-20"
    >
      {/* The through-line, drawn once and shared by every step. */}
      <span
        aria-hidden="true"
        className="absolute left-[1.125rem] top-10 h-[calc(100%-2rem)] w-px bg-hairline sm:left-[1.625rem]"
      />
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-accent font-mono text-[13px] font-medium text-surface sm:h-[3.25rem] sm:w-[3.25rem] sm:text-[15px]"
      >
        {step.n}
      </span>

      <h3 className="text-h3 text-ink">{step.title}</h3>
      <p className="measure mt-2 text-body-md text-ink-soft">{step.body}</p>
      <p className="mt-3 font-mono text-[12px] text-muted">{step.aside}</p>
    </motion.li>
  )
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-b border-hairline"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="how-heading" className="text-display-2 text-ink">
              Three passes,
              <br />
              <span className="text-link">about thirty seconds.</span>
            </h2>
            <p className="measure mt-4 text-body-md text-ink-soft">
              No account required to see your score, no file leaves the machine
              you are sitting at, and nothing is stored unless you ask for it.
            </p>
          </div>

          <ol className="lg:pt-2">
            {STEPS.map((step, i) => (
              <Step key={step.n} step={step} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
