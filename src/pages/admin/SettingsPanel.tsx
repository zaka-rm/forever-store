import { useEffect, useState } from 'react'
import { fetchSiteSettings, saveSiteSettings, type SiteSettings } from '@/lib/siteSettings'
import { FLAG_DEFS, fetchFlags, setFlag, type Flags } from '@/lib/featureFlags'

const input = 'w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40'
const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

export function SettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>({ announcement_fr: '', announcement_ar: '', announcement_active: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        if (s) setSettings({ announcement_fr: s.announcement_fr ?? '', announcement_ar: s.announcement_ar ?? '', announcement_active: s.announcement_active })
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

      <FeatureManager />
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
