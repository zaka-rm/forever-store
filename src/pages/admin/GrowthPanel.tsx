import { useEffect, useState } from 'react'
import {
  fetchSubscribers,
  deleteSubscriber,
  subscribersToCsv,
  fetchDistributorLeads,
  setLeadHandled,
  deleteLead,
  fetchDeliveryZones,
  saveDeliveryZone,
  deleteDeliveryZone,
  fetchReferrals,
  setReferralRewarded,
  fetchLoyalty,
  fetchSubscriptions,
  advanceSubscription,
  setSubscriptionActive,
  deleteSubscription,
  type SubscriberRow,
  type DistributorLeadRow,
  type DeliveryZoneRow,
  type ReferralRow,
  type LoyaltyRow,
  type SubscriptionRow,
} from '@/lib/adminGrowth'
import { formatDate } from '@/lib/adminData'
import { formatPrice } from '@/lib/format'
import { toWhatsAppNumber, waLink } from '@/lib/whatsapp'

type SubTab = 'subscribers' | 'leads' | 'zones' | 'referrals' | 'loyalty' | 'subscriptions'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'subscribers', label: 'Abonnés' },
  { key: 'subscriptions', label: 'Abonnements' },
  { key: 'leads', label: 'Distributeurs' },
  { key: 'zones', label: 'Livraison' },
  { key: 'referrals', label: 'Parrainage' },
  { key: 'loyalty', label: 'Fidélité' },
]

