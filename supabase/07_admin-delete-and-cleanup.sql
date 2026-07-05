-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the logged-in admin delete orders and contact messages from the panel.
-- (Reviews already had a delete policy.)

create policy "Admin can delete orders"
  on orders for delete to authenticated using (true);

create policy "Admin can delete contact messages"
  on contact_messages for delete to authenticated using (true);

-- ------------------------------------------------------------------
-- Optional one-time cleanup of the test data created during setup.
-- Review these, then remove the leading "-- " to run the ones you want.
-- ------------------------------------------------------------------
-- delete from orders where order_ref like 'FLTEST%' or customer_email like '%@example.com';
-- delete from contact_messages where email like '%@example.com';
-- delete from reviews where approved = false and author ilike 'test%';
