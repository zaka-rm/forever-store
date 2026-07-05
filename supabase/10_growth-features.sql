-- Run in Supabase → SQL Editor → New query → Run.
-- Adds newsletter subscribers, distributor recruitment leads, delivery zones
-- by city, and a lightweight referral program.

-- ---------------------------------------------------------------------------
-- 1. Newsletter subscribers
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);
alter table subscribers enable row level security;

create policy "Public can subscribe"
  on subscribers for insert
  to anon
  with check (true);

create policy "Admin can read subscribers"
  on subscribers for select
  to authenticated
  using (true);

create policy "Admin can delete subscribers"
  on subscribers for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. "Devenir distributeur" recruitment leads
-- ---------------------------------------------------------------------------
create table if not exists distributor_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  city text,
  message text,
  handled boolean not null default false
);
alter table distributor_leads enable row level security;

create policy "Public can submit distributor lead"
  on distributor_leads for insert
  to anon
  with check (true);

create policy "Admin can read distributor leads"
  on distributor_leads for select
  to authenticated
  using (true);

create policy "Admin can update distributor leads"
  on distributor_leads for update
  to authenticated
  using (true);

create policy "Admin can delete distributor leads"
  on distributor_leads for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Delivery zones — shipping fee per city
-- ---------------------------------------------------------------------------
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city text unique not null,
  fee numeric not null default 0,
  free_threshold numeric,
  active boolean not null default true
);
alter table delivery_zones enable row level security;

create policy "Public can read active delivery zones"
  on delivery_zones for select
  to anon
  using (active = true);

create policy "Admin manage delivery zones"
  on delivery_zones for all
  to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 4. Referral program
-- ---------------------------------------------------------------------------
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referrer_ref text not null,
  referred_order_ref text not null,
  rewarded boolean not null default false
);
alter table referrals enable row level security;

create policy "Admin can read referrals"
  on referrals for select
  to authenticated
  using (true);

create policy "Admin can update referrals"
  on referrals for update
  to authenticated
  using (true);

-- Customers submit a referral only through this function — it checks the
-- referrer's order actually exists, so nobody can insert junk data directly
-- (the referrals table has no public insert policy).
create or replace function submit_referral(p_referrer_ref text, p_referred_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_exists boolean;
begin
  if p_referrer_ref is null or p_referred_ref is null or p_referrer_ref = p_referred_ref then
    return false;
  end if;

  select exists(select 1 from orders where order_ref = p_referrer_ref) into referrer_exists;
  if not referrer_exists then
    return false;
  end if;

  insert into referrals (referrer_ref, referred_order_ref) values (p_referrer_ref, p_referred_ref);
  return true;
end;
$$;

grant execute on function submit_referral(text, text) to anon;
