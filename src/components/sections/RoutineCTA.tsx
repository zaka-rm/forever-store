import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { OrganicVisual } from '@/components/ui/OrganicVisual'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useFeature } from '@/lib/featureFlags'

export function RoutineCTA() {
  const { t } = useLanguage()
  const cta = t.home.routineCta
  const enabled = useFeature('routines')
  if (!enabled) return null

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-10">
      <RevealItem className="relative overflow-hidden rounded-5xl bg-ink px-8 py-16 sm:px-16 sm:py-20">
        <OrganicVisual tone="ink" className="absolute inset-0 opacity-60" />
        <div className="relative">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-300">
            {cta.eyebrow}
          </p>
          <h2 className="max-w-md text-balance font-display text-4xl text-cream sm:text-5xl">
            {cta.title}<span className="font-extrabold text-sage-300">{cta.titleAccent}</span>
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-cream/70">{cta.body}</p>
          <div className="mt-8">
            <Button to="/contact" variant="ghost">
              {cta.cta}
            </Button>
          </div>
        </div>
      </RevealItem>
    </SectionReveal>
  )
}
