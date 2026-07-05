-- Run in Supabase → SQL Editor → New query → Run.
-- "Recevoir chaque mois" — customers subscribe to a monthly re-delivery of a
-- consumable product. Cash-on-delivery friendly: no auto-charge — the admin sees
-- who's due and prepares the order (with the manual-order tool) each month.

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  product_id text not null,
  product_name text not null,
  quantity int not null default 1,
  frequency text not null default 'monthly',
  next_date date not null default (current_date + interval '1 month'),
  active boolean not null default true
);

alter table subscriptions enable row level security;

-- Public can create a subscription (like the other storefront forms).
create policy "Public can create subscription"
  on subscriptions for insert
  to anon
  with check (active = true);

-- Only the admin manages them.
create policy "Admin can read subscriptions"
  on subscriptions for select to authenticated using (true);
create policy "Admin can update subscriptions"
  on subscriptions for update to authenticated using (true) with check (true);
create policy "Admin can delete subscriptions"
  on subscriptions for delete to authenticated using (true);
