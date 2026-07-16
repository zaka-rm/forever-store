-- ⚠️⚠️⚠️  DESTRUCTIF — À N'EXÉCUTER QU'EN TOUT DERNIER  ⚠️⚠️⚠️
--
-- Ce script SUPPRIME toutes les tables et fonctions Zyvora de l'ANCIEN projet
-- (celui de Naturaloé). Ne l'exécutez QUE lorsque :
--   1. Le NOUVEAU projet Supabase Zyvora est créé,
--   2. Le schéma Zyvora y est recréé (40/41/42/43_zyvora*.sql),
--   3. Les données Zyvora y sont copiées,
--   4. L'app Zyvora pointe vers le nouveau projet ET fonctionne.
--
-- Tant que ce n'est pas confirmé, NE LANCEZ PAS ce script — vous perdriez les
-- données Zyvora. Faites d'abord une sauvegarde (Supabase → Database → Backups).
--
-- Naturaloé n'est PAS touché : aucune de ses tables n'est ici.

begin;

-- Fonctions Zyvora (publiques + privées)
drop function if exists public.zyvora_is_member(uuid) cascade;
drop function if exists public.zyvora_role(uuid) cascade;
drop function if exists private.zyvora_is_member(uuid) cascade;
drop function if exists private.zyvora_role(uuid) cascade;

-- Tables Zyvora (cascade retire aussi leurs policies, triggers, index)
drop table if exists public.zyvora_events cascade;
drop table if exists public.zyvora_invitations cascade;
drop table if exists public.zyvora_memberships cascade;
drop table if exists public.zyvora_subscriptions cascade;
drop table if exists public.zyvora_client_errors cascade;
drop table if exists public.zyvora_workspaces cascade;

commit;

-- Vérification : ne doit plus rien retourner.
select tablename from pg_tables where schemaname = 'public' and tablename like 'zyvora%';
