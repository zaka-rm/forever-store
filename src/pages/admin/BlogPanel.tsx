import { useEffect, useState } from 'react'
import { fetchAllPosts, deletePost, setPostPublished, importDefaultPosts, emptyPost, type BlogRow } from '@/lib/adminBlog'
import { formatDate } from '@/lib/adminData'
import { BlogForm } from '@/pages/admin/BlogForm'

type View = { mode: 'list' } | { mode: 'edit'; row: BlogRow; isNew: boolean }

export function BlogPanel() {
  const [rows, setRows] = useState<BlogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchAllPosts())
    } catch {
      setError("Impossible de charger les articles. Avez-vous exécuté 17_blog.sql ?")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleImport() {
    setImporting(true)
    try {
      await importDefaultPosts()
      await load()
    } catch {
      setError("Échec de l'import. Avez-vous exécuté 17_blog.sql ?")
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(row: BlogRow) {
    if (!confirm(`Supprimer l'article « ${row.title} » ?`)) return
    await deletePost(row.id)
    load()
  }

  async function togglePublished(row: BlogRow) {
    // optimistic update
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, published: !r.published } : r)))
    try {
      await setPostPublished(row.id, !row.published)
    } catch {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, published: row.published } : r)))
      alert("Échec. Avez-vous exécuté 17_blog.sql ?")
    }
  }

  if (view.mode === 'edit') {
    return (
      <div className="rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink">
          {view.isNew ? 'Nouvel article' : `Modifier — ${view.row.title}`}
        </h2>
        <BlogForm
          initial={view.row}
          isNew={view.isNew}
          onSaved={() => { setView({ mode: 'list' }); load() }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">{rows.length} article{rows.length > 1 ? 's' : ''}</p>
        <div className="flex flex-none gap-2">
          {rows.length === 0 && (
            <button onClick={handleImport} disabled={importing} className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink disabled:opacity-60">
              {importing ? 'Import…' : 'Importer les articles par défaut'}
            </button>
          )}
          <button onClick={() => setView({ mode: 'edit', row: emptyPost(), isNew: true })} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-sage-700">
            + Nouvel article
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-ink/40">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucun article dans la base. Cliquez « Importer les articles par défaut » pour charger le contenu existant, ou créez le vôtre.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark">
          {rows.map((row) => (
            <div key={row.id} className={`flex items-center gap-4 border-b border-ink/10 px-4 py-3 last:border-0 ${!row.published ? 'opacity-55' : ''}`}>
              <div className="h-12 w-16 flex-none overflow-hidden rounded-lg bg-stone">
                {row.image && <img src={row.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                  {row.title}
                  {!row.published && <span className="flex-none rounded-full bg-ink/10 px-2 py-0.5 text-[10px] uppercase text-ink/50">Brouillon</span>}
                </p>
                <p className="truncate text-xs text-ink/45">{row.tag || '—'} · {formatDate(row.date)}</p>
              </div>
              <button
                onClick={() => togglePublished(row)}
                title={row.published ? 'Masquer du site' : 'Publier sur le site'}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink"
              >
                {row.published ? 'Masquer' : 'Publier'}
              </button>
              <button onClick={() => setView({ mode: 'edit', row, isNew: false })} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink hover:border-ink">Modifier</button>
              <button onClick={() => handleDelete(row)} className="rounded-full border border-clay-500/30 px-3 py-1.5 text-xs text-clay-600 hover:border-clay-500">Supprimer</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
