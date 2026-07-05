import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL') ?? ''
// Optional: a verified Resend sender, e.g. "Forever Living <commandes@votre-domaine.com>".
// Falls back to Resend's shared test sender if not set.
const fromAddress = Deno.env.get('ORDER_EMAIL_FROM') ?? 'Forever Living <onboarding@resend.dev>'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

type Locale = 'fr' | 'ar'

const COPY = {
  fr: {
    dir: 'ltr',
    subjects: {
      pending: (r: string) => `Confirmez votre commande #${r}`,
      confirmed: (r: string) => `Votre commande #${r} est confirmée ✓`,
      shipped: (r: string) => `Votre commande #${r} a été expédiée`,
      out_for_delivery: (r: string) => `Votre commande #${r} est en cours de livraison`,
      delivered: (r: string) => `Votre commande #${r} a été livrée`,
      cancelled: (r: string) => `Votre commande #${r} a été annulée`,
    } as Record<string, (r: string) => string>,
    headline: {
      pending: 'Confirmez votre commande',
      confirmed: 'Commande confirmée',
      shipped: 'Commande expédiée',
      out_for_delivery: 'En cours de livraison',
      delivered: 'Commande livrée',
      cancelled: 'Commande annulée',
    } as Record<string, string>,
    message: {
      pending: 'Merci pour votre commande ! Pour la valider, veuillez la confirmer en cliquant ci-dessous.',
      confirmed: 'Bonne nouvelle ! Votre commande est confirmée et en cours de préparation. Vous trouverez le détail ci-dessous.',
      shipped: 'Votre colis est en route. Vous pouvez suivre son avancement à tout moment.',
      out_for_delivery: 'Votre commande est en cours de livraison — elle arrive très bientôt !',
      delivered: 'Votre commande a été livrée. Merci de votre confiance, et à très bientôt !',
      cancelled: 'Votre commande a été annulée. Pour toute question, n’hésitez pas à nous contacter.',
    } as Record<string, string>,
    greeting: (name: string) => `Bonjour ${name},`,
    confirmBtn: 'Confirmer la commande',
    cancelBtn: 'Annuler la commande',
    expiryNotice: 'Sans confirmation de votre part sous 24 heures, la commande sera automatiquement annulée.',
    trackBtn: 'Suivre ma commande',
    invoiceTitle: 'Récapitulatif de votre commande',
    orderRef: 'Commande n°',
    orderedOn: 'Passée le',
    product: 'Produit',
    qty: 'Qté',
    unit: 'Prix',
    lineTotal: 'Total',
    subtotal: 'Sous-total',
    shipping: 'Livraison',
    free: 'Offerte',
    total: 'Total',
    payment: 'Paiement',
    cod: 'À la livraison',
    card: 'Carte bancaire',
    shipTo: 'Adresse de livraison',
    footer: 'Forever Living — Distributeur Indépendant. Merci de votre confiance.',
  },
  ar: {
    dir: 'rtl',
    subjects: {
      pending: (r: string) => `أكّد طلبك رقم #${r}`,
      confirmed: (r: string) => `تم تأكيد طلبك رقم #${r} ✓`,
      shipped: (r: string) => `تم شحن طلبك رقم #${r}`,
      out_for_delivery: (r: string) => `طلبك رقم #${r} قيد التوصيل`,
      delivered: (r: string) => `تم توصيل طلبك رقم #${r}`,
      cancelled: (r: string) => `تم إلغاء طلبك رقم #${r}`,
    } as Record<string, (r: string) => string>,
    headline: {
      pending: 'أكّد طلبك',
      confirmed: 'تم تأكيد الطلب',
      shipped: 'تم شحن الطلب',
      out_for_delivery: 'قيد التوصيل',
      delivered: 'تم توصيل الطلب',
      cancelled: 'تم إلغاء الطلب',
    } as Record<string, string>,
    message: {
      pending: 'شكراً لطلبك! للمتابعة، يرجى تأكيد طلبك بالضغط أدناه.',
      confirmed: 'خبر سار! تم تأكيد طلبك وهو قيد التحضير. تجد التفاصيل أدناه.',
      shipped: 'طردك في الطريق. يمكنك تتبع حالته في أي وقت.',
      out_for_delivery: 'طلبك قيد التوصيل — سيصل قريباً جداً!',
      delivered: 'تم توصيل طلبك. شكراً لثقتك، وإلى اللقاء قريباً!',
      cancelled: 'تم إلغاء طلبك. لأي استفسار، لا تتردد في التواصل معنا.',
    } as Record<string, string>,
    greeting: (name: string) => `مرحباً ${name}،`,
    confirmBtn: 'تأكيد الطلب',
    cancelBtn: 'إلغاء الطلب',
    expiryNotice: 'في حال عدم التأكيد خلال 24 ساعة، سيتم إلغاء الطلب تلقائياً.',
    trackBtn: 'تتبع طلبي',
    invoiceTitle: 'ملخص طلبك',
    orderRef: 'رقم الطلب',
    orderedOn: 'تم في',
    product: 'المنتج',
    qty: 'الكمية',
    unit: 'السعر',
    lineTotal: 'المجموع',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    free: 'مجاني',
    total: 'المجموع',
    payment: 'الدفع',
    cod: 'عند الاستلام',
    card: 'بطاقة بنكية',
    shipTo: 'عنوان التوصيل',
    footer: 'Forever Living — موزع مستقل. شكراً لثقتك.',
  },
} as const

