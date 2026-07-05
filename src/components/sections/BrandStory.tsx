import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { ProductImage } from '@/components/ui/ProductImage'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function BrandStory() {
  const { t } = useLanguage()
  const story = t.home.brandStory

  return (
    <SectionReveal className="bg-cream-dark py-24 sm:py-32">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <RevealItem className="relative aspect-[4/3] overflow-hidden rounded-5xl bg-stone">
          <ProductImage src="/products/page-04.jpg" alt="Plantation d'Aloe Vera Forever Living" />
        </RevealItem>

        <div>
          <RevealItem>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
              {story.eyebrow}
            </p>
            <h2 className="max-w-lg text-balance font-display text-4xl text-ink sm:text-5xl">
              {story.title}<span className="font-extrabold text-sage-600">{story.titleAccent}</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink/65">{story.body}</p>
            <div className="mt-8">
              <Button to="/about" variant="secondary">
                {story.cta}
              </Button>
            </div>
          </RevealItem>

          <RevealItem className="mt-12 grid gap-8 sm:grid-cols-3">
            {story.pillars.map((p) => (
              <div key={p.title}>
                <p className="mb-2 font-display text-lg font-semibold text-ink">{p.title}</p>
                <p className="text-sm leading-relaxed text-ink/60">{p.copy}</p>
              </div>
            ))}
          </RevealItem>
        </div>
      </div>
    </SectionReveal>
  )
}
