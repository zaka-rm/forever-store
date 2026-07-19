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

