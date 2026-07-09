import { supabase } from '@/lib/supabaseClient'

// ---------------------------------------------------------------------------
// Newsletter subscribers
// ---------------------------------------------------------------------------
export interface SubscriberRow {
  id: string
  email: string
  created_at: string
}

export async function fetchSubscribers(): Promise<SubscriberRow[]> {
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SubscriberRow[]
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { error } = await supabase.from('subscribers').delete().eq('id', id)
  if (error) throw error
}

export function subscribersToCsv(rows: SubscriberRow[]): string {
  const header = 'email,inscrit_le'
  const lines = rows.map((r) => `${r.email},${new Date(r.created_at).toISOString()}`)
  return [header, ...lines].join('\n')
}

// ---------------------------------------------------------------------------
// Distributor leads ("Devenir distributeur")
// ---------------------------------------------------------------------------
export interface DistributorLeadRow {
  id: string
  created_at: string
  name: string
  email: string
  phone: string | null
  city: string | null
  message: string | null
  handled: boolean
}

export async function fetchDistributorLeads(): Promise<DistributorLeadRow[]> {
  const { data, error } = await supabase
    .from('distributor_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DistributorLeadRow[]
}

export async function setLeadHandled(id: string, handled: boolean): Promise<void> {
  const { error } = await supabase.from('distributor_leads').update({ handled }).eq('id', id)
  if (error) throw error
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('distributor_leads').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Delivery zones (shipping fee by city)
// ---------------------------------------------------------------------------
export interface DeliveryZoneRow {
  id: string
  city: string
  fee: number
  free_threshold: number | null
  active: boolean
}

export async function fetchDeliveryZones(): Promise<DeliveryZoneRow[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('city', { ascending: true })
  if (error) throw error
  return (data ?? []) as DeliveryZoneRow[]
}

export async function saveDeliveryZone(row: Partial<DeliveryZoneRow> & { city: string }, isNew: boolean): Promise<void> {
  if (isNew) {
    const { error } = await supabase.from('delivery_zones').insert(row)
    if (error) throw error
  } else {
    const { error } = await supabase.from('delivery_zones').update(row).eq('id', row.id)
    if (error) throw error
  }
}

export async function deleteDeliveryZone(id: string): Promise<void> {
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------
export interface ReferralRow {
  id: string
  created_at: string
  referrer_ref: string
  referred_order_ref: string
  rewarded: boolean
}

export async function fetchReferrals(): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReferralRow[]
}

export async function setReferralRewarded(id: string, rewarded: boolean): Promise<void> {
  const { error } = await supabase.from('referrals').update({ rewarded }).eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Loyalty points (by email)
// ---------------------------------------------------------------------------
export interface LoyaltyRow {
  email: string
  points: number
  updated_at: string
}

export async function fetchLoyalty(): Promise<LoyaltyRow[]> {
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .order('points', { ascending: false })
  if (error) throw error
  return (data ?? []) as LoyaltyRow[]
}

// ---------------------------------------------------------------------------
// Abandoned carts (checkout started but not confirmed)
// ---------------------------------------------------------------------------
export interface AbandonedCartRow {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  phone: string | null
  city: string | null
  items: { name: string; price: number; quantity: number }[]
  subtotal: number
  recovered: boolean
}

export async function fetchAbandonedCarts(): Promise<AbandonedCartRow[]> {
  const { data, error } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('recovered', false)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AbandonedCartRow[]
}

export async function deleteAbandonedCart(id: string): Promise<void> {
  const { error } = await supabase.from('abandoned_carts').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Subscriptions (monthly re-delivery)
// ---------------------------------------------------------------------------
export interface SubscriptionRow {
  id: string
  created_at: string
  name: string
  phone: string | null
  email: string | null
  product_id: string
  product_name: string
  quantity: number
  frequency: string
  next_date: string
  active: boolean
}

export async function fetchSubscriptions(): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as SubscriptionRow[]
}

/** Marks this cycle delivered by pushing the next date forward one month. */
export async function advanceSubscription(id: string, currentNext: string): Promise<string> {
  const d = new Date(currentNext)
  d.setMonth(d.getMonth() + 1)
  const next = d.toISOString().slice(0, 10)
  const { error } = await supabase.from('subscriptions').update({ next_date: next }).eq('id', id)
  if (error) throw error
  return next
}

export async function setSubscriptionActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('subscriptions').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Stock alerts ("Prévenez-moi quand c'est disponible")
// ---------------------------------------------------------------------------
export interface StockAlertRow {
  id: string
  created_at: string
  product_id: string
  product_name: string
  contact: string
  notified: boolean
}

export async function fetchStockAlerts(): Promise<StockAlertRow[]> {
  const { data, error } = await supabase
    .from('stock_alerts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as StockAlertRow[]
}

export async function setAlertNotified(id: string, notified: boolean): Promise<void> {
  const { error } = await supabase.from('stock_alerts').update({ notified }).eq('id', id)
  if (error) throw error
}

export async function deleteStockAlert(id: string): Promise<void> {
  const { error } = await supabase.from('stock_alerts').delete().eq('id', id)
  if (error) throw error
}
