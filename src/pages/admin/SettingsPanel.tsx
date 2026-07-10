import { useEffect, useState } from 'react'
import { fetchSiteSettings, saveSiteSettings, type SiteSettings } from '@/lib/siteSettings'
import { FLAG_DEFS, fetchFlags, setFlag, type Flags } from '@/lib/featureFlags'
import { fetchTestimonials, addTestimonial, setTestimonialActive, deleteTestimonial, type TestimonialRow } from '@/lib/testimonials'
import { uploadProductImage } from '@/lib/adminProducts'

const input = 'w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40'
const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

export function SettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>({ announcement_fr: '', announcement_ar: '', announcement_active: false, story_fr: '', story_ar: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        if (s) setSettings({ announcement_fr: s.announcement_fr ?? '', announcement_ar: s.announcement_ar ?? '', announcement_active: s.announcement_active, story_fr: s.story_fr ?? '', story_ar: s.story_ar ?? '' })
        else setError("Réglages introuvables. Avez-vous exécuté 14_site-settings.sql ?")
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await saveSiteSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("Échec de l'enregistrement. Avez-vous exécuté 14_site-settings.sql ?")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="py-8 text-center text-ink/40">Chargement…</p>

  return (
    <div className="max-w-2xl">
      <div className="rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-ink">Bandeau d'annonce</h2>
        <p className="mt-1 mb-6 text-sm text-ink/55">
          Le message promotionnel affiché en haut de chaque page (ex : « Livraison offerte dès 500 DH »).
        </p>

        <label className="mb-5 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.announcement_active}
            onChange={(e) => setSettings({ ...settings, announcement_active: e.target.checked })}
            className="h-5 w-5 rounded accent-sage-600"
          />
          <span className="text-sm font-medium text-ink">Afficher le bandeau</span>
        </label>

        <div className="mb-4">
          <label className={label}>Message (Français)</label>
          <input
            className={input}
            value={settings.announcement_fr ?? ''}
            onChange={(e) => setSettings({ ...settings, announcement_fr: e.target.value })}
            placeholder="Livraison offerte dès 500 DH 🚚"
          />
        </div>
        <div className="mb-6">
          <label className={label}>Message (العربية)</label>
          <input
            dir="rtl"
            className={input}
            value={settings.announcement_ar ?? ''}
            onChange={(e) => setSettings({ ...settings, announcement_ar: e.target.value })}
            placeholder="شحن مجاني ابتداءً من 500 درهم 🚚"
          />
        </div>

        {/* Live preview */}
        {settings.announcement_active && (settings.announcement_fr || settings.announcement_ar) && (
          <div className="mb-6">
            <p className={label}>Aperçu</p>
            <div className="rounded-xl bg-sage-700 px-4 py-2 text-center text-sm font-medium text-cream">
              {settings.announcement_fr || settings.announcement_ar}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span className="text-sm font-medium text-sage-700">Enregistré ✓</span>}
        </div>
        {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
      </div>

      {/* --- Votre histoire ------------------------------------------------ */}
      <div className="mt-6 rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold text-ink">Votre histoire (« Qui suis-je »)</h2>
        <p className="mt-1 mb-6 text-sm text-ink/55">
          Quelques phrases honnêtes sur qui vous êtes — affichées sur l'accueil. Les gens achètent
          à des personnes, pas à des boutiques anonymes. Pas besoin de montrer votre visage.
          Laissez vide pour masquer la section.
        </p>
        <div className="mb-4">
          <label className={label}>Votre histoire (Français)</label>
          <textarea
            rows={4}
            className={`${input} resize-y`}
            value={settings.story_fr ?? ''}
            onChange={(e) => setSettings({ ...settings, story_fr: e.target.value })}
            placeholder="Je m'appelle …, distributeur indépendant Forever Living à Kelaa des Sraghna. J'ai découvert l'Aloe Vera quand…"
          />
        </div>
        <div className="mb-6">
          <label className={label}>Votre histoire (العربية)</label>
          <textarea
            dir="rtl"
            rows={4}
            className={`${input} resize-y`}
            value={settings.story_ar ?? ''}
            onChange={(e) => setSettings({ ...settings, story_ar: e.target.value })}
            placeholder="اسمي …، موزع مستقل لمنتجات فوريفر في قلعة السراغنة…"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span className="text-sm font-medium text-sage-700">Enregistré ✓</span>}
        </div>
      </div>

      <TestimonialsManager />

      <FeatureManager />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Témoignages en capture d'écran : uploadez les beaux messages WhatsApp de vos
// clients (numéros floutés !) — affichés sur l'accueil.
// ---------------------------------------------------------------------------
function TestimonialsManager() {
  const [rows, setRows] = useState<TestimonialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTestimonials()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadProductImage('testimonials', file)
      await addTestimonial(url, caption.trim() || null)
      setCaption('')
      setRows(await fetchTestimonials())
    } catch {
      setError("Échec de l'envoi. Avez-vous exécuté 28_story-testimonials.sql ?")
    } finally {
      setUploading(false)
    }
  }

  async function toggle(r: TestimonialRow) {
    setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x)))
    try {
      await setTestimonialActive(r.id, !r.active)
    } catch {
      setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: r.active } : x)))
    }
  }

  async function remove(r: TestimonialRow) {
    if (!confirm('Supprimer cette capture ?')) return
    await deleteTestimonial(r.id)
    setRows((list) => list.filter((x) => x.id !== r.id))
  }

  return (
    <div className="mt-6 rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-ink">Témoignages WhatsApp</h2>
      <p className="mt-1 mb-6 text-sm text-ink/55">
        Vos clients envoient rarement un avis via le formulaire, mais ils envoient de beaux
        messages WhatsApp. Uploadez les captures d'écran (⚠️ floutez les numéros et noms !) —
        elles s'affichent sur l'accueil.
      </p>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className={label}>Légende (facultative)</label>
          <input
            className={input}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Cliente de Marrakech — Pack Digestion"
          />
        </div>
        <label className="flex cursor-pointer items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700">
          {uploading ? 'Envoi…' : '+ Ajouter une capture'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="mb-4 text-sm font-medium text-clay-600">{error}</p>}

      {loading ? (
        <p className="py-4 text-center text-ink/40">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-cream py-8 text-center text-sm text-ink/40">
          Aucune capture pour le moment.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map((r) => (
            <div key={r.id} className={`overflow-hidden rounded-2xl border border-ink/10 bg-cream ${r.active ? '' : 'opacity-50'}`}>
              <img src={r.image} alt="" className="aspect-[3/4] w-full object-cover" />
              {r.caption && <p className="truncate px-2 pt-1.5 text-[11px] text-ink/55">{r.caption}</p>}
              <div className="flex items-center justify-between px-2 py-1.5">
                <button onClick={() => toggle(r)} className="text-[11px] font-medium text-ink/60 hover:text-ink">
                  {r.active ? 'Masquer' : 'Afficher'}
                </button>
                <button onClick={() => remove(r)} className="text-[11px] text-clay-600 hover:underline">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gestionnaire de fonctions : chaque fonctionnalité du site s'active ou se
// désactive individuellement, effet immédiat pour les visiteurs (au prochain
// chargement de page), sans redéploiement.
// ---------------------------------------------------------------------------
function FeatureManager() {
  const [flags, setFlags] = useState<Flags>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState('')

  useEffect(() => {
    fetchFlags()
      .then(setFlags)
      .finally(() => setLoading(false))
  }, [])

  async function toggle(key: string) {
    const next = !(flags[key] ?? true)
    setFlags((f) => ({ ...f, [key]: next }))
    setSavingKey(key)
    setError('')
    try {
      await setFlag(key, next)
    } catch {
      setFlags((f) => ({ ...f, [key]: !next }))
      setError("Échec de l'enregistrement. Avez-vous exécuté 26_feature-flags.sql ?")
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="mt-6 rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-ink">Gestionnaire de fonctions</h2>
      <p className="mt-1 mb-6 text-sm text-ink/55">
        Activez ou désactivez chaque fonctionnalité du site individuellement. Le changement est
        immédiat pour les visiteurs (au prochain chargement de page).
      </p>

      {loading ? (
        <p className="py-6 text-center text-ink/40">Chargement…</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink/10">
          {FLAG_DEFS.map((def) => {
            const on = flags[def.key] ?? def.default
            return (
              <div key={def.key} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{def.label}</p>
                  <p className="mt-0.5 text-xs text-ink/50">{def.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={savingKey === def.key}
                  onClick={() => toggle(def.key)}
                  className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${
                    on ? 'bg-sage-600' : 'bg-ink/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-cream shadow transition-all ${
                      on ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium text-clay-600">{error}</p>}
    </div>
  )
}
