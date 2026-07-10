-- Run in Supabase → SQL Editor → New query → Run.
-- Packs gérés depuis l'admin : chaque pack contient des produits précis (avec
-- quantités), un nom FR/AR et un objectif FR/AR. Affichés sur la page Routines.
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  active boolean not null default true,
  icon text not null default '🌿',
  name_fr text not null,
  name_ar text,
  goal_fr text,
  goal_ar text,
  -- Photo du pack (facultative) : si définie, elle remplace la grille de
  -- produits sur la carte du pack.
  image text,
  -- [{ "id": "p01", "quantity": 1 }, ...]
  items jsonb not null default '[]'::jsonb
);

-- Si vous aviez déjà exécuté ce script avant l'ajout de la photo :
alter table packs add column if not exists image text;

alter table packs enable row level security;

-- Le site lit les packs (les inactifs sont filtrés côté site)…
drop policy if exists "packs public read" on packs;
create policy "packs public read"
  on packs for select
  using (true);

-- …seul l'admin connecté peut créer / modifier / supprimer.
drop policy if exists "packs admin write" on packs;
create policy "packs admin write"
  on packs for all
  to authenticated
  using (true)
  with check (true);
