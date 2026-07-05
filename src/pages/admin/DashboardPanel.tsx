import { useEffect, useState } from 'react'
import {
  fetchOrders,
  fetchMessages,
  fetchAdminReviews,
  type OrderRow,
} from '@/lib/adminData'
import { orderStatusLabel } from '@/lib/orderStatus'
import { formatPrice } from '@/lib/format'

interface Stats {
  revenueTotal: number
  revenueMonth: number
  ordersCount: number
  avgBasket: number
  pendingOrders: number
  unhandledMessages: number
  pendingReviews: number
  byStatus: Record<string, number>
  topProducts: { name: string; qty: number }[]
  daily: { date: string; label: string; revenue: number }[]
}

function SalesChart({ daily }: { daily: Stats['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue))
  const total = daily.reduce((s, d) => s + d.revenue, 0)
  return (
    <div className="rounded-2xl bg-cream-dark p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-ink/40">Ventes — 30 derniers jours</h3>
        <span className="text-sm font-medium text-ink/60">{formatPrice(total)}</span>
      </div>
      <div className="flex h-32 items-end gap-[3px]">
        {daily.map((d) => (
          <div
            key={d.date}
            title={`${d.label} : ${formatPrice(d.revenue)}`}
            className="group flex-1 rounded-t bg-sage-500/70 transition-colors hover:bg-sage-600"
            style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink/40">
        <span>{daily[0]?.label}</span>
        <span>{daily[Math.floor(daily.length / 2)]?.label}</span>
        <span>{daily[daily.length - 1]?.label}</span>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-dark p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  )
}

export function DashboardPanel({ onGoto }: { onGoto: (tab: 'orders' | 'messages' | 'reviews') => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [orders, messages, reviews] = await Promise.all([
          fetchOrders(),
          fetchMessages(),
          fetchAdminReviews(),
        ])
        setStats(compute(orders, messages.filter((m) => !m.handled).length, reviews.filter((r) => !r.approved).length))
      } catch {
        setError("Impossible de charger les statistiques. Avez-vous exécuté les scripts SQL (policies admin) ?")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>
  if (!stats) return null

  const money = (n: number) => formatPrice(n)

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Chiffre d'affaires" value={money(stats.revenueTotal)} />
        <Metric label="Ce mois-ci" value={money(stats.revenueMonth)} />
        <Metric label="Commandes" value={String(stats.ordersCount)} />
        <Metric label="Panier moyen" value={money(stats.avgBasket)} />
      </div>

      <SalesChart daily={stats.daily} />

      {/* Needs attention */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">À traiter</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button onClick={() => onGoto('orders')} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-cream-dark px-4 py-3 text-left hover:border-ink/30">
            <span className="text-sm text-ink/70">Commandes à confirmer</span>
            <span className={`font-display text-xl font-bold ${stats.pendingOrders ? 'text-clay-600' : 'text-ink/30'}`}>{stats.pendingOrders}</span>
          </button>
          <button onClick={() => onGoto('messages')} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-cream-dark px-4 py-3 text-left hover:border-ink/30">
            <span className="text-sm text-ink/70">Messages non traités</span>
            <span className={`font-display text-xl font-bold ${stats.unhandledMessages ? 'text-clay-600' : 'text-ink/30'}`}>{stats.unhandledMessages}</span>
          </button>
          <button onClick={() => onGoto('reviews')} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-cream-dark px-4 py-3 text-left hover:border-ink/30">
            <span className="text-sm text-ink/70">Avis à approuver</span>
            <span className={`font-display text-xl font-bold ${stats.pendingReviews ? 'text-clay-600' : 'text-ink/30'}`}>{stats.pendingReviews}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* Top products */}
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">Meilleures ventes</h3>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-ink/40">Aucune vente pour le moment.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {stats.topProducts.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-cream-dark px-4 py-2.5 text-sm">
                  <span className="truncate text-ink/80"><span className="text-ink/40">{i + 1}.</span> {p.name}</span>
                  <span className="flex-none font-medium text-ink">{p.qty} vendus</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Orders by status */}
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">Commandes par statut</h3>
          <ul className="flex flex-col gap-2">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between rounded-xl bg-cream-dark px-4 py-2.5 text-sm">
                <span className="text-ink/70">{orderStatusLabel(status, 'fr')}</span>
                <span className="font-medium text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function compute(orders: OrderRow[], unhandledMessages: number, pendingReviews: number): Stats {
  const active = orders.filter((o) => o.status !== 'cancelled')
  const now = new Date()
  const revenueTotal = active.reduce((s, o) => s + Number(o.total), 0)
  const revenueMonth = active
    .filter((o) => {
      const d = new Date(o.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, o) => s + Number(o.total), 0)

  const byStatus: Record<string, number> = {}
  for (const o of orders) byStatus[o.status || 'pending'] = (byStatus[o.status || 'pending'] || 0) + 1

  const qtyByProduct: Record<string, number> = {}
  for (const o of active) {
    for (const it of o.items || []) {
      qtyByProduct[it.name] = (qtyByProduct[it.name] || 0) + Number(it.quantity)
    }
  }
  const topProducts = Object.entries(qtyByProduct)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // Revenue per day for the last 30 days.
  const revByDay: Record<string, number> = {}
  for (const o of active) {
    const key = new Date(o.created_at).toISOString().slice(0, 10)
    revByDay[key] = (revByDay[key] || 0) + Number(o.total)
  }
  const daily: Stats['daily'] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: revByDay[key] || 0 })
  }

  return {
    revenueTotal,
    revenueMonth,
    ordersCount: active.length,
    avgBasket: active.length ? revenueTotal / active.length : 0,
    pendingOrders: orders.filter((o) => (o.status || 'pending') === 'pending').length,
    unhandledMessages,
    pendingReviews,
    byStatus,
    topProducts,
    daily,
  }
}
