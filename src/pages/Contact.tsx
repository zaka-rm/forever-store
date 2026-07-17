import { useState } from 'react'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NOTIFICATION_EMAIL } from '@/lib/constants'
import { supabase } from '@/lib/supabaseClient'
import {
  isPublicFormConfigurationError,
  isValidEmail,
  requirePublicFormStorage,
} from '@/lib/publicForms'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Contact() {
  usePageMeta('Contact', 'Contactez votre Distributeur Indépendant Forever Living Products pour toute question ou commande.')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendError, setSendError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const { t } = useLanguage()
  const c = t.contact

  const info = [
    { label: c.infoLabels.email, value: NOTIFICATION_EMAIL },
    { label: c.infoLabels.phone, value: '06 00 00 00 00' },
    { label: c.infoLabels.availability, value: 'Sur rendez-vous, Lun–Ven 9h–18h' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()

    if (!cleanName || !isValidEmail(cleanEmail) || !cleanMessage) {
      setSendError(c.invalid)
      return
    }

    setIsSubmitting(true)
    setSendError('')
    try {
      requirePublicFormStorage()
      const { error } = await supabase.from('contact_messages').insert({
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject || null,
        message: cleanMessage,
      })
      if (error) throw error
      setSubmitted(true)
    } catch (error) {
      setSendError(isPublicFormConfigurationError(error) ? c.unavailable : c.sendError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mx-auto mb-16 max-w-xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {c.eyebrow}
          </p>
          <h1 className="text-balance font-display text-5xl text-ink sm:text-6xl">
            {c.title}<span className="font-extrabold text-sage-600">{c.titleAccent}</span>
          </h1>
        </RevealItem>

        <RevealItem className="grid gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="flex flex-col gap-8">
              {info.map((item) => (
                <div key={item.label}>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink/40">
                    {item.label}
                  </p>
                  <p className="font-display text-xl font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex gap-3">
              {['IG', 'TT', 'PI'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-xs text-ink/70 transition-colors hover:border-ink hover:text-ink"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-5xl border border-ink/10 bg-cream-dark p-8 sm:p-10">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full min-h-[320px] flex-col items-center justify-center text-center"
              >
                <p role="status" aria-live="polite" className="font-display text-2xl font-bold text-sage-600">{c.successTitle}</p>
                <p className="mt-3 max-w-xs text-sm text-ink/60">{c.successBody}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                      {c.nameLabel}
                    </label>
                    <input
                      id="contact-name"
                      required
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setSendError('') }}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                      {c.emailLabel}
                    </label>
                    <input
                      id="contact-email"
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setSendError('') }}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                    {c.subjectLabel}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                    {c.messageLabel}
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setSendError('') }}
                    className="w-full resize-none rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </div>
                <Button type="submit" variant="primary" magnetic={false} className="mt-2 w-full" disabled={isSubmitting}>
                  {isSubmitting ? c.sending : c.sendButton}
                </Button>
                {sendError && <p role="alert" className="text-center text-xs font-medium text-clay-600">{sendError}</p>}
                <p className="text-center text-xs text-ink/40">{c.mailHint}</p>
              </form>
            )}
          </div>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
