import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
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

  useEffect(() => {
    document.title = 'Admin — Forever Living'
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  if (checking) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-600">Espace Admin</p>
            <h1 className="font-display text-xl font-bold text-ink">Forever Living</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-sm text-ink/60 hover:text-ink">Voir le site ↗</a>
            <button onClick={handleLogout} className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink hover:border-ink">
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="flex gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'text-ink' : 'text-ink/45 hover:text-ink/70'
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {tab === 'dashboard' && <DashboardPanel onGoto={setTab} />}
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
