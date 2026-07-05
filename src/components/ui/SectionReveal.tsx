import { type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

interface SectionRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  stagger?: number
  as?: 'div' | 'section'
  // Above-the-fold sections should reveal on mount, not on scroll — the
  // whileInView observer can miss during client-side page transitions.
  immediate?: boolean
}

const makeVariants = (y: number, stagger: number): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
    },
  },
})

export function SectionReveal({
  children,
  className = '',
  delay = 0,
  y = 24,
  stagger = 0.1,
  as = 'div',
  immediate = false,
}: SectionRevealProps) {
  const Component = motion[as]
  const revealProps = immediate
    ? { animate: 'visible' }
    : { whileInView: 'visible', viewport: { once: true, amount: 0.2 } }
  return (
    <Component
      initial="hidden"
      {...revealProps}
      variants={makeVariants(y, stagger)}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Component>
  )
}

export function RevealItem({
  children,
  className = '',
  y = 24,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
