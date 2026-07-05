import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Email ou mot de passe incorrect.')
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-4xl border border-ink/10 bg-cream-dark p-8 shadow-soft">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">Espace Admin</p>
        <h1 className="mb-6 font-display text-3xl font-bold text-ink">Connexion</h1>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-2xl bg-clay-500/10 px-4 py-3 text-xs text-clay-600">
            Supabase n'est pas encore configuré (fichier .env). Le panneau admin ne
            fonctionnera qu'une fois les clés renseignées — voir SETUP_BACKEND.md.
          </p>
        )}

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
        </form>
      </div>
    </div>
  )
}
