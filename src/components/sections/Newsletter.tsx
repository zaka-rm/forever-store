import { useState } from 'react'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  isPublicFormConfigurationError,
  isValidEmail,
  subscribeToNewsletter,
} from '@/lib/publicForms'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { t } = useLanguage()
  const section = t.home.newsletter

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim()
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage(section.invalid)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await subscribeToNewsletter(normalizedEmail)
      setSubmitted(true)
      setEmail('')
    } catch (error) {
      setErrorMessage(isPublicFormConfigurationError(error) ? section.unavailable : section.error)
    } finally {
      setIsSubmitting(false)
    }
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
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 font-display text-lg font-bold text-sage-600"
          >
            {section.success}
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <label htmlFor="home-newsletter-email" className="sr-only">{section.placeholder}</label>
            <input
              id="home-newsletter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMessage('')
              }}
              placeholder={section.placeholder}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? 'home-newsletter-error' : undefined}
              className="w-full rounded-full border border-ink/15 bg-cream px-5 py-3.5 text-sm text-ink outline-none transition-colors focus:border-ink/40 sm:w-72"
            />
            <Button type="submit" variant="primary" magnetic={false} disabled={isSubmitting}>
              {isSubmitting ? section.sending : section.cta}
            </Button>
            {errorMessage && (
              <p id="home-newsletter-error" role="alert" className="text-sm font-medium text-clay-600 sm:basis-full">
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </RevealItem>
    </SectionReveal>
  )
}
