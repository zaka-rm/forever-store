import { useProducts } from '@/lib/productsContext'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getViewed } from '@/lib/recentlyViewed'
import { ProductCard } from '@/components/ui/ProductCard'

/** Shows the visitor's recently-viewed products (from localStorage). */
export function RecentlyViewed({ excludeId, max = 4 }: { excludeId?: string; max?: number }) {
  const { products } = useProducts()
  const { t } = useLanguage()

  const items = getViewed()
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, max)

  if (items.length === 0) return null

  return (
    <section className="container-px mx-auto max-w-7xl py-16">
      <h2 className="mb-8 font-display text-2xl font-bold text-ink sm:text-3xl">{t.shop.recentlyViewed}</h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
