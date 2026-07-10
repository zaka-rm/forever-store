import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface SiteSettings {
  announcement_fr: string | null
  announcement_ar: string | null
  announcement_active: boolean
  story_fr?: string | null
  story_ar?: string | null
}

/** Reads the single settings row. Returns null if unavailable (table not created yet). */
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  if (!isSupabaseConfigured) return null
  // select('*') so it still works before 28_story-testimonials.sql adds columns.
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) return null
  return data as SiteSettings
}

/** Admin: saves the settings (announcement bar + story). */
export async function saveSiteSettings(s: SiteSettings): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .update({ ...s, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}
