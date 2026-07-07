import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Proof {
  name: string
  city: string | null
  product: string | null
  created_at: string
}

export function SocialProof() {
  const { t, locale } = useLanguage()
  const [items, setItems] = useState<Proof[]>([])
  const [index, setIndex] = useState(0)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    supabase.rpc('recent_orders_public', { p_limit: 8 }).then(({ data, error }) => {
      if (!active || error || !Array.isArray(data)) return
      const valid = (data as Proof[]).filter((d) => d.name && d.product)
      if (valid.length) setItems(valid)
    })
    return () => {
      active = false
    }
  }, [])

  // Rotate: show one for ~5s, hide ~4s, then the next.
  useEffect(() => {
    if (items.length === 0 || dismissed) return
    let visibleT: ReturnType<typeof setTimeout>
    const first = setTimeout(() => setShow(true), 3000)
    const cycle = setInterval(() => {
      setShow(false)
      visibleT = setTimeout(() => {
        setIndex((i) => (i + 1) % items.length)
        setShow(true)
      }, 700)
    }, 9000)
    return () => {
      clearTimeout(first)
      clearTimeout(visibleT)
      clearInterval(cycle)
    }
  }, [items, dismissed])

  if (items.length === 0 || dismissed) return null
  const item = items[index]

  function relativeTime(iso: string) {
    const diffH = (Date.now() - new Date(iso).getTime()) / 3.6e6
    if (diffH < 1) return t.socialProof.recently
    if (diffH < 24) return `${Math.round(diffH)}h`
    return `${Math.round(diffH / 24)}j`
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 start-6 z-30 hidden max-w-[300px] items-center gap-3 rounded-2xl border border-ink/10 bg-cream px-4 py-3 shadow-soft sm:flex"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sage-100 text-lg">🛍️</span>
          <div className="min-w-0 text-xs leading-snug">
            <p className="text-ink">
              <span className="font-semibold">{item.name}</span>
              {item.city ? ` ${t.socialProof.connector} ${item.city}` : ''} {t.socialProof.action}{' '}
              <span className="font-medium">{item.product}</span>
            </p>
            <p className="mt-0.5 text-ink/40">{relativeTime(item.created_at)} · {locale === 'ar' ? 'موزّع Forever' : 'Forever'}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Fermer"
            className="flex-none self-start text-ink/30 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
