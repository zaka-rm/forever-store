import { useProducts } from '@/lib/productsContext'
import { useWishlist } from '@/lib/wishlistContext'
import { ProductCard } from '@/components/ui/ProductCard'
import { Button } from '@/components/ui/Button'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Favoris() {
  const { ids } = useWishlist()
  const { products } = useProducts()
  const { t } = useLanguage()
  usePageMeta('Vos Favoris', 'Retrouvez vos produits Forever Living préférés.')
  const saved = products.filter((p) => ids.includes(p.id))

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mb-12 max-w-xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {t.wishlist.eyebrow}
          </p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {t.wishlist.title}<span className="font-extrabold text-sage-600">{t.wishlist.titleAccent}</span>
          </h1>
        </RevealItem>

        {saved.length === 0 ? (
          <RevealItem className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-ink/50">{t.wishlist.empty}</p>
            <Button to="/shop" variant="primary">
              {t.wishlist.browse}
            </Button>
          </RevealItem>
        ) : (
          <RevealItem className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {saved.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </RevealItem>
        )}
      </SectionReveal>
    </div>
  )
}
