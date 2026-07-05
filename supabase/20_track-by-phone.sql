-- Run in Supabase → SQL Editor → New query → Run.
-- Suivi de commande par TÉLÉPHONE ou email. Indispensable depuis que l'email
-- est facultatif au checkout : le client entre son n° de commande + le contact
-- utilisé (téléphone ou email). Les numéros marocains correspondent quel que
-- soit le format saisi (0612345678, 212612345678, +212 6 12 34 56 78…) : on
-- compare les 9 derniers chiffres.

create or replace function track_order_v2(p_ref text, p_contact text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select o.order_ref, o.status, o.created_at, o.total
  from orders o
  where o.order_ref = trim(p_ref)
    and (
      -- correspondance par email…
      lower(o.customer_email) = lower(trim(p_contact))
      -- …ou par téléphone (9 derniers chiffres, peu importe le format)
      or (
        length(regexp_replace(p_contact, '\D', '', 'g')) >= 9
        and right(regexp_replace(coalesce(o.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(p_contact, '\D', '', 'g'), 9)
      )
    )
  limit 1;
$$;

grant execute on function track_order_v2(text, text) to anon;
