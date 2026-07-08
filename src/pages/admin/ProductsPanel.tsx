import { useEffect, useMemo, useState } from 'react'
import {
  fetchAllProducts,
  deleteProduct,
  setProductHidden,
  emptyProduct,
  type ProductRow,
} from '@/lib/adminProducts'
import { ProductForm } from '@/pages/admin/ProductForm'
import { formatPrice } from '@/lib/format'

type View = { mode: 'list' } | { mode: 'edit'; row: ProductRow; isNew: boolean }
type Filter = 'all' | 'visible' | 'hidden' | 'low'

export function ProductsPanel() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      setRows(await fetchAllProducts())
    } catch {
      setLoadError(
        "Impossible de charger les produits. Avez-vous exécuté 02_products-and-admin.sql et 03_products-seed.sql ?",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(row: ProductRow) {
    if (!confirm(`Supprimer « ${row.name} » ? Cette action est définitive.`)) return
    await deleteProduct(row.id)
    load()
  }

  async function toggleHidden(row: ProductRow) {
    setBusyId(row.id)
    // optimistic
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, hidden: !r.hidden } : r)))
    try {
      await setProductHidden(row.id, !row.hidden)
    } catch {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, hidden: row.hidden } : r)))
      alert("Échec. Avez-vous exécuté 11_product-visibility.sql ?")
    } finally {
      setBusyId(null)
    }
  }

  function startAdd() {
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0
    setView({ mode: 'edit', row: emptyProduct(nextSort), isNew: true })
  }

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows],
  )

  const counts = useMemo(() => {
    const visible = rows.filter((r) => !r.hidden).length
    const hidden = rows.length - visible
    const low = rows.filter((r) => typeof r.stock === 'number' && r.stock <= 5).length
    return { total: rows.length, visible, hidden, low }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (category !== 'all' && r.category !== category) return false
      if (filter === 'visible' && r.hidden) return false
      if (filter === 'hidden' && !r.hidden) return false
      if (filter === 'low' && !(typeof r.stock === 'number' && r.stock <= 5)) return false
      if (q && !`${r.name} ${r.slug} ${r.category}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, category, filter])

  if (view.mode === 'edit') {
    return (
      <div className="rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink">
          {view.isNew ? 'Nouveau produit' : `Modifier — ${view.row.name}`}
        </h2>
        <ProductForm
          initial={view.row}
          isNew={view.isNew}
          onSaved={() => {
            setView({ mode: 'list' })
            load()
          }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </div>
    )
  }

  const chip = (key: Filter, label: string, count: number) => (
    <button
      onClick={() => setFilter(key)}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        filter === key ? 'bg-ink text-cream' : 'bg-cream text-ink/60 hover:text-ink'
      }`}
    >
      {label} <span className={filter === key ? 'text-cream/70' : 'text-ink/35'}>({count})</span>
    </button>
  )

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {counts.total} produits · <span className="text-sage-700">{counts.visible} visibles</span>
          {counts.hidden > 0 && <> · <span className="text-ink/50">{counts.hidden} masqués</span></>}
          {counts.low > 0 && <> · <span className="text-clay-600">{counts.low} stock faible</span></>}
        </p>
        <button
          onClick={startAdd}
          className="flex-none rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-sage-700"
        >
          + Ajouter un produit
        </button>
      </div>

      {/* Search + filters */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-full border border-ink/15 bg-cream py-2.5 pl-11 pr-4 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {chip('all', 'Tous', counts.total)}
          {chip('visible', 'Visibles', counts.visible)}
          {chip('hidden', 'Masqués', counts.hidden)}
          {chip('low', 'Stock faible', counts.low)}
        </div>
      </div>

      {loadError && <p className="mb-4 rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{loadError}</p>}
      {loading ? (
        <p className="py-16 text-center text-ink/40">Chargement…</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {filtered.map((row) => {
            const low = typeof row.stock === 'number' && row.stock <= 5
            const out = typeof row.stock === 'number' && row.stock <= 0
            return (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-ink/10 px-4 py-3 last:border-0 sm:flex-nowrap ${row.hidden ? 'opacity-55' : ''}`}
              >
                <div className="h-12 w-10 flex-none overflow-hidden rounded-lg bg-stone">
                  {row.image && <img src={row.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium text-ink">{row.name}</p>
                    {row.hidden && (
                      <span className="flex-none rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/50">Masqué</span>
                    )}
                    {out ? (
                      <span className="flex-none rounded-full bg-clay-500/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">Rupture</span>
                    ) : low ? (
                      <span className="flex-none rounded-full bg-clay-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-clay-600">Stock {row.stock}</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-ink/45">{row.category} · {formatPrice(row.price)}</p>
                </div>
                {/* Buttons wrap to a full-width second row on mobile, inline on desktop */}
                <div className="flex w-full flex-none gap-2 sm:w-auto">
                  <button
                    onClick={() => toggleHidden(row)}
                    disabled={busyId === row.id}
                    title={row.hidden ? 'Rendre visible sur le site' : 'Masquer du site'}
                    className="flex-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink disabled:opacity-50 sm:flex-none"
                  >
                    {row.hidden ? 'Afficher' : 'Masquer'}
                  </button>
                  <button
                    onClick={() => setView({ mode: 'edit', row, isNew: false })}
                    className="flex-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink sm:flex-none"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    className="flex-1 rounded-full border border-clay-500/30 px-3 py-1.5 text-xs text-clay-600 hover:border-clay-500 sm:flex-none"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-ink/40">
              {rows.length === 0
                ? 'Aucun produit. Cliquez sur « Ajouter un produit », ou exécutez products-seed.sql pour importer le catalogue existant.'
                : 'Aucun produit ne correspond à votre recherche.'}
            </p>
          )}
        </div>
      )}
    </>
  )
}
