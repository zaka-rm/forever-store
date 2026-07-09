import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// ---------------------------------------------------------------------------
// YouCan Pay — payment webhook.
//
// YouCan Pay calls this URL after a payment attempt. On a successful, paid
// transaction we flip the matching order from `pending` to `paid`.
//
// SECURITY: YouCan Pay signs its webhooks. Set YOUCANPAY_WEBHOOK_SECRET and we
// verify the payload's signature before trusting it. Confirm the exact header
// name + signature scheme against their docs when your keys arrive (left as a
// clearly-marked TODO below so no payment is ever marked paid on a forged call).
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = Deno.env.get('YOUCANPAY_WEBHOOK_SECRET') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  const raw = await req.text()

  // --- Verify the webhook is genuinely from YouCan Pay ---------------------
  // TODO(confirm-with-docs): YouCan Pay sends a signature header. Once you have
  // the docs, compare it against an HMAC of `raw` using WEBHOOK_SECRET and
  // reject on mismatch. Until then we require the secret to be present and
  // matched via a shared token so the endpoint can't be triggered anonymously.
  if (!WEBHOOK_SECRET) {
    console.error('YOUCANPAY_WEBHOOK_SECRET not set — refusing to process')
    return new Response('Not configured', { status: 500 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Bad payload', { status: 400 })
  }

  // Shared-secret check (interim, until signature verification is wired):
  const providedSecret = req.headers.get('x-youcanpay-signature') ?? (payload.secret as string) ?? ''
  if (providedSecret !== WEBHOOK_SECRET) {
    console.error('Webhook secret mismatch')
    return new Response('Invalid signature', { status: 401 })
  }

  // Pull the fields we care about (defensive — shapes vary by event type).
  const eventType = (payload.event_type ?? payload.type ?? '') as string
  const transaction = (payload.payload ?? payload.transaction ?? payload) as Record<string, unknown>
  const status = String(transaction.status ?? payload.status ?? '').toLowerCase()
  const orderRef = (transaction.order_id ?? payload.order_id) as string | undefined
  const tokenId = (transaction.token_id ?? payload.token_id) as string | undefined

  const isPaid = status === 'paid' || status === 'succeeded' || eventType.includes('paid')
  if (!isPaid) {
    // Failed / pending / other events — acknowledge without changing the order.
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Reconcile by our order reference first, then fall back to the token id.
  let query = supabase.from('orders').update({ payment_status: 'paid', status: 'confirmed' })
  query = orderRef ? query.eq('order_ref', orderRef) : query.eq('youcanpay_token', tokenId ?? '')

  const { error } = await query
  if (error) console.error('Failed to mark order paid', error)

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
