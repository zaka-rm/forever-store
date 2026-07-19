-- ============================================================
-- ZYVORA - COMBINED SCHEMA (auto-generated, ZYVORA tables only)
-- Paste this into the ZYVORA project's SQL editor and Run.
-- Does NOT include the Naturaloe store schema (that lives in its own project).
-- ============================================================

-- >>> FILE: 40_zyvora.sql >>>
-- ZYVORA Wave 0 — platform foundation (accounts + server-side Business Memory)
-- Apply in the Supabase SQL editor (same workflow as 30_finance.sql).
--
-- Constitutional enforcement at the database layer:
--   * Workspace isolation: RLS restricts every row to its owner (CODEX 00 F.2/F.3).
--   * Business Memory is append-only: INSERT + SELECT only — no UPDATE/DELETE
--     policies exist on zyvora_events (Article V, ADR-0002).

create table if not exists public.zyvora_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.zyvora_workspaces enable row level security;

drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
create policy "zyvora_ws_select_own" on public.zyvora_workspaces
  for select using (auth.uid() = owner);

drop policy if exists "zyvora_ws_insert_own" on public.zyvora_workspaces;
create policy "zyvora_ws_insert_own" on public.zyvora_workspaces
  for insert with check (auth.uid() = owner);

drop policy if exists "zyvora_ws_update_own" on public.zyvora_workspaces;
create policy "zyvora_ws_update_own" on public.zyvora_workspaces
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

-- Business Memory event store: the four streams, append-only.
create table if not exists public.zyvora_events (
  id uuid primary key, -- client-generated; makes offline retries idempotent
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  ts bigint not null,
  stream text not null check (stream in ('fact','interpretation','decision','outcome')),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zyvora_events_ws_ts on public.zyvora_events (workspace_id, ts);

alter table public.zyvora_events enable row level security;

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
create policy "zyvora_ev_select_own" on public.zyvora_events
  for select using (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
create policy "zyvora_ev_insert_own" on public.zyvora_events
  for insert with check (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

-- Deliberately NO update policy and NO delete policy on zyvora_events:
-- Business Memory is permanent and append-only (ADR-0002).


-- >>> FILE: 41_zyvora_teams.sql >>>
-- ZYVORA Wave 0 completion — multi-user: memberships, invitations, roles, RLS.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000027 invitation & membership, FEAT-000028 roles & permission grants,
--   FEAT-000029 policy evaluation (enforced here at the data layer via RLS).
-- Apply AFTER 40_zyvora.sql (same SQL-editor workflow).
--
-- Model: one Workspace has many Memberships (user + role). Access to a Workspace
-- and its Business Memory is granted by membership, not just ownership. The owner
-- always has an implicit 'owner' membership. Roles: owner > manager > staff > viewer.

-- 1. Memberships -----------------------------------------------------------
create table if not exists public.zyvora_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists zyvora_memberships_user on public.zyvora_memberships (user_id);

-- Helper: is the current user a member of a workspace (optionally with a role floor)?
create or replace function public.zyvora_is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.zyvora_memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.zyvora_workspaces w
    where w.id = ws and w.owner = auth.uid()
  );
$$;

create or replace function public.zyvora_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.zyvora_memberships m where m.workspace_id = ws and m.user_id = auth.uid()),
    (select 'owner' from public.zyvora_workspaces w where w.id = ws and w.owner = auth.uid())
  );
$$;

alter table public.zyvora_memberships enable row level security;

-- Members can see the roster of their own workspaces.
drop policy if exists "zyvora_mem_select" on public.zyvora_memberships;
create policy "zyvora_mem_select" on public.zyvora_memberships
  for select using (public.zyvora_is_member(workspace_id));

-- Only owner/manager may add or change memberships.
drop policy if exists "zyvora_mem_write" on public.zyvora_memberships;
create policy "zyvora_mem_write" on public.zyvora_memberships
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- 2. Invitations (email-based; accepted when that user signs in) ------------
create table if not exists public.zyvora_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('manager','staff','viewer')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
create index if not exists zyvora_inv_email on public.zyvora_invitations (lower(email));

alter table public.zyvora_invitations enable row level security;

-- Owner/manager manage invitations for their workspace.
drop policy if exists "zyvora_inv_manage" on public.zyvora_invitations;
create policy "zyvora_inv_manage" on public.zyvora_invitations
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- An invited user may see invitations addressed to their own email (to accept).
drop policy if exists "zyvora_inv_see_mine" on public.zyvora_invitations;
create policy "zyvora_inv_see_mine" on public.zyvora_invitations
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 3. Widen workspace + event access from owner-only to any member -----------
-- (drop BOTH the old owner-only name and the new member name, so re-runs are safe)
drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
drop policy if exists "zyvora_ws_select_member" on public.zyvora_workspaces;
create policy "zyvora_ws_select_member" on public.zyvora_workspaces
  for select using (public.zyvora_is_member(id));

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_select_member" on public.zyvora_events;
create policy "zyvora_ev_select_member" on public.zyvora_events
  for select using (public.zyvora_is_member(workspace_id));

