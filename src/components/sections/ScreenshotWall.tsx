import { useEffect, useState } from 'react'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { fetchTestimonials, type TestimonialRow } from '@/lib/testimonials'
import { useFeature } from '@/lib/featureFlags'

/**
 * Real customer messages (WhatsApp screenshots, numbers blurred) uploaded from
 * the admin. Renders nothing until at least one screenshot is added.
 */
export function ScreenshotWall() {
  const enabled = useFeature('wa_testimonials')
  const { t } = useLanguage()
  const [rows, setRows] = useState<TestimonialRow[]>([])
  const [zoomed, setZoomed] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    fetchTestimonials().then((all) => setRows(all.filter((r) => r.active)))
  }, [enabled])

  if (!enabled || rows.length === 0) return null

  return (
    <SectionReveal className="container-px mx-auto max-w-7xl py-10">
      <RevealItem className="mb-8 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
          {t.home.screenshotsEyebrow}
        </p>
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {t.home.screenshotsTitle}
        </h2>
      </RevealItem>
      <RevealItem>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setZoomed(r.image)}
              className="w-52 flex-none snap-start overflow-hidden rounded-3xl border border-ink/10 bg-cream-dark text-start shadow-card transition-transform hover:-translate-y-1 sm:w-60"
            >
              <img src={r.image} alt={r.caption ?? ''} loading="lazy" className="w-full object-cover" />
              {r.caption && <p className="px-4 py-3 text-xs text-ink/60">{r.caption}</p>}
            </button>
          ))}
        </div>
      </RevealItem>

      {/* Simple lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6"
          onClick={() => setZoomed(null)}
          role="dialog"
        >
          <img src={zoomed} alt="" className="max-h-[85vh] max-w-full rounded-2xl" />
        </div>
      )}
    </SectionReveal>
  )
}
