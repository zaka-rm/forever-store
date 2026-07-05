import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getLocalizedProduct, stockStatus } from '@/lib/products'
import { useProducts } from '@/lib/productsContext'
import { ProductImage } from '@/components/ui/ProductImage'
import { RatingStars } from '@/components/ui/RatingStars'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/ui/ProductCard'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useCart } from '@/lib/cartContext'
import { useWishlist } from '@/lib/wishlistContext'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ReviewsSection } from '@/components/sections/ReviewsSection'
import { RecentlyViewed } from '@/components/sections/RecentlyViewed'
import { TrustStrip } from '@/components/sections/TrustStrip'
import { SubscribeBox } from '@/components/ui/SubscribeBox'
import { trackViewed } from '@/lib/recentlyViewed'
import { JsonLd } from '@/components/ui/JsonLd'
import { usePageMeta } from '@/lib/usePageMeta'
import { SITE_URL } from '@/lib/constants'
import { formatPrice } from '@/lib/format'

export default function ProductDetail() {
  const { slug } = useParams()
  const { getProductBySlug, getRelatedProducts, loading } = useProducts()
  const rawProduct = slug ? getProductBySlug(slug) : undefined
  const { addToCart } = useCart()
  const { has, toggle } = useWishlist()
  const { t, locale } = useLanguage()
  const [quantity, setQuantity] = useState(1)
  usePageMeta(rawProduct?.name ?? '', rawProduct?.tagline, rawProduct?.image)

  // Remember this product for the "recently viewed" strip.
  useEffect(() => {
    if (rawProduct) trackViewed(rawProduct.id)
  }, [rawProduct?.id])

  // Gallery: which image is shown in the main frame (resets on product change).
  const [activeImage, setActiveImage] = useState<string | null>(null)
  useEffect(() => {
    setActiveImage(null)
  }, [rawProduct?.id])

  // While the catalogue is still loading from the database, wait before deciding
  // the slug is invalid — otherwise we'd wrongly redirect on a valid product.
  if (loading && !rawProduct) return <div className="min-h-[70vh]" />
  if (!rawProduct) return <Navigate to="/shop" replace />

  const product = getLocalizedProduct(rawProduct, locale)
  const related = getRelatedProducts(rawProduct)
  const saved = has(product.id)
  const stock = stockStatus(product.stock)
  const soldOut = stock === 'out'

  // Main image + any gallery photos, de-duplicated. The selected one is shown big.
  const images = [product.image, ...(product.gallery ?? [])].filter((src, i, arr) => src && arr.indexOf(src) === i)
  const shownImage = activeImage ?? product.image

  const accordionItems = [
    ...(product.ingredients.length > 0
      ? [
          {
            title: t.product.ingredientsTitle,
            content: (
              <ul className="flex flex-wrap gap-2">
                {product.ingredients.map((ing) => (
                  <li key={ing} className="rounded-full bg-sage-100 px-3 py-1 text-xs text-sage-700">
                    {ing}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    ...(product.packContents
      ? [
          {
            title: t.product.packContentsTitle,
            content: (
              <ul className="flex flex-col gap-1.5">
                {product.packContents.map((item) => (
                  <li key={item} className="text-sm text-ink/70">
                    • {item}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { title: t.product.howToUseTitle, content: product.howToUse },
    { title: t.product.shippingTitle, content: t.product.shippingContent },
  ]

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <JsonLd
        data={{
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: rawProduct.name,
          image: rawProduct.image.startsWith('http') ? rawProduct.image : SITE_URL.replace(/\/$/, '') + rawProduct.image,
          description: rawProduct.tagline || rawProduct.description,
          brand: { '@type': 'Brand', name: 'Forever Living' },
          offers: {
            '@type': 'Offer',
            price: rawProduct.price,
            priceCurrency: 'EUR',
            availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
          ...(rawProduct.reviewCount > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: rawProduct.rating,
                  reviewCount: rawProduct.reviewCount,
                },
              }
            : {}),
        }}
      />
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-5xl bg-stone">
              <ProductImage key={shownImage} src={shownImage} alt={product.name} eager />
              <button
                type="button"
                onClick={() => toggle(product.id)}
                aria-label={t.nav.openWishlist}
                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-cream/90 transition-colors hover:bg-cream"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 ${saved ? 'fill-clay-500 stroke-clay-500' : 'fill-none stroke-ink/60'}`}
                  strokeWidth="1.6"
                >
                  <path d="M12 20.5s-7.5-4.6-9.6-9.3C1 8.1 2.3 5 5.4 4.2c2-.5 3.9.3 5 1.9l1.6 2.2 1.6-2.2c1.1-1.6 3-2.4 5-1.9 3.1.8 4.4 3.9 3 7-2.1 4.7-9.6 9.3-9.6 9.3Z" />
                </svg>
              </button>
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(src)}
                    className={`h-20 w-16 flex-none overflow-hidden rounded-2xl border-2 bg-stone transition-colors ${
                      shownImage === src ? 'border-ink' : 'border-transparent hover:border-ink/30'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
              {t.categories[product.category]}
              {product.size ? ` · ${product.size}` : ''}
            </p>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-4">
              <RatingStars rating={product.rating} count={product.reviewCount} />
            </div>
            <p className="mt-6 font-display text-2xl font-bold text-sage-600">{formatPrice(product.price)}</p>
            {stock === 'low' && (
              <div className="mt-2 inline-block rounded-full bg-clay-500/90 px-3 py-1">
                <p className="text-xs font-medium uppercase tracking-wider text-cream">
                  {t.product.lowStockPrefix} {product.stock} {t.product.lowStockSuffix}
                </p>
              </div>
            )}
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink/65">{product.description}</p>

            {soldOut ? (
              <div className="mt-8">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-ink/40 py-3.5 text-sm font-medium text-cream"
                >
                  {t.product.outOfStock}
                </button>
              </div>
            ) : (
              <div className="mt-8 flex items-center gap-4">
                <div className="flex items-center gap-4 rounded-full border border-ink/15 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="text-ink/60 hover:text-ink"
                    aria-label={t.product.decreaseQty}
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        typeof product.stock === 'number' ? Math.min(q + 1, product.stock) : q + 1,
                      )
                    }
                    disabled={typeof product.stock === 'number' && quantity >= product.stock}
                    className="text-ink/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t.product.increaseQty}
                  >
                    +
                  </button>
                </div>
                <Button variant="primary" onClick={() => addToCart(product, quantity)} className="flex-1">
                  {t.product.addToCart} — {formatPrice(product.price * quantity)}
                </Button>
              </div>
            )}

            <SubscribeBox productId={product.id} productName={product.name} />

            <div className="mt-12">
              <Accordion items={accordionItems} />
            </div>
          </div>
        </RevealItem>

        <RevealItem className="mt-14">
          <TrustStrip className="rounded-3xl border-x" />
        </RevealItem>

        <ReviewsSection productId={product.id} />

        {related.length > 0 && (
          <RevealItem className="mt-20">
            <h2 className="mb-10 font-display text-3xl text-ink sm:text-4xl">
              {t.product.related}<span className="font-extrabold text-clay-500">{t.product.relatedAccent}</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </RevealItem>
        )}
      </SectionReveal>

      <RecentlyViewed excludeId={product.id} />
    </div>
  )
}
