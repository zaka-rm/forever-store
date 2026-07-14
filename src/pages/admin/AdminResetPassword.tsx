import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

// The reset email links here with a recovery token in the URL. The Supabase
// client (detectSessionInUrl, on by default) exchanges it for a temporary
// session and fires PASSWORD_RECOVERY — only then can we set a new password.
export default function AdminResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    document.title = 'Admin — Nouveau mot de passe'
    // A recovery session may already exist (link just opened), or arrive via the
    // auth event a moment later.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/admin', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-4xl border border-ink/10 bg-cream-dark p-8 shadow-soft">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">Espace Admin</p>
        <h1 className="mb-6 font-display text-3xl font-bold text-ink">Nouveau mot de passe</h1>

        {done ? (
          <p className="rounded-2xl bg-sage-100 px-4 py-3 text-sm text-sage-700">
            ✓ Mot de passe mis à jour. Redirection vers l'admin…
          </p>
        ) : !ready ? (
          <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
            Lien invalide ou expiré. Redemandez un lien depuis « Mot de passe oublié » sur la page de
            connexion. (Le lien n'est valable qu'un court moment.)
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">Nouveau mot de passe</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">Confirmer</label>
              <input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            {error && <p className="text-xs font-medium text-clay-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-ink py-3 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
            >
              {loading ? 'Mise à jour…' : 'Définir le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
