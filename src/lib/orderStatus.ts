// Fulfilment workflow for orders. The admin moves an order through these steps;
// the customer can follow along on the public tracking page.

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

// The linear happy-path (cancelled sits outside it).
export const ORDER_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

export const ORDER_STATUS_LABELS_FR: Record<OrderStatus, string> = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  out_for_delivery: 'En cours de livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const ORDER_STATUS_LABELS_AR: Record<OrderStatus, string> = {
  pending: 'في انتظار التأكيد',
  confirmed: 'تم التأكيد',
  shipped: 'تم الشحن',
  out_for_delivery: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغاة',
}

export function orderStatusLabel(status: string, locale: string): string {
  const map = locale === 'ar' ? ORDER_STATUS_LABELS_AR : ORDER_STATUS_LABELS_FR
  return map[(status as OrderStatus)] ?? status
}

// Tailwind badge classes per status (uses the app's palette).
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-clay-500/10 text-clay-600',
  confirmed: 'bg-sage-100 text-sage-700',
  shipped: 'bg-sage-100 text-sage-700',
  out_for_delivery: 'bg-sage-200 text-sage-800',
  delivered: 'bg-sage-600 text-cream',
  cancelled: 'bg-ink/10 text-ink/50 line-through',
}
