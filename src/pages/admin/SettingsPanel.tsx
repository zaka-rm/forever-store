import { useEffect, useState } from 'react'
import { fetchSiteSettings, saveSiteSettings, type SiteSettings } from '@/lib/siteSettings'

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
    </div>
  )
}
