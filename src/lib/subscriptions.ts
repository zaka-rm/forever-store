import { supabase } from '@/lib/supabaseClient'

export interface NewSubscription {
  name: string
  phone: string
  email?: string
  productId: string
  productName: string
  quantity?: number
}

/** Customer-facing: records a monthly re-delivery request for a product. */
export async function createSubscription(input: NewSubscription): Promise<void> {
  const { error } = await supabase.from('subscriptions').insert({
    name: input.name.trim(),
    phone: input.phone.trim() || null,
    email: input.email?.trim() || null,
    product_id: input.productId,
    product_name: input.productName,
    quantity: input.quantity ?? 1,
  })
  if (error) throw error
}
