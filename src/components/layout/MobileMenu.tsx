import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale, setLocale } = useLanguage()

  const navLinks = [
    { to: '/', label: t.nav.home },
    { to: '/shop', label: t.nav.shop },
    { to: '/quiz', label: t.nav.quiz },
    { to: '/blog', label: t.nav.blog },
    { to: '/about', label: t.nav.about },
    { to: '/contact', label: t.nav.contact },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-[80%] max-w-sm flex-col bg-cream p-8 lg:hidden"
          >
            <div className="mb-12 flex items-center justify-between">
              <span className="font-display text-2xl font-semibold text-sage-700">FOREVER</span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.nav.closeMenu}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                >
                  <NavLink
                    to={link.to}
                    onClick={onClose}
                    className="font-display text-3xl font-bold text-ink"
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            <div className="mt-10 flex items-center gap-0.5 rounded-full border border-ink/10 p-0.5 text-xs font-semibold w-fit">
              <button
                type="button"
                onClick={() => setLocale('fr')}
                className={`rounded-full px-3 py-1.5 transition-colors ${locale === 'fr' ? 'bg-ink text-cream' : 'text-ink/50'}`}
              >
                Français
              </button>
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={`rounded-full px-3 py-1.5 transition-colors ${locale === 'ar' ? 'bg-ink text-cream' : 'text-ink/50'}`}
              >
                العربية
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
