import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { ProductImage } from '@/components/ui/ProductImage'
import { OversizedType } from '@/components/ui/OversizedType'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function About() {
  const { t } = useLanguage()
  const a = t.about
  usePageMeta('Notre Histoire', "Depuis 1978, Forever Living Products promeut le bien-être par l'Aloe Vera dans plus de 160 pays.")

  return (
    <div className="pb-10 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {a.eyebrow}
          </p>
          <h1 className="text-balance font-display text-5xl text-ink sm:text-6xl">
            {a.title}<span className="font-extrabold text-sage-600">{a.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink/65">{a.body}</p>
        </RevealItem>

        <RevealItem className="relative mt-16 aspect-[16/7] overflow-hidden rounded-5xl bg-stone">
          <ProductImage src="/products/page-05.jpg" alt="Plantation Forever Living Products" />
        </RevealItem>
      </SectionReveal>

      <OversizedType text={a.oversizedType} className="my-20" />

      <SectionReveal className="container-px mx-auto max-w-7xl py-10">
        <RevealItem className="mx-auto mb-14 max-w-xl text-center">
          <h2 className="text-balance font-display text-4xl text-ink sm:text-5xl">{a.valuesTitle}</h2>
        </RevealItem>
        <RevealItem className="grid gap-8 sm:grid-cols-3">
          {a.values.map((v) => (
            <div key={v.title} className="rounded-4xl border border-ink/10 p-8">
              <p className="mb-3 font-display text-xl font-semibold text-ink">{v.title}</p>
              <p className="text-sm leading-relaxed text-ink/60">{v.copy}</p>
            </div>
          ))}
        </RevealItem>
      </SectionReveal>

      <SectionReveal className="bg-cream-dark py-24 sm:py-32">
        <div className="container-px mx-auto max-w-4xl">
          <RevealItem className="mb-14 text-center">
            <h2 className="text-balance font-display text-4xl text-ink sm:text-5xl">{a.journeyTitle}</h2>
          </RevealItem>
          <RevealItem className="flex flex-col gap-10">
            {a.timeline.map((item) => (
              <div key={item.year} className="grid grid-cols-[80px_1fr] gap-6 border-l border-ink/15 pl-6 sm:grid-cols-[120px_1fr]">
                <span className="font-display text-2xl font-bold text-clay-500">{item.year}</span>
                <p className="text-sm leading-relaxed text-ink/65">{item.copy}</p>
              </div>
            ))}
          </RevealItem>
        </div>
      </SectionReveal>

      <SectionReveal className="container-px mx-auto max-w-7xl py-24 text-center sm:py-28">
        <RevealItem>
          <h2 className="mx-auto max-w-md text-balance font-display text-3xl text-ink sm:text-4xl">
            {a.ctaTitle}
          </h2>
          <div className="mt-8">
            <Button to="/shop" variant="primary">
              {a.ctaButton}
            </Button>
          </div>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
