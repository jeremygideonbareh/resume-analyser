import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
} from 'motion/react'
import { useRef } from 'react'

/**
 * MagneticButton — primary CTA that translates toward the cursor with a spring.
 * Respects prefers-reduced-motion → static.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
  ...props
}: HTMLMotionProps<'button'> & { strength?: number }) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.5 })

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (reduce || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }

  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      className={className}
      style={reduce ? undefined : { x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      {...props}
    >
      {children}
    </motion.button>
  )
}