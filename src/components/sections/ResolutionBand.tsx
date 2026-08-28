import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * ResolutionBand — the seam between the machine's view and its consequence.
 *
 * The image runs solid black ink at the left, through grey halftone, to bare
 * paper fibre at the right. Sitting between the indigo parse band above and the
 * light verdict section below, that gradient does structural work: the page
 * appears to resolve out of the dark and back into paper. It is the one place
 * a full-bleed image earns its keep without any UI over it.
 *
 * Nothing is set on top of the photograph deliberately. Type over this much
 * texture would need a scrim heavy enough to destroy the detail that makes the
 * picture worth showing, so the line sits beneath it on clean canvas instead.
 */
export function ResolutionBand() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-12% 0px' })

  return (
    <section ref={ref} aria-labelledby="resolution-heading">
      <div className="relative h-[38vh] min-h-[240px] w-full overflow-hidden sm:h-[46vh]">
        <MediaBackdrop src="ink-dissolve" scrim={0} eager={false} />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={inView || reduce ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <h2 id="resolution-heading" className="text-h1 text-ink">
            Close enough, a word stops being a word.
          </h2>
          <p className="measure mt-3 text-body-md text-ink-soft">
            Printed ink at 200× is just marks on fibre — present or absent,
            matching or not. That is the resolution your application is read at,
            and it is the reason phrasing you would defend in an interview can
            still score zero.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
