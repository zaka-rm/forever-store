import { useEffect, useState } from 'react'
import {
  fetchDiscounts,
  saveDiscount,
  deleteDiscount,
  formatDate,
  type DiscountRow,
} from '@/lib/adminData'
import { formatPrice } from '@/lib/format'

const empty = {
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  value: 10,
  min_subtotal: '' as number | '',
  active: true,
  expires_at: '' as string,
}

export function DiscountsPanel() {
  const [rows, setRows] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ ...empty })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchDiscounts())
    } catch {
      setError("Impossible de charger les codes. Avez-vous exécuté 08_new-features.sql ?")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) return
    setSaving(true)
    setError('')
    try {
      await saveDiscount(
        {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: Number(form.value),
          min_subtotal: form.min_subtotal === '' ? null : Number(form.min_subtotal),
          active: true,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        },
        true,
      )
      setForm({ ...empty })
      load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('duplicate') || msg.includes('unique') ? 'Ce code existe déjà.' : "Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: DiscountRow) {
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))
    try {
      await saveDiscount({ id: r.id, code: r.code, active: !r.active }, false)
    } catch {
      load()
    }
  }

  async function handleDelete(r: DiscountRow) {
    if (!confirm(`Supprimer le code ${r.code} ?`)) return
    await deleteDiscount(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  const input = 'rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40'
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleCreate} className="rounded-3xl border border-ink/10 bg-cream-dark p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-ink">Nouveau code promo</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>Code</label>
            <input className={`${input} w-full uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BIENVENUE10" />
          </div>
          <div>
            <label className={label}>Type</label>
            <select className={`${input} w-full`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}>
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (DH)</option>
            </select>
          </div>
          <div>
            <label className={label}>Valeur ({form.type === 'percent' ? '%' : 'DH'})</label>
            <input type="number" min="0" step="0.01" className={`${input} w-full`} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label}>Min. panier (DH, facultatif)</label>
            <input type="number" min="0" className={`${input} w-full`} value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="—" />
          </div>
          <div>
            <label className={label}>Expire le (facultatif)</label>
            <input type="date" className={`${input} w-full`} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60">
              {saving ? 'Création…' : 'Créer le code'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
      </form>

      {loading ? (
        <p className="py-8 text-center text-ink/40">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">Aucun code promo pour le moment.</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => {
            const expired = r.expires_at ? new Date(r.expires_at) < new Date() : false
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-ink/10 px-4 py-3 last:border-0">
                <span className="font-mono text-sm font-bold text-ink">{r.code}</span>
                <span className="text-xs text-ink/60">
                  {r.type === 'percent' ? `−${r.value}%` : `−${formatPrice(Number(r.value))}`}
                  {r.min_subtotal ? ` · dès ${formatPrice(Number(r.min_subtotal), 0)}` : ''}
                </span>
                {expired && <span className="rounded-full bg-clay-500/10 px-2 py-0.5 text-[11px] text-clay-600">Expiré</span>}
                {r.expires_at && !expired && <span className="text-[11px] text-ink/40">exp. {formatDate(r.expires_at)}</span>}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${r.active ? 'bg-sage-100 text-sage-700' : 'border border-ink/15 text-ink/50'}`}
                  >
                    {r.active ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => handleDelete(r)} className="rounded-full border border-clay-500/30 px-3 py-1.5 text-xs text-clay-600 hover:border-clay-500">
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
