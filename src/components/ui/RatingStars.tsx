interface RatingStarsProps {
  rating: number
  count?: number
  className?: string
}

export function RatingStars({ rating, count, className = '' }: RatingStarsProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.round(rating)
          return (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className={`h-3.5 w-3.5 ${filled ? 'fill-clay-500' : 'fill-stone-dark'}`}
            >
              <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
            </svg>
          )
        })}
      </div>
      {count !== undefined && <span className="text-xs text-ink/60">({count})</span>}
    </div>
  )
}
