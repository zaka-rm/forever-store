import { useRef } from 'react'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { RatingStars } from '@/components/ui/RatingStars'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Testimonials() {
  const dragRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()
  const section = t.home.testimonials

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-24 sm:py-32">
      <RevealItem className="mx-auto mb-12 max-w-xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
          {section.eyebrow}
        </p>
        <h2 className="text-balance font-display text-4xl text-ink sm:text-5xl">
          {section.title}<span className="font-extrabold text-clay-500">{section.titleAccent}</span>
        </h2>
      </RevealItem>

      <RevealItem>
        <motion.div
          ref={dragRef}
          className="cursor-grab overflow-x-auto pb-4 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <motion.div
            drag="x"
            dragConstraints={dragRef}
            className="flex w-max gap-6"
          >
            {section.items.map((item) => (
              <div
                key={item.name}
                className="w-[280px] flex-none select-none rounded-4xl border border-ink/10 bg-cream-dark p-7 sm:w-[320px]"
              >
                <RatingStars rating={item.rating} className="mb-4" />
                <p className="font-display text-lg font-medium leading-snug text-ink">"{item.quote}"</p>
                <p className="mt-5 text-sm font-medium text-ink/60">{item.name}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </RevealItem>
    </SectionReveal>
  )
}
