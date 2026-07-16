-- Run in Supabase → SQL Editor → New query → Run.
-- RÉPARATION — restaure l'accès public du site après une remédiation de
-- sécurité trop agressive. N'affecte PAS la sécurité admin (private.is_admin).
-- Idempotent : ré-exécutable sans risque.

-- ===========================================================================
-- 1) Formulaires publics : l'anon doit pouvoir INSÉRER (contact + distributeur)
-- ===========================================================================
drop policy if exists "Public can insert contact messages" on public.contact_messages;
create policy "Public can insert contact messages"
  on public.contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "Public can submit distributor lead" on public.distributor_leads;
create policy "Public can submit distributor lead"
  on public.distributor_leads for insert to anon, authenticated with check (true);

-- Privilège table (l'RLS ne sert à rien si le GRANT de base manque)
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.distributor_leads to anon, authenticated;

-- Autres écritures publiques légitimes du site
grant insert on public.reviews to anon, authenticated;          -- avis clients
grant insert on public.subscribers to anon, authenticated;      -- newsletter
grant insert on public.stock_alerts to anon, authenticated;     -- « prévenez-moi »
grant insert, update on public.abandoned_carts to anon, authenticated; -- paniers abandonnés
grant insert on public.orders to anon, authenticated;           -- commandes (COD)

-- ===========================================================================
-- 2) Fonctions indispensables au site — l'anon DOIT pouvoir les appeler.
--    (Oui, ceci fera réapparaître certains « warnings » du linter : c'est
--     NORMAL et voulu pour une boutique publique. Ne les supprimez pas.)
-- ===========================================================================
grant execute on function public.validate_discount(text) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.track_order_v2(text, text) to anon, authenticated;
grant execute on function public.submit_referral(text, text) to anon, authenticated;
grant execute on function public.decrement_stock(jsonb) to anon, authenticated;
grant execute on function public.get_loyalty(text) to anon, authenticated;
grant execute on function public.recent_orders_public(integer) to anon, authenticated;
grant execute on function public.respond_order(text, uuid, text) to anon, authenticated;

-- ===========================================================================
-- 3) Vérification — liste les policies publiques restaurées.
-- ===========================================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('contact_messages', 'distributor_leads')
order by tablename, policyname;
