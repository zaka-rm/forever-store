import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

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
  locale: string
  successUrl: string
  cancelUrl: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, customer, locale, successUrl, cancelUrl }: CheckoutRequest = await req.json()

    if (!items?.length || !customer?.email) {
      return new Response(JSON.stringify({ error: 'Missing items or customer info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const shipping = subtotal > 50 ? 0 : 6
    const total = subtotal + shipping

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Livraison' },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: lineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    })

    const { error: dbError } = await supabase.from('orders').insert({
      customer_name: customer.fullName,
      customer_email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      region: customer.region,
      zip: customer.zip,
      country: customer.country,
      items,
      subtotal,
      shipping,
      total,
      currency: 'eur',
      stripe_session_id: session.id,
      payment_status: 'pending',
      locale,
    })

    if (dbError) {
      console.error('Failed to insert order', dbError)
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
