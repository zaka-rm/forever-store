import { useEffect, useState } from 'react'
import { useProducts } from '@/lib/productsContext'
import { useCart, BUNDLE_RATE, BUNDLE_MIN_ITEMS } from '@/lib/cartContext'
import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/components/ui/ProductImage'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { formatPrice } from '@/lib/format'
import { getLocalizedProduct, type Product } from '@/lib/products'
import { ROUTINES, buildRoutine } from '@/lib/routines'
import { fetchPacks, resolvePack, type ResolvedPack } from '@/lib/packs'
import { useFeature } from '@/lib/featureFlags'
import { Navigate } from 'react-router-dom'

export default function Routines() {
  const routinesEnabled = useFeature('routines')
  const bundleEnabled = useFeature('bundle_discount')
  const { products } = useProducts()
  const { addToCart, openCart } = useCart()
  const { t, locale } = useLanguage()
  const lang = locale === 'ar' ? 'ar' : 'fr'
  const r = t.routines
  usePageMeta(r.metaTitle, r.metaDescription)

  // Admin-curated packs from the database (empty until 27_packs.sql is run and
  // the first pack is created in Admin → Packs).
  const [dbPacks, setDbPacks] = useState<ResolvedPack[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchPacks().then((rows) => {
      if (cancelled) return
      const resolved = rows
        .filter((p) => p.active)
        .map((p) => resolvePack(p, products, BUNDLE_RATE, BUNDLE_MIN_ITEMS, bundleEnabled))
        .filter((p) => p.items.length > 0)
      setDbPacks(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [products, bundleEnabled])

  // Feature switched off in the admin → the page quietly redirects to the shop.
  if (!routinesEnabled) return <Navigate to="/shop" replace />

  function addAll(items: { product: Product; quantity: number }[]) {
    // Add every product first, then reveal the cart once.
    items.forEach(({ product, quantity }) => addToCart(product, quantity))
    openCart()
  }

  // ---- Cards to display: admin packs when any exist, else the automatic
  // routines (so the page never looks empty before the first pack is created).
  type Card = {
    key: string
    icon: string
    title: string
    goal: string
    image: string | null
    items: { product: Product; quantity: number }[]
    subtotal: number
    discount: number
    total: number
  }

  let cards: Card[]
  if (dbPacks && dbPacks.length > 0) {
    cards = dbPacks.map((p) => ({
      key: p.pack.id,
      icon: p.pack.icon || '🌿',
      title: (lang === 'ar' && p.pack.name_ar) || p.pack.name_fr,
      goal: ((lang === 'ar' && p.pack.goal_ar) || p.pack.goal_fr) ?? '',
      image: p.pack.image,
      items: p.items,
      subtotal: p.subtotal,
      discount: p.discount,
      total: p.total,
    }))
  } else {
    const usedIds = new Set<string>()
    cards = ROUTINES.map((def) => {
      const b = buildRoutine(def, products, BUNDLE_RATE, usedIds)
      b.items.forEach((p) => usedIds.add(p.id))
      return b
    })
      .filter((b) => b.items.length >= 3)
      .map((b) => ({
        key: b.def.id,
        icon: b.def.icon,
        title: b.def.title[lang],
        goal: b.def.goal[lang],
        image: null,
        items: b.items.map((product) => ({ product, quantity: 1 })),
        subtotal: b.subtotal,
        discount: b.discount,
        total: b.total,
      }))
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
          {cards.map((card) => (
            <RevealItem
              key={card.key}
              className="flex flex-col overflow-hidden rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8"
            >
              <div className="mb-5 flex items-start gap-4">
                <span className="text-3xl" aria-hidden>{card.icon}</span>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-ink">{card.title}</h2>
                  {card.goal && <p className="mt-1 text-sm text-ink/60">{card.goal}</p>}
                </div>
              </div>

              {card.image ? (
                /* Custom composed pack photo + compact contents list */
                <div className="mb-6">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone">
                    <ProductImage src={card.image} alt={card.title} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-ink/60">
                    {card.items
                      .map(({ product, quantity }) => {
                        const lp = getLocalizedProduct(product, lang)
                        return quantity > 1 ? `${lp.name} ×${quantity}` : lp.name
                      })
                      .join(' · ')}
                  </p>
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {card.items.map(({ product, quantity }) => {
                    const lp = getLocalizedProduct(product, lang)
                    return (
                      <div key={product.id} className="min-w-0">
                        <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone">
                          <ProductImage src={product.image} alt={lp.name} />
                          {quantity > 1 && (
                            <span className="absolute end-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">
                              ×{quantity}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-medium text-ink/80">{lp.name}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5">
                <div>
                  {card.discount > 0 && (
                    <p className="text-xs text-ink/45 line-through">{formatPrice(card.subtotal)}</p>
                  )}
                  <p className="font-display text-2xl font-bold text-ink">
                    {formatPrice(card.total)}
                    {card.discount > 0 && (
                      <span className="ms-2 align-middle text-xs font-semibold text-sage-700">
                        −{formatPrice(card.discount)}
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="primary" magnetic={false} onClick={() => addAll(card.items)}>
                  {r.addRoutine}
                </Button>
              </div>
            </RevealItem>
          ))}
        </div>

        {cards.length === 0 && (
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
