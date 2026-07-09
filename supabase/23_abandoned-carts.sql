-- Run in Supabase → SQL Editor → New query → Run.
-- « Paniers abandonnés » : dès que le client saisit nom + téléphone au checkout,
-- on enregistre son panier — même s'il ne confirme pas. Vous le relancez ensuite
-- par WhatsApp depuis l'admin. (Récupère typiquement 15-30% des ventes perdues.)

create table if not exists abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  phone text,
  city text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  recovered boolean not null default false
);

alter table abandoned_carts enable row level security;

-- The visitor can create/refresh their own row (keyed by a random session id
-- stored in their browser). Low-risk data; admin manages it.
create policy "Public can upsert abandoned cart"
  on abandoned_carts for insert to anon, authenticated with check (true);
create policy "Public can update own abandoned cart"
  on abandoned_carts for update to anon, authenticated using (true) with check (true);
create policy "Admin can read abandoned carts"
  on abandoned_carts for select to authenticated using (true);
create policy "Admin can delete abandoned carts"
  on abandoned_carts for delete to authenticated using (true);
