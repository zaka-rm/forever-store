import { useState } from 'react'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { supabase } from '@/lib/supabaseClient'
import { usePageMeta } from '@/lib/usePageMeta'

export default function BecomeDistributor() {
  const { t } = useLanguage()
  const d = t.becomeDistributor
  usePageMeta(d.eyebrow, d.subtitle)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendError, setSendError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setSendError(false)

    const { error } = await supabase.from('distributor_leads').insert({
      name,
      email,
      phone: phone || null,
      city: city || null,
      message: message || null,
    })

    setIsSubmitting(false)

    if (error) {
      setSendError(true)
      return
    }
    setSubmitted(true)
  }

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{d.eyebrow}</p>
          <h1 className="text-balance font-display text-5xl text-ink sm:text-6xl">
            {d.title}<span className="font-extrabold text-sage-600">{d.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink/65">{d.subtitle}</p>
        </RevealItem>

        <RevealItem className="mx-auto mb-20 max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {d.perks.map((perk, i) => (
              <div key={perk.title} className="rounded-4xl border border-ink/10 p-7">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 font-display text-sm font-bold text-sage-700">
                  {i + 1}
                </span>
                <p className="mb-2 font-display text-lg font-semibold text-ink">{perk.title}</p>
                <p className="text-sm leading-relaxed text-ink/60">{perk.copy}</p>
              </div>
            ))}
          </div>
        </RevealItem>

        <RevealItem className="mx-auto max-w-2xl">
          <div className="rounded-5xl border border-ink/10 bg-cream-dark p-8 sm:p-10">
            <h2 className="mb-6 text-center font-display text-2xl font-bold text-ink">{d.formTitle}</h2>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-[280px] flex-col items-center justify-center text-center"
              >
                <p className="font-display text-2xl font-bold text-sage-600">{d.successTitle}</p>
                <p className="mt-3 max-w-xs text-sm text-ink/60">{d.successBody}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{d.nameLabel}</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{d.emailLabel}</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{d.phoneLabel}</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{d.cityLabel}</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{d.messageLabel}</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-none rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </div>
                <Button type="submit" variant="primary" magnetic={false} className="mt-2 w-full" disabled={isSubmitting}>
                  {isSubmitting ? d.sending : d.sendButton}
                </Button>
                {sendError && <p className="text-center text-xs font-medium text-clay-600">{d.sendError}</p>}
              </form>
            )}
          </div>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
