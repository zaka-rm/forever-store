import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLocalizedProduct } from '@/lib/products'
import { useProducts } from '@/lib/productsContext'
import { quizAreas, type QuizArea, type QuizProblem } from '@/lib/quizData'
import { ProductCard } from '@/components/ui/ProductCard'
import { RatingStars } from '@/components/ui/RatingStars'
import { Button } from '@/components/ui/Button'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useCart } from '@/lib/cartContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { formatPrice } from '@/lib/format'

const AREA_ICON_PATHS: Record<QuizArea['icon'], string> = {
  droplet: 'M12 3.2c3.4 4 5.3 6.7 5.3 9.4a5.3 5.3 0 1 1-10.6 0C6.7 9.9 8.6 7.2 12 3.2z',
  leaf: 'M4.5 19.5C4.5 11 10 5.5 19.5 5.5 19.5 14 14 19.5 4.5 19.5z M8.5 15.5c2.3-3.3 5.2-5.3 8.5-6.2',
  pulse: 'M3 12h3.6l1.9-5 4 11 2.4-6H21',
  comb: 'M4 8h16 M6.5 8v7 M10 8v7 M13.5 8v7 M17 8v7',
}

function AreaIcon({ id }: { id: QuizArea['icon'] }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={AREA_ICON_PATHS[id]} />
    </svg>
  )
}

export default function Quiz() {
  const { t, locale } = useLanguage()
  const { getProductBySlug } = useProducts()
  const { addToCart } = useCart()
  usePageMeta('Quiz Bien-être', 'Trouvez en deux questions le produit Forever qui répond à votre besoin.')
  const q = t.quiz

  const [step, setStep] = useState(0)
  const [area, setArea] = useState<QuizArea | null>(null)
  const [problem, setProblem] = useState<QuizProblem | null>(null)

  function pickArea(a: QuizArea) {
    setArea(a)
    setProblem(null)
    setStep(1)
  }
  function pickProblem(p: QuizProblem) {
    setProblem(p)
    setStep(2)
  }
  function restart() {
    setArea(null)
    setProblem(null)
    setStep(0)
  }
  function goBack() {
    if (step === 2) setStep(1)
    else setStep(0)
  }

  // Resolve the recommended products, skipping any that are missing/hidden so the
  // result is never a dead end — the first available product becomes the hero.
  const candidates = problem
    ? [problem.heroSlug, ...problem.alsoSlugs]
        .map((s) => getProductBySlug(s))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : []
  const hero = candidates[0]
  const also = candidates.slice(1)
  const heroLocalized = hero ? getLocalizedProduct(hero, locale) : undefined
  const problemLabel = problem ? (locale === 'ar' ? problem.labelAr : problem.label) : ''
  const why = problem ? (locale === 'ar' ? problem.whyAr : problem.why) : ''

  function addRoutine() {
    if (hero) addToCart(hero)
    also.forEach((p) => addToCart(p))
  }

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-5xl">
        <RevealItem className="mx-auto mb-12 max-w-xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{q.eyebrow}</p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {q.title}<span className="font-extrabold text-sage-600">{q.titleAccent}</span>
          </h1>
          <p className="mt-4 text-sm text-ink/60">{q.subtitle}</p>
        </RevealItem>

        <RevealItem className="rounded-5xl border border-ink/10 bg-cream-dark p-6 sm:p-10">
          {step > 0 && (
            <button type="button" onClick={goBack} className="mb-6 text-sm text-ink/60 hover:text-ink">
              {q.back}
            </button>
          )}

          {/* Step 0 — choose an area */}
          {step === 0 && (
            <div>
              <h2 className="mb-6 font-display text-2xl font-bold text-ink">{q.stepAreaTitle}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {quizAreas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickArea(a)}
                    className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-cream px-5 py-4 text-start transition-colors hover:border-sage-500 hover:bg-sage-50"
                  >
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sage-100 text-sage-700">
                      <AreaIcon id={a.icon} />
                    </span>
                    <span className="font-display text-lg font-medium text-ink">{locale === 'ar' ? a.labelAr : a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — choose the specific problem */}
          {step === 1 && area && (
            <div>
              <h2 className="mb-6 font-display text-2xl font-bold text-ink">{q.stepProblemTitle}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {area.problems.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProblem(p)}
                    className="rounded-2xl border border-ink/10 bg-cream px-5 py-4 text-start text-sm font-medium text-ink transition-colors hover:border-sage-500 hover:bg-sage-50"
                  >
                    {locale === 'ar' ? p.labelAr : p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — the solution */}
          {step === 2 && problem && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-sage-600">{q.resultsForPrefix}</p>
                  <h2 className="font-display text-2xl font-bold text-ink">{problemLabel}</h2>
                </div>
                <Button variant="secondary" onClick={restart}>{q.restart}</Button>
              </div>

              {!heroLocalized ? (
                <div className="py-10 text-center">
                  <p className="mb-6 text-sm text-ink/60">{q.noResults}</p>
                  <Button to="/shop" variant="primary">{q.browseShop}</Button>
                </div>
              ) : (
                <>
                  {/* Hero recommendation */}
                  <div className="grid gap-6 rounded-4xl border border-sage-200 bg-cream p-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:p-6">
                    <Link to={`/shop/${heroLocalized.slug}`} className="block aspect-square overflow-hidden rounded-3xl bg-stone">
                      <img src={heroLocalized.image} alt={heroLocalized.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex flex-col">
                      <span className="mb-2 w-fit rounded-full bg-sage-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-sage-700">
                        {q.heroBadge}
                      </span>
                      <Link to={`/shop/${heroLocalized.slug}`}>
                        <h3 className="font-display text-2xl font-bold text-ink hover:text-sage-700">{heroLocalized.name}</h3>
                      </Link>
                      <div className="mt-1.5"><RatingStars rating={heroLocalized.rating} count={heroLocalized.reviewCount} /></div>
                      <p className="mt-2 font-display text-xl font-bold text-sage-600">{formatPrice(heroLocalized.price)}</p>

                      <div className="mt-4 rounded-2xl bg-cream-dark p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink/50">{q.whyTitle}</p>
                        <p className="text-sm leading-relaxed text-ink/75">{why}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button variant="primary" onClick={() => addToCart(hero!)}>
                          {t.product.addToCart} — {formatPrice(heroLocalized.price)}
                        </Button>
                        <Button to={`/shop/${heroLocalized.slug}`} variant="secondary">{locale === 'ar' ? 'عرض المنتج' : 'Voir le produit'}</Button>
                      </div>
                    </div>
                  </div>

                  {/* Complementary products */}
                  {also.length > 0 && (
                    <div className="mt-10">
                      <h3 className="mb-6 font-display text-xl font-bold text-ink">{q.completeRoutine}</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
                        {also.map((p) => (
                          <ProductCard key={p.id} product={p} />
                        ))}
                      </div>
                      <div className="mt-8 text-center">
                        <Button variant="primary" onClick={addRoutine}>{q.addAllToCart}</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
