import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface SiteSettings {
  announcement_fr: string | null
  announcement_ar: string | null
  announcement_active: boolean
}

/** Reads the single settings row. Returns null if unavailable (table not created yet). */
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('site_settings')
    .select('announcement_fr, announcement_ar, announcement_active')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) return null
  return data as SiteSettings
}

/** Admin: saves the announcement bar settings. */
export async function saveSiteSettings(s: SiteSettings): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .update({ ...s, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}
