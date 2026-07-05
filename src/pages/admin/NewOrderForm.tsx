import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { fetchAllProducts, type ProductRow } from '@/lib/adminProducts'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/constants'
import { formatPrice } from '@/lib/format'

interface Line {
  id: string
  name: string
  price: number
  quantity: number
}

const input = 'w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40'
const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

/** Admin form to enter an order taken by phone/WhatsApp so it lands in the system. */
export function NewOrderForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [pick, setPick] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', city: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllProducts()
      .then((rows) => setProducts(rows.filter((r) => !r.hidden)))
      .catch(() => setError('Impossible de charger les produits.'))
  }, [])

  function addLine() {
    const p = products.find((x) => x.id === pick)
    if (!p) return
    setLines((list) => {
      const existing = list.find((l) => l.id === p.id)
      if (existing) return list.map((l) => (l.id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      return [...list, { id: p.id, name: p.name, price: p.price, quantity: 1 }]
    })
    setPick('')
  }

  function setQty(id: string, quantity: number) {
    if (quantity <= 0) {
      setLines((list) => list.filter((l) => l.id !== id))
      return
    }
    setLines((list) => list.map((l) => (l.id === id ? { ...l, quantity } : l)))
  }

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines])
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE
  const total = subtotal + shipping

  async function save() {
    if (!customer.name.trim() || lines.length === 0) {
      setError('Ajoutez au moins un produit et le nom du client.')
      return
    }
    setSaving(true)
    setError('')
    const reference = `FL${Date.now().toString().slice(-8)}`
    const orderRow = {
      customer_name: customer.name.trim(),
      customer_email: customer.email.trim() || 'commande-manuelle@forever.local',
      phone: customer.phone.trim() || null,
      address: customer.address.trim() || null,
      city: customer.city.trim() || null,
      region: null,
      zip: null,
      country: 'Maroc',
      items: lines,
      subtotal,
      shipping,
      total,
      discount_code: null,
      discount_amount: 0,
      currency: 'mad',
      payment_status: 'pending',
      payment_method: 'cod',
      status: 'pending',
      order_ref: reference,
      locale: 'fr',
      // Only sent when filled, so it works even before 13_order-notes.sql is run.
      ...(customer.notes.trim() ? { notes: customer.notes.trim() } : {}),
    }
    let { error: err } = await supabase.from('orders').insert(orderRow)
    // Missing `notes` column (13_order-notes.sql not run) → retry without it.
    if (err && 'notes' in orderRow && /notes/.test(err.message)) {
      const { notes: _omit, ...withoutNotes } = orderRow as Record<string, unknown>
      ;({ error: err } = await supabase.from('orders').insert(withoutNotes))
    }
    setSaving(false)
    if (err) {
      setError("Échec de l'enregistrement. " + err.message)
      return
    }
    // Best-effort stock decrement, same as the storefront checkout.
    Promise.resolve(
      supabase.rpc('decrement_stock', {
        p_items: lines.map((l) => ({ id: l.id, quantity: l.quantity })),
      }),
    ).catch(() => {})
    onSaved()
  }

  return (
    <div className="rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ink">Nouvelle commande</h2>
        <button onClick={onCancel} className="text-sm text-ink/50 hover:text-ink">← Retour</button>
      </div>

      {/* Products */}
      <p className={label}>Produits</p>
      <div className="mb-3 flex gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
          <option value="">Choisir un produit…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>
          ))}
        </select>
        <button
          onClick={addLine}
          disabled={!pick}
          className="flex-none rounded-xl bg-ink px-5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-40"
        >
          Ajouter
        </button>
      </div>

      {lines.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-ink/10 bg-cream">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5 last:border-0">
              <span className="flex-1 truncate text-sm text-ink">{l.name}</span>
              <input
                type="number"
                min="0"
                value={l.quantity}
                onChange={(e) => setQty(l.id, Number(e.target.value))}
                className="w-16 rounded-lg border border-ink/15 bg-cream px-2 py-1 text-center text-sm outline-none focus:border-ink/40"
              />
              <span className="w-24 text-right text-sm font-medium text-ink">{formatPrice(l.price * l.quantity)}</span>
              <button onClick={() => setQty(l.id, 0)} className="text-ink/30 hover:text-clay-600">✕</button>
            </div>
          ))}
          <div className="flex flex-col gap-1 bg-cream-dark/50 px-4 py-3 text-sm">
            <div className="flex justify-between text-ink/60"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-ink/60"><span>Livraison</span><span>{shipping === 0 ? 'Offerte' : formatPrice(shipping)}</span></div>
            <div className="flex justify-between border-t border-ink/10 pt-1.5 font-display font-bold text-ink"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      )}

      {/* Customer */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nom du client *</label>
          <input className={input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Mohammed El Fassi" />
        </div>
        <div>
          <label className={label}>Téléphone</label>
          <input className={input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="0612345678" />
        </div>
        <div>
          <label className={label}>Ville</label>
          <input className={input} value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="Marrakech" />
        </div>
        <div>
          <label className={label}>Email (facultatif)</label>
          <input className={input} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="client@email.com" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Adresse</label>
          <input className={input} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="32 Rue Al Amir Moulay Abdellah" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Instructions de livraison (facultatif)</label>
          <input className={input} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="Appeler avant de venir, étage, repère…" />
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-clay-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Créer la commande'}
        </button>
        <button onClick={onCancel} className="rounded-full border border-ink/15 px-6 py-2.5 text-sm text-ink hover:border-ink">
          Annuler
        </button>
      </div>
    </div>
  )
}
