-- Run in Supabase → SQL Editor → New query → Run.
-- Adds the order fulfilment workflow (confirm / ship / deliver / cancel) and a
-- secure way for customers to track their own order without any email service.

-- 1. Fulfilment status + a human-friendly reference (e.g. FL12345678).
alter table orders add column if not exists status text not null default 'pending';
alter table orders add column if not exists order_ref text;

-- 2. Let the logged-in admin change an order (confirm, ship, cancel, etc.).
create policy "Admin can update orders"
  on orders for update
  to authenticated
  using (true)
  with check (true);

-- 3. Public order tracking. A customer looks up ONE order using its reference
--    AND the email used on the order. `security definer` lets this function read
--    that single row without exposing the whole orders table to the public.
create or replace function track_order(p_ref text, p_email text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select order_ref, status, created_at, total
  from orders
  where order_ref = p_ref
    and lower(customer_email) = lower(p_email)
  limit 1;
$$;

grant execute on function track_order(text, text) to anon;
