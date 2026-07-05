import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { blogPosts as staticPosts, type BlogPost } from '@/lib/blogPosts'

interface BlogContextValue {
  posts: BlogPost[]
  loading: boolean
  fromDatabase: boolean
  getBySlug: (slug: string) => BlogPost | undefined
  refresh: () => void
}

const BlogContext = createContext<BlogContextValue | null>(null)

function mapRow(r: Record<string, unknown>): BlogPost {
  const title = String(r.title ?? '')
  const excerpt = (r.excerpt as string) ?? ''
  const tag = (r.tag as string) ?? ''
  return {
    slug: String(r.slug),
    title,
    titleAr: (r.title_ar as string) ?? title,
    excerpt,
    excerptAr: (r.excerpt_ar as string) ?? excerpt,
    content: Array.isArray(r.content) ? (r.content as string[]) : [],
    contentAr: Array.isArray(r.content_ar) ? (r.content_ar as string[]) : [],
    image: (r.image as string) ?? '',
    date: (r.date as string) ?? '',
    readTime: (r.read_time as string) ?? '',
    tag,
    tagAr: (r.tag_ar as string) ?? tag,
  }
}

export function BlogProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<BlogPost[]>(staticPosts)
  const [loading, setLoading] = useState(true)
  const [fromDatabase, setFromDatabase] = useState(false)

  async function load() {
    if (!isSupabaseConfigured) {
      setPosts(staticPosts)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('date', { ascending: false })

    if (error || !data || data.length === 0) {
      // Table not created / empty → keep the built-in articles.
      setPosts(staticPosts)
      setFromDatabase(false)
    } else {
      setPosts(data.map(mapRow))
      setFromDatabase(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: BlogContextValue = {
    posts,
    loading,
    fromDatabase,
    getBySlug: (slug) => posts.find((p) => p.slug === slug),
    refresh: load,
  }

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>
}

export function useBlog() {
  const ctx = useContext(BlogContext)
  if (!ctx) throw new Error('useBlog must be used within BlogProvider')
  return ctx
}
