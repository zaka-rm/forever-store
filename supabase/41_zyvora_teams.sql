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
drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
create policy "zyvora_ws_select_member" on public.zyvora_workspaces
  for select using (public.zyvora_is_member(id));

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
create policy "zyvora_ev_select_member" on public.zyvora_events
  for select using (public.zyvora_is_member(workspace_id));

-- Members with an operational role may append events; viewers cannot.
drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
create policy "zyvora_ev_insert_member" on public.zyvora_events
  for insert with check (public.zyvora_role(workspace_id) in ('owner','manager','staff'));

-- Still NO update/delete on zyvora_events — append-only (ADR-0002).