function money(n: number): string {
  return `${Number(n).toFixed(2)} €`
}

function buildHtml(order: any, status: string, siteUrl: string): string {
  const locale: Locale = order.locale === 'ar' ? 'ar' : 'fr'
  const t = COPY[locale]
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : []
  const ref = order.order_ref ?? order.id?.slice(0, 8)?.toUpperCase() ?? ''
  const date = new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const align = locale === 'ar' ? 'right' : 'left'
  const opp = locale === 'ar' ? 'left' : 'right'

  const base = `${siteUrl}/commande?ref=${encodeURIComponent(ref)}&token=${order.confirm_token}`
  const confirmUrl = `${base}&a=confirm`
  const cancelUrl = `${base}&a=cancel`

  // New orders get Confirm / Cancel buttons; later statuses get a track button.
  const actionBlock =
    status === 'pending'
      ? `<tr><td style="padding:22px 32px 4px;text-align:${align};">
          <a href="${confirmUrl}" style="display:inline-block;background:#4F5A41;color:#faf7f0;text-decoration:none;font-size:15px;font-weight:700;padding:14px 30px;border-radius:999px;margin-${opp}:10px;margin-bottom:10px;">✓ ${t.confirmBtn}</a>
          <a href="${cancelUrl}" style="display:inline-block;background:transparent;color:#993c1d;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:999px;border:1px solid #d9c3b6;margin-bottom:10px;">${t.cancelBtn}</a>
          <p style="margin:8px 0 0;font-size:13px;color:#a3552b;background:#f7ece2;border-radius:10px;padding:10px 14px;">⏱ ${t.expiryNotice}</p>
        </td></tr>`
      : `<tr><td style="padding:24px 32px 4px;text-align:${align};">
          <a href="${siteUrl}/suivi" style="display:inline-block;background:#2b2823;color:#faf7f0;text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:999px;">${t.trackBtn} →</a>
        </td></tr>`

  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e7e0d2;color:#2b2823;font-size:14px;text-align:${align};">${it.name}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e7e0d2;color:#6b6559;font-size:14px;text-align:center;">${it.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e7e0d2;color:#6b6559;font-size:14px;text-align:${opp};">${money(it.price)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e7e0d2;color:#2b2823;font-size:14px;font-weight:600;text-align:${opp};">${money(it.price * it.quantity)}</td>
      </tr>`,
    )
    .join('')

  const addr = [order.address, order.city, order.zip, order.region, order.country]
    .filter(Boolean)
    .join(', ')
  const paymentLabel = order.payment_method === 'card' ? t.card : t.cod

  return `
  <!DOCTYPE html>
  <html dir="${t.dir}" lang="${locale}">
  <body style="margin:0;padding:0;background:#efe9dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9dc;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#faf7f0;border-radius:20px;overflow:hidden;border:1px solid #e7e0d2;">
          <tr><td style="padding:28px 32px 8px;text-align:${align};">
            <span style="font-size:22px;font-weight:800;letter-spacing:1px;color:#4F5A41;">FOREVER<span style="color:#b08968;">.</span></span>
          </td></tr>

          <tr><td style="padding:8px 32px 0;text-align:${align};">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a8578;">${t.orderRef} ${ref}</p>
            <h1 style="margin:0;font-size:26px;color:#2b2823;">${t.headline[status] ?? status}</h1>
            <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#5c5749;">${t.greeting(order.customer_name ?? '')}</p>
            <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#5c5749;">${t.message[status] ?? ''}</p>
          </td></tr>

          ${actionBlock}

          <tr><td style="padding:20px 32px 8px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8578;text-align:${align};">${t.invoiceTitle}</p>
            <p style="margin:0 0 12px;font-size:13px;color:#8a8578;text-align:${align};">${t.orderedOn} ${date}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <thead><tr>
                <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;color:#8a8578;text-align:${align};font-weight:600;">${t.product}</th>
                <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;color:#8a8578;text-align:center;font-weight:600;">${t.qty}</th>
                <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;color:#8a8578;text-align:${opp};font-weight:600;">${t.unit}</th>
                <th style="padding:0 0 8px;font-size:11px;text-transform:uppercase;color:#8a8578;text-align:${opp};font-weight:600;">${t.lineTotal}</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="font-size:14px;color:#6b6559;padding:3px 0;text-align:${align};">${t.subtotal}</td>
                <td style="font-size:14px;color:#6b6559;padding:3px 0;text-align:${opp};">${money(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b6559;padding:3px 0;text-align:${align};">${t.shipping}</td>
                <td style="font-size:14px;color:#6b6559;padding:3px 0;text-align:${opp};">${Number(order.shipping) === 0 ? t.free : money(order.shipping)}</td>
              </tr>
              <tr>
                <td style="font-size:17px;font-weight:800;color:#2b2823;padding:10px 0 0;border-top:2px solid #2b2823;text-align:${align};">${t.total}</td>
                <td style="font-size:17px;font-weight:800;color:#2b2823;padding:10px 0 0;border-top:2px solid #2b2823;text-align:${opp};">${money(order.total)}</td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:20px 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebdf;border-radius:14px;">
              <tr><td style="padding:16px 18px;text-align:${align};">
                <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8578;">${t.payment}</p>
                <p style="margin:0 0 12px;font-size:14px;color:#2b2823;">${paymentLabel}</p>
                ${addr ? `<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a8578;">${t.shipTo}</p><p style="margin:0;font-size:14px;color:#2b2823;line-height:1.5;">${addr}${order.phone ? `<br/>${order.phone}` : ''}</p>` : ''}
              </td></tr>
            </table>
          </td></tr>

          <tr><td style="padding:18px 32px 28px;border-top:1px solid #e7e0d2;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a29c8d;">${t.footer}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, orderRef, status, siteUrl } = await req.json()
    if ((!orderId && !orderRef) || !status) {
      return new Response(JSON.stringify({ error: 'Missing orderId/orderRef or status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lookup = supabase.from('orders').select('*')
    const { data: order, error } = await (orderId
      ? lookup.eq('id', orderId)
      : lookup.eq('order_ref', orderRef)
    ).single()

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const locale: Locale = order.locale === 'ar' ? 'ar' : 'fr'
    const ref = order.order_ref ?? order.id.slice(0, 8).toUpperCase()
    const subjectFn = COPY[locale].subjects[status]
    const subject = subjectFn ? subjectFn(ref) : `Commande #${ref}`
    const html = buildHtml(order, status, siteUrl || '')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: order.customer_email,
        bcc: notificationEmail || undefined,
        subject,
        html,
        reply_to: notificationEmail || undefined,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Resend error', detail)
      return new Response(JSON.stringify({ error: 'Email provider error', detail }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to send order email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
