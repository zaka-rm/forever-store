// Central analytics. Each service loads ONLY if its ID is set in .env:
//   VITE_META_PIXEL_ID  → Meta (Facebook/Instagram) Pixel — required before ads
//   VITE_GA4_ID         → Google Analytics 4 (e.g. G-XXXXXXX)
//   VITE_CLARITY_ID     → Microsoft Clarity (free heatmaps/session replays)
// With no IDs set, this module does nothing at all.

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined
const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID as string | undefined

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function addScript(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

export function initAnalytics() {
  // Meta Pixel
  if (PIXEL_ID && !window.fbq) {
    const fbq: any = (...args: unknown[]) => {
      ;(fbq.q = fbq.q || []).push(args)
    }
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = fbq.q = []
    window.fbq = fbq
    addScript('https://connect.facebook.net/en_US/fbevents.js')
    fbq('init', PIXEL_ID)
    fbq('track', 'PageView')
  }

  // Google Analytics 4
  if (GA4_ID && !window.gtag) {
    window.dataLayer = window.dataLayer || []
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args)
    }
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`)
    window.gtag('js', new Date())
    window.gtag('config', GA4_ID)
  }

  // Microsoft Clarity
  if (CLARITY_ID) {
    addScript(`https://www.clarity.ms/tag/${CLARITY_ID}`)
  }
}

/** SPA route change — GA4 needs this; the Pixel tracks new PageViews too. */
export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', { page_path: path })
  window.fbq?.('track', 'PageView')
}

export function trackAddToCart(name: string, price: number) {
  window.fbq?.('track', 'AddToCart', { content_name: name, value: price, currency: 'MAD' })
  window.gtag?.('event', 'add_to_cart', { currency: 'MAD', value: price, items: [{ item_name: name, price }] })
}

export function trackInitiateCheckout(value: number) {
  window.fbq?.('track', 'InitiateCheckout', { value, currency: 'MAD' })
  window.gtag?.('event', 'begin_checkout', { currency: 'MAD', value })
}

export function trackPurchase(value: number, orderRef: string) {
  // Fire once per order, even if the confirmation page is refreshed.
  const key = `tracked:${orderRef}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* private mode — track anyway */
  }
  window.fbq?.('track', 'Purchase', { value, currency: 'MAD' })
  window.gtag?.('event', 'purchase', { currency: 'MAD', value, transaction_id: orderRef })
}
