import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createSubscription } from '@/lib/subscriptions'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/** "Recevoir chaque mois" — lets a customer subscribe to monthly re-delivery. */
export function SubscribeBox({ productId, productName }: { productId: string; productName: string }) {
  const { t } = useLanguage()
  const s = t.product.subscribe
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setSaving(true)
    setError(false)
    try {
      await createSubscription({ name, phone, productId, productName })
      setDone(true)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return <p className="mt-4 rounded-2xl bg-sage-100 px-4 py-3 text-sm font-medium text-sage-700">{s.success}</p>
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink/10 bg-cream-dark p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="text-lg">🔁</span> {s.cta}
        </span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-lg text-ink/40">+</motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-xs leading-relaxed text-ink/55">{s.desc}</p>
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={s.name}
                required
                className="rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={s.phone}
                type="tel"
                required
                className="rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
              >
                {saving ? '…' : s.submit}
              </button>
              {error && <p className="text-xs font-medium text-clay-600">{s.error}</p>}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
