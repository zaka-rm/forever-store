import { formatPrice, CURRENCY_SYMBOL } from '@/lib/format'
import { toWhatsAppNumber, waLink } from '@/lib/whatsapp'
import type { OrderRow } from '@/lib/adminData'

/**
 * Builds a wa.me link with a ready-written message that adapts to the order's
 * current status — so one click keeps the customer informed at every step.
 */
export function orderWhatsAppUrl(o: OrderRow): string {
  const ref = o.order_ref ? ` #${o.order_ref}` : ''
  const total = formatPrice(Number(o.total))
  const items = o.items.map((it) => `• ${it.name} × ${it.quantity}`).join('\n')
  // Personal tracking link — the reference is pre-filled, the customer only
  // types their phone number.
  const trackLink = o.order_ref ? `\nSuivi : ${window.location.origin}/suivi?ref=${o.order_ref}` : ''

  let message: string
  switch (o.status) {
    case 'confirmed':
      message = `Bonjour ${o.customer_name}, votre commande Forever${ref} est confirmée ✅ et en préparation. Total à régler à la livraison : ${total}. Merci pour votre confiance !${trackLink}`
      break
    case 'shipped':
      message = `Bonjour ${o.customer_name}, bonne nouvelle : votre commande${ref} a été expédiée 🚚. Nous vous préviendrons dès qu'elle arrive. Total à régler : ${total}.${trackLink}`
      break
    case 'out_for_delivery':
      message = `Bonjour ${o.customer_name}, votre commande${ref} est en cours de livraison aujourd'hui 📦. Merci de préparer ${total} en espèces. À tout de suite !`
      break
    case 'delivered':
      message = `Bonjour ${o.customer_name}, merci pour votre commande${ref} chez Forever ! 🌿 Nous espérons que tout vous convient — n'hésitez pas à nous faire un retour. À bientôt !`
      break
    case 'cancelled':
      message = `Bonjour ${o.customer_name}, votre commande${ref} a été annulée. Contactez-nous si vous souhaitez la repasser, avec plaisir. Merci !`
      break
    default: // pending
      message =
        `Bonjour ${o.customer_name}, votre commande Forever${ref} est bien reçue :\n${items}\n\n` +
        `Total à régler à la livraison : ${total}.\n` +
        `Merci de confirmer pour organiser la livraison. 🌿${trackLink}`
  }
  return waLink(toWhatsAppNumber(o.phone), message)
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const SLIP_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c1c1a; margin: 0; }
  .slip { max-width: 640px; margin: 28px auto; padding: 0 24px; }
  .slip + .slip { page-break-before: always; }
  .brand { font-size: 24px; font-weight: 800; color: #4F5A41; letter-spacing: .04em; }
  h1 { font-size: 15px; letter-spacing: .12em; text-transform: uppercase; color: #999; margin: 2px 0 18px; }
  .box { border: 1.5px solid #ddd; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; }
  .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #999; margin: 0 0 8px; }
  .name { font-size: 18px; font-weight: 700; }
  .addr { font-size: 15px; margin-top: 4px; }
  .phone { font-size: 16px; font-weight: 600; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; border-bottom: 1px solid #ddd; padding: 6px 4px; font-size: 11px; text-transform: uppercase; color: #999; }
  td { padding: 7px 4px; border-bottom: 1px solid #f0f0f0; }
  .collect { border: 2px solid #4F5A41; border-radius: 12px; padding: 14px 18px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .collect .label { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #4F5A41; }
  .collect .amount { font-size: 26px; font-weight: 800; color: #4F5A41; }
  .muted { color: #888; font-size: 12px; }`

// The inner HTML of one delivery slip (without the page wrapper).
function slipBody(o: OrderRow): string {
  const rows = o.items
    .map((it) => `<tr><td>${esc(it.name)}</td><td style="text-align:center">${it.quantity}</td></tr>`)
    .join('')
  const address = [o.address, o.city, o.zip, o.region, o.country].filter(Boolean).map((s) => esc(s as string)).join(', ')
  return `<div class="slip">
    <div class="brand">FOREVER</div>
    <h1>Bon de livraison ${o.order_ref ? '· #' + esc(o.order_ref) : ''}</h1>
    <div class="box">
      <h2>Livrer à</h2>
      <div class="name">${esc(o.customer_name)}</div>
      <div class="addr">${address || '—'}</div>
      <div class="phone">📞 ${esc(o.phone || '—')}</div>
    </div>
    <div class="box">
      <h2>Contenu du colis</h2>
      <table>
        <thead><tr><th>Article</th><th style="text-align:center">Qté</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${o.notes ? `<div class="box"><h2>Instructions de livraison</h2><div class="addr">${esc(o.notes)}</div></div>` : ''}
    <div class="collect">
      <span class="label">Montant à encaisser</span>
      <span class="amount">${o.payment_method === 'cod' ? formatPrice(Number(o.total)) : '0 ' + CURRENCY_SYMBOL}</span>
    </div>
    <p class="muted">${o.payment_method === 'cod' ? 'Paiement à la livraison (espèces).' : 'Déjà payé en ligne — ne rien encaisser.'}</p>
  </div>`
}

function openPrintWindow(title: string, bodies: string) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${esc(title)}</title>
<style>${SLIP_STYLES}</style></head>
<body>${bodies}<script>window.onload = function(){ window.print(); }</script></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

/** Opens a print-ready delivery slip for one order. */
export function printDeliverySlip(o: OrderRow) {
  openPrintWindow(`Bon de livraison ${o.order_ref || ''}`, slipBody(o))
}

/** Opens one print job containing a delivery slip per order (one per page). */
export function printDeliverySlips(orders: OrderRow[]) {
  if (orders.length === 0) return
  openPrintWindow(`Bons de livraison (${orders.length})`, orders.map(slipBody).join(''))
}
