import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCart } from '@/lib/cartContext'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { printReceipt, type Receipt } from '@/lib/receipt'
import { trackPurchase } from '@/lib/analytics'
import { DISTRIBUTOR_WHATSAPP, waLink } from '@/lib/whatsapp'
import { formatPrice } from '@/lib/format'
import { useFeature } from '@/lib/featureFlags'

export default function OrderConfirmation() {
  const { clearCart } = useCart()
  const { t, locale } = useLanguage()
  usePageMeta('Commande Confirmée', 'Merci pour votre commande Forever Living Products.')
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get('session_id')
  const ref = params.get('ref')
  const reference = ref
    ? ref
    : sessionId
      ? sessionId.replace('cs_test_', '').replace('cs_live_', '').slice(0, 12).toUpperCase()
      : ''
  // Referral codes are only meaningful for our own generated references (the
  // cash-on-delivery flow) — Stripe session ids aren't order_refs customers can share.
  const canShareReferral = Boolean(ref)
  const [cleared, setCleared] = useState(false)
  const [copied, setCopied] = useState(false)
  const waConfirmEnabled = useFeature('order_wa_confirm')

  // The receipt snapshot saved at checkout (only present for orders placed in
  // this browser session), matched to the current reference.
  const receipt: Receipt | null = (() => {
    try {
      const raw = sessionStorage.getItem('lastReceipt')
      if (!raw) return null
      const parsed = JSON.parse(raw) as Receipt
      return parsed.ref === reference ? parsed : null
    } catch {
      return null
    }
  })()

  function downloadReceipt() {
    if (receipt) printReceipt(receipt, t.orderConfirmation.receipt, locale === 'ar')
  }

  function copyCode() {
    navigator.clipboard.writeText(reference).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function shareWhatsApp() {
    const text = `${t.orderConfirmation.referralShareText} ${reference} — ${window.location.origin}/shop`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  useEffect(() => {
    clearCart()
    setCleared(true)
    // Analytics: a real order was placed this session (fires once per order).
    if (receipt) trackPurchase(receipt.total, receipt.ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-[80vh] items-center justify-center pb-24 pt-32 sm:pt-40">
      <div className="container-px mx-auto max-w-lg text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100"
        >
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="#4F5A41" strokeWidth="2">
            <motion.path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {t.orderConfirmation.eyebrow}
          </p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {t.orderConfirmation.title}<span className="font-extrabold text-sage-600">{t.orderConfirmation.titleAccent}</span>
          </h1>
          <p className="mt-5 text-sm text-ink/60">
            {t.orderConfirmation.orderPrefix} <span className="font-medium text-ink">{cleared ? reference : ''}</span> {t.orderConfirmation.orderPlaced}
          </p>
          {reference && (
            <p className="mt-3 text-xs text-ink/45">{t.orderConfirmation.trackHint}</p>
          )}

          {/* One-tap WhatsApp confirmation — customers who confirm are real
              orders, so this directly cuts COD ghost orders. */}
          {waConfirmEnabled && reference && (
            <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-[#25D366]/30 bg-[#25D366]/5 p-6">
              <p className="font-display text-lg font-bold text-ink">{t.orderConfirmation.waConfirmTitle}</p>
              <p className="mt-1.5 text-sm text-ink/60">{t.orderConfirmation.waConfirmBody}</p>
              <a
                href={waLink(
                  DISTRIBUTOR_WHATSAPP,
                  `${t.orderConfirmation.waConfirmMessage} ${reference}` +
                    (receipt
                      ? ` — ${receipt.items.map((it) => `${it.name} ×${it.quantity}`).join(', ')} — ${formatPrice(receipt.total)}`
                      : ''),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:brightness-95"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.25-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.1-.15.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.5-.9-.8-1.5-1.75-1.65-2.05-.15-.3 0-.45.15-.6.15-.15.3-.35.45-.55.15-.2.2-.3.3-.5.1-.2.05-.4-.05-.55-.1-.15-.65-1.55-.9-2.15-.2-.55-.45-.5-.65-.5h-.55c-.2 0-.5.05-.75.35-.25.3-1 1-1 2.4s1.05 2.8 1.2 3c.15.2 2.05 3.15 5 4.4.7.3 1.25.5 1.65.65.7.2 1.35.2 1.85.1.55-.05 1.7-.7 1.95-1.35.25-.65.25-1.2.15-1.35-.1-.15-.3-.2-.6-.35zM12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.25A10 10 0 1012 2z"/></svg>
                {t.orderConfirmation.waConfirmButton}
              </a>
            </div>
          )}

          {canShareReferral && (
            <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-ink/10 bg-cream-dark p-6">
              <p className="font-display text-lg font-bold text-ink">{t.orderConfirmation.referralTitle}</p>
              <p className="mt-1.5 text-sm text-ink/60">{t.orderConfirmation.referralBody}</p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex-1 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
                >
                  {copied ? t.orderConfirmation.referralCopied : reference}
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="flex-none rounded-full bg-sage-600 px-4 py-2.5 text-sm font-medium text-cream hover:bg-sage-700"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          )}

          {receipt && (
            <div className="mt-6">
              <button
                type="button"
                onClick={downloadReceipt}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.orderConfirmation.receiptButton}
              </button>
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {reference && (
              <Button to={`/suivi?ref=${reference}`} variant="primary">
                {t.orderConfirmation.trackOrder}
              </Button>
            )}
            <Button to="/shop" variant={reference ? 'secondary' : 'primary'}>
              {t.orderConfirmation.continueShopping}
            </Button>
            <Button to="/" variant="secondary">
              {t.orderConfirmation.backHome}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
