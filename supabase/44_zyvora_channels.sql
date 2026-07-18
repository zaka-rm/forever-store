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

