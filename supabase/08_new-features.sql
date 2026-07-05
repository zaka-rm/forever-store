-- Run in Supabase → SQL Editor → New query → Run.
-- Adds product stock control and promo/discount codes.

-- 1. Stock per product. NULL = not tracked (always available); 0 = out of stock.
alter table products add column if not exists stock integer;

-- 2. Promo / discount codes.
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null default 'percent',   -- 'percent' | 'fixed'
  value numeric not null,
  min_subtotal numeric,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table discount_codes enable row level security;

create policy "Admin manage discount codes"
  on discount_codes for all
  to authenticated
  using (true) with check (true);

-- Customers validate a code at checkout through this function only
-- (they can't read the codes table directly).
create or replace function validate_discount(p_code text)
returns table (code text, type text, value numeric, min_subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- 3. Record the applied discount on each order.
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount numeric not null default 0;
