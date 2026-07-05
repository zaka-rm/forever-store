import { useProducts } from '@/lib/productsContext'
import { ProductCard } from '@/components/ui/ProductCard'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function NewArrivals() {
  const { products } = useProducts()
  const { t } = useLanguage()
  const items = products.filter((p) => p.new).slice(0, 4)

  // Nothing tagged "Nouveau" → don't render an empty section.
  if (items.length === 0) return null

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-24 sm:py-32">
      <RevealItem className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {t.home.newArrivals.eyebrow}
          </p>
          <h2 className="max-w-md text-balance font-display text-4xl text-ink sm:text-5xl">
            {t.home.newArrivals.title}
          </h2>
        </div>
        <Button to="/shop" variant="secondary">
          {t.home.newArrivals.viewAll}
        </Button>
      </RevealItem>

      <RevealItem className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </RevealItem>
    </SectionReveal>
  )
}
