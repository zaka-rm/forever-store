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
