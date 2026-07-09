import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

// A short two-tone chime via Web Audio (no audio file needed). Silently no-ops
// if the browser blocks audio before a user interaction.
function playNewOrderChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const g = ctx.createGain()
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 880
    o1.connect(g)
    o1.start()
    o1.stop(ctx.currentTime + 0.3)
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = 1320
    o2.connect(g)
    o2.start(ctx.currentTime + 0.16)
    o2.stop(ctx.currentTime + 0.6)
  } catch {
    /* audio blocked — the visual badge + title still alert the admin */
  }
}
import { DashboardPanel } from '@/pages/admin/DashboardPanel'
import { ProductsPanel } from '@/pages/admin/ProductsPanel'
import { OrdersPanel } from '@/pages/admin/OrdersPanel'
import { MessagesPanel } from '@/pages/admin/MessagesPanel'
import { ReviewsPanel } from '@/pages/admin/ReviewsPanel'
import { DiscountsPanel } from '@/pages/admin/DiscountsPanel'
import { GrowthPanel } from '@/pages/admin/GrowthPanel'
import { CustomersPanel } from '@/pages/admin/CustomersPanel'
import { BlogPanel } from '@/pages/admin/BlogPanel'
import { SettingsPanel } from '@/pages/admin/SettingsPanel'

type Tab = 'dashboard' | 'products' | 'orders' | 'customers' | 'messages' | 'reviews' | 'discounts' | 'growth' | 'blog' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'products', label: 'Produits' },
  { key: 'orders', label: 'Commandes' },
  { key: 'customers', label: 'Clients' },
  { key: 'discounts', label: 'Codes promo' },
  { key: 'growth', label: 'Croissance' },
  { key: 'blog', label: 'Blog' },
  { key: 'messages', label: 'Messages' },
  { key: 'reviews', label: 'Avis' },
  { key: 'settings', label: 'Réglages' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [newOrders, setNewOrders] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)
  const knownCount = useRef<number | null>(null)

  useEffect(() => {
    document.title = 'Admin — Naturaloé'
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/admin/login', { replace: true })
        return
      }
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/admin/login', { replace: true })
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  // Poll for new orders every 25s → chime + badge + browser-tab title alert.
  useEffect(() => {
    if (checking) return
    let active = true
    async function poll() {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true })
      if (!active || count == null) return
      if (knownCount.current !== null && count > knownCount.current) {
        const added = count - knownCount.current
        setNewOrders((n) => n + added)
        playNewOrderChime()
      }
      knownCount.current = count

      // Also surface reviews awaiting moderation as a badge on the Avis tab.
      const { count: reviewsPending } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('approved', false)
      if (active && reviewsPending != null) setPendingReviews(reviewsPending)
    }
    poll()
    const id = setInterval(poll, 25000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [checking])

  // Reflect pending new orders in the browser tab title (visible when minimized).
  useEffect(() => {
    document.title = newOrders > 0 ? `(${newOrders}) 🔔 Nouvelle commande — Naturaloé` : 'Admin — Naturaloé'
  }, [newOrders])

  function goToTab(key: Tab) {
    setTab(key)
    if (key === 'orders') setNewOrders(0)
    if (key === 'reviews') setPendingReviews(0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  if (checking) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sage-600 sm:text-xs">Espace Admin</p>
            <h1 className="truncate font-display text-lg font-bold text-ink sm:text-xl">Naturaloé</h1>
          </div>
          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <a href="/" target="_blank" className="hidden text-sm text-ink/60 hover:text-ink sm:inline">Voir le site ↗</a>
            <button onClick={handleLogout} className="rounded-full border border-ink/15 px-3 py-2 text-xs text-ink hover:border-ink sm:px-4 sm:text-sm">
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => goToTab(t.key)}
              className={`relative flex-none whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                tab === t.key ? 'text-ink' : 'text-ink/45 hover:text-ink/70'
              }`}
            >
              {t.label}
              {t.key === 'orders' && newOrders > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-clay-500 px-1.5 text-[11px] font-bold text-cream">
                  {newOrders}
                </span>
              )}
              {t.key === 'reviews' && pendingReviews > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-clay-500 px-1.5 text-[11px] font-bold text-cream">
                  {pendingReviews}
                </span>
              )}
              {tab === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink sm:inset-x-3" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {tab === 'dashboard' && <DashboardPanel onGoto={goToTab} />}
        {tab === 'products' && <ProductsPanel />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'customers' && <CustomersPanel />}
        {tab === 'discounts' && <DiscountsPanel />}
        {tab === 'growth' && <GrowthPanel />}
        {tab === 'blog' && <BlogPanel />}
        {tab === 'messages' && <MessagesPanel />}
        {tab === 'reviews' && <ReviewsPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}
