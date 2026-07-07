import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { WHATSAPP_NUMBER } from '@/lib/constants'

export function LiveChat() {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const c = t.liveChat

  function openWhatsapp(topic: string) {
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(topic)}`
    window.open(href, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  function goToContact() {
    setOpen(false)
    navigate('/contact')
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? c.close : c.open}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink shadow-soft"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#FBFCFC" strokeWidth="1.8">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#FBFCFC" strokeWidth="1.8">
            <path d="M4 5h16v10H8l-4 4V5Z" strokeLinejoin="round" />
          </svg>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[168px] right-6 z-30 w-[calc(100%-3rem)] max-w-sm overflow-hidden rounded-4xl border border-ink/10 bg-cream shadow-soft sm:w-80"
          >
            <div className="bg-ink px-5 py-4">
              <p className="font-display text-sm font-semibold text-cream">Naturaloé</p>
            </div>
            <div className="p-5">
              <p className="mb-4 text-sm leading-relaxed text-ink/80">{c.greeting}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openWhatsapp(c.quickReplies.product)}
                  className="rounded-2xl border border-ink/10 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:border-sage-500 hover:bg-sage-50"
                >
                  {c.quickReplies.product}
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsapp(c.quickReplies.order)}
                  className="rounded-2xl border border-ink/10 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:border-sage-500 hover:bg-sage-50"
                >
                  {c.quickReplies.order}
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsapp(c.quickReplies.distributor)}
                  className="rounded-2xl border border-ink/10 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:border-sage-500 hover:bg-sage-50"
                >
                  {c.quickReplies.distributor}
                </button>
              </div>
              <button
                type="button"
                onClick={goToContact}
                className="mt-4 w-full text-center text-xs font-medium text-ink/50 underline-offset-2 hover:text-ink hover:underline"
              >
                {c.goContact}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
