-- Run in Supabase → SQL Editor → New query → Run.
-- Permet aux clients de joindre une photo à leur avis (une vraie photo vaut
-- mieux que tout argumentaire). La photo est facultative.
alter table reviews add column if not exists photo_url text;

-- Bucket de stockage public pour les photos d'avis.
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- N'importe quel visiteur peut envoyer une photo…
drop policy if exists "review photos public upload" on storage.objects;
create policy "review photos public upload"
  on storage.objects for insert
  with check (bucket_id = 'review-photos');

-- …et tout le monde peut les voir (bucket public).
drop policy if exists "review photos public read" on storage.objects;
create policy "review photos public read"
  on storage.objects for select
  using (bucket_id = 'review-photos');
