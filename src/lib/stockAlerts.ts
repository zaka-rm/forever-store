import { supabase } from '@/lib/supabaseClient'

/** Customer-facing: registers a "notify me when back in stock" request. */
export async function createStockAlert(input: { productId: string; productName: string; contact: string }): Promise<void> {
  const { error } = await supabase.from('stock_alerts').insert({
    product_id: input.productId,
    product_name: input.productName,
    contact: input.contact.trim(),
  })
  if (error) throw error
}
