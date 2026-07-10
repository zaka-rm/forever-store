-- Run in Supabase → SQL Editor → New query → Run.

-- 1) Votre histoire (« Qui suis-je ») — texte FR/AR modifiable dans l'admin,
--    affiché sur l'accueil. Les Marocains achètent à des personnes : racontez
--    qui vous êtes (pas besoin de montrer votre visage).
alter table site_settings add column if not exists story_fr text;
alter table site_settings add column if not exists story_ar text;

-- 2) Témoignages en capture d'écran — les clients envoient rarement un avis via
--    le formulaire, mais ils envoient de beaux messages WhatsApp. Uploadez des
--    captures (numéros floutés !) depuis l'admin.
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  active boolean not null default true,
  image text not null,
  caption text
);

alter table testimonials enable row level security;

drop policy if exists "testimonials public read" on testimonials;
create policy "testimonials public read"
  on testimonials for select
  using (true);

drop policy if exists "testimonials admin write" on testimonials;
create policy "testimonials admin write"
  on testimonials for all
  to authenticated
  using (true)
  with check (true);
