import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RevealItem } from '@/components/ui/SectionReveal'
import { RatingStars } from '@/components/ui/RatingStars'
import { getReviews, type Review } from '@/lib/reviews'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { supabase } from '@/lib/supabaseClient'
import { useFeature } from '@/lib/featureFlags'

export function ReviewsSection({ productId }: { productId: string }) {
  const { t } = useLanguage()
  const [dbReviews, setDbReviews] = useState<Review[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoReviewsEnabled = useFeature('photo_reviews')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('reviews')
      .select('id, author, rating, comment, created_at, photo_url')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return
        setDbReviews(
          data.map((row) => ({
            id: row.id as string,
            author: row.author as string,
            rating: row.rating as number,
            comment: row.comment as string,
            date: (row.created_at as string).slice(0, 10),
            photoUrl: (row.photo_url as string) ?? undefined,
          })),
        )
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  const reviews = [...getReviews(productId), ...dbReviews]
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !comment) return
    setUploading(true)
    let photoUrl: string | null = null
    if (photo) {
      try {
        const ext = photo.name.split('.').pop() || 'jpg'
        const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('review-photos')
          .upload(path, photo, { upsert: false, contentType: photo.type })
        if (!upErr) {
          photoUrl = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
        }
      } catch {
        /* photo optional — never block the review */
      }
    }
    await supabase.from('reviews').insert({
      product_id: productId,
      author: name,
      rating,
      comment,
      approved: false,
      photo_url: photoUrl,
    })
    setUploading(false)
    setSubmitted(true)
    setShowForm(false)
    setName('')
    setComment('')
    setRating(5)
    setPhoto(null)
  }

  return (
    <RevealItem className="mt-20 max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{t.reviews.title}</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <RatingStars rating={average} />
              <span className="text-sm text-ink/50">({reviews.length})</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          {t.reviews.writeReview}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="mb-8 flex flex-col gap-4 rounded-3xl border border-ink/10 bg-cream-dark p-6"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
              {t.reviews.nameLabel}
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
              {t.reviews.ratingLabel}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} / 5`}
                  className="p-0.5"
                >
                  <svg viewBox="0 0 20 20" className={`h-6 w-6 ${n <= rating ? 'fill-clay-500' : 'fill-stone-dark'}`}>
                    <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
              {t.reviews.commentLabel}
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full resize-none rounded-2xl border border-ink/15 bg-cream px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>
          {photoReviewsEnabled && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                {t.reviews.photoLabel}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-ink/70 file:me-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-cream"
              />
            </div>
          )}
          <p className="text-xs text-ink/40">{t.reviews.pendingNotice}</p>
          <button
            type="submit"
            disabled={uploading}
            className="w-fit rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            {uploading ? '…' : t.reviews.submit}
          </button>
        </motion.form>
      )}

      {submitted && (
        <p className="mb-6 text-sm font-medium text-sage-600">{t.reviews.thanks}</p>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-ink/50">{t.reviews.noReviews}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-ink/10 pb-6 last:border-0">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{review.author}</span>
                <span className="text-xs text-ink/40">{review.date}</span>
              </div>
              <RatingStars rating={review.rating} className="mb-2" />
              <p className="text-sm leading-relaxed text-ink/70">{review.comment}</p>
              {review.photoUrl && (
                <a href={review.photoUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={review.photoUrl}
                    alt=""
                    loading="lazy"
                    className="mt-3 h-24 w-24 rounded-2xl border border-ink/10 object-cover"
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </RevealItem>
  )
}
