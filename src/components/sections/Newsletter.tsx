import { useState } from 'react'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { t } = useLanguage()
  const section = t.home.newsletter

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-24 sm:py-28">
      <RevealItem className="mx-auto max-w-xl text-center">
        <h2 className="text-balance font-display text-3xl text-ink sm:text-4xl">
          {section.title} <span className="font-extrabold text-sage-600">{section.titleAccent}</span>
        </h2>
        <p className="mt-4 text-sm text-ink/60">{section.subtitle}</p>

        {submitted ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 font-display text-lg font-bold text-sage-600"
          >
            {section.success}
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={section.placeholder}
              className="w-full rounded-full border border-ink/15 bg-cream px-5 py-3.5 text-sm text-ink outline-none transition-colors focus:border-ink/40 sm:w-72"
            />
            <Button type="submit" variant="primary" magnetic={false}>
              {section.cta}
            </Button>
          </form>
        )}
      </RevealItem>
    </SectionReveal>
  )
}
