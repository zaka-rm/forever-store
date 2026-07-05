import { useLanguage } from '@/lib/i18n/LanguageContext'

const iconClass = 'h-6 w-6 flex-none text-sage-600'

function Wallet() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14h2" strokeLinecap="round" />
    </svg>
  )
}
function Badge() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-1 2.5-2.7-.2L12 21l-2.2-1.6-2.7.2-1-2.5-2.3-1.4.7-2.6-.7-2.6 2.3-1.4 1-2.5 2.7.2z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Truck() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  )
}
function Shield() {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A reassurance row for cash-on-delivery shoppers (homepage + product pages). */
export function TrustStrip({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  const items = [
    { icon: <Wallet />, label: t.home.trust.cod },
    { icon: <Badge />, label: t.home.trust.authentic },
    { icon: <Truck />, label: t.home.trust.delivery },
    { icon: <Shield />, label: t.home.trust.guarantee },
  ]

  return (
    <div className={`border-y border-ink/10 bg-cream-dark ${className}`}>
      <div className="container-px mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 py-6 sm:grid-cols-4 sm:py-7">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {item.icon}
            <span className="text-sm font-medium leading-tight text-ink/80">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
