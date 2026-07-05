import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const tones = ['bg-sage-100 text-sage-700', 'bg-clay-300/40 text-clay-600', 'bg-stone text-ink/70', 'bg-sage-100 text-sage-700']

export function IngredientSpotlight() {
  const { t } = useLanguage()
  const section = t.home.ingredientSpotlight

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-24 sm:py-32">
      <RevealItem className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
          {section.eyebrow}
        </p>
        <h2 className="text-balance font-display text-4xl text-ink sm:text-5xl">
          {section.title}<span className="font-extrabold text-clay-500">{section.titleAccent}</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">{section.subtitle}</p>
      </RevealItem>

      <RevealItem className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {section.facts.map((item, i) => (
          <div
            key={item.name}
            className="flex flex-col gap-4 rounded-4xl border border-ink/10 bg-cream p-7 transition-shadow hover:shadow-card"
          >
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${tones[i]}`}>
              Aloe Vera
            </span>
            <p className="font-display text-xl font-semibold text-ink">{item.name}</p>
            <p className="text-sm leading-relaxed text-ink/60">{item.copy}</p>
          </div>
        ))}
      </RevealItem>
    </SectionReveal>
  )
}
