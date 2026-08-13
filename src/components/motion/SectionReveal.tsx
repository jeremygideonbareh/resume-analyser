import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef, type ReactNode } from 'react'

/**
 * SectionReveal — reveals children once when scrolled into view.
 * transform + opacity only (perf-safe), ease-out-expo curve.
 * Respects prefers-reduced-motion → renders instantly.
 */
export function SectionReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={
        reduce
          ? undefined
          : { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }
      }
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggeredReveal — reveals a list of children one after another.
 * Each child is wrapped in a motion.div with incremental delay.
 */
export function StaggeredReveal({
  children,
  stagger = 0.08,
  className,
}: {
  children: ReactNode[]
  stagger?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={
            reduce
              ? undefined
              : { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * stagger }
          }
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}