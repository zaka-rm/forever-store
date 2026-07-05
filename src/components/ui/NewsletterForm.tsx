import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function NewsletterForm() {
  const { t } = useLanguage()
  const n = t.newsletter
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    const { error } = await supabase.from('subscribers').insert({ email: email.trim() })
    // A duplicate email is not an error from the user's point of view.
    if (error && !String(error.message).toLowerCase().includes('duplicate')) {
      setStatus('error')
      return
    }
    setStatus('done')
    setEmail('')
  }

  if (status === 'done') {
    return <p className="text-sm font-medium text-sage-700">{n.thanks}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-ink/40">{n.title}</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={n.placeholder}
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
      {status === 'error' && <p className="text-xs text-clay-600">{n.error}</p>}
    </form>
  )
}
