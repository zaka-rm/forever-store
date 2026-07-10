import { useEffect, useMemo, useState } from 'react'
import { fetchPacks, savePack, deletePack, type PackRow, type PackItemRef } from '@/lib/packs'
import { uploadProductImage } from '@/lib/adminProducts'
import { ROUTINES, buildRoutine } from '@/lib/routines'
import { useProducts } from '@/lib/productsContext'
import { formatPrice } from '@/lib/format'
import { BUNDLE_MIN_ITEMS, BUNDLE_RATE } from '@/lib/cartContext'

const input = 'w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40'
const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

interface Draft {
  id?: string
  icon: string
  name_fr: string
  name_ar: string
  goal_fr: string
  goal_ar: string
  image: string
  sort_order: number
  active: boolean
  items: PackItemRef[]
}

const emptyDraft: Draft = {
  icon: '🌿',
  name_fr: '',
  name_ar: '',
  goal_fr: '',
  goal_ar: '',
  image: '',
  sort_order: 0,
  active: true,
  items: [],
}

export function PacksPanel() {
  const { products } = useProducts()
  const [packs, setPacks] = useState<PackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPacks()
      .then(setPacks)
      .finally(() => setLoading(false))
  }, [])

  async function reload() {
    setPacks(await fetchPacks())
  }

  function startNew() {
    setDraft({ ...emptyDraft, sort_order: packs.length })
    setError('')
  }

  function startEdit(p: PackRow) {
    setDraft({
      id: p.id,
      icon: p.icon || '🌿',
      name_fr: p.name_fr,
      name_ar: p.name_ar ?? '',
      goal_fr: p.goal_fr ?? '',
      goal_ar: p.goal_ar ?? '',
      image: p.image ?? '',
      sort_order: p.sort_order,
      active: p.active,
      items: p.items ?? [],
    })
    setError('')
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.name_fr.trim()) {
      setError('Le nom (français) est obligatoire.')
      return
    }
    if (draft.items.length === 0) {
      setError('Ajoutez au moins un produit au pack.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await savePack(
        {
          id: draft.id,
          icon: draft.icon.trim() || '🌿',
          name_fr: draft.name_fr.trim(),
          name_ar: draft.name_ar.trim() || null,
          goal_fr: draft.goal_fr.trim() || null,
          goal_ar: draft.goal_ar.trim() || null,
          image: draft.image.trim() || null,
          sort_order: draft.sort_order,
          active: draft.active,
          items: draft.items,
        },
        !draft.id,
      )
      setDraft(null)
      await reload()
    } catch {
      setError("Échec de l'enregistrement. Avez-vous exécuté 27_packs.sql ?")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: PackRow) {
    if (!confirm(`Supprimer le pack « ${p.name_fr} » ?`)) return
    await deletePack(p.id)
    await reload()
  }

  async function toggleActive(p: PackRow) {
    setPacks((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    try {
      await savePack({ id: p.id, name_fr: p.name_fr, active: !p.active }, false)
    } catch {
      setPacks((list) => list.map((x) => (x.id === p.id ? { ...x, active: p.active } : x)))
    }
  }

  function packSubtotal(items: PackItemRef[]): { subtotal: number; count: number } {
    let subtotal = 0
    let count = 0
    for (const ref of items) {
      const prod = products.find((x) => x.id === ref.id)
      if (!prod) continue
      subtotal += prod.price * ref.quantity
      count += ref.quantity
    }
    return { subtotal, count }
  }

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {packs.length} pack{packs.length > 1 ? 's' : ''} — affichés sur la page « Routines ».
          La remise routine (−{Math.round(BUNDLE_RATE * 100)}% dès {BUNDLE_MIN_ITEMS} articles)
          s'applique automatiquement au panier.
        </p>
        <button
          onClick={startNew}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700"
        >
          + Nouveau pack
        </button>
      </div>

      {draft && (
        <PackForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
          saving={saving}
          error={error}
        />
      )}

      {packs.length === 0 && !draft ? (
        <div className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center">
          <p className="text-sm text-ink/40">
            Aucun pack pour le moment — la page Routines affiche des routines automatiques.
          </p>
          <p className="mt-1 text-xs text-ink/35">
            Créez votre premier pack : il remplacera les routines automatiques.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {packs.map((p) => {
            const { subtotal, count } = packSubtotal(p.items ?? [])
            return (
              <div
                key={p.id}
                className={`rounded-3xl border bg-cream-dark p-5 ${p.active ? 'border-ink/10' : 'border-ink/10 opacity-60'}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.name_fr}
                      {p.name_ar && <span className="ms-2 text-ink/50">· {p.name_ar}</span>}
                    </p>
                    <p className="text-xs text-ink/45">
                      {count} article{count > 1 ? 's' : ''} · {formatPrice(subtotal)}
                      {!p.active && ' · Masqué'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(p)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                      p.active
                        ? 'border border-ink/15 text-ink/60 hover:border-ink'
                        : 'bg-ink text-cream hover:bg-sage-700'
                    }`}
                  >
                    {p.active ? 'Masquer' : 'Afficher'}
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-medium text-ink hover:border-ink"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="rounded-full border border-clay-500/30 px-4 py-1.5 text-xs text-clay-600 hover:border-clay-500"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PackForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
}) {
  const { products } = useProducts()
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleImageFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      // Reuses the existing product-images bucket under a packs/ folder.
      const url = await uploadProductImage('packs', file)
      setDraft({ ...draft, image: url })
    } catch {
      setUploadError("Échec de l'envoi. Vérifiez que le bucket 'product-images' existe.")
    } finally {
      setUploading(false)
    }
  }

  const selectedIds = new Set(draft.items.map((it) => it.id))
  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.nameAr ?? '').includes(search.trim()))
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, draft.items])

  function addItem(id: string) {
    setDraft({ ...draft, items: [...draft.items, { id, quantity: 1 }] })
  }

  function removeItem(id: string) {
    setDraft({ ...draft, items: draft.items.filter((it) => it.id !== id) })
  }

  function setQty(id: string, quantity: number) {
    if (quantity <= 0) return removeItem(id)
    setDraft({ ...draft, items: draft.items.map((it) => (it.id === id ? { ...it, quantity } : it)) })
  }

  const subtotal = draft.items.reduce((s, it) => {
    const p = products.find((x) => x.id === it.id)
    return s + (p ? p.price * it.quantity : 0)
  }, 0)
  const count = draft.items.reduce((s, it) => s + it.quantity, 0)
  const discount = count >= BUNDLE_MIN_ITEMS ? Math.round(subtotal * BUNDLE_RATE) : 0

  return (
    <div className="mb-6 rounded-4xl border border-sage-600/30 bg-cream-dark p-6 sm:p-8">
      <h3 className="mb-5 font-display text-xl font-bold text-ink">
        {draft.id ? 'Modifier le pack' : 'Nouveau pack'}
      </h3>

      <div className="mb-4 grid gap-4 sm:grid-cols-[80px_1fr_1fr]">
        <div>
          <label className={label}>Icône</label>
          <input
            className={`${input} text-center text-xl`}
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            placeholder="🌿"
          />
        </div>
        <div>
          <label className={label}>Nom (Français) *</label>
          <input
            className={input}
            value={draft.name_fr}
            onChange={(e) => setDraft({ ...draft, name_fr: e.target.value })}
            placeholder="Pack Digestion & Vitalité"
          />
        </div>
        <div>
          <label className={label}>Nom (العربية)</label>
          <input
            dir="rtl"
            className={input}
            value={draft.name_ar}
            onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })}
            placeholder="باك الهضم والحيوية"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Objectif (Français)</label>
          <input
            className={input}
            value={draft.goal_fr}
            onChange={(e) => setDraft({ ...draft, goal_fr: e.target.value })}
            placeholder="Purifier, nourrir et retrouver de l'énergie."
          />
        </div>
        <div>
          <label className={label}>Objectif (العربية)</label>
          <input
            dir="rtl"
            className={input}
            value={draft.goal_ar}
            onChange={(e) => setDraft({ ...draft, goal_ar: e.target.value })}
            placeholder="التطهير والتغذية واستعادة الطاقة."
          />
        </div>
      </div>

      {/* --- Pack photo (optional) ------------------------------------------ */}
      <div className="mb-4">
        <label className={label}>Photo du pack (facultative)</label>
        <p className="mb-2 text-xs text-ink/45">
          Si vous ajoutez une photo (ex : les produits posés ensemble), elle remplace la grille de
          produits sur la carte. Sans photo, la grille s'affiche — les deux fonctionnent.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          {draft.image && (
            <div className="relative">
              <img src={draft.image} alt="" className="h-24 w-32 rounded-2xl border border-ink/10 object-cover" />
              <button
                type="button"
                onClick={() => setDraft({ ...draft, image: '' })}
                className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-cream"
                title="Retirer la photo"
              >
                ✕
              </button>
            </div>
          )}
          <label className="flex h-24 w-40 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-ink/20 bg-cream text-center text-xs text-ink/50 hover:border-ink/40">
            {uploading ? 'Envoi…' : 'Cliquez pour choisir une photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0])} />
          </label>
        </div>
        <input
          className={`${input} mt-2`}
          value={draft.image}
          onChange={(e) => setDraft({ ...draft, image: e.target.value })}
          placeholder="…ou collez une URL d'image"
        />
        {uploadError && <p className="mt-1 text-xs font-medium text-clay-600">{uploadError}</p>}
      </div>

      {/* --- Product picker ------------------------------------------------ */}
      <div className="mb-4">
        <label className={label}>Produits du pack *</label>

        {draft.items.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {draft.items.map((it) => {
              const p = products.find((x) => x.id === it.id)
              return (
                <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-cream px-3 py-2">
                  {p?.image && (
                    <img src={p.image} alt="" className="h-10 w-10 flex-none rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p?.name ?? it.id}</p>
                    <p className="text-xs text-ink/45">{p ? formatPrice(p.price) : 'Produit introuvable'}</p>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(it.id, it.quantity - 1)}
                      className="h-7 w-7 rounded-full border border-ink/15 text-sm text-ink hover:border-ink"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-medium text-ink">{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQty(it.id, it.quantity + 1)}
                      className="h-7 w-7 rounded-full border border-ink/15 text-sm text-ink hover:border-ink"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="flex-none text-ink/30 hover:text-clay-600"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <input
          className={input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit à ajouter…"
        />
        {search.trim() && (
          <div className="mt-2 flex flex-col gap-1">
            {available.length === 0 ? (
              <p className="px-2 py-1 text-xs text-ink/40">Aucun produit trouvé.</p>
            ) : (
              available.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    addItem(p.id)
                    setSearch('')
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-cream px-3 py-2 text-start hover:border-sage-600/50"
                >
                  {p.image && <img src={p.image} alt="" className="h-8 w-8 flex-none rounded-lg object-cover" />}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                  <span className="flex-none text-xs text-ink/45">{formatPrice(p.price)}</span>
                  <span className="flex-none text-sage-700">+</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- Price preview -------------------------------------------------- */}
      {draft.items.length > 0 && (
        <div className="mb-4 rounded-2xl bg-sage-100/50 px-4 py-3 text-sm text-ink/70">
          {count} article{count > 1 ? 's' : ''} · Sous-total {formatPrice(subtotal)}
          {discount > 0 ? (
            <span className="ms-2 font-medium text-sage-700">
              → {formatPrice(subtotal - discount)} après remise routine (−{formatPrice(discount)})
            </span>
          ) : (
            <span className="ms-2 text-ink/45">
              (ajoutez {BUNDLE_MIN_ITEMS - count} article{BUNDLE_MIN_ITEMS - count > 1 ? 's' : ''} pour
              déclencher la remise −{Math.round(BUNDLE_RATE * 100)}%)
            </span>
          )}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            className="h-5 w-5 rounded accent-sage-600"
          />
          <span className="text-sm font-medium text-ink">Visible sur le site</span>
        </label>
        <div className="flex items-center gap-2">
          <span className={`${label} mb-0`}>Ordre</span>
          <input
            type="number"
            className="w-20 rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le pack'}
        </button>
        <button onClick={onCancel} className="text-sm text-ink/60 hover:text-ink">
          Annuler
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
    </div>
  )
}
