import { useRef } from 'react'
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import { cn } from '@/lib/utils'

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
      {/* The numeral sits ON the rail, so it needs the section's own ground
          behind it or the drawn line runs straight through the disc. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full font-mono text-[13px] font-medium ring-4 ring-paper transition-colors duration-300 sm:h-[3.25rem] sm:w-[3.25rem] sm:text-[15px]',
          inView ? 'bg-accent text-surface' : 'bg-hairline text-muted',
        )}
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
  const railRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  // Mapped across the rail's own travel through the viewport, not the whole
  // section, so the line finishes at the last step rather than at the footer.
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ['start 75%', 'end 60%'],
  })
  const railScale = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1]),
    { stiffness: 90, damping: 30, restDelta: 0.001 },
  )

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

          <div ref={railRef} className="relative lg:pt-2">
            {/* Track + the line that draws along it. Scroll-linked rather than
                triggered: the rail fills exactly as far as the reader has got,
                so the progress they see IS their progress, not an animation
                that fires once and finishes without them. */}
            <span
              aria-hidden="true"
              className="absolute left-[1.125rem] top-10 bottom-14 w-px bg-hairline sm:left-[1.625rem]"
            />
            <motion.span
              aria-hidden="true"
              style={reduce ? { scaleY: 1 } : { scaleY: railScale }}
              className="absolute left-[1.125rem] top-10 bottom-14 w-px origin-top bg-accent sm:left-[1.625rem]"
            />
            <ol>
              {STEPS.map((step, i) => (
                <Step key={step.n} step={step} index={i} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