-- Members with an operational role may append events; viewers cannot.
drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_insert_member" on public.zyvora_events;
create policy "zyvora_ev_insert_member" on public.zyvora_events
  for insert with check (public.zyvora_role(workspace_id) in ('owner','manager','staff'));

-- Still NO update/delete on zyvora_events — append-only (ADR-0002).


-- >>> FILE: 42_zyvora_telemetry.sql >>>
-- ZYVORA productization Stone 2 — error telemetry.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000032 audit & observability (client-error channel).
-- Apply AFTER 41_zyvora_teams.sql (same SQL-editor workflow).
--
-- Purpose: when the app breaks on a customer's machine, the vendor (you) can see
-- it. Clients may INSERT their own error reports; nobody can update or delete
-- them from the client (append-only, like Business Memory); reading is for the
-- service role only (Supabase dashboard / future admin console).

create table if not exists public.zyvora_client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,
  message text not null,
  stack text,
  place text,               -- where in the app it happened (view / boundary / promise)
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists zyvora_client_errors_time on public.zyvora_client_errors (created_at desc);

alter table public.zyvora_client_errors enable row level security;

-- Signed-in users may report their own errors. No select/update/delete policies:
-- reports are write-only from the client.
drop policy if exists zyvora_client_errors_insert on public.zyvora_client_errors;
create policy zyvora_client_errors_insert on public.zyvora_client_errors
  for insert to authenticated
  with check (user_id = auth.uid());


-- >>> FILE: 43_zyvora_billing.sql >>>
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


-- >>> FILE: 44_zyvora_channels.sql >>>
-- ZYVORA channel bindings — explicit destination ownership for inbound webhooks.
-- Apply after 41_zyvora_teams.sql. A Twilio number/sender belongs to exactly one
-- Workspace, preventing an inbound message from ever being guessed across tenants.

create table if not exists public.zyvora_channel_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms')),
  address text not null check (address ~ '^\+[0-9]{8,15}$'),
  label text,
  created_at timestamptz not null default now(),
  unique (channel, address)
);

create index if not exists zyvora_channel_bindings_ws
  on public.zyvora_channel_bindings (workspace_id);

alter table public.zyvora_channel_bindings enable row level security;

drop policy if exists "zyvora_channel_select" on public.zyvora_channel_bindings;
create policy "zyvora_channel_select" on public.zyvora_channel_bindings
  for select using (public.zyvora_is_member(workspace_id));

drop policy if exists "zyvora_channel_manage" on public.zyvora_channel_bindings;
create policy "zyvora_channel_manage" on public.zyvora_channel_bindings
  for all using (public.zyvora_role(workspace_id) in ('owner', 'manager'))
  with check (public.zyvora_role(workspace_id) in ('owner', 'manager'));



-- >>> FILE: 45_zyvora_workspace_bootstrap.sql >>>
-- ZYVORA workspace bootstrap — safely creates the first Workspace + owner membership.
-- A direct client INSERT can be blocked by RLS during the no-workspace/no-membership
-- bootstrap state. This SECURITY DEFINER function is deliberately narrow:
-- authenticated only, owner is always auth.uid(), validated inputs, safe search_path.

create or replace function public.zyvora_create_workspace(p_name text, p_currency text default 'USD')
returns public.zyvora_workspaces
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  ws public.zyvora_workspaces;
  clean_name text := trim(coalesce(p_name, ''));
  clean_currency text := upper(trim(coalesce(p_currency, 'USD')));
begin
  if uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if length(clean_name) < 1 or length(clean_name) > 120 then
    raise exception 'Workspace name must be between 1 and 120 characters' using errcode = '22023';
  end if;
  if clean_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a 3-letter ISO code' using errcode = '22023';
  end if;

  insert into public.zyvora_workspaces (owner, name, currency)
  values (uid, clean_name, clean_currency)
  returning * into ws;

  insert into public.zyvora_memberships (workspace_id, user_id, role)
  values (ws.id, uid, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  return ws;
end;
$$;

revoke all on function public.zyvora_create_workspace(text, text) from public;
revoke all on function public.zyvora_create_workspace(text, text) from anon;
grant execute on function public.zyvora_create_workspace(text, text) to authenticated;


