import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Translations } from '@/lib/i18n/translations'

export type Locale = 'fr' | 'ar'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  dir: 'ltr' | 'rtl'
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'forever-locale'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'ar' ? 'ar' : 'fr'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  function setLocale(next: Locale) {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, dir, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
