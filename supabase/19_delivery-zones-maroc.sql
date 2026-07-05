-- Run in Supabase → SQL Editor → New query → Run.
-- Tarifs de livraison par ville (estimations Amana fournies par le vendeur).
-- Grille : Kelaa 20 DH · grandes villes 35 DH · sud/éloigné 50-60 DH.
-- Les villes secondaires non listées utilisent le tarif par défaut du site (40 DH).
-- Livraison offerte dès 500 DH partout (seuil global du site).
--
-- ⚠️ La correspondance se fait sur le nom exact tapé par le client (sans tenir
-- compte des majuscules). Ajoutez les variantes courantes si besoin dans
-- l'admin → Croissance → Livraison (ex. « Casa » en plus de « Casablanca »).

insert into delivery_zones (city, fee, free_threshold, active) values
  -- Votre ville : livraison en main propre
  ('El Kelaa des Sraghna', 20, 500, true),
  ('Kelaa des Sraghna',    20, 500, true),
  ('Kelaa',                20, 500, true),
  -- Grandes villes (~35 DH)
  ('Casablanca', 35, 500, true),
  ('Casa',       35, 500, true),
  ('Rabat',      35, 500, true),
  ('Marrakech',  35, 500, true),
  ('Fès',        35, 500, true),
  ('Fes',        35, 500, true),
  ('Tanger',     35, 500, true),
  ('Agadir',     35, 500, true),
  ('Salé',       35, 500, true),
  ('Sale',       35, 500, true),
  ('Meknès',     35, 500, true),
  ('Meknes',     35, 500, true),
  ('Oujda',      35, 500, true),
  ('Kénitra',    35, 500, true),
  ('Kenitra',    35, 500, true),
  ('Tétouan',    35, 500, true),
  ('Tetouan',    35, 500, true),
  ('Mohammedia', 35, 500, true),
  ('El Jadida',  35, 500, true),
  ('Temara',     35, 500, true),
  -- Sud et régions éloignées (50-60 DH)
  ('Ouarzazate', 50, 500, true),
  ('Errachidia', 50, 500, true),
  ('Zagora',     55, 500, true),
  ('Tinghir',    50, 500, true),
  ('Guelmim',    55, 500, true),
  ('Tan-Tan',    55, 500, true),
  ('Laâyoune',   60, 500, true),
  ('Laayoune',   60, 500, true),
  ('Dakhla',     60, 500, true)
on conflict (city) do update
  set fee = excluded.fee,
      free_threshold = excluded.free_threshold,
      active = true;
