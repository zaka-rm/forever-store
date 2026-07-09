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

  // Search BOTH languages regardless of the active locale: Arabic users often
  // type Latin product names ("aloe", "argi+"), and French users may paste
  // Arabic — either way the product should be found.
  const results = products
    .filter((p) => {
      const haystack = [p.name, p.tagline, p.category, p.nameAr, p.taglineAr]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    .map((p) => getLocalizedProduct(p, locale))

  return limit ? results.slice(0, limit) : results
}
