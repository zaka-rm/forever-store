import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { searchProducts } from '@/lib/search'
import { useProducts } from '@/lib/productsContext'
import { ProductImage } from '@/components/ui/ProductImage'
import { formatPrice } from '@/lib/format'

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { t, locale } = useLanguage()
  const { products } = useProducts()
  const navigate = useNavigate()
  const results = searchProducts(products, query, locale, 6)

  function goToResults() {
    if (!query.trim()) return
    navigate(`/recherche?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    goToResults()
  }

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-0 z-50 mx-auto max-w-2xl p-4 sm:p-8"
          >
            <div className="rounded-4xl border border-ink/10 bg-cream p-6 shadow-soft">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search.placeholder}
                  className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/40"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full hover:bg-ink/5"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </form>

              {query.trim() && (
                <div className="mt-5 border-t border-ink/10 pt-5">
                  {results.length === 0 ? (
                    <p className="py-6 text-center text-sm text-ink/50">{t.search.noResults}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {results.map((product) => (
                        <Link
                          key={product.id}
                          to={`/shop/${product.slug}`}
                          onClick={handleClose}
                          className="flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-stone"
                        >
                          <div className="h-14 w-12 flex-none overflow-hidden rounded-xl bg-stone">
                            <ProductImage src={product.image} alt={product.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-semibold text-ink">{product.name}</p>
                            <p className="truncate text-xs text-ink/50">{product.tagline}</p>
                          </div>
                          <span className="flex-none text-sm font-medium text-ink">{formatPrice(product.price)}</span>
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={goToResults}
                        className="mt-2 rounded-full border border-ink/10 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:border-ink"
                      >
                        {t.search.viewAll}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
