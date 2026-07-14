-- Run in Supabase → SQL Editor → New query → Run.
-- Panneau Finances : prix d'achat Forever par produit (table réservée à
-- l'admin — jamais lisible publiquement, vos coûts restent secrets) + coût
-- réel de livraison par défaut.

create table if not exists product_costs (
  product_id text primary key,
  cost numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table product_costs enable row level security;

-- Admin uniquement (lecture ET écriture) — aucun accès public.
drop policy if exists "product costs admin all" on product_costs;
create policy "product costs admin all"
  on product_costs for all
  to authenticated
  using (true)
  with check (true);

-- Ce que VOUS payez au livreur pour une livraison (Amana/CTM…), utilisé pour
-- calculer le bénéfice net. Modifiable depuis l'onglet Finances.
alter table site_settings add column if not exists courier_cost numeric not null default 35;
