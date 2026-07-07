import { useState } from 'react'
import { createStockAlert } from '@/lib/stockAlerts'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/** Shown on out-of-stock products: captures a "notify me when back" request. */
export function StockAlertBox({ productId, productName }: { productId: string; productName: string }) {
  const { t } = useLanguage()
  const a = t.product.stockAlert
  const [contact, setContact] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim()) return
    setSaving(true)
    setError(false)
    try {
      await createStockAlert({ productId, productName, contact })
      setDone(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return <p className="mt-4 rounded-2xl bg-sage-100 px-4 py-3 text-sm font-medium text-sage-700">{a.success}</p>
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink/10 bg-cream-dark p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span className="text-lg">🔔</span> {a.title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink/55">{a.desc}</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={a.placeholder}
          required
          className="min-w-0 flex-1 rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex-none rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
        >
          {saving ? '…' : a.submit}
        </button>
      </form>
      {error && <p className="mt-2 text-xs font-medium text-clay-600">{a.error}</p>}
    </div>
  )
}
