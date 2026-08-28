import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { MediaBackdrop } from '@/components/media/MediaBackdrop'

/**
 * ResolutionBand — the seam between the machine's view and its consequence.
 *
 * The image runs solid black ink at the left, through grey halftone, to bare
 * paper fibre at the right. Sitting between the indigo parse band above and the
 * light verdict section below, that gradient does structural work: the page
 * appears to resolve out of the dark and back into paper.
 *
 * The copy used to sit beneath the photograph because type over that much
 * texture needed a scrim heavy enough to destroy the detail. A glass plate
 * solves it properly — it lightens and blurs only its own footprint, leaving
 * the rest of the image at full strength. This is the one place on the page
 * where glass is doing work no flat panel could.
 *
 * The plate is deliberately offset right, over the pale fibre half. Sitting it
 * left over the solid black would technically still pass contrast once the
 * glass lightens it, but the image's whole argument is the left-to-right
 * dissolve, and covering the ink end hides the half that carries the meaning.
 */
export function ResolutionBand() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-12% 0px' })

  return (
    <section
      ref={ref}
      aria-labelledby="resolution-heading"
      className="relative overflow-hidden"
    >
      <div className="relative min-h-[26rem] w-full sm:min-h-[32rem] lg:min-h-[36rem]">
        <MediaBackdrop src="ink-dissolve" scrim={0} eager={false} />

        <div className="relative mx-auto flex h-full max-w-6xl items-center px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={inView || reduce ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="glass ml-auto w-full max-w-lg rounded-xl p-7 sm:p-9"
          >
            <h2 id="resolution-heading" className="text-h1 text-ink">
              Close enough, a word stops being a word.
            </h2>
            <p className="mt-3 text-body-md text-ink-soft">
              Printed ink at 200× is just marks on fibre — present or absent,
              matching or not. That is the resolution your application is read
              at, and it is why phrasing you would defend in an interview can
              still score zero.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
