import { useEffect, useState } from 'react'
import {
  fetchAdminReviews,
  setReviewApproved,
  deleteReview,
  formatDate,
  type ReviewRow,
} from '@/lib/adminData'
import { useProducts } from '@/lib/productsContext'
import { RatingStars } from '@/components/ui/RatingStars'

export function ReviewsPanel() {
  const { products } = useProducts()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setReviews(await fetchAdminReviews())
      } catch {
        setError("Impossible de charger les avis. Avez-vous exécuté 02_products-and-admin.sql (policies admin) ?")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function productName(id: string): string {
    return products.find((p) => p.id === id)?.name ?? id
  }

  async function toggleApproved(r: ReviewRow) {
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, approved: !x.approved } : x)))
    try {
      await setReviewApproved(r.id, !r.approved)
    } catch {
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, approved: r.approved } : x)))
    }
  }

  async function handleDelete(r: ReviewRow) {
    if (!confirm('Supprimer cet avis définitivement ?')) return
    await deleteReview(r.id)
    setReviews((prev) => prev.filter((x) => x.id !== r.id))
  }

  if (loading) return <p className="py-16 text-center text-ink/40">Chargement…</p>
  if (error) return <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{error}</p>

  const pending = reviews.filter((r) => !r.approved).length

  return (
    <>
      <p className="mb-6 text-sm text-ink/60">
        {reviews.length} avis{pending > 0 && <span className="text-clay-600"> · {pending} en attente</span>}
      </p>
      {reviews.length === 0 ? (
        <p className="rounded-3xl border border-ink/10 bg-cream-dark py-12 text-center text-sm text-ink/40">
          Aucun avis pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`rounded-3xl border bg-cream-dark p-5 ${r.approved ? 'border-ink/10' : 'border-clay-500/40'}`}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {r.author} <span className="text-ink/40">— {productName(r.product_id)}</span>
                  </p>
                  <p className="text-xs text-ink/45">{formatDate(r.created_at)}</p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    r.approved ? 'bg-sage-100 text-sage-700' : 'bg-clay-500/10 text-clay-600'
                  }`}
                >
                  {r.approved ? 'Publié' : 'En attente'}
                </span>
              </div>
              <RatingStars rating={r.rating} className="mb-2" />
              <p className="mb-3 text-sm text-ink/70">{r.comment}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleApproved(r)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    r.approved
                      ? 'border border-ink/15 text-ink/60 hover:border-ink'
                      : 'bg-ink text-cream hover:bg-sage-700'
                  }`}
                >
                  {r.approved ? 'Masquer' : 'Approuver'}
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  className="rounded-full border border-clay-500/30 px-4 py-1.5 text-xs text-clay-600 hover:border-clay-500"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
