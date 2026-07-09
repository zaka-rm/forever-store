import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

// A stable per-browser id so we upsert the same abandoned-cart row instead of
// creating duplicates as the customer edits the checkout.
function sessionId(): string {
  try {
    let id = localStorage.getItem('cartSession')
    if (!id) {
      id = 'cs_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('cartSession', id)
    }
    return id
  } catch {
    return 'cs_anon'
  }
}

interface AbandonedInput {
  name: string
  phone: string
  city?: string
  items: { name: string; price: number; quantity: number }[]
  subtotal: number
}

/** Best-effort: save the in-progress checkout so it can be recovered by WhatsApp. */
export async function saveAbandonedCart(input: AbandonedInput): Promise<void> {
  if (!isSupabaseConfigured || !input.phone.trim() || input.items.length === 0) return
  try {
    await supabase.from('abandoned_carts').upsert(
      {
        session_id: sessionId(),
        name: input.name.trim() || null,
        phone: input.phone.trim(),
        city: input.city?.trim() || null,
        items: input.items,
        subtotal: input.subtotal,
        recovered: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    )
  } catch {
    /* silent — never block checkout */
  }
}

/** Marks the current session's abandoned cart as recovered (order placed). */
export async function markCartRecovered(): Promise<void> {
  if (!isSupabaseConfigured) return
  try {
    await supabase.from('abandoned_carts').update({ recovered: true }).eq('session_id', sessionId())
  } catch {
    /* silent */
  }
}
