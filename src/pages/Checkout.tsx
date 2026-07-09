import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCart } from '@/lib/cartContext'
import { ProductImage } from '@/components/ui/ProductImage'
import { Button } from '@/components/ui/Button'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { supabase } from '@/lib/supabaseClient'
import { usePageMeta } from '@/lib/usePageMeta'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/constants'
import { formatPrice } from '@/lib/format'
import { trackInitiateCheckout } from '@/lib/analytics'

interface OrderFormData {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  region: string
  zip: string
  country: string
  notes: string
}

const initialFormData: OrderFormData = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  region: '',
  zip: '',
  country: 'Maroc',
  notes: '',
}

export default function Checkout() {
  const { lines, subtotal } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<OrderFormData>(initialFormData)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderError, setOrderError] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; type: 'percent' | 'fixed'; value: number } | null>(null)
  const [promoError, setPromoError] = useState('')
  const [promoChecking, setPromoChecking] = useState(false)
  const [zone, setZone] = useState<{ fee: number; free_threshold: number | null } | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const { t, locale } = useLanguage()
  const c = t.checkout
  usePageMeta('Commande', 'Finalisez votre commande Forever Living Products.')

  // Analytics: the visitor reached the checkout (fires once per visit).
  useEffect(() => {
    if (lines.length > 0) trackInitiateCheckout(subtotal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Look up a city-specific delivery fee (debounced) — falls back to the
  // site-wide default when no matching zone is configured.
  useEffect(() => {
    const city = formData.city.trim()
    if (!city) {
      setZone(null)
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('delivery_zones')
        .select('fee, free_threshold')
        .ilike('city', city)
        .eq('active', true)
        .maybeSingle()
      setZone(data ?? null)
    }, 500)
    return () => clearTimeout(timeout)
  }, [formData.city])

  if (lines.length === 0) return <Navigate to="/shop" replace />

  const freeThreshold = zone?.free_threshold ?? FREE_SHIPPING_THRESHOLD
  const shipping = subtotal >= freeThreshold ? 0 : (zone?.fee ?? SHIPPING_FEE)
  const discount = promo
    ? promo.type === 'percent'
      ? Math.round(subtotal * promo.value) / 100
      : Math.min(promo.value, subtotal)
    : 0
  const total = Math.max(0, subtotal + shipping - discount)

  async function applyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    setPromoError('')
    const { data } = await supabase.rpc('validate_discount', { p_code: code })
    setPromoChecking(false)
    const d = data && data[0]
    if (!d) {
      setPromo(null)
      setPromoError(c.promoInvalid)
      return
    }
    if (d.min_subtotal && subtotal < Number(d.min_subtotal)) {
      setPromo(null)
      setPromoError(`${c.promoMin} ${formatPrice(Number(d.min_subtotal), 0)}`)
      return
    }
    setPromo({ code: d.code, type: d.type, value: Number(d.value) })
    setPromoError('')
  }

  function updateField(key: keyof OrderFormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function startStripeCheckout() {
    setIsSubmitting(true)
    setOrderError(false)

    const origin = window.location.origin
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        items: lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          price: line.product.price,
          quantity: line.quantity,
        })),
        customer: formData,
        locale,
        successUrl: `${origin}/checkout/confirmation`,
        cancelUrl: `${origin}/checkout`,
      },
    })

    if (error || !data?.url) {
      setOrderError(true)
      setIsSubmitting(false)
      return
    }

    window.location.href = data.url
  }

  // Cash-on-delivery: save the order straight to the database (payment collected
  // later), then send the customer to the confirmation page.
  async function placeCodOrder() {
    setIsSubmitting(true)
    setOrderError(false)

    const reference = `FL${Date.now().toString().slice(-8)}`
    const orderRow = {
        customer_name: formData.fullName,
        customer_email: formData.email.trim(),
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        zip: formData.zip,
        country: formData.country,
        items: lines.map((line) => ({
          id: line.product.id,
          name: line.product.name,
          price: line.product.price,
          quantity: line.quantity,
        })),
        subtotal,
        shipping,
        total,
        discount_code: promo?.code ?? null,
        discount_amount: discount,
        currency: 'eur',
        payment_status: 'pending',
        payment_method: 'cod',
        status: 'pending',
        order_ref: reference,
        locale,
        // Only sent when filled, so checkout keeps working even before the
        // `notes` column is added (13_order-notes.sql).
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
    }

    let { error } = await supabase.from('orders').insert(orderRow)

    // If the database doesn't have the `notes` column yet, never lose the sale:
    // retry once without it (the note still reaches you via WhatsApp contact).
    if (error && 'notes' in orderRow && /notes/.test(error.message)) {
      const { notes: _omit, ...withoutNotes } = orderRow as Record<string, unknown>
      ;({ error } = await supabase.from('orders').insert(withoutNotes))
    }

    if (error) {
      setOrderError(true)
      setIsSubmitting(false)
      return
    }

    // Reduce stock for the ordered items (best-effort; only affects products
    // whose stock is tracked). Runs through a trusted function since customers
    // can't update products directly.
    Promise.resolve(
      supabase.rpc('decrement_stock', {
        p_items: lines.map((line) => ({ id: line.product.id, quantity: line.quantity })),
      }),
    ).catch(() => {})

    // Best-effort "order received" email, looked up by reference (anonymous
    // customers can't read the order row back). Ignored if not deployed yet.
    supabase.functions
      .invoke('send-order-email', {
        body: { orderRef: reference, status: 'pending', siteUrl: window.location.origin },
      })
      .catch(() => {})

    // Best-effort referral: validated server-side (the referrer's order must
    // exist); silently ignored if invalid or the code isn't set up yet.
    const refCode = referralCode.trim()
    if (refCode) {
      Promise.resolve(supabase.rpc('submit_referral', { p_referrer_ref: refCode, p_referred_ref: reference })).catch(() => {})
    }

    // Snapshot the order so the confirmation page can offer a printable receipt
    // (the cart is cleared there, and customers can't read the order back).
    sessionStorage.setItem(
      'lastReceipt',
      JSON.stringify({
        ref: reference,
        date: new Date().toISOString(),
        customer: { name: formData.fullName, address: formData.address, city: formData.city, phone: formData.phone },
        items: lines.map((line) => ({ name: line.product.name, price: line.product.price, quantity: line.quantity })),
        subtotal,
        shipping,
        discount,
        discountCode: promo?.code ?? null,
        total,
      }),
    )

    navigate(`/checkout/confirmation?ref=${reference}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < c.steps.length - 1) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (paymentMethod === 'card') {
      startStripeCheckout()
    } else {
      placeCodOrder()
    }
  }

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-6xl">
        <RevealItem className="mb-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">
            {c.eyebrow}
          </p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">{c.title}</h1>

          <div className="mt-8 flex items-center gap-3">
            {c.steps.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    i <= step ? 'bg-ink text-cream' : 'bg-stone text-ink/40'
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-sm ${i <= step ? 'text-ink' : 'text-ink/40'}`}>{label}</span>
                {i < c.steps.length - 1 && <div className="mx-1 h-px w-8 bg-ink/15 sm:w-16" />}
              </div>
            ))}
          </div>
        </RevealItem>

        <RevealItem className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="min-w-0 rounded-5xl border border-ink/10 bg-cream-dark p-6 sm:p-10">
            {step === 0 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-2xl font-bold text-ink">{c.contactHeading}</h2>
                <Field label={c.fullName} type="text" value={formData.fullName} onChange={(v) => updateField('fullName', v)} />
                <Field label={c.phone} type="tel" value={formData.phone} onChange={(v) => updateField('phone', v)} />
                <Field label={c.email} type="email" required={false} value={formData.email} onChange={(v) => updateField('email', v)} />
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-2xl font-bold text-ink">{c.shippingHeading}</h2>
                <Field label={c.address} type="text" value={formData.address} onChange={(v) => updateField('address', v)} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={c.city} type="text" value={formData.city} onChange={(v) => updateField('city', v)} />
                  <Field label={c.region} type="text" value={formData.region} onChange={(v) => updateField('region', v)} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={c.zip} type="text" value={formData.zip} onChange={(v) => updateField('zip', v)} />
                  <Field label={c.country} type="text" value={formData.country} onChange={(v) => updateField('country', v)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                    {c.notesLabel}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={2}
                    placeholder={c.notesPlaceholder}
                    className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                  />
                </div>
              </div>
            )}

            {step === c.steps.length - 1 && (
              <div className="mt-8">
                <h2 className="mb-4 font-display text-2xl font-bold text-ink">{c.paymentHeading}</h2>
                <div className="flex flex-col gap-3">
                  <PaymentOption
                    selected={paymentMethod === 'cod'}
                    onSelect={() => setPaymentMethod('cod')}
                    title={c.payCod}
                    desc={c.payCodDesc}
                  />
                  <PaymentOption
                    selected={paymentMethod === 'card'}
                    onSelect={() => setPaymentMethod('card')}
                    title={c.payCard}
                    desc={c.payCardDesc}
                  />
                </div>
                <p className="mt-5 text-xs text-ink/40">
                  {paymentMethod === 'card' ? c.redirectNotice : c.codNotice}
                </p>

                {paymentMethod === 'cod' && (
                  <div className="mt-5">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
                      {c.referralLabel}
                    </label>
                    <input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder={c.referralPlaceholder}
                      className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm uppercase text-ink outline-none focus:border-ink/40"
                    />
                  </div>
                )}
              </div>
            )}
            {orderError && (
              <p className="mt-3 text-xs font-medium text-clay-600">{c.orderError}</p>
            )}

            <div className="mt-8 flex items-center justify-between">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-ink/60 hover:text-ink"
                >
                  {c.back}
                </button>
              ) : (
                <span />
              )}
              <Button type="submit" variant="primary" magnetic={false} disabled={isSubmitting}>
                {step === c.steps.length - 1
                  ? isSubmitting
                    ? paymentMethod === 'card'
                      ? c.placingOrder
                      : `${c.placeOrderCod}…`
                    : paymentMethod === 'card'
                      ? c.placeOrder
                      : c.placeOrderCod
                  : c.continue}
              </Button>
            </div>
          </form>

          <aside className="h-fit min-w-0 rounded-5xl border border-ink/10 p-6 sm:p-8">
            <h2 className="mb-6 font-display text-xl font-bold text-ink">{c.summaryTitle}</h2>
            <ul className="flex flex-col gap-5">
              {lines.map((line) => (
                <li key={line.product.id} className="flex items-center gap-4">
                  <div className="h-16 w-14 flex-none overflow-hidden rounded-xl bg-stone">
                    <ProductImage src={line.product.image} alt={line.product.name} />
                  </div>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">{line.product.name}</p>
                      <p className="text-xs text-ink/50">{c.qty} {line.quantity}</p>
                    </div>
                    <span className="text-sm text-ink">
                      {formatPrice(line.product.price * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Promo code */}
            <div className="mt-6 border-t border-ink/10 pt-6">
              {promo ? (
                <div className="flex items-center justify-between rounded-xl bg-sage-100 px-3 py-2 text-sm">
                  <span className="font-medium text-sage-700">✓ {promo.code} {c.promoApplied}</span>
                  <button type="button" onClick={() => { setPromo(null); setPromoInput('') }} className="text-xs text-sage-700/70 underline">
                    {c.promoRemove}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder={c.promoPlaceholder}
                    className="flex-1 rounded-full border border-ink/15 bg-cream px-4 py-2 text-sm uppercase text-ink outline-none focus:border-ink/40"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoChecking}
                    className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-60"
                  >
                    {promoChecking ? '…' : c.promoApply}
                  </button>
                </div>
              )}
              {promoError && <p className="mt-2 text-xs font-medium text-clay-600">{promoError}</p>}
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-ink/10 pt-6 text-sm">
              <div className="flex justify-between text-ink/60">
                <span>{c.subtotal}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>{c.shipping}</span>
                <span>{shipping === 0 ? c.free : formatPrice(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-medium text-sage-700">
                  <span>{c.discount} {promo ? `(${promo.code})` : ''}</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-ink/10 pt-3 font-display text-lg font-bold text-ink">
                <span>{c.total}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </aside>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}

function PaymentOption({
  selected,
  onSelect,
  title,
  desc,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors ${
        selected ? 'border-ink bg-cream' : 'border-ink/15 hover:border-ink/40'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
          selected ? 'border-ink' : 'border-ink/30'
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink/50">{desc}</span>
      </span>
    </button>
  )
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = true,
}: {
  label: string
  type: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">
        {label}
      </label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
      />
    </div>
  )
}
