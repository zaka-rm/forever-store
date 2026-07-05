# Base de données Supabase — guide de mise en place

Tous les fichiers `.sql` de ce dossier se lancent **de la même façon** :

> Supabase → **SQL Editor** → **New query** → coller le contenu du fichier → **Run**.

Les numéros indiquent **l'ordre**. Lancez-les de haut en bas, **une seule fois chacun**.
(Vous avez déjà lancé la plupart — cette liste sert de référence.)

---

## 1. Installation de base (obligatoire, dans l'ordre)

| Ordre | Fichier | Ce qu'il fait |
|------|---------|----------------|
| 01 | `01_schema.sql` | Tables de base : commandes, messages de contact, avis. |
| 02 | `02_products-and-admin.sql` | Table des produits + droits admin + espace pour les images. |
| 03 | `03_products-seed.sql` | Importe le catalogue (72 produits) dans la base. |
| 04 | `04_enable-public-forms.sql` | Autorise le public à envoyer un message et à passer commande. |
| 05 | `05_order-tracking.sql` | Suivi de commande (page « Suivi »). |
| 06 | `06_order-confirmation.sql` | Confirmation/annulation par email + annulation auto après 24 h. |
| 07 | `07_admin-delete-and-cleanup.sql` | Permet à l'admin de supprimer commandes et messages. |

## 2. Fonctionnalités (obligatoire pour les options correspondantes)

| Ordre | Fichier | Ce qu'il fait |
|------|---------|----------------|
| 08 | `08_new-features.sql` | Gestion du stock + codes promo. |
| 09 | `09_stock-decrement.sql` | Décompte automatique du stock à chaque commande. |
| 10 | `10_growth-features.sql` | Abonnés newsletter, distributeurs, zones de livraison, parrainage. |
| 11 | `11_product-visibility.sql` | Bouton « Masquer / Afficher » un produit. |
| 12 | `12_loyalty-program.sql` | Programme de fidélité (points par email). |
| 13 | `13_order-notes.sql` | Champ « Instructions de livraison » sur les commandes. |
| 14 | `14_site-settings.sql` | Bandeau d'annonce éditable depuis l'admin (onglet Réglages). |
| 15 | `15_social-proof.sql` | Popups « X à Casablanca vient de commander… » (prénom + ville uniquement). |
| 16 | `16_subscriptions.sql` | Abonnements « Recevoir chaque mois » (livraison mensuelle). |
| 17 | `17_blog.sql` | Blog éditable depuis l'admin (articles FR + AR, onglet Blog). |
| 18 | `18_fix-orders-security.sql` | 🔴 Ré-active la sécurité (RLS) de la table orders. **Obligatoire avant le lancement.** |
| 19 | `19_delivery-zones-maroc.sql` | Tarifs de livraison par ville marocaine (grille Amana). |
| 20 | `20_track-by-phone.sql` | Suivi de commande par téléphone OU email (indispensable, email facultatif). |

## 3. Utilitaire (à lancer une seule fois, au besoin)

| Fichier | Ce qu'il fait |
|---------|----------------|
| `99_convert-to-dirham.sql` | ⚠️ **Une seule fois.** Convertit les prix d'euros en dirhams (× 10,8). |

---

## Le dossier `functions/` (emails & paiement carte — optionnel)

Ces « Edge Functions » gèrent l'**envoi d'emails** et le **paiement par carte (Stripe)**.
Elles se **déploient** séparément (elles ne se collent pas dans le SQL Editor) et
nécessitent des comptes externes (Resend pour l'email, Stripe pour la carte).

- `send-order-email` — email de confirmation de commande
- `send-contact-email` — email quand un client écrit
- `create-checkout-session` + `stripe-webhook` — paiement par carte
- `_shared` — code commun aux fonctions

Le site **fonctionne sans elles** : les commandes et messages sont enregistrés dans
la base et visibles dans l'admin. Les emails ne partent simplement pas tant que ces
fonctions ne sont pas déployées.

---

## Bon à savoir

- La plupart des scripts sont « idempotents » sur les tables (`if not exists`), mais
  **relancer** un script qui crée une *policy* déjà existante peut afficher une erreur.
  En cas de doute : lancez chaque script **une seule fois**.
- Les identifiants de connexion à la base sont dans le fichier `.env.local` à la racine
  du projet (`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`).
