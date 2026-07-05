-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the public submit contact messages and place cash-on-delivery orders
-- directly (no backend function needed) — the same way product reviews already
-- work. Orders can only be created as 'pending', so nobody can fake a paid order.

-- Remember how each order was paid (cash on delivery vs. card).
alter table orders add column if not exists payment_method text;

-- Public can submit contact messages (they land in the admin "Messages" tab).
create policy "Public can insert contact messages"
  on contact_messages for insert
  to anon
  with check (true);

-- Public can place pending (cash-on-delivery) orders (admin "Commandes" tab).
create policy "Public can insert pending orders"
  on orders for insert
  to anon
  with check (payment_status = 'pending');
