import { useEffect, useState } from 'react'
import { fetchSiteSettings } from '@/lib/siteSettings'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// A short key derived from the text, so dismissing one promo doesn't hide the next.
function keyFor(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return `annBar:${h}`
}

export function AnnouncementBar() {
  const { locale } = useLanguage()
  const [text, setText] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let active = true
    fetchSiteSettings().then((s) => {
      if (!active || !s || !s.announcement_active) return
      const msg = (locale === 'ar' ? s.announcement_ar : s.announcement_fr)?.trim()
      if (!msg) return
      setText(msg)
      setDismissed(localStorage.getItem(keyFor(msg)) === '1')
    })
    return () => {
      active = false
    }
  }, [locale])

  if (!text || dismissed) return null

  function dismiss() {
    if (text) localStorage.setItem(keyFor(text), '1')
    setDismissed(true)
  }

  return (
    <div className="relative z-10 bg-sage-700 px-10 py-2 text-center text-xs font-medium text-cream sm:text-sm">
      {text}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute end-3 top-1/2 -translate-y-1/2 text-cream/70 hover:text-cream"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
