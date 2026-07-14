import { supabase } from '@/lib/supabaseClient'
import type { OrderRow } from '@/lib/adminData'
import type { Product } from '@/lib/products'

// ---------------------------------------------------------------------------
// Finances — turns orders + your Forever purchase prices into real numbers:
// gross revenue, cost of goods, courier costs, discounts given, NET profit,
// and the "3 envelopes" split (stock / costs / profit) from the guide.
// Purchase prices live in `product_costs`, an admin-only table (RLS) so your
// costs are never exposed to the public site.
// ---------------------------------------------------------------------------

export type CostMap = Record<string, number>

export async function fetchCosts(): Promise<CostMap> {
  const { data, error } = await supabase.from('product_costs').select('product_id, cost')
  if (error) throw error
  const map: CostMap = {}
  for (const row of data ?? []) map[row.product_id as string] = Number(row.cost)
  return map
}

export async function saveCost(productId: string, cost: number): Promise<void> {
  const { error } = await supabase
    .from('product_costs')
    .upsert({ product_id: productId, cost, updated_at: new Date().toISOString() }, { onConflict: 'product_id' })
  if (error) throw error
}

/** What YOU pay the courier per delivery (Amana/CTM…). Stored in site_settings. */
export async function fetchCourierCost(): Promise<number> {
  const { data } = await supabase.from('site_settings').select('courier_cost').eq('id', 1).maybeSingle()
  return data?.courier_cost != null ? Number(data.courier_cost) : 35
}

export async function saveCourierCost(cost: number): Promise<void> {
  const { error } = await supabase.from('site_settings').update({ courier_cost: cost }).eq('id', 1)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Per-order economics
// ---------------------------------------------------------------------------

export interface OrderFinance {
  order: OrderRow
  /** what the customer pays you in cash (order total) */
  revenue: number
  /** what the goods cost you at Forever (sum of item qty × purchase price) */
  goodsCost: number
  /** what you pay the courier for this delivery */
  courierCost: number
  /** discount you granted (promo + bundle, already deducted from revenue) */
  discountGiven: number
  /** revenue − goodsCost − courierCost */
  net: number
  /** true when at least one item has no purchase price set yet */
  missingCosts: boolean
}

/**
 * Computes one order's economics. Items are matched to purchase prices by
 * product id, falling back to product name (older/manual orders).
 */
export function orderFinance(
  order: OrderRow,
  costs: CostMap,
  products: Product[],
  courierCost: number,
): OrderFinance {
  let goodsCost = 0
  let missingCosts = false
  for (const it of order.items ?? []) {
    let cost = costs[it.id]
    if (cost === undefined) {
      const byName = products.find((p) => p.name === it.name)
      if (byName) cost = costs[byName.id]
    }
    if (cost === undefined) {
      missingCosts = true
      continue
    }
    goodsCost += cost * Number(it.quantity)
  }
  const revenue = Number(order.total)
  return {
    order,
    revenue,
    goodsCost,
    courierCost,
    discountGiven: Number(order.discount_amount ?? 0),
    net: revenue - goodsCost - courierCost,
    missingCosts,
  }
}

// ---------------------------------------------------------------------------
// Global summary (the 3 envelopes)
// ---------------------------------------------------------------------------

export interface FinanceSummary {
  ordersCount: number
  revenue: number
  goodsCost: number // Enveloppe 1 — Stock (à re-dépenser chez Forever)
  courierTotal: number // Enveloppe 2 — Frais
  net: number // Enveloppe 3 — Bénéfice
  marginPct: number
  discountsGiven: number
  freeShippingGiven: number // deliveries you paid because the order crossed the free-shipping threshold
  ordersWithMissingCosts: number
}

export function summarize(rows: OrderFinance[]): FinanceSummary {
  const revenue = rows.reduce((s, r) => s + r.revenue, 0)
  const goodsCost = rows.reduce((s, r) => s + r.goodsCost, 0)
  const courierTotal = rows.reduce((s, r) => s + r.courierCost, 0)
  const net = revenue - goodsCost - courierTotal
  return {
    ordersCount: rows.length,
    revenue,
    goodsCost,
    courierTotal,
    net,
    marginPct: revenue > 0 ? (net / revenue) * 100 : 0,
    discountsGiven: rows.reduce((s, r) => s + r.discountGiven, 0),
    freeShippingGiven: rows.filter((r) => Number(r.order.shipping) === 0).reduce((s, r) => s + r.courierCost, 0),
    ordersWithMissingCosts: rows.filter((r) => r.missingCosts).length,
  }
}
