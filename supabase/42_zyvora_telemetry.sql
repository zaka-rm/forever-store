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