export function GrowthPanel() {
  const [sub, setSub] = useState<SubTab>('subscribers')

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-ink/10">
        {SUB_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSub(s.key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
              sub === s.key ? 'text-ink' : 'text-ink/45 hover:text-ink/70'
            }`}
          >
            {s.label}
            {sub === s.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        ))}
      </div>
      {sub === 'subscribers' && <SubscribersTab />}
      {sub === 'leads' && <LeadsTab />}
      {sub === 'zones' && <ZonesTab />}
      {sub === 'referrals' && <ReferralsTab />}
      {sub === 'loyalty' && <LoyaltyTab />}
      {sub === 'subscriptions' && <SubscriptionsTab />}
    </div>
  )
}

function SubscriptionsTab() {
  const [rows, setRows] = useState<SubscriptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubscriptions()
      .then(setRows)
      .catch(() => setError("Impossible de charger les abonnements. Avez-vous exécuté 16_subscriptions.sql ?"))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  async function markDelivered(r: SubscriptionRow) {
    const next = await advanceSubscription(r.id, r.next_date)
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, next_date: next } : x)))
  }
  async function toggle(r: SubscriptionRow) {
    await setSubscriptionActive(r.id, !r.active)
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)))
  }
  async function remove(r: SubscriptionRow) {
    if (!confirm(`Supprimer l'abonnement de ${r.name} ?`)) return
    await deleteSubscription(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  const due = rows.filter((r) => r.active && r.next_date <= today).length

  return (
    <div>
      <p className="mb-4 text-xs text-ink/45">
        Livraisons mensuelles demandées par vos clients. Les abonnements « à livrer » sont dus aujourd'hui ou en retard —
        préparez la commande (onglet Commandes → Nouvelle commande), contactez le client, puis cliquez « Livré ».
        {due > 0 && <span className="ml-1 font-medium text-clay-600">{due} à livrer.</span>}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucun abonnement pour le moment.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => {
            const isDue = r.active && r.next_date <= today
            return (
              <div key={r.id} className={`flex flex-wrap items-center gap-3 border-b border-ink/10 px-4 py-3 last:border-0 ${!r.active ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.name} · <span className="text-ink/60">{r.product_name} × {r.quantity}</span>
                  </p>
                  <p className="text-xs text-ink/45">{r.phone || r.email || '—'} · prochaine : {formatDate(r.next_date)}</p>
                </div>
                {isDue && <span className="flex-none rounded-full bg-clay-500/90 px-2 py-0.5 text-[10px] font-medium uppercase text-cream">À livrer</span>}
                {r.phone && (
                  <a
                    href={waLink(toWhatsAppNumber(r.phone), `Bonjour ${r.name}, c'est Forever 🌿 Votre livraison mensuelle de ${r.product_name} est prête. On vous livre quand ?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:brightness-95"
                  >
                    💬
                  </a>
                )}
                {r.active && (
                  <button onClick={() => markDelivered(r)} className="flex-none rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream hover:bg-sage-700">
                    Livré
                  </button>
                )}
                <button onClick={() => toggle(r)} className="flex-none rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink">
                  {r.active ? 'Pause' : 'Reprendre'}
                </button>
                <button onClick={() => remove(r)} className="flex-none text-ink/30 hover:text-clay-600">✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LoyaltyTab() {
  const [rows, setRows] = useState<LoyaltyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setRows(await fetchLoyalty())
      } catch {
        setError("Impossible de charger les points. Avez-vous exécuté 12_loyalty-program.sql ?")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <div>
      <p className="mb-4 text-xs text-ink/45">
        Les points sont crédités automatiquement (1 point par DH) lorsqu'une commande passe au statut « Livrée ».
        Pour récompenser un client, créez-lui un code promo dans l'onglet « Codes promo ».
      </p>
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucun point pour le moment. Marquez une commande « Livrée » pour créditer le client.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => (
            <div key={r.email} className="flex items-center gap-4 border-b border-ink/10 px-4 py-3 last:border-0">
              <span className="flex-1 truncate text-sm text-ink">{r.email}</span>
              <span className="flex-none font-display text-lg font-bold text-sage-600">{r.points}</span>
              <span className="flex-none text-xs text-ink/40">pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SubscribersTab() {
  const [rows, setRows] = useState<SubscriberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchSubscribers())
    } catch {
      setError("Impossible de charger les abonnés. Avez-vous exécuté 10_growth-features.sql ?")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function exportCsv() {
    const csv = subscribersToCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'abonnes-newsletter.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(r: SubscriberRow) {
    if (!confirm(`Retirer ${r.email} ?`)) return
    await deleteSubscriber(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink/60">{rows.length} abonné{rows.length > 1 ? 's' : ''}</p>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-medium text-ink hover:border-ink">
            Exporter en CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">Aucun abonné pour le moment.</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-4 border-b border-ink/10 px-4 py-3 last:border-0">
              <span className="flex-1 truncate text-sm text-ink">{r.email}</span>
              <span className="flex-none text-xs text-ink/40">{formatDate(r.created_at)}</span>
              <button onClick={() => handleDelete(r)} className="flex-none rounded-full border border-clay-500/30 px-2.5 py-1 text-xs text-clay-600 hover:border-clay-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LeadsTab() {
  const [rows, setRows] = useState<DistributorLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchDistributorLeads())
    } catch {
      setError("Impossible de charger les candidatures. Avez-vous exécuté 10_growth-features.sql ?")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function toggle(r: DistributorLeadRow) {
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, handled: !x.handled } : x)))
    try {
      await setLeadHandled(r.id, !r.handled)
    } catch {
      load()
    }
  }

  async function handleDelete(r: DistributorLeadRow) {
    if (!confirm(`Supprimer la candidature de ${r.name} ?`)) return
    await deleteLead(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <div>
      <p className="mb-4 text-sm text-ink/60">{rows.length} candidature{rows.length > 1 ? 's' : ''}</p>
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">Aucune candidature pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-3xl border bg-cream-dark p-5 ${r.handled ? 'border-ink/10 opacity-60' : 'border-sage-300/50'}`}>
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{r.name} {r.city ? `— ${r.city}` : ''}</p>
                  <p className="truncate text-xs text-ink/45">
                    <a href={`mailto:${r.email}`} className="hover:text-ink">{r.email}</a>
                    {r.phone ? ` · ${r.phone}` : ''} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <button onClick={() => toggle(r)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${r.handled ? 'border border-ink/15 text-ink/50' : 'bg-ink text-cream hover:bg-sage-700'}`}>
                    {r.handled ? 'Rouvrir' : 'Marquer traité'}
                  </button>
                  <button onClick={() => handleDelete(r)} className="rounded-full border border-clay-500/30 px-2.5 py-1.5 text-xs text-clay-600 hover:border-clay-500">✕</button>
                </div>
              </div>
              {r.message && <p className="whitespace-pre-wrap text-sm text-ink/70">{r.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ZonesTab() {
  const [rows, setRows] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ city: '', fee: 6, free_threshold: '' as number | '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchDeliveryZones())
    } catch {
      setError("Impossible de charger les zones. Avez-vous exécuté 10_growth-features.sql ?")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.city.trim()) return
    setSaving(true)
    setError('')
    try {
      await saveDeliveryZone(
        { city: form.city.trim(), fee: Number(form.fee), free_threshold: form.free_threshold === '' ? null : Number(form.free_threshold), active: true },
        true,
      )
      setForm({ city: '', fee: 6, free_threshold: '' })
      load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('duplicate') || msg.includes('unique') ? 'Cette ville a déjà une zone.' : "Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: DeliveryZoneRow) {
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))
    try {
      await saveDeliveryZone({ id: r.id, city: r.city, active: !r.active }, false)
    } catch {
      load()
    }
  }

  async function handleDelete(r: DeliveryZoneRow) {
    if (!confirm(`Supprimer la zone « ${r.city} » ?`)) return
    await deleteDeliveryZone(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  const input = 'rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40'
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-ink/45">
        Définissez des frais de livraison par ville. Les villes non listées ci-dessous utilisent le tarif par défaut du site.
      </p>
      <form onSubmit={handleCreate} className="rounded-3xl border border-ink/10 bg-cream-dark p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={label}>Ville</label>
            <input className={`${input} w-full`} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Casablanca" />
          </div>
          <div>
            <label className={label}>Frais (DH)</label>
            <input type="number" min="0" step="0.01" className={`${input} w-full`} value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label}>Gratuit dès (DH, facultatif)</label>
            <input type="number" min="0" className={`${input} w-full`} value={form.free_threshold} onChange={(e) => setForm({ ...form, free_threshold: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="—" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60">
              {saving ? '…' : 'Ajouter'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">Aucune zone définie — tarif par défaut appliqué partout.</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-ink/10 px-4 py-3 last:border-0">
              <span className="font-medium text-ink">{r.city}</span>
              <span className="text-xs text-ink/60">
                {formatPrice(Number(r.fee))} {r.free_threshold ? `· gratuit dès ${formatPrice(Number(r.free_threshold), 0)}` : ''}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => toggleActive(r)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${r.active ? 'bg-sage-100 text-sage-700' : 'border border-ink/15 text-ink/50'}`}>
                  {r.active ? 'Actif' : 'Inactif'}
                </button>
                <button onClick={() => handleDelete(r)} className="rounded-full border border-clay-500/30 px-3 py-1.5 text-xs text-clay-600 hover:border-clay-500">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReferralsTab() {
  const [rows, setRows] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchReferrals())
    } catch {
      setError("Impossible de charger les parrainages. Avez-vous exécuté 10_growth-features.sql ?")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function toggle(r: ReferralRow) {
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, rewarded: !x.rewarded } : x)))
    try {
      await setReferralRewarded(r.id, !r.rewarded)
    } catch {
      load()
    }
  }

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <div>
      <p className="mb-4 text-xs text-ink/45">
        Un client existant partage sa référence de commande (ex. FL12345678). Un nouveau client qui l'utilise au moment de payer
        crée une ligne ici. Marquez « Récompensé » une fois que vous avez envoyé la récompense au parrain (ex. code promo, cadeau).
      </p>
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">Aucun parrainage pour le moment.</p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-ink/10 px-4 py-3 last:border-0">
              <span className="text-sm text-ink">
                Parrain <span className="font-mono font-medium">#{r.referrer_ref}</span> → nouvelle commande <span className="font-mono font-medium">#{r.referred_order_ref}</span>
              </span>
              <span className="text-xs text-ink/40">{formatDate(r.created_at)}</span>
              <button onClick={() => toggle(r)} className={`ml-auto rounded-full px-3 py-1.5 text-xs font-medium ${r.rewarded ? 'bg-sage-100 text-sage-700' : 'border border-ink/15 text-ink/50'}`}>
                {r.rewarded ? 'Récompensé ✓' : 'Marquer récompensé'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
