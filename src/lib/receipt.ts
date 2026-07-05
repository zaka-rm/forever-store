export interface ReceiptItem {
  name: string
  price: number
  quantity: number
}

export interface Receipt {
  ref: string
  date: string
  customer: { name: string; address: string; city: string; phone: string }
  items: ReceiptItem[]
  subtotal: number
  shipping: number
  discount: number
  discountCode: string | null
  total: number
}

export interface ReceiptLabels {
  title: string
  order: string
  date: string
  deliverTo: string
  item: string
  qty: string
  price: string
  subtotal: string
  shipping: string
  discount: string
  total: string
  free: string
  thanks: string
}

import { formatPrice } from '@/lib/format'

const money = (n: number) => formatPrice(n)

/** Opens a clean, print-ready receipt in a new window and triggers the print dialog. */
export function printReceipt(r: Receipt, L: ReceiptLabels, rtl: boolean) {
  const rows = r.items
    .map(
      (it) => `<tr>
        <td>${escapeHtml(it.name)}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td style="text-align:${rtl ? 'left' : 'right'}">${money(it.price * it.quantity)}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html dir="${rtl ? 'rtl' : 'ltr'}" lang="${rtl ? 'ar' : 'fr'}">
<head>
<meta charset="utf-8" />
<title>${L.title} ${r.ref}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c1c1a; max-width: 640px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0; color: #4F5A41; }
  .brand { font-size: 26px; font-weight: 800; color: #4F5A41; letter-spacing: .04em; }
  .muted { color: #777; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 16px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
  th { text-align: ${rtl ? 'right' : 'left'}; border-bottom: 1px solid #ddd; padding: 8px 4px; font-size: 12px; text-transform: uppercase; color: #999; }
  td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
  .totals { margin-top: 12px; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .grand { font-size: 18px; font-weight: 800; border-top: 2px solid #eee; margin-top: 6px; padding-top: 10px; }
  .thanks { margin-top: 28px; text-align: center; color: #4F5A41; font-weight: 600; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">FOREVER</div>
      <div class="muted">${L.title}</div>
    </div>
    <div style="text-align:${rtl ? 'left' : 'right'}">
      <div><strong>${L.order}</strong> ${escapeHtml(r.ref)}</div>
      <div class="muted">${L.date}: ${new Date(r.date).toLocaleString(rtl ? 'ar' : 'fr-FR')}</div>
    </div>
  </div>

  <div class="muted" style="margin-bottom:16px">
    <strong>${L.deliverTo}:</strong> ${escapeHtml(r.customer.name)} — ${escapeHtml(r.customer.address)}, ${escapeHtml(r.customer.city)} · ${escapeHtml(r.customer.phone)}
  </div>

  <table>
    <thead>
      <tr><th>${L.item}</th><th style="text-align:center">${L.qty}</th><th style="text-align:${rtl ? 'left' : 'right'}">${L.price}</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>${L.subtotal}</span><span>${money(r.subtotal)}</span></div>
    <div><span>${L.shipping}</span><span>${r.shipping === 0 ? L.free : money(r.shipping)}</span></div>
    ${r.discount > 0 ? `<div><span>${L.discount}${r.discountCode ? ` (${escapeHtml(r.discountCode)})` : ''}</span><span>−${money(r.discount)}</span></div>` : ''}
    <div class="grand"><span>${L.total}</span><span>${money(r.total)}</span></div>
  </div>

  <p class="thanks">${L.thanks}</p>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
