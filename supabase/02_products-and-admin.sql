-- Run this in Supabase → SQL Editor AFTER schema.sql.
-- Creates the products table (so you can edit products from the admin panel
-- instead of code), plus a public storage bucket for product images.
-- The admin panel writes here using a logged-in (authenticated) account;
-- the public website only reads.

create table if not exists products (
  id text primary key,
  slug text unique not null,
  name text not null,
  name_ar text,
  category text not null,
  price numeric not null default 0,
  rating numeric not null default 5,
  review_count int not null default 0,
  tagline text,
  tagline_ar text,
  description text,
  description_ar text,
  ingredients jsonb not null default '[]',
  ingredients_ar jsonb,
  how_to_use text,
  how_to_use_ar text,
  image text,
  size text,
  best_seller boolean not null default false,
  is_new boolean not null default false,
  pack_contents jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Everyone can read products (that's the public shop).
create policy "Public can read products"
  on products for select
  to anon, authenticated
  using (true);

-- Only a logged-in admin can change them.
create policy "Admin can insert products"
  on products for insert to authenticated with check (true);
create policy "Admin can update products"
  on products for update to authenticated using (true);
create policy "Admin can delete products"
  on products for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for product images (drag-and-drop uploads from the admin).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "Admin can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "Admin can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

create policy "Admin can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- Admin (logged-in) access to orders, contact messages, and review moderation,
-- so they can be viewed/managed from the /admin panel instead of the Supabase
-- Table Editor. The public still cannot read orders or messages.
-- ---------------------------------------------------------------------------
create policy "Admin can read orders"
  on orders for select to authenticated using (true);

create policy "Admin can read contact messages"
  on contact_messages for select to authenticated using (true);
create policy "Admin can update contact messages"
  on contact_messages for update to authenticated using (true);

create policy "Admin can read all reviews"
  on reviews for select to authenticated using (true);
create policy "Admin can update reviews"
  on reviews for update to authenticated using (true);
create policy "Admin can delete reviews"
  on reviews for delete to authenticated using (true);
