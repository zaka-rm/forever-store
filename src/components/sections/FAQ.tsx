import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Accordion } from '@/components/ui/Accordion'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function FAQ() {
  const { t } = useLanguage()
  const section = t.home.faq

  return (
    <SectionReveal className="bg-cream-dark py-24 sm:py-32">
      <div className="container-px mx-auto max-w-3xl">
        <RevealItem className="mb-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{section.eyebrow}</p>
          <h2 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {section.title}
          </h2>
        </RevealItem>
        <RevealItem>
          <Accordion items={[...section.items]} />
        </RevealItem>
      </div>
    </SectionReveal>
  )
}
