import { useEffect, useMemo, useState } from 'react'
import { fetchOrders, formatDate, type OrderRow } from '@/lib/adminData'
import { formatPrice } from '@/lib/format'
import { toWhatsAppNumber, waLink } from '@/lib/whatsapp'

interface Customer {
  key: string
  name: string
  phone: string | null
  email: string | null
  city: string | null
  orders: OrderRow[]
  totalSpent: number
  lastOrder: string
}

function buildCustomers(orders: OrderRow[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const o of orders) {
    const phoneDigits = (o.phone || '').replace(/\D/g, '')
    const key = phoneDigits || (o.customer_email || '').toLowerCase() || o.customer_name.toLowerCase()
    if (!key) continue
    let c = map.get(key)
    if (!c) {
      c = { key, name: o.customer_name, phone: o.phone, email: o.customer_email, city: o.city, orders: [], totalSpent: 0, lastOrder: o.created_at }
      map.set(key, c)
    }
    c.orders.push(o)
    if (o.status !== 'cancelled') c.totalSpent += Number(o.total)
    if (new Date(o.created_at) > new Date(c.lastOrder)) {
      c.lastOrder = o.created_at
      c.name = o.customer_name // keep the most recent spelling
      c.city = o.city
    }
  }
  return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent)
}

export function CustomersPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("Impossible de charger les clients. Avez-vous exécuté 02_products-and-admin.sql ?"))
      .finally(() => setLoading(false))
  }, [])

  const customers = useMemo(() => buildCustomers(orders), [orders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => `${c.name} ${c.phone ?? ''} ${c.email ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q))
  }, [customers, query])

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  const repeat = customers.filter((c) => c.orders.length > 1).length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {customers.length} client{customers.length > 1 ? 's' : ''}
          {repeat > 0 && <> · <span className="text-sage-700">{repeat} fidèle{repeat > 1 ? 's' : ''}</span></>}
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un client (nom, téléphone, ville)…"
        className="mb-5 w-full rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
      />

      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          {customers.length === 0 ? 'Aucun client pour le moment.' : 'Aucun client ne correspond.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div key={c.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-cream-dark">
              <button
                onClick={() => setOpenKey(openKey === c.key ? null : c.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                    {c.name}
                    {c.orders.length > 1 && (
                      <span className="flex-none rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-sage-700">Fidèle</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink/45">{c.phone || c.email || '—'}{c.city ? ` · ${c.city}` : ''}</p>
                </div>
                <div className="flex-none text-right">
                  <p className="font-display text-sm font-bold text-ink">{formatPrice(c.totalSpent)}</p>
                  <p className="text-[11px] text-ink/45">{c.orders.length} cmd · {formatDate(c.lastOrder)}</p>
                </div>
                <span className="flex-none text-ink/30">{openKey === c.key ? '−' : '+'}</span>
              </button>

              {openKey === c.key && (
                <div className="border-t border-ink/10 px-4 py-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {c.phone && (
                      <a
                        href={waLink(toWhatsAppNumber(c.phone), `Bonjour ${c.name}, c'est Forever Living 🌿 `)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:brightness-95"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink">
                        ✉ Email
                      </a>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {c.orders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-xs text-ink/60">
                        <span>{o.order_ref ? `#${o.order_ref}` : '—'} · {formatDate(o.created_at)}</span>
                        <span className="text-ink/80">{formatPrice(Number(o.total))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
