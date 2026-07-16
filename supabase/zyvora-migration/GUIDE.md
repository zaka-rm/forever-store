# Séparer Zyvora de Naturaloé (projets Supabase distincts)

Aujourd'hui, **Naturaloé** (votre boutique) et **Zyvora** (l'autre application) partagent
le même projet Supabase. On va donner à Zyvora **son propre projet**, pour que les deux
ne se gênent plus jamais.

> ⚠️ On ne supprime RIEN de l'ancien projet tant que le nouveau n'est pas confirmé
> fonctionnel. Faites une sauvegarde avant de commencer : Supabase → Database → Backups.

## Ce que Zyvora possède dans la base (à déplacer)

**Tables (6)** : `zyvora_workspaces`, `zyvora_events`, `zyvora_memberships`,
`zyvora_invitations`, `zyvora_client_errors`, `zyvora_subscriptions`
**Fonctions** : `zyvora_is_member`, `zyvora_role` (publiques + privées)

Naturaloé ne référence AUCUNE de ces tables — la coupure est nette.

---

## Étapes

### 1. Créer le nouveau projet
Sur supabase.com → **New project** → nommez-le par ex. `zyvora`. Notez son **URL** et sa
clé **anon** (Settings → API).

### 2. Recréer le schéma Zyvora dans le nouveau projet
Dans le **nouveau** projet → SQL Editor, exécutez dans l'ordre les fichiers déjà présents
dans le repo :
1. `supabase/40_zyvora.sql`
2. `supabase/41_zyvora_teams.sql`
3. `supabase/42_zyvora_telemetry.sql`
4. `supabase/43_zyvora_billing.sql`

Cela recrée toutes les tables, policies et fonctions Zyvora, proprement.

### 3. Copier les données (si Zyvora a déjà des données réelles)
Si Zyvora est encore vide (pas encore utilisé en vrai), **sautez cette étape**.

Sinon, pour chaque table, dans l'**ANCIEN** projet : Table Editor → la table → **Export → CSV**.
Puis dans le **NOUVEAU** projet : Table Editor → la même table → **Import → CSV**.
Ordre d'import (à cause des dépendances) :
`zyvora_workspaces` → `zyvora_memberships` → `zyvora_invitations` → `zyvora_events`
→ `zyvora_subscriptions` → `zyvora_client_errors`.

> Note : les utilisateurs (auth) ne se copient pas entre projets. Si des comptes Zyvora
> existent, recréez-les dans le nouveau projet (Authentication → Users). Pour un projet
> encore au tout début, c'est en général juste votre propre compte.

### 4. Re-pointer l'application Zyvora vers le nouveau projet
L'app Zyvora vit dans le dossier `zyvora/`. Mettez à jour ses variables
d'environnement (là où elle est déployée + `zyvora/.env` en local) :
```
VITE_SUPABASE_URL=<URL du NOUVEAU projet>
VITE_SUPABASE_ANON_KEY=<clé anon du NOUVEAU projet>
```
Redéployez l'app Zyvora. Testez-la : connexion, création d'un workspace, etc.

### 5. SEULEMENT une fois Zyvora confirmé OK → nettoyer l'ancien projet
Dans l'**ANCIEN** projet (Naturaloé), exécutez
`CLEANUP-old-naturaloe-project-RUN-LAST.sql`.
Il supprime les tables/fonctions Zyvora de la base Naturaloé — vos avertissements
`zyvora_*` disparaissent et la surface API de Naturaloé devient propre.

---

## Résultat
- **Projet Naturaloé** : seulement la boutique. Lints propres, aucun risque Zyvora.
- **Projet Zyvora** : indépendant, avec ses propres lints et sa propre auth.
- Les deux évoluent séparément.
