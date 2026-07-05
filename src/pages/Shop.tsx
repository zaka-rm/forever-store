import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { categories, type Category } from '@/lib/products'
import { useProducts } from '@/lib/productsContext'
import { ProductCard } from '@/components/ui/ProductCard'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { RecentlyViewed } from '@/components/sections/RecentlyViewed'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState<Category | 'Tous'>('Tous')
  const [sort, setSort] = useState<SortKey>('featured')
  const { products } = useProducts()
  const { t } = useLanguage()
  usePageMeta('Boutique', 'Toute la gamme Forever Living : nutrition, beauté, cheveux, fitness et bien plus.')

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'featured', label: t.shop.sort.featured },
    { value: 'price-asc', label: t.shop.sort.priceAsc },
    { value: 'price-desc', label: t.shop.sort.priceDesc },
    { value: 'rating', label: t.shop.sort.rating },
  ]

  const filtered = useMemo(() => {
    let list = products.filter((p) => activeCategory === 'Tous' || p.category === activeCategory)
    list = [...list]
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    return list
  }, [activeCategory, sort, products])

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mb-12 max-w-xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {t.shop.eyebrow}
          </p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {t.shop.title}<span className="font-extrabold text-sage-600">{t.shop.titleAccent}</span>
          </h1>
        </RevealItem>

        <RevealItem className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['Tous', ...categories] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat ? 'text-cream' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {activeCategory === cat && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{cat === 'Tous' ? t.shop.all : t.categories[cat]}</span>
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-fit rounded-full border border-ink/15 bg-cream px-4 py-2 text-sm text-ink outline-none"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </RevealItem>

        <motion.div
          layout
          className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-x-8"
        >
          {filtered.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-ink/50">{t.shop.noResults}</p>
        )}
      </SectionReveal>

      <RecentlyViewed />
    </div>
  )
}
