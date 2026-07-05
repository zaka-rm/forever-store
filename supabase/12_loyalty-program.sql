-- Run in Supabase → SQL Editor → New query → Run.
-- Email-based loyalty points: customers earn 1 point per € automatically when
-- you mark their order "Livrée" (delivered). No customer login required.

create table if not exists loyalty_points (
  email text primary key,
  points integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table loyalty_points enable row level security;

create policy "Admin can read loyalty points"
  on loyalty_points for select
  to authenticated
  using (true);

-- Guard column so points are only ever awarded once per order.
alter table orders add column if not exists loyalty_awarded boolean not null default false;

-- When an order becomes "delivered", credit the customer's points once.
create or replace function award_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'delivered'
     and coalesce(OLD.loyalty_awarded, false) = false
     and NEW.customer_email is not null
     and NEW.customer_email <> '' then
    insert into loyalty_points (email, points)
      values (lower(NEW.customer_email), floor(NEW.total)::int)
    on conflict (email) do update
      set points = loyalty_points.points + floor(NEW.total)::int,
          updated_at = now();
    NEW.loyalty_awarded := true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_loyalty on orders;
create trigger trg_award_loyalty
  before update on orders
  for each row
  execute function award_loyalty_points();

-- Customers look up their own balance by email (returns 0 if none).
create or replace function get_loyalty(p_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select points from loyalty_points where email = lower(p_email)), 0);
$$;

grant execute on function get_loyalty(text) to anon;
