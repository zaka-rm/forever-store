import { useProducts } from '@/lib/productsContext'
import { useCart, BUNDLE_RATE } from '@/lib/cartContext'
import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/components/ui/ProductImage'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { formatPrice } from '@/lib/format'
import { getLocalizedProduct } from '@/lib/products'
import { ROUTINES, buildRoutine } from '@/lib/routines'
import { useFeature } from '@/lib/featureFlags'
import { Navigate } from 'react-router-dom'

export default function Routines() {
  const routinesEnabled = useFeature('routines')
  const { products } = useProducts()
  const { addToCart, openCart } = useCart()
  const { t, locale } = useLanguage()
  const lang = locale === 'ar' ? 'ar' : 'fr'
  const r = t.routines
  usePageMeta(r.metaTitle, r.metaDescription)

  // Feature switched off in the admin → the page quietly redirects to the shop.
  if (!routinesEnabled) return <Navigate to="/shop" replace />

  // Build routines sequentially, keeping each one's products distinct from the
  // others so the four routines feel genuinely different.
  const usedIds = new Set<string>()
  const built = ROUTINES.map((def) => {
    const b = buildRoutine(def, products, BUNDLE_RATE, usedIds)
    b.items.forEach((p) => usedIds.add(p.id))
    return b
  }).filter((b) => b.items.length >= 3)

  function addRoutine(items: ReturnType<typeof buildRoutine>['items']) {
    // Add every product first, then reveal the cart once (addToCart opens it too,
    // but this keeps the final state clean).
    items.forEach((p) => addToCart(p, 1))
    openCart()
  }

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mb-12 max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{r.eyebrow}</p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {r.title}<span className="font-extrabold text-sage-600">{r.titleAccent}</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-ink/65">{r.intro}</p>
        </RevealItem>

        <div className="grid gap-8 lg:grid-cols-2">
          {built.map(({ def, items, subtotal, discount, total }) => (
            <RevealItem
              key={def.id}
              className="flex flex-col overflow-hidden rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8"
            >
              <div className="mb-5 flex items-start gap-4">
                <span className="text-3xl" aria-hidden>{def.icon}</span>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-ink">{def.title[lang]}</h2>
                  <p className="mt-1 text-sm text-ink/60">{def.goal[lang]}</p>
                </div>
              </div>

              <div className="mb-6 flex gap-3">
                {items.map((p) => {
                  const lp = getLocalizedProduct(p, lang)
                  return (
                    <div key={p.id} className="min-w-0 flex-1">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-stone">
                        <ProductImage src={p.image} alt={lp.name} />
                      </div>
                      <p className="mt-2 truncate text-xs font-medium text-ink/80">{lp.name}</p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5">
                <div>
                  <p className="text-xs text-ink/45 line-through">{formatPrice(subtotal)}</p>
                  <p className="font-display text-2xl font-bold text-ink">
                    {formatPrice(total)}
                    <span className="ms-2 align-middle text-xs font-semibold text-sage-700">
                      −{formatPrice(discount)}
                    </span>
                  </p>
                </div>
                <Button variant="primary" magnetic={false} onClick={() => addRoutine(items)}>
                  {r.addRoutine}
                </Button>
              </div>
            </RevealItem>
          ))}
        </div>

        {built.length === 0 && (
          <RevealItem className="py-16 text-center">
            <p className="text-ink/50">{r.empty}</p>
            <div className="mt-4">
              <Button to="/shop" variant="primary">{r.browse}</Button>
            </div>
          </RevealItem>
        )}
      </SectionReveal>
    </div>
  )
}
