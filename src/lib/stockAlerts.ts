import { supabase } from '@/lib/supabaseClient'
import { isValidPhoneOrEmail, requirePublicFormStorage } from '@/lib/publicForms'

/** Customer-facing: registers a "notify me when back in stock" request. */
export async function createStockAlert(input: { productId: string; productName: string; contact: string }): Promise<void> {
  requirePublicFormStorage()
  const contact = input.contact.trim()
  if (!input.productId.trim() || !input.productName.trim() || !isValidPhoneOrEmail(contact)) {
    throw new TypeError('A valid product and contact are required.')
  }

  const { error } = await supabase.from('stock_alerts').insert({
    product_id: input.productId.trim(),
    product_name: input.productName.trim(),
    contact,
  })
  if (error) throw error
}
