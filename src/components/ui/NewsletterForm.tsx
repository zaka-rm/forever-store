import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  isPublicFormConfigurationError,
  isValidEmail,
  subscribeToNewsletter,
} from '@/lib/publicForms'

export function NewsletterForm() {
  const { t } = useLanguage()
  const n = t.newsletter
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.trim()
    if (!isValidEmail(normalizedEmail)) {
      setStatus('error')
      setErrorMessage(n.invalid)
      return
    }
    setStatus('loading')
    setErrorMessage('')
    try {
      await subscribeToNewsletter(normalizedEmail)
    } catch (error) {
      setStatus('error')
      setErrorMessage(isPublicFormConfigurationError(error) ? n.unavailable : n.error)
      return
    }
    setStatus('done')
    setEmail('')
  }

  if (status === 'done') {
    return <p role="status" aria-live="polite" className="text-sm font-medium text-sage-700">{n.thanks}</p>
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={status === 'loading'} className="flex flex-col gap-2" noValidate>
      <p className="text-xs font-medium uppercase tracking-wider text-ink/40">{n.title}</p>
      <div className="flex gap-2">
        <input
          id="footer-newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder={n.placeholder}
          aria-label={n.placeholder}
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'footer-newsletter-error' : undefined}
          className="min-w-0 flex-1 rounded-full border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex-none rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
        >
          {status === 'loading' ? '…' : n.submit}
        </button>
      </div>
      {status === 'error' && <p id="footer-newsletter-error" role="alert" className="text-xs text-clay-600">{errorMessage}</p>}
    </form>
  )
}
