import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function OversizedType({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const x = useTransform(scrollYProgress, [0, 1], ['6%', '-6%'])
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.25, 1, 1, 0.25])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.p
        style={{ x, opacity }}
        className="select-none whitespace-nowrap font-display text-[16vw] font-extrabold leading-none text-ink sm:text-[14vw] lg:text-[10vw]"
      >
        {text}
      </motion.p>
    </div>
  )
}
