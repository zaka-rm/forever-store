import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

// ---------------------------------------------------------------------------
// Gestionnaire de fonctions — every feature can be switched on/off from
// Admin → Réglages without a redeploy. Public pages read the flags once at
// load; if the table is missing or unreachable the DEFAULTS below apply, so
// the site never breaks because of a flag.
// ---------------------------------------------------------------------------

export interface FlagDef {
  key: string
  label: string
  desc: string
  default: boolean
}

// Single source of truth for which flags exist (labels shown in the admin).
export const FLAG_DEFS: FlagDef[] = [
  { key: 'routines', label: 'Page Routines', desc: 'La page « Routines » et ses liens dans le menu et sur l’accueil.', default: true },
  { key: 'bundle_discount', label: 'Remise routine −10%', desc: 'Remise automatique de −10% dès 3 articles dans le panier.', default: true },
  { key: 'bundle_nudge', label: 'Incitation panier', desc: 'Bandeau « Ajoutez X produit(s) pour −10% » dans le panier.', default: true },
  { key: 'abandoned_cart', label: 'Paniers abandonnés', desc: 'Sauvegarde nom + téléphone au checkout pour relance WhatsApp.', default: true },
  { key: 'photo_reviews', label: 'Avis avec photo', desc: 'Les clients peuvent joindre une photo à leur avis.', default: true },
  { key: 'order_sound', label: 'Alerte nouvelle commande', desc: 'Son + badge dans l’admin à chaque nouvelle commande.', default: true },
  { key: 'reviews_badge', label: 'Badge avis en attente', desc: 'Compteur d’avis à modérer sur l’onglet Avis de l’admin.', default: true },
  { key: 'card_payment', label: 'Paiement par carte', desc: 'Option « Payer par carte » au checkout (nécessite les clés YouCan Pay).', default: false },
  { key: 'order_wa_confirm', label: 'Confirmation WhatsApp', desc: 'Bouton « Confirmer ma commande sur WhatsApp » après la commande (réduit les fausses commandes).', default: true },
  { key: 'checkout_badges', label: 'Badges de confiance', desc: 'Rappels « Payez à la livraison · Produits authentiques · Satisfait ou remboursé » au moment du paiement.', default: true },
  { key: 'followups', label: 'Relance fidélité', desc: 'Onglet admin listant les clients livrés il y a 20+ jours pour proposer un réassort.', default: true },
]

export type Flags = Record<string, boolean>

function defaults(): Flags {
  return Object.fromEntries(FLAG_DEFS.map((d) => [d.key, d.default]))
}

/** Reads all flags; unknown/missing keys fall back to their default. */
export async function fetchFlags(): Promise<Flags> {
  const base = defaults()
  if (!isSupabaseConfigured) return base
  try {
    const { data, error } = await supabase.from('feature_flags').select('key, enabled')
    if (error || !data) return base
    for (const row of data) base[row.key as string] = Boolean(row.enabled)
    return base
  } catch {
    return base
  }
}

/** Admin: flips one flag. */
export async function setFlag(key: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('feature_flags')
    .upsert({ key, enabled, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

const FeatureFlagsContext = createContext<Flags>(defaults())

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Flags>(defaults())

  useEffect(() => {
    fetchFlags().then(setFlags)
  }, [])

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>
}

/** True when the feature is enabled (defaults apply until flags load). */
export function useFeature(key: string): boolean {
  const flags = useContext(FeatureFlagsContext)
  return flags[key] ?? true
}
