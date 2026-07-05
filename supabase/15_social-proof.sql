-- Run in Supabase → SQL Editor → New query → Run.
-- Powers the "social proof" popups on the storefront ("Fatima à Casablanca vient
-- de commander…"). Exposes ONLY a first name + city + product — never phone,
-- email, address or amount — through a trusted read-only function.

create or replace function recent_orders_public(p_limit int default 8)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
  from (
    select
      split_part(trim(customer_name), ' ', 1) as name,
      city,
      (items -> 0 ->> 'name') as product,
      created_at
    from orders
    where status <> 'cancelled'
      and coalesce(trim(customer_name), '') <> ''
    order by created_at desc
    limit greatest(1, least(p_limit, 20))
  ) x;
$$;

grant execute on function recent_orders_public(int) to anon;
