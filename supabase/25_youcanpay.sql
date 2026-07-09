-- Run in Supabase → SQL Editor → New query → Run.
-- Colonne pour relier une commande à son paiement YouCan Pay (carte bancaire).
alter table orders add column if not exists youcanpay_token text;
