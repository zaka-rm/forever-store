import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { LiveChat } from '@/components/ui/LiveChat'
import { SocialProof } from '@/components/ui/SocialProof'
import { SearchOverlay } from '@/components/ui/SearchOverlay'
import { AppRoutes } from '@/router'
import { useLenis, scrollToTop } from '@/lib/useLenis'
import { initAnalytics, trackPageView } from '@/lib/analytics'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    scrollToTop()
    trackPageView(pathname)
  }, [pathname])
  return null
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  useLenis()

  // Load analytics once (does nothing until the IDs are set in .env).
  useEffect(() => {
    initAnalytics()
  }, [])

  // The admin panel is a standalone tool — render it without the storefront chrome.
  if (pathname.startsWith('/admin')) {
    return (
      <>
        <ScrollToTop />
        <AppRoutes />
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header onMenuOpen={() => setMenuOpen(true)} onSearchOpen={() => setSearchOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <Footer />
      <LiveChat />
      <WhatsAppButton />
      <SocialProof />
    </div>
  )
}
