import { type ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps {
  children: ReactNode
  variant?: Variant
  to?: string
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  magnetic?: boolean
  disabled?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-cream hover:bg-sage-700',
  secondary: 'bg-transparent text-ink border border-ink/30 hover:border-ink',
  ghost: 'bg-clay-500 text-cream hover:bg-clay-600',
}

export function Button({
  children,
  variant = 'primary',
  to,
  href,
  onClick,
  type = 'button',
  className = '',
  magnetic = true,
  disabled = false,
}: ButtonProps) {
  const ref = useRef<HTMLElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 })

  function handleMouseMove(e: React.MouseEvent) {
    if (!magnetic || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const relX = e.clientX - rect.left - rect.width / 2
    const relY = e.clientY - rect.top - rect.height / 2
    x.set(relX * 0.25)
    y.set(relY * 0.4)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const classes = `inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`

  const content = (
    <motion.span
      style={{ x: springX, y: springY }}
      className="inline-flex items-center gap-2"
    >
      {children}
    </motion.span>
  )

  const sharedProps = {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    className: classes,
  }

  if (to) {
    return (
      <Link to={to} ref={ref as React.Ref<HTMLAnchorElement>} {...sharedProps}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} ref={ref as React.Ref<HTMLAnchorElement>} {...sharedProps}>
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...sharedProps}
    >
      {content}
    </button>
  )
}
