import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

// ---------------------------------------------------------------------------
// Screenshot testimonials — WhatsApp screenshots (numbers blurred!) uploaded
// from the admin. Far more convincing to Moroccan shoppers than a text form.
// ---------------------------------------------------------------------------

export interface TestimonialRow {
  id: string
  created_at: string
  sort_order: number
  active: boolean
  image: string
  caption: string | null
}

export async function fetchTestimonials(): Promise<TestimonialRow[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as TestimonialRow[]
  } catch {
    return []
  }
}

export async function addTestimonial(image: string, caption: string | null): Promise<void> {
  const { error } = await supabase.from('testimonials').insert({ image, caption })
  if (error) throw error
}

export async function setTestimonialActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('testimonials').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw error
}
