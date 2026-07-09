import { supabase } from '@/lib/supabaseClient'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface OrderRow {
  id: string
  created_at: string
  customer_name: string
  customer_email: string
  phone: string | null
  address: string | null
  city: string | null
  region: string | null
  zip: string | null
  country: string | null
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  payment_status: string
  payment_method: string | null
  status: string
  order_ref: string | null
  locale: string | null
  notes: string | null
}

export interface MessageRow {
  id: string
  created_at: string
  name: string
  email: string
  subject: string | null
  message: string
  handled: boolean
}

export interface ReviewRow {
  id: string
  created_at: string
  product_id: string
  author: string
  rating: number
  comment: string
  approved: boolean
  photo_url?: string | null
}

export async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

export async function setOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// Wraps a value for CSV: doubles quotes and wraps in quotes if needed.
function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Builds a spreadsheet-ready CSV of orders (for accounting / delivery lists). */
export function ordersToCsv(rows: OrderRow[]): string {
  const header = [
    'reference', 'date', 'statut', 'client', 'telephone', 'email',
    'ville', 'adresse', 'paiement', 'total_DH', 'articles',
  ]
  const lines = rows.map((o) =>
    [
      o.order_ref ?? '',
      new Date(o.created_at).toISOString(),
      o.status,
      o.customer_name,
      o.phone ?? '',
      o.customer_email ?? '',
      o.city ?? '',
      o.address ?? '',
      o.payment_method === 'cod' ? 'Livraison' : o.payment_method === 'card' ? 'Carte' : '',
      Number(o.total).toFixed(2),
      o.items.map((it) => `${it.name} x${it.quantity}`).join(' | '),
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export async function fetchMessages(): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MessageRow[]
}

export async function setMessageHandled(id: string, handled: boolean): Promise<void> {
  const { error } = await supabase.from('contact_messages').update({ handled }).eq('id', id)
  if (error) throw error
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('contact_messages').delete().eq('id', id)
  if (error) throw error
}

export async function fetchAdminReviews(): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReviewRow[]
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  const { error } = await supabase.from('reviews').update({ approved }).eq('id', id)
  if (error) throw error
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
}

export interface DiscountRow {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_subtotal: number | null
  active: boolean
  expires_at: string | null
  created_at: string
}

export async function fetchDiscounts(): Promise<DiscountRow[]> {
  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DiscountRow[]
}

export async function saveDiscount(row: Partial<DiscountRow> & { code: string }, isNew: boolean): Promise<void> {
  if (isNew) {
    const { error } = await supabase.from('discount_codes').insert(row)
    if (error) throw error
  } else {
    const { error } = await supabase.from('discount_codes').update(row).eq('id', row.id)
    if (error) throw error
  }
}

export async function deleteDiscount(id: string): Promise<void> {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id)
  if (error) throw error
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
