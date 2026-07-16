-- ZYVORA productization Stone 4 — billing (Stripe subscriptions).
-- Vendor productization (monetization of ZYVORA itself; no canonical CAP/FEAT id).
-- Apply AFTER 42_zyvora_telemetry.sql (same SQL-editor workflow).
--
-- Model: one subscription per OWNER (auth user). The Stripe webhook Edge
-- Function (service role) is the only writer; clients may only read their own
-- row. Truth about payment lives in Stripe; this table is the mirror the app
-- reads.

create table if not exists public.zyvora_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none'
    check (status in ('none','trialing','active','past_due','canceled','unpaid')),
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zyvora_subscriptions enable row level security;

-- Clients: read your own subscription. No insert/update/delete policies —
-- only the webhook (service role, bypasses RLS) writes here.
drop policy if exists zyvora_subscriptions_select on public.zyvora_subscriptions;
create policy zyvora_subscriptions_select on public.zyvora_subscriptions
  for select to authenticated
  using (user_id = auth.uid());
