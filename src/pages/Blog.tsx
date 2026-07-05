import { Link } from 'react-router-dom'
import { getLocalizedPost } from '@/lib/blogPosts'
import { useBlog } from '@/lib/blogContext'
import { ProductImage } from '@/components/ui/ProductImage'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Blog() {
  const { t, locale } = useLanguage()
  const { posts } = useBlog()
  const b = t.blog
  usePageMeta('Le Journal', "Conseils, science et rituels autour de l'Aloe Vera.")
  const localized = posts.map((p) => getLocalizedPost(p, locale))

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-7xl">
        <RevealItem className="mb-14 max-w-xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{b.eyebrow}</p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {b.title}<span className="font-extrabold text-sage-600">{b.titleAccent}</span>
          </h1>
          <p className="mt-4 text-sm text-ink/60">{b.subtitle}</p>
        </RevealItem>

        <RevealItem className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {localized.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group flex flex-col">
              <div className="aspect-[4/3] overflow-hidden rounded-4xl bg-stone">
                <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
                  <ProductImage src={post.image} alt={post.title} />
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sage-600">
                  {post.tag} · {post.readTime} {b.readTimeSuffix}
                </p>
                <p className="font-display text-lg font-semibold leading-snug text-ink">{post.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
