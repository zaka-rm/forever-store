import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { Product } from '@/lib/products'

// ---------------------------------------------------------------------------
// Packs — admin-curated product bundles shown on the Routines page. Each pack
// lists specific products (with quantities); the customer adds the whole pack
// to the cart in one tap. The cart's automatic routine discount (−10% from
// 3 articles) then applies by itself, so the price shown always matches what
// is really charged.
// ---------------------------------------------------------------------------

export interface PackItemRef {
  id: string
  quantity: number
}

export interface PackRow {
  id: string
  created_at: string
  sort_order: number
  active: boolean
  icon: string
  name_fr: string
  name_ar: string | null
  goal_fr: string | null
  goal_ar: string | null
  items: PackItemRef[]
}

/** All packs, actives first by sort order (admin sees all; site filters active). */
export async function fetchPacks(): Promise<PackRow[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data as PackRow[]
  } catch {
    return []
  }
}

export async function savePack(pack: Partial<PackRow> & { name_fr: string }, isNew: boolean): Promise<void> {
  if (isNew) {
    const { id: _omit, ...row } = pack
    const { error } = await supabase.from('packs').insert(row)
    if (error) throw error
  } else {
    const { error } = await supabase.from('packs').update(pack).eq('id', pack.id!)
    if (error) throw error
  }
}

export async function deletePack(id: string): Promise<void> {
  const { error } = await supabase.from('packs').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Resolving a pack against the live catalogue
// ---------------------------------------------------------------------------

export interface ResolvedPackItem {
  product: Product
  quantity: number
}

export interface ResolvedPack {
  pack: PackRow
  items: ResolvedPackItem[]
  /** total number of articles (sum of quantities) */
  count: number
  subtotal: number
  /** discount the CART will actually apply (bundle rate when count ≥ min) */
  discount: number
  total: number
  /** true when every referenced product exists and is in stock */
  complete: boolean
}

const inStock = (p: Product) => p.stock === null || p.stock === undefined || p.stock > 0

export function resolvePack(
  pack: PackRow,
  products: Product[],
  bundleRate: number,
  bundleMinItems: number,
  bundleEnabled: boolean,
): ResolvedPack {
  const items: ResolvedPackItem[] = []
  let missing = false
  for (const ref of pack.items ?? []) {
    const product = products.find((p) => p.id === ref.id)
    if (!product || !inStock(product)) {
      missing = true
      continue
    }
    items.push({ product, quantity: Math.max(1, Number(ref.quantity) || 1) })
  }
  const count = items.reduce((s, it) => s + it.quantity, 0)
  const subtotal = items.reduce((s, it) => s + it.product.price * it.quantity, 0)
  const discount = bundleEnabled && count >= bundleMinItems ? Math.round(subtotal * bundleRate) : 0
  return { pack, items, count, subtotal, discount, total: subtotal - discount, complete: !missing && items.length > 0 }
}
