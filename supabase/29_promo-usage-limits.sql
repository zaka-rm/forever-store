-- Run in Supabase → SQL Editor → New query → Run.
-- Limite d'utilisation des codes promo : chaque code peut avoir un nombre
-- maximum d'utilisations (ex : un code fidélité utilisable 2 fois, un code
-- unique utilisable 1 fois). Vide = illimité, comme avant.

alter table discount_codes add column if not exists max_uses int;
alter table discount_codes add column if not exists used_count int not null default 0;

-- Le code n'est plus valide une fois la limite atteinte.
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
    and (max_uses is null or used_count < max_uses)
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- Chaque commande passée avec un code compte une utilisation. Le compteur est
-- incrémenté par un trigger côté base : le client ne peut ni l'éviter ni le
-- manipuler. (Le code automatique « ROUTINE-10% » ne correspond à aucune ligne
-- de la table, donc il n'est simplement pas compté.)
create or replace function count_discount_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.discount_code is not null then
    update discount_codes
      set used_count = used_count + 1
      where upper(code) = upper(new.discount_code);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_count_discount_use on orders;
create trigger orders_count_discount_use
  after insert on orders
  for each row
  execute function count_discount_use();
