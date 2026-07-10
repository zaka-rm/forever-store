-- Run in Supabase → SQL Editor → New query → Run.
-- Gestionnaire de fonctions : chaque fonctionnalité du site peut être activée
-- ou désactivée individuellement depuis Admin → Réglages, sans redéploiement.
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table feature_flags enable row level security;

-- Tout le monde peut lire l'état des fonctions (le site en a besoin)…
drop policy if exists "feature flags public read" on feature_flags;
create policy "feature flags public read"
  on feature_flags for select
  using (true);

-- …mais seul l'admin connecté peut les modifier.
drop policy if exists "feature flags admin write" on feature_flags;
create policy "feature flags admin write"
  on feature_flags for all
  to authenticated
  using (true)
  with check (true);

-- État initial de chaque fonction (modifiable ensuite depuis l'admin).
insert into feature_flags (key, enabled) values
  ('routines', true),          -- Page « Routines » + liens de navigation
  ('bundle_discount', true),   -- Remise routine automatique −10% dès 3 articles
  ('bundle_nudge', true),      -- Bandeau « Ajoutez X produit(s) pour −10% » dans le panier
  ('abandoned_cart', true),    -- Sauvegarde des paniers abandonnés au checkout
  ('photo_reviews', true),     -- Champ photo dans le formulaire d'avis
  ('order_sound', true),       -- Son + badge « nouvelle commande » dans l'admin
  ('reviews_badge', true),     -- Badge « avis en attente » sur l'onglet Avis
  ('card_payment', false),     -- Option « Payer par carte » au checkout (nécessite YouCan Pay)
  ('order_wa_confirm', true),  -- Bouton « Confirmer ma commande sur WhatsApp » après commande
  ('checkout_badges', true),   -- Badges de confiance au moment du paiement
  ('followups', true),         -- Onglet admin « Relance fidélité » (réassort à J+20)
  ('product_wa_order', true),  -- Bouton « Commander sur WhatsApp » sur les pages produit
  ('pack_cross_sell', true),   -- Bandeau « fait partie du pack X » sur les pages produit
  ('story_section', true),     -- Section « Qui suis-je » sur l'accueil
  ('wa_testimonials', true),   -- Témoignages WhatsApp (captures) sur l'accueil
  ('checkout_prefill', true)   -- Pré-remplissage des coordonnées d'un client déjà connu
on conflict (key) do nothing;
-- Script réexécutable sans risque : les lignes existantes ne sont pas modifiées.
