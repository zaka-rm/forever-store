import { useEffect, useState } from 'react'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { fetchSiteSettings } from '@/lib/siteSettings'
import { useFeature } from '@/lib/featureFlags'

/**
 * « Qui suis-je » — the seller's own story, written in the admin (Réglages).
 * People buy from people: a few honest sentences beat any marketing copy.
 * Renders nothing until a story is written.
 */
export function SellerStory() {
  const enabled = useFeature('story_section')
  const { t, locale } = useLanguage()
  const [story, setStory] = useState('')

  useEffect(() => {
    if (!enabled) return
    fetchSiteSettings().then((s) => {
      if (!s) return
      const text = (locale === 'ar' && s.story_ar) || s.story_fr || ''
      setStory(text.trim())
    })
  }, [enabled, locale])

  if (!enabled || !story) return null

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-10">
      <RevealItem className="mx-auto max-w-3xl rounded-5xl border border-ink/10 bg-cream-dark px-8 py-12 text-center sm:px-14">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
          {t.home.storyEyebrow}
        </p>
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{t.home.storyTitle}</h2>
        <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink/70">{story}</p>
      </RevealItem>
    </SectionReveal>
  )
}
