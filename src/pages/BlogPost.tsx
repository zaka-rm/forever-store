import { Link, Navigate, useParams } from 'react-router-dom'
import { getLocalizedPost } from '@/lib/blogPosts'
import { useBlog } from '@/lib/blogContext'
import { ProductImage } from '@/components/ui/ProductImage'
import { Button } from '@/components/ui/Button'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function BlogPost() {
  const { slug } = useParams()
  const { posts, loading, getBySlug } = useBlog()
  const rawPost = slug ? getBySlug(slug) : undefined
  const { t, locale } = useLanguage()
  const b = t.blog
  usePageMeta(rawPost ? getLocalizedPost(rawPost, locale).title : '', rawPost?.excerpt)

  // Wait for the database load before deciding the slug is invalid.
  if (loading && !rawPost) return <div className="min-h-[70vh]" />
  if (!rawPost) return <Navigate to="/blog" replace />

  const post = getLocalizedPost(rawPost, locale)
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 3).map((p) => getLocalizedPost(p, locale))

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-3xl">
        <RevealItem className="mb-8">
          <Button to="/blog" variant="secondary" magnetic={false}>
            {b.backToBlog}
          </Button>
        </RevealItem>

        <RevealItem>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {post.tag} · {post.readTime} {b.readTimeSuffix}
          </p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">{post.title}</h1>
        </RevealItem>

        <RevealItem className="mt-10 aspect-[16/9] overflow-hidden rounded-5xl bg-stone">
          <ProductImage src={post.image} alt={post.title} eager />
        </RevealItem>

        <RevealItem className="mt-10 flex flex-col gap-5">
          {post.content.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-ink/75">
              {paragraph}
            </p>
          ))}
        </RevealItem>
      </SectionReveal>

      {more.length > 0 && (
        <SectionReveal className="container-px mx-auto mt-20 max-w-7xl">
          <RevealItem className="grid gap-8 sm:grid-cols-3">
            {more.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden rounded-4xl bg-stone">
                  <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
                    <ProductImage src={p.image} alt={p.title} />
                  </div>
                </div>
                <p className="mt-4 font-display text-base font-semibold leading-snug text-ink">{p.title}</p>
              </Link>
            ))}
          </RevealItem>
        </SectionReveal>
      )}
    </div>
  )
}
