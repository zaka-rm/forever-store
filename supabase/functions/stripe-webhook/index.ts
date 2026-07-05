import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function sendEmail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Forever Living Store <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const { data: order, error } = await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('stripe_session_id', session.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update order', error)
    }

    if (order) {
      const items = order.items as Array<{ name: string; quantity: number; price: number }>
      const itemLines = items
        .map((item) => `${item.name} x${item.quantity} — ${(item.price * item.quantity).toFixed(2)} €`)
        .join('<br/>')

      await sendEmail(
        order.customer_email,
        'Votre commande Forever Living est confirmée',
        `<p>Merci pour votre commande, ${order.customer_name} !</p><p>${itemLines}</p><p>Total : ${Number(order.total).toFixed(2)} €</p>`,
      )

      await sendEmail(
        notificationEmail,
        `Nouvelle commande payée — ${order.customer_name}`,
        `<p>${order.customer_name} (${order.customer_email}) vient de payer une commande.</p><p>${itemLines}</p><p>Total : ${Number(order.total).toFixed(2)} €</p>`,
      )
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
