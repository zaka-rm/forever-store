import { supabase } from '@/lib/supabaseClient'
import { blogPosts as staticPosts } from '@/lib/blogPosts'

export interface BlogRow {
  id: string
  slug: string
  title: string
  title_ar: string | null
  excerpt: string | null
  excerpt_ar: string | null
  content: string[]
  content_ar: string[]
  image: string | null
  tag: string | null
  tag_ar: string | null
  date: string
  read_time: string | null
  published: boolean
}

export function emptyPost(): BlogRow {
  return {
    id: crypto.randomUUID(),
    slug: '',
    title: '',
    title_ar: null,
    excerpt: null,
    excerpt_ar: null,
    content: [],
    content_ar: [],
    image: null,
    tag: null,
    tag_ar: null,
    date: new Date().toISOString().slice(0, 10),
    read_time: '3 min',
    published: true,
  }
}

export async function fetchAllPosts(): Promise<BlogRow[]> {
  const { data, error } = await supabase.from('blog_posts').select('*').order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as BlogRow[]
}

export async function savePost(row: BlogRow, isNew: boolean): Promise<void> {
  if (isNew) {
    const { error } = await supabase.from('blog_posts').insert(row)
    if (error) throw error
  } else {
    const { error } = await supabase.from('blog_posts').update(row).eq('id', row.id)
    if (error) throw error
  }
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) throw error
}

/** One-click seed: inserts the built-in articles so the admin can edit them. */
export async function importDefaultPosts(): Promise<number> {
  const rows = staticPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    title_ar: p.titleAr,
    excerpt: p.excerpt,
    excerpt_ar: p.excerptAr,
    content: p.content,
    content_ar: p.contentAr,
    image: p.image,
    tag: p.tag,
    tag_ar: p.tagAr,
    date: p.date,
    read_time: p.readTime,
    published: true,
  }))
  const { error } = await supabase.from('blog_posts').upsert(rows, { onConflict: 'slug' })
  if (error) throw error
  return rows.length
}

/** Uploads a blog image to the existing product-images bucket (blog/ folder). */
export async function uploadBlogImage(postId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `blog/${postId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('product-images').upload(filePath, file, { upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
  return data.publicUrl
}
