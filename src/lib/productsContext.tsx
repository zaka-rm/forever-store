import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { products as staticProducts, type Product, type Category } from '@/lib/products'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

interface ProductsContextValue {
  products: Product[]
  loading: boolean
  /** true when the list came from the Supabase database, false when using the bundled fallback */
  fromDatabase: boolean
  getProductBySlug: (slug: string) => Product | undefined
  getBestSellers: () => Product[]
  getRelatedProducts: (product: Product, count?: number) => Product[]
  refresh: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

// Supabase stores columns in snake_case; the rest of the app uses the camelCase Product shape.
function mapRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    nameAr: (row.name_ar as string) ?? undefined,
    category: row.category as Category,
    price: Number(row.price),
    rating: Number(row.rating),
    reviewCount: Number(row.review_count ?? 0),
    tagline: (row.tagline as string) ?? '',
    taglineAr: (row.tagline_ar as string) ?? undefined,
    description: (row.description as string) ?? '',
    descriptionAr: (row.description_ar as string) ?? undefined,
    ingredients: (row.ingredients as string[]) ?? [],
    ingredientsAr: (row.ingredients_ar as string[]) ?? undefined,
    howToUse: (row.how_to_use as string) ?? '',
    howToUseAr: (row.how_to_use_ar as string) ?? undefined,
    image: (row.image as string) ?? '',
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : undefined,
    size: (row.size as string) ?? undefined,
    bestSeller: (row.best_seller as boolean) ?? undefined,
    new: (row.is_new as boolean) ?? undefined,
    packContents: (row.pack_contents as string[]) ?? undefined,
    stock: row.stock === null || row.stock === undefined ? null : Number(row.stock),
  }
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  // Start from the bundled catalogue so the site renders instantly and always works,
  // even before the database is configured. If Supabase has products, they replace this.
  const [products, setProducts] = useState<Product[]>(staticProducts)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [fromDatabase, setFromDatabase] = useState(false)

  async function load() {
    if (!isSupabaseConfigured) {
      setProducts(staticProducts)
      setLoading(false)
      setFromDatabase(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      // Database not seeded yet (or unreachable) — keep showing the bundled catalogue.
      setProducts(staticProducts)
      setFromDatabase(false)
    } else {
      // Hidden products stay in the admin but never appear on the public site.
      // (Filtered here so it works even before the `hidden` column exists.)
      setProducts(data.filter((row) => !row.hidden).map(mapRow))
      setFromDatabase(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: ProductsContextValue = {
    products,
    loading,
    fromDatabase,
    getProductBySlug: (slug) => products.find((p) => p.slug === slug),
    getBestSellers: () => products.filter((p) => p.bestSeller),
    getRelatedProducts: (product, count = 4) =>
      products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, count),
    refresh: load,
  }

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
