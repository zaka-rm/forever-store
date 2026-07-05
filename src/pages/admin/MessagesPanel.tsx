import { useEffect, useState } from 'react'
import { fetchMessages, setMessageHandled, deleteMessage, formatDate, type MessageRow } from '@/lib/adminData'

export function MessagesPanel() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setMessages(await fetchMessages())
      } catch {
        setError("Impossible de charger les messages. Avez-vous exécuté 02_products-and-admin.sql (policies admin) ?")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function toggleHandled(m: MessageRow) {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, handled: !x.handled } : x)))
    try {
      await setMessageHandled(m.id, !m.handled)
    } catch {
      // revert on failure
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, handled: m.handled } : x)))
    }
  }

  async function handleDelete(m: MessageRow) {
    if (!confirm(`Supprimer le message de ${m.name} ?`)) return
    await deleteMessage(m.id)
    setMessages((prev) => prev.filter((x) => x.id !== m.id))
  }

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  return (
    <>
      <p className="mb-6 text-sm text-ink/60">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
      {messages.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucun message pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl border bg-cream-dark p-5 ${m.handled ? 'border-ink/10 opacity-60' : 'border-sage-300/50'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{m.name}</p>
                  <p className="truncate text-xs text-ink/45">
                    <a href={`mailto:${m.email}`} className="hover:text-ink">{m.email}</a> · {formatDate(m.created_at)}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <button
                    onClick={() => toggleHandled(m)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      m.handled
                        ? 'border border-ink/15 text-ink/50 hover:border-ink'
                        : 'bg-ink text-cream hover:bg-sage-700'
                    }`}
                  >
                    {m.handled ? 'Rouvrir' : 'Marquer traité'}
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    aria-label="Supprimer"
                    className="rounded-full border border-clay-500/30 px-2.5 py-1.5 text-xs text-clay-600 hover:border-clay-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {m.subject && <p className="mb-1 text-sm font-semibold text-ink">{m.subject}</p>}
              <p className="whitespace-pre-wrap text-sm text-ink/70">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
