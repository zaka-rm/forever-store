import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCart } from '@/lib/cartContext'
import { useWishlist } from '@/lib/wishlistContext'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { useFeature } from '@/lib/featureFlags'

export function Header({ onMenuOpen, onSearchOpen }: { onMenuOpen: () => void; onSearchOpen: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const { count, openCart } = useCart()
  const { count: wishCount } = useWishlist()
  const { t, locale, setLocale } = useLanguage()

  const routinesEnabled = useFeature('routines')
  const navLinks = [
    { to: '/shop', label: t.nav.shop },
    ...(routinesEnabled ? [{ to: '/routines', label: t.nav.routines }] : []),
    { to: '/quiz', label: t.nav.quiz },
    { to: '/about', label: t.nav.about },
    { to: '/contact', label: t.nav.contact },
  ]

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-cream/90 shadow-card backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <AnnouncementBar />
      <div className="container-px mx-auto flex h-20 max-w-7xl items-center justify-between">
        <NavLink to="/" className="flex items-baseline gap-0.5 font-display text-2xl font-semibold tracking-tight text-sage-700">
          Naturaloé
        </NavLink>

        <nav className="hidden items-center gap-10 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium tracking-wide transition-colors ${
                  isActive ? 'text-ink' : 'text-ink/60 hover:text-ink'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center rounded-full border border-ink/10 p-0.5 text-xs font-semibold sm:flex">
            <button
              type="button"
              onClick={() => setLocale('fr')}
              className={`rounded-full px-2.5 py-1 transition-colors ${locale === 'fr' ? 'bg-ink text-cream' : 'text-ink/50 hover:text-ink'}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLocale('ar')}
              className={`rounded-full px-2.5 py-1 transition-colors ${locale === 'ar' ? 'bg-ink text-cream' : 'text-ink/50 hover:text-ink'}`}
            >
              ع
            </button>
          </div>

          <button
            type="button"
            onClick={onSearchOpen}
            aria-label={t.nav.search}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>

          <NavLink
            to="/favoris"
            aria-label={t.nav.openWishlist}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20.5s-7.5-4.6-9.6-9.3C1 8.1 2.3 5 5.4 4.2c2-.5 3.9.3 5 1.9l1.6 2.2 1.6-2.2c1.1-1.6 3-2.4 5-1.9 3.1.8 4.4 3.9 3 7-2.1 4.7-9.6 9.3-9.6 9.3Z" />
            </svg>
            {wishCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sage-600 text-[10px] font-medium text-white">
                {wishCount}
              </span>
            )}
          </NavLink>

          <button
            type="button"
            onClick={openCart}
            aria-label={t.nav.openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 7h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.4H8.5A1.5 1.5 0 0 1 7 19.5L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-clay-500 text-[10px] font-medium text-white"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            type="button"
            onClick={onMenuOpen}
            aria-label={t.nav.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-ink/5 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </motion.header>
  )
}
