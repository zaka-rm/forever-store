import { useEffect, useMemo, useState } from 'react'
import { fetchOrders, type OrderRow } from '@/lib/adminData'
import {
  fetchCosts,
  saveCost,
  fetchCourierCost,
  saveCourierCost,
  orderFinance,
  summarize,
  type CostMap,
} from '@/lib/finance'
import { useProducts } from '@/lib/productsContext'
import { formatPrice } from '@/lib/format'

const money = (n: number) => formatPrice(n)
const input = 'rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40'

type Period = 'month' | 'all'

export function FinancePanel() {
  const { products } = useProducts()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [costs, setCosts] = useState<CostMap>({})
  const [courierCost, setCourierCost] = useState(35)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    ;(async () => {
      try {
        const [o, c, cc] = await Promise.all([fetchOrders(), fetchCosts(), fetchCourierCost()])
        setOrders(o)
        setCosts(c)
        setCourierCost(cc)
      } catch {
        setError('Impossible de charger. Avez-vous exécuté 30_finance.sql ?')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Delivered orders only: money you have actually cashed. (Cancelled orders
  // never count; pending ones aren't cash yet.)
  const rows = useMemo(() => {
    const now = new Date()
    return orders
      .filter((o) => o.status === 'delivered')
      .filter((o) => {
        if (period === 'all') return true
        const d = new Date(o.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .map((o) => orderFinance(o, costs, products, courierCost))
  }, [orders, costs, products, courierCost, period])

  const sum = useMemo(() => summarize(rows), [rows])

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <div className="flex flex-col gap-8">
      {/* Period + courier cost */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('month')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${period === 'month' ? 'bg-ink text-cream' : 'bg-cream-dark text-ink/60'}`}
          >
            Ce mois-ci
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${period === 'all' ? 'bg-ink text-cream' : 'bg-cream-dark text-ink/60'}`}
          >
            Depuis le début
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          Coût livreur par colis (DH)
          <input
            type="number"
            min="0"
            className={`${input} w-20`}
            value={courierCost}
            onChange={(e) => setCourierCost(Number(e.target.value) || 0)}
            onBlur={() => saveCourierCost(courierCost).catch(() => {})}
          />
        </label>
      </div>

      {sum.ordersWithMissingCosts > 0 && (
        <p className="rounded-2xl border border-clay-500/30 bg-clay-500/5 px-4 py-3 text-sm text-clay-600">
          ⚠️ {sum.ordersWithMissingCosts} commande{sum.ordersWithMissingCosts > 1 ? 's ont' : ' a'} des produits
          sans prix d'achat — le bénéfice affiché est surestimé. Renseignez les prix d'achat ci-dessous.
        </p>
      )}

      {/* The money machine */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label={`Encaissé (${sum.ordersCount} livrée${sum.ordersCount > 1 ? 's' : ''})`} value={money(sum.revenue)} />
        <Card label="Coût marchandise" value={`−${money(sum.goodsCost)}`} tone="cost" />
        <Card label="Livraisons payées" value={`−${money(sum.courierTotal)}`} tone="cost" />
        <Card
          label={`Bénéfice net (${sum.marginPct.toFixed(0)}%)`}
          value={money(sum.net)}
          tone={sum.net >= 0 ? 'good' : 'bad'}
        />
      </div>

      {/* The 3 envelopes */}
      <div className="rounded-3xl border border-ink/10 bg-cream-dark p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-ink">Les 3 enveloppes</h3>
        <p className="mb-4 text-xs text-ink/50">
          Quand un client vous paie, l'argent se répartit ainsi. Ne dépensez jamais l'enveloppe Stock !
        </p>
        <Envelope label="1 · Stock — à re-dépenser chez Forever" amount={sum.goodsCost} total={sum.revenue} color="bg-sage-600" />
        <Envelope label="2 · Frais — livraisons, emballage" amount={sum.courierTotal} total={sum.revenue} color="bg-clay-500" />
        <Envelope label="3 · Bénéfice — votre argent (à réinvestir au début)" amount={Math.max(0, sum.net)} total={sum.revenue} color="bg-ink" />
      </div>

      {/* What promotions really cost */}
      <div className="rounded-3xl border border-ink/10 bg-cream-dark p-6">
        <h3 className="mb-1 font-display text-lg font-bold text-ink">Ce que vos promos vous ont coûté</h3>
        <p className="mb-4 text-xs text-ink/50">
          Une remise « achète » un comportement (panier plus gros, fidélité). Vérifiez ici qu'elle ne mange pas votre marge.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Card label="Remises accordées (codes + routine −10%)" value={`−${money(sum.discountsGiven)}`} tone="cost" />
          <Card label="Livraisons offertes (payées par vous)" value={`−${money(sum.freeShippingGiven)}`} tone="cost" />
        </div>
      </div>

      {/* Per-order table */}
      <OrdersTable rows={rows} />

      {/* Purchase price editor */}
      <CostsEditor costs={costs} onSaved={(id, v) => setCosts((c) => ({ ...c, [id]: v }))} />

      {/* Restock simulator */}
      <RestockSimulator costs={costs} />
    </div>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'cost' }) {
  const color = tone === 'good' ? 'text-sage-700' : tone === 'bad' ? 'text-clay-600' : tone === 'cost' ? 'text-ink/70' : 'text-ink'
  return (
    <div className="rounded-2xl bg-cream-dark p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Envelope({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink/70">{label}</span>
        <span className="font-medium text-ink">{money(amount)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OrdersTable({ rows }: { rows: ReturnType<typeof orderFinance>[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-3xl border border-ink/10 bg-cream-dark py-10 text-center text-sm text-ink/40">
        Aucune commande livrée sur cette période. (Seules les commandes marquées « Livrée » comptent —
        c'est du vrai argent encaissé.)
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-ink/10 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-ink/40">
        <span>Commande</span>
        <span className="text-end">Encaissé</span>
        <span className="hidden text-end sm:block">Coûts</span>
        <span className="text-end">Net</span>
      </div>
      {rows.map((r) => (
        <div key={r.order.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-ink/10 px-4 py-2.5 text-sm last:border-0">
          <span className="min-w-0 truncate text-ink/80">
            {r.order.order_ref || r.order.id.slice(0, 8)}
            <span className="ms-2 text-xs text-ink/40">{r.order.customer_name}</span>
            {r.missingCosts && <span className="ms-2 text-xs text-clay-600" title="Prix d'achat manquants">⚠️</span>}
          </span>
          <span className="text-end text-ink/70">{money(r.revenue)}</span>
          <span className="hidden text-end text-ink/50 sm:block">−{money(r.goodsCost + r.courierCost)}</span>
          <span className={`text-end font-semibold ${r.net >= 0 ? 'text-sage-700' : 'text-clay-600'}`}>{money(r.net)}</span>
        </div>
      ))}
    </div>
  )
}

function CostsEditor({ costs, onSaved }: { costs: CostMap; onSaved: (id: string, v: number) => void }) {
  const { products } = useProducts()
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')

  const q = search.trim().toLowerCase()
  const list = products
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => Number(costs[b.id] === undefined) - Number(costs[a.id] === undefined) || a.name.localeCompare(b.name))
    .slice(0, q ? 20 : 10)
  const missing = products.filter((p) => costs[p.id] === undefined).length

  async function save(id: string, v: number) {
    setSavingId(id)
    setError('')
    try {
      await saveCost(id, v)
      onSaved(id, v)
    } catch {
      setError("Échec de l'enregistrement. Avez-vous exécuté 30_finance.sql ?")
    } finally {
      setSavingId('')
    }
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-cream-dark p-6">
      <h3 className="mb-1 font-display text-lg font-bold text-ink">Prix d'achat Forever</h3>
      <p className="mb-4 text-xs text-ink/50">
        Ce que VOUS payez chez Forever pour chaque produit (voir votre bon de commande). Secret — jamais
        visible sur le site. {missing > 0 && <span className="font-medium text-clay-600">{missing} produit{missing > 1 ? 's' : ''} sans prix.</span>}
      </p>
      <input
        className={`${input} mb-3 w-full`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un produit…"
      />
      <div className="flex flex-col gap-2">
        {list.map((p) => {
          const margin = costs[p.id] !== undefined ? p.price - costs[p.id] : null
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{p.name}</span>
              <span className="flex-none text-xs text-ink/45">vente {money(p.price)}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                defaultValue={costs[p.id] ?? ''}
                placeholder="achat"
                disabled={savingId === p.id}
                onBlur={(e) => {
                  const v = Number(e.target.value)
                  if (e.target.value !== '' && v >= 0 && v !== costs[p.id]) save(p.id, v)
                }}
                className={`${input} w-24 text-end`}
              />
              {margin !== null && (
                <span className={`w-20 flex-none text-end text-xs font-medium ${margin > 0 ? 'text-sage-700' : 'text-clay-600'}`}>
                  +{money(margin)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
    </div>
  )
}

// « Si j'achète ces produits chez Forever, combien ça me coûte, et combien il
// me restera une fois tout vendu ? » — the restock simulator.
function RestockSimulator({ costs }: { costs: CostMap }) {
  const { products } = useProducts()
  const [search, setSearch] = useState('')
  const [basket, setBasket] = useState<Record<string, number>>({})

  const q = search.trim().toLowerCase()
  const found = q ? products.filter((p) => p.name.toLowerCase().includes(q) && !basket[p.id]).slice(0, 6) : []

  const lines = Object.entries(basket)
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === id)
      if (!p) return null
      const cost = costs[id]
      return { p, qty, cost, buy: cost !== undefined ? cost * qty : null, sell: p.price * qty }
    })
    .filter(Boolean) as { p: (typeof products)[number]; qty: number; cost?: number; buy: number | null; sell: number }[]

  const totalBuy = lines.reduce((s, l) => s + (l.buy ?? 0), 0)
  const totalSell = lines.reduce((s, l) => s + l.sell, 0)
  const hasMissing = lines.some((l) => l.buy === null)

  return (
    <div className="rounded-3xl border border-ink/10 bg-cream-dark p-6">
      <h3 className="mb-1 font-display text-lg font-bold text-ink">Simulateur de réapprovisionnement</h3>
      <p className="mb-4 text-xs text-ink/50">
        « Si j'achète ces produits chez Forever, combien je sors de l'enveloppe Stock, et combien il me
        restera une fois tout vendu au prix du site ? »
      </p>

      <input
        className={`${input} w-full`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ajouter un produit au panier d'achat…"
      />
      {found.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {found.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setBasket((b) => ({ ...b, [p.id]: 1 }))
                setSearch('')
              }}
              className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-cream px-3 py-2 text-start hover:border-sage-600/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
              <span className="flex-none text-xs text-ink/45">
                achat {costs[p.id] !== undefined ? money(costs[p.id]) : '?'}
              </span>
              <span className="flex-none text-sage-700">+</span>
            </button>
          ))}
        </div>
      )}

      {lines.length > 0 && (
        <>
          <div className="mt-4 flex flex-col gap-2">
            {lines.map((l) => (
              <div key={l.p.id} className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{l.p.name}</span>
                <div className="flex flex-none items-center gap-1">
                  <button onClick={() => setBasket((b) => { const n = { ...b }; if (n[l.p.id] <= 1) delete n[l.p.id]; else n[l.p.id]--; return n })} className="h-6 w-6 rounded-full border border-ink/15 text-xs">−</button>
                  <span className="w-6 text-center text-sm">{l.qty}</span>
                  <button onClick={() => setBasket((b) => ({ ...b, [l.p.id]: b[l.p.id] + 1 }))} className="h-6 w-6 rounded-full border border-ink/15 text-xs">+</button>
                </div>
                <span className="w-24 flex-none text-end text-xs text-ink/60">
                  {l.buy !== null ? `coût ${money(l.buy)}` : 'prix d\'achat ?'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card label="Sort de l'enveloppe Stock" value={`−${money(totalBuy)}`} tone="cost" />
            <Card label="Rentrera une fois vendu" value={money(totalSell)} />
            <Card label="Bénéfice potentiel" value={money(totalSell - totalBuy)} tone="good" />
          </div>
          {hasMissing && (
            <p className="mt-2 text-xs text-clay-600">
              ⚠️ Certains produits n'ont pas de prix d'achat — le coût réel sera plus élevé qu'affiché.
            </p>
          )}
          <p className="mt-2 text-[11px] text-ink/40">
            Hors frais de livraison et remises éventuelles — c'est le potentiel brut si tout se vend au prix du site.
          </p>
        </>
      )}
    </div>
  )
}
