import { useState } from 'react'
import { categories } from '@/lib/products'
import {
  saveProduct,
  uploadProductImage,
  slugify,
  type ProductRow,
} from '@/lib/adminProducts'

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function arrayToLines(arr: string[] | null | undefined): string {
  return (arr ?? []).join('\n')
}

interface Props {
  initial: ProductRow
  isNew: boolean
  onSaved: () => void
  onCancel: () => void
}

export function ProductForm({ initial, isNew, onSaved, onCancel }: Props) {
  const [row, setRow] = useState<ProductRow>(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof ProductRow>(key: K, value: ProductRow[K]) {
    setRow((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-fill the slug from the name for new products (until the user edits it).
  function onNameChange(value: string) {
    setRow((prev) => ({
      ...prev,
      name: value,
      slug: isNew && (prev.slug === '' || prev.slug === slugify(prev.name)) ? slugify(value) : prev.slug,
    }))
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadProductImage(row.id, file)
      set('image', url)
    } catch {
      setError("Échec de l'envoi de l'image. Vérifiez que le bucket 'product-images' existe.")
    } finally {
      setUploading(false)
    }
  }

  async function handleGalleryFile(file: File | undefined) {
    if (!file) return
    setGalleryUploading(true)
    setError('')
    try {
      const url = await uploadProductImage(row.id, file)
      set('gallery', [...(row.gallery ?? []), url])
    } catch {
      setError("Échec de l'envoi de l'image. Vérifiez que le bucket 'product-images' existe.")
    } finally {
      setGalleryUploading(false)
    }
  }

  function removeGalleryImage(index: number) {
    set('gallery', (row.gallery ?? []).filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!row.name.trim() || !row.slug.trim()) {
      setError('Le nom et le slug sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      await saveProduct(row, isNew)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message.includes('duplicate') || message.includes('unique')
          ? 'Ce slug est déjà utilisé par un autre produit. Choisissez-en un autre.'
          : "Échec de l'enregistrement. Réessayez.",
      )
      setSaving(false)
    }
  }

  const input =
    'w-full rounded-xl border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ink/40'
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink/40'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nom (FR)</label>
          <input className={input} value={row.name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div>
          <label className={label}>Nom (AR)</label>
          <input className={input} dir="rtl" value={row.name_ar ?? ''} onChange={(e) => set('name_ar', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Slug (adresse URL)</label>
          <input className={input} value={row.slug} onChange={(e) => set('slug', e.target.value)} />
        </div>
        <div>
          <label className={label}>Catégorie</label>
          <select className={input} value={row.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={label}>Prix (DH)</label>
          <input type="number" step="0.01" className={input} value={row.price} onChange={(e) => set('price', Number(e.target.value))} />
        </div>
        <div>
          <label className={label}>Taille</label>
          <input className={input} value={row.size ?? ''} onChange={(e) => set('size', e.target.value || null)} />
        </div>
        <div>
          <label className={label}>Note (0–5)</label>
          <input type="number" step="0.1" min="0" max="5" className={input} value={row.rating} onChange={(e) => set('rating', Number(e.target.value))} />
        </div>
        <div>
          <label className={label}>Nb. avis</label>
          <input type="number" className={input} value={row.review_count} onChange={(e) => set('review_count', Number(e.target.value))} />
        </div>
      </div>

      <div>
        <label className={label}>Stock (laisser vide = illimité)</label>
        <input
          type="number"
          min="0"
          placeholder="Illimité"
          className={`${input} sm:max-w-[200px]`}
          value={row.stock ?? ''}
          onChange={(e) => set('stock', e.target.value === '' ? null : Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-ink/40">0 = rupture de stock (bouton « Ajouter » désactivé). Vide = non suivi.</p>
      </div>

      {/* Image upload */}
      <div>
        <label className={label}>Image</label>
        <div className="flex items-center gap-4">
          <div className="h-24 w-20 flex-none overflow-hidden rounded-xl border border-ink/10 bg-stone">
            {row.image ? (
              <img src={row.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-ink/30">Aucune</div>
            )}
          </div>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFile(e.dataTransfer.files[0])
            }}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink/25 bg-cream px-4 py-6 text-center text-xs text-ink/50 hover:border-ink/50"
          >
            {uploading ? 'Envoi…' : 'Glissez une image ici, ou cliquez pour choisir un fichier'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </div>
        <input
          className={`${input} mt-2`}
          placeholder="…ou collez une URL / un chemin (/products/xxx.png)"
          value={row.image ?? ''}
          onChange={(e) => set('image', e.target.value || null)}
        />
      </div>

      {/* Extra photos (gallery) */}
      <div>
        <label className={label}>Galerie — photos supplémentaires</label>
        <div className="flex flex-wrap gap-3">
          {(row.gallery ?? []).map((url, i) => (
            <div key={i} className="relative h-24 w-20 flex-none overflow-hidden rounded-xl border border-ink/10 bg-stone">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                aria-label="Retirer"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-[11px] text-cream hover:bg-clay-500"
              >
                ✕
              </button>
            </div>
          ))}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleGalleryFile(e.dataTransfer.files[0])
            }}
            className="flex h-24 w-20 flex-none cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink/25 bg-cream text-2xl text-ink/40 hover:border-ink/50"
          >
            {galleryUploading ? '…' : '+'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGalleryFile(e.target.files?.[0])} />
          </label>
        </div>
        <p className="mt-1 text-xs text-ink/40">Ces photos s'affichent en plus de l'image principale sur la page du produit.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Accroche (FR)</label>
          <input className={input} value={row.tagline ?? ''} onChange={(e) => set('tagline', e.target.value || null)} />
        </div>
        <div>
          <label className={label}>Accroche (AR)</label>
          <input className={input} dir="rtl" value={row.tagline_ar ?? ''} onChange={(e) => set('tagline_ar', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Description (FR)</label>
          <textarea rows={4} className={input} value={row.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
        </div>
        <div>
          <label className={label}>Description (AR)</label>
          <textarea rows={4} dir="rtl" className={input} value={row.description_ar ?? ''} onChange={(e) => set('description_ar', e.target.value || null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Composants — un par ligne (FR)</label>
          <textarea rows={4} className={input} value={arrayToLines(row.ingredients)} onChange={(e) => set('ingredients', linesToArray(e.target.value))} />
        </div>
        <div>
          <label className={label}>Composants — un par ligne (AR)</label>
          <textarea
            rows={4}
            dir="rtl"
            className={input}
            value={arrayToLines(row.ingredients_ar)}
            onChange={(e) => {
              const arr = linesToArray(e.target.value)
              set('ingredients_ar', arr.length ? arr : null)
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Conseils d'utilisation (FR)</label>
          <textarea rows={2} className={input} value={row.how_to_use ?? ''} onChange={(e) => set('how_to_use', e.target.value || null)} />
        </div>
        <div>
          <label className={label}>Conseils d'utilisation (AR)</label>
          <textarea rows={2} dir="rtl" className={input} value={row.how_to_use_ar ?? ''} onChange={(e) => set('how_to_use_ar', e.target.value || null)} />
        </div>
      </div>

      <div>
        <label className={label}>Contenu du pack — un article par ligne (laisser vide si non applicable)</label>
        <textarea
          rows={3}
          className={input}
          value={arrayToLines(row.pack_contents)}
          onChange={(e) => {
            const arr = linesToArray(e.target.value)
            set('pack_contents', arr.length ? arr : null)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={row.best_seller} onChange={(e) => set('best_seller', e.target.checked)} />
          Meilleure vente (affiché en accueil)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={row.is_new} onChange={(e) => set('is_new', e.target.checked)} />
          Nouveau (badge « NOUVEAU »)
        </label>
      </div>

      {error && <p className="text-sm font-medium text-clay-600">{error}</p>}

      <div className="flex items-center gap-3 border-t border-ink/10 pt-5">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-sage-700 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : isNew ? 'Créer le produit' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-ink/60 hover:text-ink">
          Annuler
        </button>
      </div>
    </form>
  )
}
