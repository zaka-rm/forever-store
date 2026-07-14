import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

// Translate Supabase's English auth errors into a clear French message — and,
// crucially, DON'T pretend every failure is "wrong password". "Email not
// confirmed" is a very common cause that looks identical to bad credentials.
function frenchAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('not confirmed')) {
    return "Votre email n'est pas confirmé. Ouvrez le lien de confirmation reçu par email, ou confirmez le compte dans Supabase → Authentication → Users."
  }
  if (m.includes('invalid login')) {
    return 'Email ou mot de passe incorrect. Si vous êtes sûr du mot de passe, utilisez « Mot de passe oublié ».'
  }
  if (m.includes('rate') || m.includes('too many')) {
    return 'Trop de tentatives. Patientez une minute puis réessayez.'
  }
  return message // show the real reason rather than masking it
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Password-reset UI
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    document.title = 'Admin — Connexion'
    // If already logged in, skip straight to the dashboard.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin', { replace: true })
    })
  }, [navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setError(frenchAuthError(error.message))
      return
    }
    navigate('/admin', { replace: true })
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Entrez votre email pour recevoir le lien de réinitialisation.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset`,
    })
    setLoading(false)
    if (error) {
      setError(frenchAuthError(error.message))
      return
    }
    setResetSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-4xl border border-ink/10 bg-cream-dark p-8 shadow-soft">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">Espace Admin</p>
        <h1 className="mb-6 font-display text-3xl font-bold text-ink">
          {resetMode ? 'Mot de passe oublié' : 'Connexion'}
        </h1>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-2xl bg-clay-500/10 px-4 py-3 text-xs text-clay-600">
            Supabase n'est pas encore configuré (fichier .env). Le panneau admin ne
            fonctionnera qu'une fois les clés renseignées — voir SETUP_BACKEND.md.
          </p>
        )}

        {resetSent ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-2xl bg-sage-100 px-4 py-3 text-sm text-sage-700">
              📧 Si un compte existe pour <span className="font-medium">{email.trim()}</span>, un email
              avec un lien de réinitialisation vient d'être envoyé. Ouvrez-le pour choisir un nouveau
              mot de passe. (Pensez à vérifier les spams.)
            </p>
            <button
              onClick={() => {
                setResetMode(false)
                setResetSent(false)
              }}
              className="text-sm text-ink/60 hover:text-ink"
            >
              ← Retour à la connexion
            </button>
          </div>
        ) : resetMode ? (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-xs text-ink/55">
              Entrez l'email de votre compte admin. Vous recevrez un lien pour définir un nouveau mot de passe.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            {error && <p className="text-xs font-medium text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-ink py-3 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <button type="button" onClick={() => setResetMode(false)} className="text-sm text-ink/60 hover:text-ink">
              ← Retour à la connexion
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">Mot de passe</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            {error && <p className="text-xs font-medium text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-ink py-3 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('')
                setResetMode(true)
              }}
              className="text-center text-xs text-ink/50 hover:text-ink"
            >
              Mot de passe oublié ?
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
