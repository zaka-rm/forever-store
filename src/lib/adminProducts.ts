import { supabase } from '@/lib/supabaseClient'

// Admin works directly with the database column shape (snake_case).
export interface ProductRow {
  id: string
  slug: string
  name: string
  name_ar: string | null
  category: string
  price: number
  rating: number
  review_count: number
  tagline: string | null
  tagline_ar: string | null
  description: string | null
  description_ar: string | null
  ingredients: string[]
  ingredients_ar: string[] | null
  how_to_use: string | null
  how_to_use_ar: string | null
  image: string | null
  gallery: string[] | null
  size: string | null
  best_seller: boolean
  is_new: boolean
  pack_contents: string[] | null
  stock: number | null
  hidden: boolean
  sort_order: number
}

export function emptyProduct(sortOrder: number): ProductRow {
  return {
    id: crypto.randomUUID(),
    slug: '',
    name: '',
    name_ar: null,
    category: 'Nutrition',
    price: 0,
    rating: 5,
    review_count: 0,
    tagline: null,
    tagline_ar: null,
    description: null,
    description_ar: null,
    ingredients: [],
    ingredients_ar: null,
    how_to_use: null,
    how_to_use_ar: null,
    image: null,
    gallery: null,
    size: null,
    best_seller: false,
    is_new: false,
    pack_contents: null,
    stock: null,
    hidden: false,
    sort_order: sortOrder,
  }
}

export async function setProductHidden(id: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ hidden }).eq('id', id)
  if (error) throw error
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function fetchAllProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as ProductRow[]
}

export async function saveProduct(row: ProductRow, isNew: boolean): Promise<void> {
  // Only send `gallery` when it actually has images, so product saves keep
  // working even before the gallery column is added (15_product-gallery.sql).
  const payload: Record<string, unknown> = { ...row }
  if (!Array.isArray(row.gallery) || row.gallery.length === 0) delete payload.gallery

  if (isNew) {
    const { error } = await supabase.from('products').insert(payload)
    if (error) throw error
  } else {
    const { error } = await supabase.from('products').update(payload).eq('id', row.id)
    if (error) throw error
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// Uploads a file to the public product-images bucket and returns its public URL.
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${productId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
  return data.publicUrl
}
