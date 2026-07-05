-- Run in Supabase → SQL Editor → New query → Run.
-- Email confirmation flow: the customer confirms or cancels their order from the
-- email buttons, and any order left unconfirmed for 24h is auto-cancelled.

-- 1. Secret token that makes the confirm/cancel email links safe (unguessable).
alter table orders add column if not exists confirm_token uuid not null default gen_random_uuid();

-- 2. The action the customer's email buttons trigger (via the /commande page).
--    Only a 'pending' order can be changed this way, and only with the right token.
create or replace function respond_order(p_ref text, p_token uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_status text;
  new_status text;
begin
  select status into cur_status
  from orders
  where order_ref = p_ref and confirm_token = p_token;

  if cur_status is null then
    return 'invalid';
  end if;

  -- Already handled (confirmed / cancelled / shipped…) → just report it back.
  if cur_status <> 'pending' then
    return cur_status;
  end if;

  if p_action = 'confirm' then
    new_status := 'confirmed';
  elsif p_action = 'cancel' then
    new_status := 'cancelled';
  else
    return 'invalid';
  end if;

  update orders set status = new_status
  where order_ref = p_ref and confirm_token = p_token;

  return new_status;
end;
$$;

grant execute on function respond_order(text, uuid, text) to anon;

-- 3. Auto-cancel: every hour, cancel pending orders older than 24h.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('auto-cancel-pending-orders');
exception when others then
  null;
end $$;

select cron.schedule(
  'auto-cancel-pending-orders',
  '0 * * * *',
  $cron$update orders set status = 'cancelled'
     where status = 'pending' and created_at < now() - interval '24 hours'$cron$
);
