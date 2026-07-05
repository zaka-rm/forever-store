-- Run in Supabase → SQL Editor → New query → Run.
-- Makes the blog editable from the admin (add / edit / remove articles), in
-- French AND Arabic. The public site shows only published articles; the admin
-- sees all. Start empty, then click "Importer les articles par défaut" in the
-- admin to load the built-in articles, or write your own.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_ar text,
  excerpt text,
  excerpt_ar text,
  content text[] not null default '{}',
  content_ar text[] not null default '{}',
  image text,
  tag text,
  tag_ar text,
  date date not null default current_date,
  read_time text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table blog_posts enable row level security;

-- Public reads published articles; the logged-in admin reads/edits everything.
create policy "Public can read published posts"
  on blog_posts for select using (published = true);
create policy "Admin can read all posts"
  on blog_posts for select to authenticated using (true);
create policy "Admin can insert posts"
  on blog_posts for insert to authenticated with check (true);
create policy "Admin can update posts"
  on blog_posts for update to authenticated using (true) with check (true);
create policy "Admin can delete posts"
  on blog_posts for delete to authenticated using (true);
