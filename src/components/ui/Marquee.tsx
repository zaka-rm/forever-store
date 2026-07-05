import { type ReactNode } from 'react'

export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee gap-12 motion-reduce:animate-none">
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div className="flex shrink-0 items-center gap-12" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
