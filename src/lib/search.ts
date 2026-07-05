import { getLocalizedProduct, type Product } from '@/lib/products'
import type { Locale } from '@/lib/i18n/LanguageContext'

export function searchProducts(
  products: Product[],
  query: string,
  locale: Locale,
  limit?: number,
): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results = products
    .map((p) => getLocalizedProduct(p, locale))
    .filter((p) => {
      const haystack = `${p.name} ${p.tagline} ${p.category}`.toLowerCase()
      return haystack.includes(q)
    })

  return limit ? results.slice(0, limit) : results
}
