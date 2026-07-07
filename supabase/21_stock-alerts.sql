-- Run in Supabase → SQL Editor → New query → Run.
-- « Prévenez-moi quand c'est disponible » : capture la demande sur les produits
-- en rupture de stock, pour savoir quoi réapprovisionner et qui recontacter.

create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  product_name text not null,
  contact text not null,
  notified boolean not null default false
);

alter table stock_alerts enable row level security;

create policy "Public can create stock alert"
  on stock_alerts for insert to anon, authenticated with check (true);
create policy "Admin can read stock alerts"
  on stock_alerts for select to authenticated using (true);
create policy "Admin can update stock alerts"
  on stock_alerts for update to authenticated using (true) with check (true);
create policy "Admin can delete stock alerts"
  on stock_alerts for delete to authenticated using (true);
