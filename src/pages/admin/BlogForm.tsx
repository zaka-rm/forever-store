import { useState } from 'react'
import { savePost, uploadBlogImage, type BlogRow } from '@/lib/adminBlog'
import { slugify } from '@/lib/adminProducts'

const linesToArray = (text: string) => text.split('\n\n').map((l) => l.trim()).filter(Boolean)
const arrayToLines = (arr: string[] | null | undefined) => (arr ?? []).join('\n\n')

const input = 'w-full rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40'
const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

export function BlogForm({ initial, isNew, onSaved, onCancel }: { initial: BlogRow; isNew: boolean; onSaved: () => void; onCancel: () => void }) {
  const [row, setRow] = useState<BlogRow>(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof BlogRow>(key: K, value: BlogRow[K]) {
    setRow((prev) => ({ ...prev, [key]: value }))
  }

  function onTitleChange(value: string) {
    setRow((prev) => ({
      ...prev,
      title: value,
      slug: isNew && (prev.slug === '' || prev.slug === slugify(prev.title)) ? slugify(value) : prev.slug,
    }))
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      set('image', await uploadBlogImage(row.id, file))
    } catch {
      setError("Échec de l'envoi de l'image. Vérifiez que le bucket 'product-images' existe.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!row.title.trim() || !row.slug.trim()) {
      setError('Le titre et le slug sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      await savePost(row, isNew)
      onSaved()
    } catch (err) {
      const m = err instanceof Error ? err.message : ''
      setError(m.includes('duplicate') || m.includes('unique') ? 'Ce slug est déjà utilisé.' : "Échec de l'enregistrement.")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Titre (FR)</label>
          <input className={input} value={row.title} onChange={(e) => onTitleChange(e.target.value)} />
        </div>
        <div>
          <label className={label}>Titre (AR)</label>
          <input className={input} dir="rtl" value={row.title_ar ?? ''} onChange={(e) => set('title_ar', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={label}>Slug (URL)</label>
          <input className={input} value={row.slug} onChange={(e) => set('slug', e.target.value)} />
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" className={input} value={row.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className={label}>Durée</label>
          <input className={input} value={row.read_time ?? ''} onChange={(e) => set('read_time', e.target.value || null)} placeholder="3 min" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Catégorie / tag (FR)</label>
          <input className={input} value={row.tag ?? ''} onChange={(e) => set('tag', e.target.value || null)} placeholder="Science" />
        </div>
        <div>
          <label className={label}>Catégorie / tag (AR)</label>
          <input className={input} dir="rtl" value={row.tag_ar ?? ''} onChange={(e) => set('tag_ar', e.target.value || null)} placeholder="علم" />
        </div>
      </div>

      {/* Image */}
      <div>
        <label className={label}>Image de couverture</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-28 flex-none overflow-hidden rounded-xl border border-ink/10 bg-stone">
            {row.image ? <img src={row.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-ink/30">Aucune</div>}
          </div>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink/25 bg-cream px-4 py-5 text-center text-xs text-ink/50 hover:border-ink/50"
          >
            {uploading ? 'Envoi…' : 'Glissez une image, ou cliquez'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </div>
        <input className={`${input} mt-2`} placeholder="…ou une URL / chemin (/products/xxx.jpg)" value={row.image ?? ''} onChange={(e) => set('image', e.target.value || null)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Extrait (FR)</label>
          <textarea rows={2} className={input} value={row.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value || null)} />
        </div>
        <div>
          <label className={label}>Extrait (AR)</label>
          <textarea rows={2} dir="rtl" className={input} value={row.excerpt_ar ?? ''} onChange={(e) => set('excerpt_ar', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Contenu (FR) — un paragraphe par bloc (ligne vide entre)</label>
          <textarea rows={10} className={input} value={arrayToLines(row.content)} onChange={(e) => set('content', linesToArray(e.target.value))} />
        </div>
        <div>
          <label className={label}>Contenu (AR)</label>
          <textarea rows={10} dir="rtl" className={input} value={arrayToLines(row.content_ar)} onChange={(e) => set('content_ar', linesToArray(e.target.value))} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" checked={row.published} onChange={(e) => set('published', e.target.checked)} />
        Publié (visible sur le site)
      </label>

      {error && <p className="text-sm font-medium text-clay-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-ink/10 pt-5">
        <button type="submit" disabled={saving || uploading} className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-sage-700 disabled:opacity-60">
          {saving ? 'Enregistrement…' : isNew ? "Créer l'article" : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-ink/60 hover:text-ink">Annuler</button>
      </div>
    </form>
  )
}
