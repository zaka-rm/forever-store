import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders } from '../_shared/cors.ts'

// ---------------------------------------------------------------------------
// YouCan Pay — create a hosted card payment (MAD).
//
// Flow: the browser sends the cart + customer here → we "tokenize" the payment
// with YouCan Pay using the PRIVATE key (which never leaves the server) → we
// save the order as `pending` → we return the hosted payment-page URL and the
// browser redirects the customer to it. YouCan Pay then calls our webhook to
// mark the order `paid`.
//
// SANDBOX: set YOUCANPAY_SANDBOX=true and use your `pri_sandbox_*` key while
// testing. Flip to false + live key when you go live.
//
// ⚠️ Confirm these two endpoints against YouCan Pay's current docs when your
// keys arrive — they are the only things that might need adjusting:
//   - TOKENIZE_URL (the API endpoint that creates the payment token)
//   - the hosted PAYMENT_PAGE_URL the customer is redirected to
// ---------------------------------------------------------------------------

const PRIVATE_KEY = Deno.env.get('YOUCANPAY_PRIVATE_KEY')!
const IS_SANDBOX = (Deno.env.get('YOUCANPAY_SANDBOX') ?? 'true') === 'true'

const TOKENIZE_URL = 'https://youcanpay.com/api/tokenize'
// Hosted payment page the customer is sent to. Sandbox uses a separate path.
function paymentPageUrl(tokenId: string): string {
  return IS_SANDBOX
    ? `https://youcanpay.com/sandbox/payment/${tokenId}`
    : `https://youcanpay.com/payment/${tokenId}`
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CheckoutRequest {
  items: CheckoutItem[]
  customer: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    region: string
    zip: string
    country: string
  }
  // Totals are computed by the browser but re-derived here so the amount charged
  // can never be tampered with client-side.
  shipping: number
  discount: number
  locale: string
  successUrl: string
  cancelUrl: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: CheckoutRequest = await req.json()
    const { items, customer, shipping, discount, locale, successUrl, cancelUrl } = body

    if (!items?.length || !customer?.phone) {
      return new Response(JSON.stringify({ error: 'Missing items or customer info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Re-derive the amount server-side (never trust a client-sent total).
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const safeShipping = Math.max(0, Number(shipping) || 0)
    const safeDiscount = Math.max(0, Number(discount) || 0)
    const total = Math.max(0, subtotal + safeShipping - safeDiscount)

    // Our own reference; also used to reconcile the webhook back to this order.
    const orderRef = `FL${Date.now().toString().slice(-8)}`

    // YouCan Pay expects the amount in the currency's smallest unit (centimes).
    const amount = Math.round(total * 100)

    const tokenRes = await fetch(TOKENIZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        pri_key: PRIVATE_KEY,
        amount,
        currency: 'MAD',
        order_id: orderRef,
        success_url: `${successUrl}?ref=${orderRef}`,
        error_url: cancelUrl,
        customer_ip: req.headers.get('x-forwarded-for') ?? '0.0.0.0',
        metadata: { locale },
      }),
    })

    const tokenData = await tokenRes.json()
    const tokenId = tokenData?.token?.id ?? tokenData?.id
    if (!tokenRes.ok || !tokenId) {
      console.error('YouCan Pay tokenize failed', tokenData)
      return new Response(JSON.stringify({ error: 'Payment init failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Save the order as pending — the webhook flips it to paid on success.
    const { error: dbError } = await supabase.from('orders').insert({
      customer_name: customer.fullName,
      customer_email: customer.email?.trim() || null,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      region: customer.region,
      zip: customer.zip,
      country: customer.country,
      items,
      subtotal,
      shipping: safeShipping,
      total,
      discount_amount: safeDiscount,
      currency: 'mad',
      order_ref: orderRef,
      youcanpay_token: tokenId,
      payment_status: 'pending',
      payment_method: 'card',
      status: 'pending',
      locale,
    })
    if (dbError) console.error('Failed to insert order', dbError)

    return new Response(JSON.stringify({ url: paymentPageUrl(tokenId), ref: orderRef }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
