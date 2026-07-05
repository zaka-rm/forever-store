import { useId } from 'react'

type Tone = 'sage' | 'clay' | 'mixed' | 'ink'

const toneGlow: Record<Tone, [string, string]> = {
  sage: ['#9FD6C8', '#0E7C66'],
  clay: ['#E8B79A', '#C1663D'],
  mixed: ['#9FD6C8', '#E8B79A'],
  ink: ['#329E86', '#0A4A40'],
}

export function OrganicVisual({ tone = 'mixed', className = '' }: { tone?: Tone; className?: string }) {
  const [a, b] = toneGlow[tone]
  const gridId = useId()

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full opacity-25 blur-3xl"
        style={{ background: a }}
      />
      <div
        className="absolute -bottom-1/3 -right-1/3 h-2/3 w-2/3 rounded-full opacity-20 blur-3xl"
        style={{ background: b }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden="true">
        <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" className="text-cream/10" />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>
    </div>
  )
}
