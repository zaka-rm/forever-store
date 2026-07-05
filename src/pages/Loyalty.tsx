import { useState } from 'react'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { supabase } from '@/lib/supabaseClient'

export default function Loyalty() {
  const { t } = useLanguage()
  const l = t.loyalty
  usePageMeta('Programme Fidélité', 'Gagnez des points et des avantages à chaque commande Forever Living.')

  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [checkError, setCheckError] = useState(false)

  async function checkPoints(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setChecking(true)
    setCheckError(false)
    setResult(null)
    const { data, error } = await supabase.rpc('get_loyalty', { p_email: email.trim() })
    setChecking(false)
    if (error) {
      setCheckError(true)
      return
    }
    setResult(Number(data ?? 0))
  }

  // Tier index from points, matching the thresholds shown in l.tiers (0–2000 / 2001–5000 / 5000+).
  const tierName = result === null ? '' : l.tiers[result > 5000 ? 2 : result > 2000 ? 1 : 0].name

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mx-auto mb-16 max-w-xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{l.eyebrow}</p>
          <h1 className="text-balance font-display text-5xl text-ink sm:text-6xl">
            {l.title}<span className="font-extrabold text-sage-600">{l.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink/65">{l.subtitle}</p>
        </RevealItem>

        <RevealItem className="mx-auto mb-20 max-w-4xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold text-ink">{l.howItWorksTitle}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {l.steps.map((step, i) => (
              <div key={step.title} className="rounded-4xl border border-ink/10 p-7">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 font-display text-sm font-bold text-sage-700">
                  {i + 1}
                </span>
                <p className="mb-2 font-display text-lg font-semibold text-ink">{step.title}</p>
                <p className="text-sm leading-relaxed text-ink/60">{step.copy}</p>
              </div>
            ))}
          </div>
        </RevealItem>

        <RevealItem className="mx-auto mb-16 max-w-4xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold text-ink">{l.tiersTitle}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {l.tiers.map((tier) => (
              <div key={tier.name} className="rounded-4xl bg-cream-dark p-7 text-center">
                <p className="font-display text-2xl font-bold text-clay-500">{tier.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-ink/40">{tier.requirement}</p>
                <p className="mt-4 text-sm leading-relaxed text-ink/65">{tier.perk}</p>
              </div>
            ))}
          </div>
        </RevealItem>

        <RevealItem className="mx-auto mb-20 max-w-xl">
          <div className="rounded-4xl bg-cream-dark p-8 text-center sm:p-10">
            <h2 className="font-display text-2xl font-bold text-ink">{l.checkTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">{l.checkSubtitle}</p>
            <form onSubmit={checkPoints} className="mx-auto mt-6 flex max-w-md gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l.checkPlaceholder}
                className="min-w-0 flex-1 rounded-full border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
              <button
                type="submit"
                disabled={checking}
                className="flex-none rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
              >
                {checking ? '…' : l.checkButton}
              </button>
            </form>

            {result !== null && (
              <div className="mt-6">
                <p className="font-display text-4xl font-extrabold text-sage-600">{result}</p>
                <p className="text-sm text-ink/60">{l.checkPoints}</p>
                <p className="mt-2 inline-block rounded-full bg-sage-100 px-4 py-1 text-xs font-medium text-sage-700">
                  {l.checkTier}: {tierName}
                </p>
                <p className="mx-auto mt-4 max-w-xs text-xs text-ink/45">{l.checkHint}</p>
              </div>
            )}
            {checkError && <p className="mt-4 text-sm font-medium text-clay-600">{l.checkError}</p>}
          </div>
        </RevealItem>

        <RevealItem className="mx-auto max-w-2xl text-center">
          <p className="mb-8 text-xs leading-relaxed text-ink/40">{l.disclaimer}</p>
          <Button to="/contact" variant="primary">
            {l.cta}
          </Button>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
