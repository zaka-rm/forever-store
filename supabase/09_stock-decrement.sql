-- Run in Supabase → SQL Editor → New query → Run.
-- Lets a cash-on-delivery order reduce product stock automatically.
-- Customers can't UPDATE products directly (RLS), so this runs as a trusted
-- function that only ever subtracts the ordered quantities — and never below 0.
-- Products with stock = NULL (not tracked) are left untouched.

create or replace function decrement_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update products
      set stock = greatest(0, stock - (item->>'quantity')::int)
      where id = (item->>'id')
        and stock is not null;
  end loop;
end;
$$;

grant execute on function decrement_stock(jsonb) to anon;
