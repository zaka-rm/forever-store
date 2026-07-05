-- Run in Supabase → SQL Editor → New query → Run.
-- A single-row settings table for site-wide options the admin can edit — starting
-- with the promo announcement bar shown at the top of every page.

create table if not exists site_settings (
  id int primary key default 1,
  announcement_fr text,
  announcement_ar text,
  announcement_active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into site_settings (id, announcement_fr, announcement_ar, announcement_active)
  values (1, 'Livraison offerte dès 500 DH 🚚', 'شحن مجاني ابتداءً من 500 درهم 🚚', true)
  on conflict (id) do nothing;

alter table site_settings enable row level security;

-- Everyone can read the banner; only the logged-in admin can change it.
create policy "Public can read site settings"
  on site_settings for select
  using (true);

create policy "Admin can update site settings"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);
