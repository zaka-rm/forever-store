import { useEffect } from 'react'
import { SITE_URL } from '@/lib/constants'

const SITE_NAME = 'Forever Living — Distributeur Indépendant'
const base = SITE_URL.replace(/\/$/, '')

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Sets the document title, meta description, canonical URL and social-share
 * (Open Graph / Twitter) tags for the current page. Pass an `image` (e.g. a
 * product photo) to give shared links a rich preview.
 */
export function usePageMeta(title: string, description?: string, image?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    document.title = fullTitle

    const url = base + window.location.pathname

    if (description) setMeta('name', 'description', description)
    setMeta('property', 'og:title', fullTitle)
    setMeta('name', 'twitter:title', fullTitle)
    if (description) {
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
    setMeta('property', 'og:url', url)

    if (image) {
      const absolute = image.startsWith('http') ? image : base + image
      setMeta('property', 'og:image', absolute)
      setMeta('name', 'twitter:image', absolute)
    }

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', url)
  }, [title, description, image])
}
