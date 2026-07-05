-- Run in Supabase → SQL Editor → New query → Run.
-- 🔴 IMPORTANT : ré-active la protection (RLS) de la table orders, désactivée
-- pendant le débogage. Sans elle, n'importe qui peut lire les données clients.
--
-- Pourquoi le "403" arrivait avant : l'ancienne policy n'autorisait que le rôle
-- "anon", mais quand vous êtes connecté à l'admin dans le même navigateur, la
-- commande part avec le rôle "authenticated" — qui n'avait aucun droit d'insertion.
-- Cette policy couvre les deux rôles, et n'autorise toujours QUE des commandes
-- en attente et non payées (personne ne peut créer une fausse commande "payée").

alter table orders enable row level security;

drop policy if exists "Public can insert pending orders" on orders;

create policy "Public can insert pending orders"
  on orders for insert
  to anon, authenticated
  with check (status = 'pending' and payment_status = 'pending');
