import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '@/components/ui/ProductCard'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { searchProducts } from '@/lib/search'
import { useProducts } from '@/lib/productsContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Search() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const { t, locale } = useLanguage()
  const { products } = useProducts()
  const results = searchProducts(products, query, locale)
  usePageMeta(`Recherche : ${query}`)

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mb-12 max-w-xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {t.search.title}
          </p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {t.search.resultsFor} <span className="font-extrabold text-sage-600">"{query}"</span>
          </h1>
        </RevealItem>

        {results.length === 0 ? (
          <RevealItem>
            <p className="py-16 text-center text-ink/50">{t.search.noResults}</p>
          </RevealItem>
        ) : (
          <RevealItem className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </RevealItem>
        )}
      </SectionReveal>
    </div>
  )
}
