import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart, BUNDLE_MIN_ITEMS } from '@/lib/cartContext'
import { useProducts } from '@/lib/productsContext'
import { stockStatus } from '@/lib/products'
import { ProductImage } from '@/components/ui/ProductImage'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { formatPrice } from '@/lib/format'
import { DISTRIBUTOR_WHATSAPP, waLink } from '@/lib/whatsapp'
import { useFeature } from '@/lib/featureFlags'

export function CartDrawer() {
  const { isOpen, closeCart, lines, updateQuantity, removeFromCart, addToCart, subtotal, hasBundle, bundleDiscount, total, count } = useCart()
  const itemsToBundle = Math.max(0, BUNDLE_MIN_ITEMS - count)
  // Both hooks must run unconditionally (Rules of Hooks) — combine after.
  const nudgeFlag = useFeature('bundle_nudge')
  const bundleFlag = useFeature('bundle_discount')
  const nudgeEnabled = nudgeFlag && bundleFlag
  const { getBestSellers } = useProducts()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  // Recommend a couple of best-sellers that aren't already in the cart and are
  // in stock (never suggest something the customer can't buy).
  const inCart = new Set(lines.map((l) => l.product.id))
  const suggestions = getBestSellers()
    .filter((p) => !inCart.has(p.id) && stockStatus(p.stock) !== 'out')
    .slice(0, 2)

  function goToCheckout() {
    closeCart()
    navigate('/checkout')
  }

  // A ready-written order the customer can send to the distributor over WhatsApp.
  function whatsappOrderLink() {
    const items = lines
      .map((l) => `• ${l.product.name} × ${l.quantity} — ${formatPrice(l.product.price * l.quantity)}`)
      .join('\n')
    const message = `${t.cart.waGreeting}\n${items}\n\n${t.cart.waSubtotal} : ${formatPrice(subtotal)}\n${t.cart.waOutro}`
    return waLink(DISTRIBUTOR_WHATSAPP, message)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-6 sm:px-8">
              <h2 className="font-display text-2xl font-bold text-ink">{t.cart.title}</h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label={t.nav.closeCart}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <p className="font-display text-xl font-semibold text-ink/70">{t.cart.empty}</p>
                  <Button to="/shop" variant="secondary" onClick={closeCart}>
                    {t.cart.browse}
                  </Button>
                </div>
              ) : (
                <>
                <ul className="flex flex-col gap-6">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={line.product.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-4 overflow-hidden"
                      >
                        <div className="h-24 w-20 flex-none overflow-hidden rounded-2xl bg-stone">
                          <ProductImage src={line.product.image} alt={line.product.name} />
                        </div>
                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display text-base text-ink">{line.product.name}</p>
                            <button
                              type="button"
                              onClick={() => removeFromCart(line.product.id)}
                              className="text-xs text-ink/40 underline-offset-2 hover:text-ink hover:underline"
                            >
                              {t.cart.remove}
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 rounded-full border border-ink/15 px-3 py-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.product.id, line.quantity - 1)}
                                className="text-ink/60 hover:text-ink"
                                aria-label={t.cart.decrease}
                              >
                                −
                              </button>
                              <span className="w-4 text-center text-sm">{line.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.product.id, line.quantity + 1)}
                                className="text-ink/60 hover:text-ink"
                                aria-label={t.cart.increase}
                              >
                                +
                              </button>
                            </div>
                            <span className="text-sm font-medium text-ink">
                              {formatPrice(line.product.price * line.quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                {suggestions.length > 0 && (
                  <div className="mt-8 border-t border-ink/10 pt-6">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wider text-ink/40">{t.cart.suggestions}</p>
                    <ul className="flex flex-col gap-4">
                      {suggestions.map((p) => (
                        <li key={p.id} className="flex items-center gap-3">
                          <div className="h-14 w-12 flex-none overflow-hidden rounded-xl bg-stone">
                            <ProductImage src={p.image} alt={p.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">{p.name}</p>
                            <p className="text-xs text-ink/50">{formatPrice(p.price)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(p, 1)}
                            className="flex-none rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                          >
                            + {t.cart.add}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border-t border-ink/10 px-6 py-6 sm:px-8">
                {nudgeEnabled && (itemsToBundle > 0 ? (
                  <p className="mb-4 rounded-2xl bg-sage-100 px-4 py-2.5 text-center text-xs font-medium text-sage-700">
                    {t.cart.bundleNudge.replace('{n}', String(itemsToBundle))}
                  </p>
                ) : (
                  <p className="mb-4 rounded-2xl bg-sage-600 px-4 py-2.5 text-center text-xs font-bold text-cream">
                    {t.cart.bundleUnlocked}
                  </p>
                ))}
                <div className="mb-4">
                  <p className="mb-2 text-center text-xs font-medium text-ink/70">
                    {remaining > 0 ? (
                      <>
                        {t.cart.freeShipPrefix}{' '}
                        <span className="font-bold text-sage-700">{formatPrice(remaining)}</span>{' '}
                        {t.cart.freeShipSuffix}
                      </>
                    ) : (
                      <span className="font-bold text-sage-700">{t.cart.freeShipUnlocked}</span>
                    )}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <motion.div
                      className="h-full rounded-full bg-sage-600"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                    />
                  </div>
                </div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink/60">{t.cart.subtotal}</span>
                  <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
                </div>
                {hasBundle && (
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-sage-700">{t.cart.bundleLabel}</span>
                    <span className="font-medium text-sage-700">−{formatPrice(bundleDiscount)}</span>
                  </div>
                )}
                <div className="mb-4 mt-1 flex items-center justify-between border-t border-ink/10 pt-2 text-sm">
                  <span className="text-ink/60">{t.cart.total}</span>
                  <span className="font-semibold text-ink">{formatPrice(total)}</span>
                </div>
                <Button variant="primary" className="w-full" onClick={goToCheckout}>
                  {t.cart.checkout}
                </Button>

                <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink/30">
                  <span className="h-px flex-1 bg-ink/10" />
                  {t.cart.orIntro}
                  <span className="h-px flex-1 bg-ink/10" />
                </div>

                <a
                  href={whatsappOrderLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeCart}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-medium text-white transition-[filter] hover:brightness-95"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.25-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.1-.15.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.5-.9-.8-1.5-1.75-1.65-2.05-.15-.3 0-.45.15-.6.15-.15.3-.35.45-.55.15-.2.2-.3.3-.5.1-.2.05-.4-.05-.55-.1-.15-.65-1.55-.9-2.15-.2-.55-.45-.5-.65-.5h-.55c-.2 0-.5.05-.75.35-.25.3-1 1-1 2.4s1.05 2.8 1.2 3c.15.2 2.05 3.15 5 4.4.7.3 1.25.5 1.65.65.7.2 1.35.2 1.85.1.55-.05 1.7-.7 1.95-1.35.25-.65.25-1.2.15-1.35-.1-.15-.3-.2-.6-.35zM12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.25A10 10 0 1012 2z"/></svg>
                  {t.cart.orderWhatsApp}
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
