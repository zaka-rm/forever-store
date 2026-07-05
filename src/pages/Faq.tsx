import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { JsonLd } from '@/components/ui/JsonLd'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Faq() {
  const { t } = useLanguage()
  const f = t.faq
  usePageMeta(`${f.title}${f.titleAccent}`, f.subtitle)

  const items = f.items.map((item) => ({ title: item.q, content: item.a }))

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: f.items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />
      <SectionReveal immediate className="container-px mx-auto max-w-3xl">
        <RevealItem className="mb-14 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{f.eyebrow}</p>
          <h1 className="text-balance font-display text-5xl text-ink sm:text-6xl">
            {f.title}<span className="font-extrabold text-sage-600">{f.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink/65">{f.subtitle}</p>
        </RevealItem>

        <RevealItem>
          <Accordion items={items} />
        </RevealItem>

        <RevealItem className="mt-16 rounded-4xl bg-cream-dark p-10 text-center">
          <p className="mb-5 font-display text-2xl font-bold text-ink">{f.stillTitle}</p>
          <Button to="/contact" variant="primary">
            {f.stillCta}
          </Button>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
