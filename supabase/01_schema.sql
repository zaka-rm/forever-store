-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Creates the three tables the store needs plus row-level security policies
-- so the public site can only insert data (never read orders/contact messages,
-- and only read reviews that have been approved).

create extension if not exists "pgcrypto";

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  phone text,
  address text,
  city text,
  region text,
  zip text,
  country text,
  items jsonb not null,
  subtotal numeric not null,
  shipping numeric not null,
  total numeric not null,
  currency text not null default 'eur',
  stripe_session_id text unique,
  payment_status text not null default 'pending',
  locale text
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  handled boolean not null default false
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false
);

alter table orders enable row level security;
alter table contact_messages enable row level security;
alter table reviews enable row level security;

-- Orders: only the create-checkout-session / stripe-webhook Edge Functions touch this
-- table (using the service role key, which bypasses RLS). No public policies needed.

-- Contact messages: same — only written by the send-contact-email Edge Function
-- via the service role key. No public policies needed.

-- Reviews: public can submit (unapproved) and read only approved reviews.
create policy "Public can insert reviews"
  on reviews for insert
  to anon
  with check (approved = false);

create policy "Public can read approved reviews"
  on reviews for select
  to anon
  using (approved = true);
