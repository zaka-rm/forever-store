-- ============================================================
-- ZYVORA + Naturaloe store - COMBINED SCHEMA (auto-generated)
-- Paste this ONE file into a fresh Supabase project's SQL editor and Run.
-- ============================================================

-- >>> FILE: 01_schema.sql >>>
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Creates the three tables the store needs plus row-level security policies
-- so the public site can only insert data (never read orders/contact messages,
-- and only read reviews that have been approved).

create extension if not exists "pgcrypto";

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  phone text,
  address text,
  city text,
  region text,
  zip text,
  country text,
  items jsonb not null,
  subtotal numeric not null,
  shipping numeric not null,
  total numeric not null,
  currency text not null default 'eur',
  stripe_session_id text unique,
  payment_status text not null default 'pending',
  locale text
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  handled boolean not null default false
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false
);

alter table orders enable row level security;
alter table contact_messages enable row level security;
alter table reviews enable row level security;

-- Orders: only the create-checkout-session / stripe-webhook Edge Functions touch this
-- table (using the service role key, which bypasses RLS). No public policies needed.

-- Contact messages: same — only written by the send-contact-email Edge Function
-- via the service role key. No public policies needed.

-- Reviews: public can submit (unapproved) and read only approved reviews.
drop policy if exists "Public can insert reviews" on reviews;
create policy "Public can insert reviews"
  on reviews for insert
  to anon
  with check (approved = false);

drop policy if exists "Public can read approved reviews" on reviews;
create policy "Public can read approved reviews"
  on reviews for select
  to anon
  using (approved = true);


-- >>> FILE: 02_products-and-admin.sql >>>
-- Run this in Supabase → SQL Editor AFTER schema.sql.
-- Creates the products table (so you can edit products from the admin panel
-- instead of code), plus a public storage bucket for product images.
-- The admin panel writes here using a logged-in (authenticated) account;
-- the public website only reads.

create table if not exists products (
  id text primary key,
  slug text unique not null,
  name text not null,
  name_ar text,
  category text not null,
  price numeric not null default 0,
  rating numeric not null default 5,
  review_count int not null default 0,
  tagline text,
  tagline_ar text,
  description text,
  description_ar text,
  ingredients jsonb not null default '[]',
  ingredients_ar jsonb,
  how_to_use text,
  how_to_use_ar text,
  image text,
  size text,
  best_seller boolean not null default false,
  is_new boolean not null default false,
  pack_contents jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Everyone can read products (that's the public shop).
drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select
  to anon, authenticated
  using (true);

-- Only a logged-in admin can change them.
drop policy if exists "Admin can insert products" on products;
create policy "Admin can insert products"
  on products for insert to authenticated with check (true);
drop policy if exists "Admin can update products" on products;
create policy "Admin can update products"
  on products for update to authenticated using (true);
drop policy if exists "Admin can delete products" on products;
create policy "Admin can delete products"
  on products for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for product images (drag-and-drop uploads from the admin).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin can upload product images" on storage.objects;
create policy "Admin can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Admin can update product images" on storage.objects;
create policy "Admin can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin can delete product images" on storage.objects;
create policy "Admin can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- Admin (logged-in) access to orders, contact messages, and review moderation,
-- so they can be viewed/managed from the /admin panel instead of the Supabase
-- Table Editor. The public still cannot read orders or messages.
-- ---------------------------------------------------------------------------
drop policy if exists "Admin can read orders" on orders;
create policy "Admin can read orders"
  on orders for select to authenticated using (true);

drop policy if exists "Admin can read contact messages" on contact_messages;
create policy "Admin can read contact messages"
  on contact_messages for select to authenticated using (true);
drop policy if exists "Admin can update contact messages" on contact_messages;
create policy "Admin can update contact messages"
  on contact_messages for update to authenticated using (true);

drop policy if exists "Admin can read all reviews" on reviews;
create policy "Admin can read all reviews"
  on reviews for select to authenticated using (true);
drop policy if exists "Admin can update reviews" on reviews;
create policy "Admin can update reviews"
  on reviews for update to authenticated using (true);
drop policy if exists "Admin can delete reviews" on reviews;
create policy "Admin can delete reviews"
  on reviews for delete to authenticated using (true);


-- >>> FILE: 03_products-seed.sql >>>
-- Auto-generated by scripts/gen-products-seed.cjs — do not edit by hand.
-- Run in Supabase → SQL Editor after products-and-admin.sql.

insert into products (id, slug, name, name_ar, category, price, rating, review_count, tagline, tagline_ar, description, description_ar, ingredients, ingredients_ar, how_to_use, how_to_use_ar, image, size, best_seller, is_new, pack_contents, sort_order) values
  ('p01', 'aloe-vera-gel-330ml', 'Forever Aloe Vera Gel 330ml', 'جل ألوفيرا فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.9, 412, 'Notre produit signature, désormais sans conservateur et riche en vitamine C.', 'المنتج المميز، الآن بدون مواد حافظة وغني بفيتامين سي.', 'L''Aloe Vera Forever fait peau neuve ! Riche d''un savoir-faire de 40 ans, Forever a revisité son produit signature et créé une toute nouvelle version sans conservateur et riche en vitamine C, dans un emballage 100% recyclable. Le secret : 99,7% de gel d''Aloe vera et une dose synergique de vitamine C.', 'تجدد ألوفيرا فوريفر مظهره! بفضل خبرة 40 عاماً، أعادت فوريفر تصميم منتجها المميز وابتكرت نسخة جديدة كلياً بدون مواد حافظة وغنية بفيتامين سي، في عبوة قابلة لإعادة التدوير بنسبة 100%. السر: 99.7% جل ألوفيرا وجرعة تآزرية من فيتامين سي.', '["99,7% de gel d''Aloe vera","Vitamine C"]'::jsonb, '["99.7% جل ألوفيرا","فيتامين سي"]'::jsonb, '30 à 40 ml, 3 fois par jour.', '30 إلى 40 مل، 3 مرات يومياً.', '/products/p01-aloe-vera-gel.png', '330 ml', true, false, NULL, 0),
  ('p02', 'aloe-peche-330ml', 'Forever Aloe Pêche 330ml', 'ألوفيرا بالخوخ فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.7, 188, 'Aloe vera, purée de pêche naturelle et vitamine C pour une saveur douce et savoureuse.', 'ألوفيرا، هريس الخوخ الطبيعي وفيتامين سي بنكهة لذيذة وناعمة.', 'La nouvelle formule de l''Aloe Pêche associe de l''Aloe vera (84,5%), de la purée de pêche et du jus concentré de raisin blanc pour une saveur douce, ainsi qu''une dose synergique de vitamine C. Packaging 100% recyclable.', NULL, '["84,5% de pulpe d''Aloe vera","Purée de pêche naturelle","Jus concentré de raisin blanc","Arôme pêche"]'::jsonb, NULL, '30 à 40 ml, 3 fois par jour.', NULL, '/products/p02-aloe-peche.png', '330 ml', false, false, NULL, 1),
  ('p03', 'aloe-berry-nectar-330ml', 'Forever Aloe Berry Nectar 330ml', 'ألوفيرا بيري نكتار فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.8, 203, 'Une large dose de pulpe d''Aloe vera, jus de pomme et canneberge, sans conservateur.', 'جرعة كبيرة من لب الألوفيرا، عصير التفاح والتوت البري، بدون مواد حافظة.', 'Une large dose (90,7%) de pulpe d''Aloe vera, un soupçon de jus de pomme et de canneberge, de la vitamine C, aucun conservateur et un emballage 100% recyclable.', NULL, '["90,7% de pulpe d''Aloe vera","Jus concentré de pomme","Jus concentré de canneberge"]'::jsonb, NULL, '30 à 40 ml, 3 fois par jour.', NULL, '/products/p03-aloe-berry-nectar.png', '330 ml', false, false, NULL, 2),
  ('p04', 'aloe-mangue-1l', 'Forever Aloe Mangue', 'ألوفيرا مانجو فوريفر', 'Pulpe d''Aloe Vera', 38, 4.8, 96, 'Gel Aloe vera et purée de mangue naturelle pour un boost de nutrition et de saveur.', 'جل ألوفيرا وهريس مانجو طبيعي لدفعة إضافية من التغذية والنكهة.', 'Avec ses 86% de gel d''Aloe vera et sa purée de mangue naturelle, cette nouvelle déclinaison apporte un boost supplémentaire de nutrition et de saveur. Sans conservateurs, source de vitamine C.', NULL, '["86% de gel d''Aloe vera pur","Vitamine C","Concentré de purée de mangue"]'::jsonb, NULL, 'Secouer légèrement avant de servir — 30 à 40 ml dilués dans 240 ml d''eau ou de jus de fruit, 3 fois par jour.', NULL, '/products/page-08.jpg', '1 litre', false, true, NULL, 3),
  ('p05', 'aloe-berry-nectar-1l', 'Aloe Berry Nectar 1L', 'ألوفيرا بيري نكتار 1 لتر', 'Pulpe d''Aloe Vera', 38, 4.7, 121, 'Goût acidulé, extrait de canneberge et pulpe Aloe Vera riche en antioxydants.', 'طعم منعش، مستخلص التوت البري ولب الألوفيرا الغني بمضادات الأكسدة.', 'Au goût délicieusement acidulé, l''Aloe Berry Nectar contient de l''extrait de canneberge associé à la pulpe d''Aloe Vera. La plante contribue aux défenses naturelles de l''organisme.', NULL, '["90,6% de pulpe d''Aloe vera stabilisée","1,71% d''extraits de canneberge et de pomme"]'::jsonb, NULL, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', NULL, '/products/page-09.jpg', '1 litre', false, false, NULL, 4),
  ('p06', 'pulpe-aloe-vera-stabilisee-1l', 'Pulpe d''Aloe Vera Stabilisée', 'لب الألوفيرا المثبت', 'Pulpe d''Aloe Vera', 38, 4.9, 267, 'Le produit à utiliser quotidiennement pour conserver un bien-être optimal.', 'المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية.', 'La pulpe d''Aloès stabilisée est le produit à utiliser quotidiennement pour conserver un bien-être optimal. L''Aloe vera contribue au maintien du système immunitaire et possède de puissants antioxydants.', 'لب الألوة المثبت هو المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية. تساهم الألوفيرا في دعم الجهاز المناعي وتحتوي على مضادات أكسدة قوية.', '["96,2% de pulpe d''Aloe vera stabilisée"]'::jsonb, '["96.2% لب ألوفيرا مثبت"]'::jsonb, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', '30 إلى 40 مل يومياً، 3 مرات يومياً أي ما بين 90 و120 مل يومياً.', '/products/page-09.jpg', '1 litre', true, false, NULL, 5),
  ('p07', 'aloe-bits-n-peaches-1l', 'Forever Aloe Bits N'' Peaches', 'ألوفيرا بيتس آند بيتشز فوريفر', 'Pulpe d''Aloe Vera', 38, 4.6, 84, 'Cœur d''Aloès enrichi en concentré de jus de pêche, savoureux et doux.', 'قلب الألوة المُخصّب بمركز عصير الخوخ، لذيذ وناعم.', 'Savoureux et doux, le Cœur d''Aloès est enrichi en concentré de jus de pêche. L''Aloe Vera aide à stimuler le métabolisme et contribue aux défenses naturelles de l''organisme.', NULL, '["91,17% de pulpe d''Aloe Vera stabilisée","0,1% de concentré de jus de pêche"]'::jsonb, NULL, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', NULL, '/products/page-09.jpg', '1 litre', false, false, NULL, 6),
  ('p08', 'forever-bee-honey', 'Forever Bee Honey', 'عسل النحل فوريفر', 'Produits de la Ruche', 22, 4.8, 156, '« L''or de la ruche », produit par les abeilles à partir du nectar des fleurs.', '«ذهب الخلية»، ينتجه النحل من رحيق الأزهار.', 'Le miel aussi appelé « or de la ruche » est produit par les abeilles à partir du nectar des fleurs. Avec sa texture fluide, le Forever Bee Honey s''ajoute facilement à l''alimentation. Son flacon est facile à utiliser pour doser.', NULL, '["100% miel naturel"]'::jsonb, NULL, 'Pour une consommation personnelle. Enfants : à consommer à partir de 12 mois.', NULL, '/products/page-10.jpg', '500 g', false, false, NULL, 7),
  ('p09', 'forever-propolis', 'Forever Propolis', 'بروبوليس فوريفر', 'Produits de la Ruche', 24, 4.6, 73, 'Résine collectée par les abeilles, aux propriétés antimicrobiennes.', 'راتينج يجمعه النحل، بخصائص مضادة للميكروبات.', 'La propolis est une résine collectée et métabolisée par les abeilles mellifères à partir des arbres. Cette substance aux propriétés antimicrobiennes est utilisée pour protéger la ruche de la prolifération de champignons et de bactéries.', NULL, '["69,6% de poudre de propolis","7% de miel","Contient soja et amande"]'::jsonb, NULL, 'Prendre 2 comprimés par jour.', NULL, '/products/page-11.jpg', '60 comprimés', false, false, NULL, 8),
  ('p10', 'forever-bee-pollen', 'Forever Bee Pollen', 'حبوب لقاح النحل فوريفر', 'Produits de la Ruche', 22, 4.7, 91, 'Collecté sur les fleurs, améliore la vitalité lors des changements de saison.', 'يُجمع من الأزهار، يحسّن الحيوية عند تغير الفصول.', 'Collecté sur les fleurs par les abeilles, le Pollen Forever améliore la vitalité et la résistance de l''organisme lors des changements de saison.', NULL, '["86% pollen (500 mg par comprimé)","12% miel"]'::jsonb, NULL, '3 comprimés par jour pendant les repas.', NULL, '/products/page-11.jpg', '100 comprimés', false, false, NULL, 9),
  ('p11', 'forever-royal-jelly', 'Forever Royal Jelly', 'الغذاء الملكي فوريفر', 'Produits de la Ruche', 28, 4.8, 110, 'Idéale pour se prémunir contre les conséquences de la période hivernale.', 'مثالي للوقاية من تداعيات فصل الشتاء.', 'La Gelée Royale est idéale pour se prémunir contre les conséquences de la période hivernale. Forever Royal Jelly renforce en douceur les défenses naturelles de l''organisme.', NULL, '["75,8 mg de gelée royale lyophilisée (équivalent à 250 mg de gelée royale fraîche par comprimé)"]'::jsonb, NULL, 'Prendre 1 à 2 comprimés à croquer par jour.', NULL, '/products/page-11.jpg', '60 comprimés', false, false, NULL, 10),
  ('p12', 'forever-active-pro-b', 'Forever Active Pro-B', 'أكتيف برو-بي فوريفر', 'Nutrition', 32, 4.8, 245, 'Probiotiques et prébiotiques pour un coup de pouce à la flore intestinale.', 'بروبيوتيك وبريبايوتيك لدعم فلورا الأمعاء.', 'La flore intestinale est composée de plusieurs milliards de bactéries qui participent au bon fonctionnement de l''organisme. Forever Active Pro-B associe de façon synergique des probiotiques et des prébiotiques.', 'تتكون فلورا الأمعاء من مليارات البكتيريا التي تساهم في حسن سير عمل الجسم. يجمع Forever Active Pro-B بشكل تآزري بين البروبيوتيك والبريبايوتيك.', '["Probiotiques","Prébiotiques"]'::jsonb, '["بروبيوتيك","بريبايوتيك"]'::jsonb, 'Prendre 1 gélule par jour avec un verre d''eau, 30 minutes avant le repas.', 'تناول كبسولة واحدة يومياً مع كوب ماء، قبل 30 دقيقة من الوجبة.', '/products/page-12.jpg', '30 capsules', true, false, NULL, 11),
  ('p13', 'forever-kids', 'Forever Kids', 'فوريفر كيدز', 'Nutrition', 26, 4.7, 102, '12 vitamines et 2 minéraux pour le développement de l''enfant.', '12 فيتاميناً ومعدنين لنمو الطفل.', 'Forever Kids contient 12 vitamines (A, B, C, D, E) et 2 minéraux (fer, zinc). Cette association contribue au fonctionnement normal du système immunitaire, réduit la fatigue et favorise le développement cognitif.', NULL, '["12 vitamines","Fer","Zinc"]'::jsonb, NULL, 'Enfants à partir de 4 ans et jeunes adultes : 4 comprimés à croquer par jour.', NULL, '/products/page-13.jpg', '48 comprimés', false, false, NULL, 12),
  ('p14', 'fields-of-greens', 'Fields of Greens', 'فيلدز أوف جرينز', 'Nutrition', 30, 4.5, 68, 'Jeunes pousses végétales : orge, blé, luzerne et piments de Cayenne.', 'براعم نباتية فتية: الشعير، القمح، الجلبان وفلفل الكايين.', 'Fields of Greens est obtenu à partir de jeunes pousses végétales : feuilles d''orge, de blé, de luzerne et de piments de Cayenne.', NULL, '["19% poudre de feuilles d''orge","19% poudre de pousse de blé","19% poudre de feuilles de luzerne","0,2% poudre de piments de Cayenne"]'::jsonb, NULL, 'Prendre 2 comprimés par jour.', NULL, '/products/page-13.jpg', '68 comprimés', false, false, NULL, 13),
  ('p15', 'forever-absorbent-c', 'Forever Absorbent-C', 'أبسوربنت-سي فوريفر', 'Nutrition', 24, 4.7, 178, 'Vitamine C pour réduire la fatigue et renforcer la résistance de l''organisme.', 'فيتامين سي لتقليل التعب وتقوية مقاومة الجسم.', 'La vitamine C contribue à réduire la fatigue et permet de retrouver tonus et énergie. Elle est indispensable pour renforcer la résistance de l''organisme.', NULL, '["42% de fibres naturelles d''avoine","5,2% d''acide ascorbique (vitamine C)","9,5% de miel"]'::jsonb, NULL, '1 comprimé à croquer par jour, le matin.', NULL, '/products/page-13.png', '100 comprimés', false, false, NULL, 14),
  ('p16', 'forever-ivision', 'Forever iVision', 'آي فيجن فوريفر', 'Nutrition', 34, 4.6, 59, 'Vitamines A, C, E et zinc pour protéger les yeux face aux écrans.', 'فيتامينات A وC وE والزنك لحماية العينين من الشاشات.', 'Adaptez vos yeux à un style de vie connecté ! Forever iVision est le complément alimentaire pour notre vision avec un apport complet de vitamines A, C, E et de zinc.', NULL, '["Vitamines A, C, E","Zinc","Lutemax 2020","Contient soja et poisson"]'::jsonb, NULL, 'Prendre 2 capsules par jour avec un demi-verre d''eau. Déconseillé aux fumeurs (bêta-carotène).', NULL, '/products/page-14.jpg', '60 comprimés', false, false, NULL, 15),
  ('p17', 'forever-supergreens', 'Forever Supergreens', 'سوبر جرينز فوريفر', 'Nutrition', 36, 4.6, 77, 'Plus de 20 variétés de fruits et légumes, Aloe vera, vitamine C et magnésium.', 'أكثر من 20 نوعاً من الفواكه والخضار، ألوفيرا، فيتامين سي والمغنيسيوم.', 'Forever Supergreens contient plus de 20 variétés de fruits et légumes, de l''Aloe vera, de la vitamine C et du magnésium. Ce mélange favorise le maintien des défenses naturelles et la récupération musculaire.', NULL, '["Pomme","Betterave","Tomate","Citrouille","Carotte","Épinards","Brocolis","Aloe vera","Chou Kale","Thé vert","Baies de Goji"]'::jsonb, NULL, 'Verser un stick dans votre boisson à l''Aloe Vera préférée ou dans de l''eau, mélanger et boire.', NULL, '/products/page-14.jpg', '30 sachets', false, false, NULL, 16),
  ('p18', 'forever-immublend', 'Forever ImmuBlend', 'إيميوبلند فوريفر', 'Nutrition', 33, 4.7, 94, 'Vitamines, minéraux et champignons traditionnels pour stimuler l''immunité.', 'فيتامينات ومعادن وفطريات تقليدية لتحفيز المناعة.', 'Forever ImmuBlend, association de vitamines, minéraux et de champignons traditionnellement utilisés en Asie, contribue à stimuler les défenses immunitaires pour optimiser son capital santé.', NULL, '["Mélange de champignons","Vitamines C, D3","Zinc"]'::jsonb, NULL, 'Prendre 1 comprimé par jour.', NULL, '/products/page-15.jpg', '60 capsules', false, false, NULL, 17),
  ('p19', 'forever-daily', 'Forever Daily', 'فوريفر ديلي', 'Nutrition', 40, 4.8, 134, 'Formule exclusive de 55 ingrédients pour un bien-être optimal au quotidien.', 'تركيبة حصرية من 55 مكوناً لعافية مثالية يومياً.', 'Formule exclusive de 55 ingrédients qui associe les nutriments du Complexe AOS (Aloe OligoSaccharides) à des vitamines, minéraux et phytonutriments d''extraits de fruits et légumes.', NULL, '["Complexe AOS","12 vitamines (A, B1, B2, B3, B5, B6, B8, B9, B12, C, D, E)","8 minéraux essentiels","Forever FVX20 (20 extraits de fruits et légumes)"]'::jsonb, NULL, 'Prendre 2 comprimés tous les matins.', NULL, '/products/page-16.jpg', '60 comprimés', false, false, NULL, 18),
  ('p20', 'forever-ail-thym', 'Forever Ail et Thym', 'الثوم والزعتر فوريفر', 'Nutrition', 22, 4.5, 52, 'Combinaison unique de 2 extraits de plantes pour le confort digestif.', 'مزيج فريد من مستخلصين نباتيين للراحة الهضمية.', 'Forever Ail et Thym est une combinaison unique de 2 extraits de plantes connues pour améliorer le confort digestif. Capsule sans odeur équivalent à 1000 mg d''ail frais.', NULL, '["3% d''extrait de bulbe d''ail","15,4% poudre de thym (feuilles)","Contient du soja"]'::jsonb, NULL, 'Prendre 1 capsule 3 fois par jour, de préférence pendant les repas.', NULL, '/products/page-16.jpg', '100 comprimés', false, false, NULL, 19),
  ('p21', 'forever-fiber', 'Forever Fiber', 'فايبر فوريفر', 'Nutrition', 28, 4.6, 65, '5g de fibres hydrosolubles pour stimuler les fonctions intestinales.', '5 غ من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء.', 'Forever Fiber apporte 5g de fibres hydrosolubles pour stimuler les fonctions intestinales et retrouver un bon confort digestif.', NULL, '["5 g de fibres solubles"]'::jsonb, NULL, 'Prendre 1 sachet tous les matins, à diluer dans de l''eau ou avec de la pulpe stabilisée.', NULL, '/products/page-17.jpg', '30 sachets de 6,1 g', false, false, NULL, 20),
  ('p22', 'infusion-fleur-aloes', 'Infusion Fleur d''Aloès', 'منقوع زهرة الألوة', 'Nutrition', 18, 4.6, 48, 'Écorce d''orange, zeste de citron, cannelle et clou de girofle.', 'قشر البرتقال، قشر الليمون، القرفة والقرنفل.', 'Cette infusion à l''arôme subtil et délicat associe les goûts acidulés de l''écorce d''orange et de zeste de citron, les saveurs épicées de la cannelle et du clou de girofle. Apporte un bien-être digestif.', NULL, '["Cannelle","Zestes d''orange","Clous de girofle","Feuilles de mûrier","Poivre de Jamaïque","Fleur d''aloès","Camomille"]'::jsonb, NULL, 'Laisser infuser 1 sachet dans environ 1 litre d''eau.', NULL, '/products/page-17.jpg', '25 sachets', false, false, NULL, 21),
  ('p23', 'vitolize-femmes', 'Vitolize Femmes', 'فيتولايز للنساء', 'Nutrition', 36, 4.6, 71, 'Plantes, vitamines et minéraux conçus spécialement pour les femmes.', 'نباتات وفيتامينات ومعادن مصممة خصيصاً للنساء.', 'Ce mélange naturel de plantes, vitamines et minéraux a été spécialement conçu pour les femmes. La vitamine B6 aide à réguler l''équilibre hormonal et la passiflore aide à diminuer le stress.', NULL, '["Poudre de pomme","Baies de Schisandra","Poudre de fruits de canneberge","Magnésium","Vitamines C, D, B12"]'::jsonb, NULL, '4 capsules par jour.', NULL, '/products/page-18.jpg', '60 capsules', false, false, NULL, 22),
  ('p24', 'vitolize-hommes', 'Vitolize Hommes', 'فيتولايز للرجال', 'Nutrition', 38, 4.6, 64, 'Vitamines, minéraux et phytostérols pour le bon fonctionnement de la prostate.', 'فيتامينات ومعادن وفيتوستيرول لدعم البروستاتا.', 'Vitolize Hommes contient des vitamines et des minéraux, ainsi que des phytostérols pour conserver un bon fonctionnement de la prostate. Le zinc contribue au maintien normal de la fertilité.', NULL, '["Huile de pépins de citrouille","Vitamines B6, C, D, E","Zinc","Sélénium","Contient soja et poisson"]'::jsonb, NULL, '2 capsules par jour.', NULL, '/products/page-18.jpg', '120 capsules', false, false, NULL, 23),
  ('p25', 'forever-move', 'Forever Move', 'فوريفر موف', 'Nutrition', 42, 4.7, 88, 'Membrane de coquille d''œuf NEM® et curcuma BioCurc® pour le confort articulaire.', 'غشاء قشر البيض NEM® وكركم BioCurc® لراحة المفاصل.', 'Forever Move est l''association de deux ingrédients brevetés, la membrane de coquille d''œuf NEM® et le curcuma BioCurc®. Ils agissent en synergie pour favoriser un confort articulaire optimal.', NULL, '["Membrane de coquille d''œuf NEM®","Extrait de rhizome de curcuma BioCurc®"]'::jsonb, NULL, 'Prendre 3 capsules par jour.', NULL, '/products/page-19.jpg', '90 capsules', false, false, NULL, 24),
  ('p26', 'forever-calcium', 'Forever Calcium', 'كالسيوم فوريفر', 'Nutrition', 26, 4.6, 57, 'Calcium, magnésium et vitamines pour une ossature normale.', 'كالسيوم ومغنيسيوم وفيتامينات لعظام طبيعية.', 'Forever Calcium contient des vitamines C et D ainsi que des minéraux (calcium, magnésium, manganèse, zinc, cuivre) pour contribuer au maintien d''une ossature et d''une fonction musculaire normales.', NULL, '["Calcium","Magnésium","Vitamine C","Zinc","Manganèse","Cuivre","Vitamine D"]'::jsonb, NULL, '4 comprimés par jour.', NULL, '/products/page-20.jpg', '376 comprimés', false, false, NULL, 25),
  ('p27', 'forever-arctic-sea', 'Forever Arctic-Sea', 'آركتيك-سي فوريفر', 'Nutrition', 40, 4.8, 142, 'Oméga-3 (EPA et DHA) pour le fonctionnement normal du cerveau et du cœur.', 'أوميغا-3 (EPA وDHA) لوظيفة طبيعية للدماغ والقلب.', 'Forever Arctic-Sea contient des acides gras insaturés, des oméga-3, dont de l''EPA et du DHA présents dans les huiles de poissons et de calamar. Ils contribuent au fonctionnement normal du cerveau et du cœur.', 'يحتوي Forever Arctic-Sea على أحماض دهنية غير مشبعة، أوميغا-3، بما في ذلك EPA وDHA الموجودة في زيوت الأسماك والحبار. تساهم في الوظيفة الطبيعية للدماغ والقلب.', '["45,9% huile de poissons","16,6% huile de calamar","11,3% huile d''olive extravierge","Contient du poisson"]'::jsonb, '["45.9% زيت السمك","16.6% زيت الحبار","11.3% زيت زيتون بكر ممتاز","يحتوي على السمك"]'::jsonb, 'Prendre 2 capsules 3 fois par jour, soit 6 capsules par jour.', 'تناول كبسولتين 3 مرات يومياً، أي 6 كبسولات في اليوم.', '/products/page-20.jpg', '90 capsules', true, false, NULL, 26),
  ('p28', 'aloe-msm-gel', 'Aloe MSM Gel', 'جل الألوفيرا إم إس إم', 'Nutrition', 25, 4.7, 99, 'Soufre organique pour favoriser le maintien du tissu conjonctif.', 'كبريت عضوي لدعم النسيج الضام.', 'Le methyl sulfonyl méthane (MSM) est une source stable et naturelle de soufre organique, présent en concentration élevée dans les articulations, favorisant le maintien de l''intégrité du tissu conjonctif.', 'الميثيل سلفونيل ميثان (MSM) مصدر مستقر وطبيعي للكبريت العضوي، موجود بتركيز عالٍ في المفاصل، ويساهم في الحفاظ على سلامة النسيج الضام.', '["Gel d''aloès","15% de MSM"]'::jsonb, '["جل الألوة","15% MSM"]'::jsonb, 'Appliquer en massages généreux sur les zones nécessaires.', 'يُطبق بتدليك سخي على المناطق المطلوبة.', '/products/page-21.jpg', '118 ml', true, false, NULL, 27),
  ('p29', 'emulsion-thermogene', 'Émulsion Thermogène', 'مستحلب التدفئة', 'Nutrition', 27, 4.5, 46, 'Crème de massage au menthol pour soulager les articulations.', 'كريم تدليك بالمنثول لتخفيف آلام المفاصل.', 'Cette crème de massage est le complément idéal pour soulager les articulations ou préparer les muscles à l''effort grâce au menthol et aux huiles d''eucalyptus, de sésame, de jojoba et d''abricot.', NULL, '["35,9% menthol et huiles essentielles"]'::jsonb, NULL, 'Appliquer en massages. Ne pas appliquer sur le visage.', NULL, '/products/page-21.jpg', '118 ml', false, false, NULL, 28),
  ('p30', 'forever-argi-plus', 'Forever Argi+', 'أرجي+ فوريفر', 'Nutrition', 44, 4.7, 103, 'L-Arginine et cocktail de vitamines pour l''effort extrême.', 'أل-أرجينين ومزيج فيتامينات للمجهود الشديد.', 'Vitalité, force, endurance, sport extrême : Forever Argi+ combine la L-Arginine à un cocktail unique de vitamines et d''extraits de fruits pour un accompagnement idéal pendant l''effort.', NULL, '["51% de L-Arginine","Mélange d''extraits de fruits rouges","Vitamines C, B6, B9"]'::jsonb, NULL, 'Mélanger une dosette à 240 ml de boisson (eau, jus de fruits ou Pulpe d''Aloe Vera).', NULL, '/products/page-22.jpg', '30 sachets de 10 g', false, false, NULL, 29),
  ('p31', 'forever-lean', 'Forever Lean', 'فوريفر لين', 'Fitness & Minceur', 39, 4.6, 87, 'Fibres de cactus Opuntia pour aider à contrôler le poids.', 'ألياف الصبار أوبونتيا للمساعدة في التحكم بالوزن.', 'Les fibres extraites du cactus Opuntia ficus-indica ont la capacité d''attirer et retenir les graisses et les sucres. Les graines de haricots blancs et le chrome aident à réduire l''apport calorique journalier.', NULL, '["Feuilles de Neopuntia®","Extrait de graines de haricot sec","Chrome"]'::jsonb, NULL, 'Prendre 1 capsule avec un verre d''eau avant le repas. Jusqu''à 4 capsules par jour.', NULL, '/products/page-23.jpg', '63 capsules', false, false, NULL, 30),
  ('p32', 'forever-therm', 'Forever Therm', 'فوريفر ثيرم', 'Fitness & Minceur', 41, 4.6, 79, 'Thé vert, café vert et guarana pour contrôler le poids et l''énergie.', 'شاي أخضر، قهوة خضراء وجوارانا للتحكم بالوزن والطاقة.', 'Forever Therm est un brûleur de graisses qui contient des extraits de plantes (thé vert, café vert, guarana) associés à des vitamines du groupe B et de la vitamine C. Aide à contrôler le poids et réduire la fatigue.', NULL, '["Thé vert","Guarana","Café vert","8 vitamines (B1, B2, B3, B5, B6, B9, B12, C)"]'::jsonb, NULL, 'Prendre 2 comprimés le matin.', NULL, '/products/page-23.jpg', '60 comprimés', false, false, NULL, 31),
  ('p33', 'forever-lite-ultra-vanille', 'Forever Lite Ultra — Vanille', 'لايت ألترا فوريفر - فانيليا', 'Fitness & Minceur', 48, 4.8, 211, '24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.', '24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.', 'Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.', 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.', '["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E","Protéines","Contient soja et lait"]'::jsonb, '["فيتامينات B1، B2، B3، B5، B6، B8، B9، B12، D، E","بروتينات","يحتوي على الصويا والحليب"]'::jsonb, 'Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.', 'في الخلاط: ملعقة قياس واحدة، 240 مل من السائل، فواكه حسب الاختيار ومكعبات ثلج. اخلط لمدة 20 إلى 30 ثانية.', '/products/page-25.jpg', '470 g', true, false, NULL, 32),
  ('p34', 'forever-lite-ultra-chocolat', 'Forever Lite Ultra — Chocolat', 'لايت ألترا فوريفر - شوكولاتة', 'Fitness & Minceur', 48, 4.7, 174, '24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.', '24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.', 'Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.', NULL, '["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E","Protéines","Contient soja et lait"]'::jsonb, NULL, 'Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.', NULL, '/products/page-25.jpg', '471 g', false, false, NULL, 33),
  ('p35', 'pack-detox-pulpe', 'Pack Detox — Pulpe d''Aloès', 'حزمة ديتوكس - لب الألوة', 'Packs', 95, 4.8, 63, 'Détoxifier le corps, sensation de légèreté et énergie retrouvée.', 'تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.', 'Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.', 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلص من السموم، شعور بالخفة وطاقة متجددة.', '[]'::jsonb, NULL, 'Suivre le livret de programme inclus pendant la durée du programme Detox.', 'اتبع كتيب البرنامج المرفق طوال مدة برنامج ديتوكس.', '/products/page-26.jpg', '1 programme', true, false, '["1x Forever Ultra Lite (Vanille ou Chocolat)","2x Pulpes d''Aloès Stabilisée","1x Forever Fields of Greens","1x Forever Active Pro-B","1x Livret de suivi du programme"]'::jsonb, 34),
  ('p36', 'pack-detox-berry', 'Pack Detox — Aloe Berry Nectar', 'حزمة ديتوكس - ألوفيرا بيري نكتار', 'Packs', 95, 4.7, 51, 'Détoxifier le corps, sensation de légèreté et énergie retrouvée.', 'تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.', 'Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.', NULL, '[]'::jsonb, NULL, 'Suivre le livret de programme inclus pendant la durée du programme Detox.', NULL, '/products/page-26.jpg', '1 programme', false, false, '["1x Forever Ultra Lite (Vanille ou Chocolat)","2x Aloe Berry Nectar","1x Forever Fields of Greens","1x Forever Active Pro-B","1x Livret de suivi du programme"]'::jsonb, 35),
  ('p37', 'smart-consumer-pack', 'Smart Consumer Pack', 'حزمة المستهلك الذكية', 'Packs', 49, 4.6, 38, '4 produits essentiels à utiliser tous les jours.', '4 منتجات أساسية للاستخدام اليومي.', 'Découvrez nos produits grâce à ce nouveau pack : 4 produits parmi nos essentiels pour avoir le meilleur de Forever à portée de main.', NULL, '[]'::jsonb, NULL, 'À utiliser dans le cadre de votre routine quotidienne.', NULL, '/products/page-27.jpg', '4 produits', false, false, '["Forever Aloe Lips with Jojoba","Forever Bright Aloe Body Lotion","Forever Aloe Pêche 330 ml","Totebag siglé Forever Living Products"]'::jsonb, 36),
  ('p38', 'pack-hygiene', 'Pack Hygiène', 'حزمة العناية اليومية', 'Packs', 89, 4.7, 44, 'Produits d''hygiène et cosmétiques pour toute la famille.', 'منتجات عناية ونظافة لكل العائلة.', 'Le pack Hygiène réunit les indispensables Forever pour le soin du corps et du visage au quotidien.', NULL, '[]'::jsonb, NULL, 'À intégrer dans votre routine quotidienne.', NULL, '/products/page-28.jpg', '5 produits', false, false, '["1x Aloe First","1x Aloe Liquid Soap","2x Stick Déodorant Aloès","1x Avocado Face & Body Soap","1x Shampoing Aloe-Jojoba","1x Après-shampoing Aloe-Jojoba"]'::jsonb, 37),
  ('p39', 'programme-bien-etre', 'Programme Bien-être', 'برنامج العافية', 'Packs', 119, 4.8, 57, 'Un bien-être au quotidien, de l''intérieur comme de l''extérieur.', 'عافية يومية، من الداخل والخارج.', 'Le pack Bien-être associe nutrition et soin du corps pour un programme complet de bien-être quotidien.', NULL, '[]'::jsonb, NULL, 'À suivre quotidiennement, en complément d''une alimentation équilibrée.', NULL, '/products/page-28.jpg', '6 produits', false, false, '["1x Pulpe d''Aloès Stabilisée","1x Aloe Berry Nectar","1x Forever Active Pro-B","1x Forever Absorbent-C","1x Forever Fields of Greens","2x Forever Bright Aloès"]'::jsonb, 38),
  ('p40', 'pack-go2fbo', 'Pack de Démarrage — GO2FBO', 'حزمة الانطلاق - GO2FBO', 'Packs', 175, 4.8, 29, 'Le pack de démarrage complet pour découvrir l''univers Forever.', 'حزمة الانطلاق الكاملة لاكتشاف عالم فوريفر.', 'Le programme GO2FBO réunit une large sélection de produits phares pour découvrir l''ensemble des gammes Forever.', NULL, '[]'::jsonb, NULL, 'Idéal pour démarrer votre activité de distributeur ou découvrir la marque.', NULL, '/products/page-29.jpg', 'Pack complet', false, true, '["2x Mini Aloe Vera Gel","Aloe-Jojoba Shampoo & Conditioner","Aloe Heat Lotion","Forever Arctic Sea","Aloe Avocado Soap","Aloe Sunscreen","Forever Absorbent-C","Forever Ail & Thym","Forever Bee Pollen","Forever Daily","Forever Kids"]'::jsonb, 39),
  ('p41', 'start-your-journey-pack', 'Start Your Journey Pack', 'حزمة بداية الرحلة', 'Packs', 149, 4.7, 33, 'Quatre produits essentiels pour démarrer votre routine Forever.', 'أربعة منتجات أساسية لبدء روتينك مع فوريفر.', 'Un pack pensé pour accompagner vos premiers pas avec les produits Forever au quotidien.', NULL, '[]'::jsonb, NULL, 'À utiliser quotidiennement pour intégrer les essentiels Forever à votre routine.', NULL, '/products/page-29.jpg', 'Pack complet', false, true, '["4x Forever Aloe Lips with Jojoba","2x Forever Bright Toothgel","1x Aloe Propolis Crème","1x Aloe Vera Gelly","2x Aloe Ever-Shield Deodorant","1x Aloe Moisturizing Lotion","1x Aloe Body Wash","1x Aloe Body Lotion"]'::jsonb, 40),
  ('p42', 'aloe-first', 'Aloe First', 'ألوي فيرست', 'Beauté', 27, 4.8, 198, 'La brume quotidienne pour hydrater, rafraîchir et tonifier l''épiderme.', 'الرذاذ اليومي للترطيب والانتعاش وتنشيط البشرة.', 'Aloe First est la brume à utiliser quotidiennement pour hydrater, rafraîchir et tonifier l''épiderme du visage et du corps grâce à sa formule enrichie de 11 extraits de plantes, d''Aloe Vera, de propolis et d''allantoïne. Son pH neutre s''adapte aux peaux les plus sensibles.', 'Aloe First هو الرذاذ الذي يُستخدم يومياً لترطيب وإنعاش وتنشيط بشرة الوجه والجسم بفضل تركيبته الغنية بـ11 مستخلصاً نباتياً والألوفيرا والبروبوليس والألانتوين. درجة حموضته المتعادلة تناسب حتى أكثر البشرات حساسية.', '["80,3% de gel d''aloès","11 extraits de plantes","Propolis","Allantoïne"]'::jsonb, '["80.3% جل ألوة","11 مستخلصاً نباتياً","بروبوليس","ألانتوين"]'::jsonb, 'Avant l''application de soins cosmétiques et à tout moment de la journée pour hydrater la peau.', 'قبل تطبيق العناية التجميلية وفي أي وقت من اليوم لترطيب البشرة.', '/products/page-31.jpg', '118 ml', true, false, NULL, 41),
  ('p43', 'aloe-propolis-creme', 'Aloe Propolis Crème', 'كريم البروبوليس بالألوة', 'Beauté', 24, 4.8, 167, 'Un véritable soin anti-bactérien et réparateur pour les irritations cutanées.', 'عناية حقيقية مضادة للبكتيريا ومُصلحة لتهيجات البشرة.', 'L''aloès associé à la propolis font de cette crème à la texture riche un véritable soin anti-bactérien et réparateur. La camomille, l''allantoïne et les vitamines A et E apportent à la peau douceur et souplesse.', 'الألوة المرتبطة بالبروبوليس تجعل من هذا الكريم ذي القوام الغني عناية حقيقية مضادة للبكتيريا ومُصلحة. البابونج والألانتوين وفيتامينات A وE تمنح البشرة نعومة ومرونة.', '["74,1% de gel d''aloès","0,5% propolis","Camomille","Allantoïne","Vitamines A et E"]'::jsonb, '["74.1% جل ألوة","0.5% بروبوليس","بابونج","ألانتوين","فيتامينات A وE"]'::jsonb, 'Appliquer sur une peau parfaitement nettoyée.', 'يُطبق على بشرة نظيفة تماماً.', '/products/page-31.jpg', '113 g', true, false, NULL, 42),
  ('p44', 'gelee-aloes', 'Gelée Aloès', 'جل الألوة', 'Beauté', 19, 4.7, 112, 'Gel transparent non gras, idéal contre irritations et coups de soleil.', 'جل شفاف غير دهني، مثالي للتهيجات وحروق الشمس.', 'Particulièrement riche en Aloe Vera, ce gel transparent non gras possède toutes les vertus de la plante. Il hydrate et régénère l''épiderme. Idéal contre les irritations de la peau et les coups de soleil.', NULL, '["84,4% de gel d''aloès"]'::jsonb, NULL, 'Appliquer généreusement sur une peau parfaitement nettoyée.', NULL, '/products/page-31.jpg', '473 ml', false, false, NULL, 43),
  ('p45', 'aloe-body-lotion', 'Aloe Body Lotion', 'لوشن الجسم بالألوة', 'Beauté', 23, 4.8, 156, 'Apaise, hydrate et protège la peau du dessèchement.', 'يهدئ ويرطب ويحمي البشرة من الجفاف.', 'L''Aloe Body Lotion apaise, hydrate et protège la peau du dessèchement. Grâce à sa concentration en gel d''Aloe Vera, huile d''argan, vitamine E et huile de macadamia, elle pénètre rapidement et laisse la peau souple. Sans silicone.', NULL, '["Gel Aloe Vera","Huile d''argan","Vitamine E","Huile de graines de macadamia"]'::jsonb, NULL, 'Appliquer généreusement et masser doucement jusqu''à absorption complète.', NULL, '/products/page-32.jpg', '236 ml', false, false, NULL, 44),
  ('p46', 'aloe-liquid-soap', 'Aloe Liquid Soap', 'صابون الألوة السائل', 'Beauté', 18, 4.7, 121, 'Savon doux pour le visage, le corps et les cheveux, dès 3 ans.', 'صابون لطيف للوجه والجسم والشعر، من سن 3 سنوات.', 'L''Aloe Liquid Soap est un savon pour le visage, le corps et les cheveux à destination de toute la famille. Sa formule très douce nettoie délicatement, respecte la peau et les cheveux, hydrate et préserve du dessèchement.', NULL, '["39% de Gel d''Aloe vera","Agents lavants de noix de coco","Extrait de concombre et jojoba","Huile d''Argan","Glycérine végétale"]'::jsonb, NULL, 'Émulsionner sur peau ou cheveux mouillés, rincer abondamment.', NULL, '/products/page-33.jpg', '473 ml', false, true, NULL, 45),
  ('p47', 'forever-bright-toothgel', 'Forever Bright Toothgel', 'معجون الأسنان برايت فوريفر', 'Beauté', 14, 4.7, 143, 'Gel dentaire sans fluor qui ravive l''émail des dents.', 'جل أسنان بدون فلورايد يُجدد مينا الأسنان.', 'Ce gel dentaire, sans fluor et non abrasif, ravive l''émail de vos dents. Son complexe à la chlorophylle, sans menthol, procure une sensation de fraîcheur naturelle grâce à la propolis et à l''aloès.', 'جل الأسنان هذا، الخالي من الفلورايد وغير الكاشط، يُجدد مينا أسنانك. مركبه من الكلوروفيل، بدون منثول، يمنح إحساساً طبيعياً بالانتعاش بفضل البروبوليس والألوة.', '["35,5% de gel d''aloès","Chlorophylle","Propolis"]'::jsonb, '["35.5% جل ألوة","كلوروفيل","بروبوليس"]'::jsonb, 'Se brosser les dents après chaque repas.', 'تنظيف الأسنان بالفرشاة بعد كل وجبة.', '/products/page-34.jpg', '130 g', true, false, NULL, 46),
  ('p48', 'stick-deodorant-aloes', 'Aloe Ever-Shield — Stick Déodorant', 'مزيل العرق إيفر-شيلد بالألوة', 'Beauté', 13, 4.7, 132, 'Sans alcool, sans sels d''aluminium, protection efficace sans tacher.', 'بدون كحول أو أملاح الألومنيوم، حماية فعالة بدون بقع.', 'Sans alcool, sans sels d''aluminium et discrètement parfumé, ce déodorant assure une protection efficace sans tacher vos vêtements. Sa formule à l''aloès adoucit et hydrate la peau.', 'بدون كحول أو أملاح الألومنيوم ومعطر بلطف، يوفر هذا المزيل حماية فعالة بدون ترك بقع على ملابسك. تركيبته بالألوة تلين وترطب البشرة.', '["Gel d''aloès"]'::jsonb, '["جل الألوة"]'::jsonb, 'Appliquer le matin ou avant l''effort sur une peau propre et sèche.', 'يُطبق في الصباح أو قبل المجهود على بشرة نظيفة وجافة.', '/products/page-34.jpg', '67 g', true, false, NULL, 47),
  ('p49', 'instant-hand-cleanser', 'Instant Hand Cleanser', 'منظف اليدين الفوري', 'Beauté', 9, 4.5, 88, 'Nettoie les mains en toute sécurité où que vous soyez.', 'ينظف اليدين بأمان أينما كنت.', 'Une formule gel pour nettoyer vos mains en toute sécurité où que vous soyez. Enrichie en Aloe Vera, sa formule parfume délicatement les mains sans les dessécher.', NULL, '["Alcool","Aloe Vera"]'::jsonb, NULL, 'Verser une noisette de gel et frotter les mains jusqu''à ce qu''elles soient sèches.', NULL, '/products/page-34.jpg', '28 g', false, false, NULL, 48),
  ('p50', 'aloe-lips', 'Aloe Lèvres (Aloe Lips)', 'بلسم الشفاه بالألوة', 'Beauté', 8, 4.9, 287, 'Baume ultra-hydratant à l''Aloe Vera, huile de jojoba et cire d''abeille.', 'بلسم مرطب جداً بالألوفيرا وزيت الجوجوبا وشمع العسل.', 'Une formule ultra-hydratante et protectrice pour ce baume à lèvres qui associe Aloe Vera, huile de jojoba et cire d''abeille. Apporte un confort réparateur pour les lèvres les plus desséchées.', 'تركيبة مرطبة وواقية للغاية لهذا البلسم الذي يجمع بين الألوفيرا وزيت الجوجوبا وشمع العسل. يوفر راحة مُصلحة للشفاه الأكثر جفافاً.', '["27,5% de gel d''aloès","20,4% d''huile de jojoba","Cire d''abeille"]'::jsonb, '["27.5% جل ألوة","20.4% زيت جوجوبا","شمع العسل"]'::jsonb, 'Appliquer sur les lèvres dès que le besoin se fait sentir.', 'يُطبق على الشفاه عند الحاجة.', '/products/page-35.jpg', '4,5 g', true, false, NULL, 49),
  ('p51', 'savon-avocat', 'Forever Avocado Face & Body Soap', 'صابون الأفوكادو للوجه والجسم', 'Beauté', 12, 4.7, 119, 'Beurre d''avocat, nettoie toutes les peaux même les plus sensibles.', 'زبدة الأفوكادو، تنظف حتى أكثر البشرات حساسية.', 'Enrichi en beurre d''avocat, le Savon à l''Avocat nettoie toutes les peaux même les plus sensibles en les hydratant. Son léger parfum de fleurs de citronnier apporte un véritable plaisir.', 'مُخصب بزبدة الأفوكادو، صابون الأفوكادو ينظف جميع أنواع البشرة حتى الأكثر حساسية مع ترطيبها. عطره الخفيف من زهور الليمون يمنح متعة حقيقية.', '["Beurre d''avocat"]'::jsonb, '["زبدة الأفوكادو"]'::jsonb, 'Émulsionner chaque jour sur peau mouillée.', 'يُستحلب يومياً على بشرة مبللة.', '/products/page-35.jpg', '284 g', true, false, NULL, 50),
  ('p52', 'ecran-solaire-aloes', 'Aloe Sunscreen SPF 30', 'واقي الشمس بالألوة SPF 30', 'Beauté', 26, 4.6, 95, 'Protection SPF 30 avancée contre les UVA et UVB, sans effet blanc.', 'حماية SPF 30 متقدمة من الأشعة UVA وUVB، بدون أثر أبيض.', 'Aloe Sunscreen combine le pouvoir apaisant de l''aloès avec de l''oxyde de zinc naturel pour une protection SPF 30 avancée contre les rayons UVA et UVB. Adaptée à tous les types de peau.', 'يجمع Aloe Sunscreen بين القوة المهدئة للألوة وأكسيد الزنك الطبيعي لحماية SPF 30 متقدمة من أشعة UVA وUVB. مناسب لجميع أنواع البشرة.', '["Aloe vera","Vitamine E","Oxyde de zinc"]'::jsonb, '["ألوفيرا","فيتامين E","أكسيد الزنك"]'::jsonb, 'Appliquer uniformément avant toute exposition au soleil. Renouveler toutes les 2 heures.', 'يُطبق بانتظام وبسخاء قبل أي تعرض للشمس. يُجدد كل ساعتين.', '/products/page-36.jpg', '177 ml', true, false, NULL, 51),
  ('p53', 'gentlemans-pride', 'Gentleman''s Pride', 'جنتلمانز برايد', 'Beauté', 21, 4.6, 73, 'Crème fluide et apaisante pour calmer le feu du rasoir.', 'كريم سائل مهدئ لتهدئة تهيج الحلاقة.', 'Gentleman''s Pride est une crème fluide et légère, aux propriétés apaisantes pour calmer le feu du rasoir et les irritations. Son parfum subtil apporte une note d''élégance discrète.', NULL, '["41,8% de gel d''aloès"]'::jsonb, NULL, 'Appliquer quotidiennement sur tout le visage après le rasage.', NULL, '/products/page-36.jpg', '118 ml', false, false, NULL, 52),
  ('p54', 'aloe-moisturizing-lotion', 'Aloe Moisturizing Lotion', 'لوشن الترطيب بالألوة', 'Beauté', 22, 4.6, 81, 'Protège, nourrit et réduit les signes du vieillissement cutané.', 'يحمي ويغذي ويقلل من علامات شيخوخة البشرة.', 'Ce soin protège, nourrit et réduit les signes du vieillissement cutané. Sa texture fondante, enrichie en collagène et en élastine, hydrate et repulpe. Convient aux peaux sensibles.', NULL, '["36,5% de gel d''aloès","Collagène","Élastine"]'::jsonb, NULL, 'Appliquer matin et soir après l''Aloe First.', NULL, '/products/page-36.jpg', '120 ml', false, false, NULL, 53),
  ('p55', 'r3-factor', 'R3 Factor', 'آر3 فاكتور', 'Beauté', 39, 4.7, 76, 'Répare, renouvelle, repulpe — exfoliation naturelle de la peau.', 'يُصلح، يجدد، يملأ - تقشير طبيعي للبشرة.', 'Répare, renouvelle, repulpe. Ce soin favorise l''exfoliation naturelle de la peau et diminue l''apparence des pores. Les rides et ridules sont lissées, le grain de peau est plus fin.', NULL, '["35,48% de gel d''aloès"]'::jsonb, NULL, 'Appliquer matin et soir sur peau nettoyée. Par temps ensoleillé, protéger la peau avec l''Écran Solaire Aloès.', NULL, '/products/page-37.jpg', '69 g', false, false, NULL, 54),
  ('p56', 'serum-alpha-e-factor', 'Sérum Alpha-E Factor', 'سيروم ألفا-إي فاكتور', 'Beauté', 44, 4.7, 68, 'Véritable bouclier anti-âge aux antioxydants puissants.', 'درع حقيقي مضاد للشيخوخة بمضادات أكسدة قوية.', 'Véritable bouclier anti-âge, ce sérum allie des antioxydants puissants pour réduire les signes du vieillissement et les agressions cutanées. La peau retrouve son éclat.', NULL, '["Vitamines A et E","Bisabolol","Huile de bourrache","Gel d''aloès"]'::jsonb, NULL, 'Appliquer seul ou avant votre soin.', NULL, '/products/page-37.jpg', '187 ml', false, false, NULL, 55),
  ('p57', 'aloe-body-wash', 'Aloe Body Wash', 'غسول الجسم بالألوة', 'Beauté', 20, 4.7, 104, 'Nettoie et revitalise la peau délicatement tout en respectant son équilibre.', 'ينظف وينشط البشرة بلطف مع الحفاظ على توازنها.', 'Grâce à sa formule très douce, l''Aloe Body Wash nettoie et revitalise la peau délicatement. Sa texture émulsion-gel fraîche laisse un parfum envoûtant et une peau propre, douce et bien hydratée.', NULL, '["Gel Aloe Vera","Vitamines A, C, E"]'::jsonb, NULL, 'Appliquer sur un luffa ou une éponge, savonner en mouvements circulaires, bien rincer.', NULL, '/products/page-38.jpg', '236 ml', false, false, NULL, 56),
  ('p58', 'shampoing-aloe-jojoba', 'Shampoing Aloe-Jojoba', 'شامبو الألوة والجوجوبا', 'Cheveux', 21, 4.7, 138, 'Nettoie en profondeur et hydrate tous les types de cheveux.', 'ينظف بعمق ويرطب جميع أنواع الشعر.', 'Conçu pour nettoyer en profondeur et hydrater tous les types de cheveux. En associant l''Aloe vera pur à l''huile de jojoba fortifiante et l''huile d''argan, ce shampoing est parfait pour un usage quotidien. Sans sulfates ajoutés.', NULL, '["39,7% de gel d''aloès","Huile de jojoba","Huile d''argan","Huile d''églantier"]'::jsonb, NULL, 'Appliquer une noix de produit, masser, rincer abondamment.', NULL, '/products/page-39.jpg', '296 ml', false, false, NULL, 57),
  ('p59', 'apres-shampoing-aloe-jojoba', 'Après-Shampoing Aloe-Jojoba', 'بلسم الألوة والجوجوبا', 'Cheveux', 21, 4.7, 109, 'Adoucit, démêle, nourrit les cheveux et leur donne de la brillance.', 'يلين وينعم ويغذي الشعر ويمنحه لمعاناً.', 'L''après-shampoing est un soin indispensable pour adoucir, démêler, nourrir les cheveux et leur donner de la brillance. Stimule également l''hydratation des cheveux et du cuir chevelu, sans sulfate.', NULL, '["40,7% de gel d''aloès","Huile de jojoba","Huile d''argan","Huile d''églantier"]'::jsonb, NULL, 'Appliquer sur l''ensemble de la chevelure en insistant sur les pointes, laisser agir puis rincer.', NULL, '/products/page-39.jpg', '296 ml', false, false, NULL, 58),
  ('p60', 'sonya-gel-nettoyant', 'Sonya — Gel Nettoyant', 'سونيا - جل التنظيف', 'Sonya', 24, 4.6, 62, 'Une toute nouvelle expérience du démaquillage, riche en Aloe vera et huile de Baobab.', 'تجربة جديدة كلياً لإزالة المكياج، غنية بالألوفيرا وزيت الباوباب.', 'Le gel Nettoyant Sonya offre une toute nouvelle expérience du démaquillage. Il fond sur la peau et forme une mousse onctueuse, laissant la peau douce et hydratée.', NULL, '["39,2% de gel d''aloès","Huile de Baobab"]'::jsonb, NULL, 'Utiliser matin et soir pour nettoyer le visage et le cou.', NULL, '/products/page-41.jpg', '177 ml', false, false, NULL, 59),
  ('p61', 'sonya-gel-eclat', 'Sonya — Gel Éclat', 'سونيا - جل الإشراقة', 'Sonya', 26, 4.6, 54, 'Retrouvez l''éclat naturel de votre teint.', 'استعيدي إشراقة بشرتك الطبيعية.', 'Retrouvez l''éclat naturel de votre teint grâce au gel Éclat Sonya. L''Aloe vera et des actifs végétaux hydratent la peau tandis qu''un peptide gomme les imperfections et uniformise le teint.', NULL, '["42,9% de gel d''aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou matin et soir.', NULL, '/products/page-41.jpg', '28,3 g', false, false, NULL, 60),
  ('p62', 'sonya-masque-gel', 'Sonya — Masque Gel', 'سونيا - قناع جل', 'Sonya', 28, 4.7, 58, 'À appliquer avant le coucher pour optimiser la récupération nocturne.', 'يُطبق قبل النوم لتحسين التجدد الليلي.', 'À appliquer juste avant le coucher, le masque gel Sonya se transforme en une texture délicieusement fraîche et vite absorbée, optimisant le processus de récupération nocturne de la peau.', NULL, '["43,2% de gel d''aloès"]'::jsonb, NULL, 'Appliquer au coucher et rincer au réveil, 2 à 3 fois par semaine.', NULL, '/products/page-41.jpg', '59 ml', false, false, NULL, 61),
  ('p63', 'sonya-gel-hydratant', 'Sonya — Gel Hydratant', 'سونيا - جل الترطيب', 'Sonya', 27, 4.7, 49, 'Fond sur la peau et unifie le teint, riche en Aloe vera.', 'يذوب على البشرة ويوحد لون البشرة، غني بالألوفيرا.', 'Le Gel Hydratant Sonya fond sur la peau, l''enveloppe d''un voile de douceur et unifie le teint. Il associe l''Aloe vera à de nombreux extraits végétaux pour optimiser l''hydratation.', NULL, '["37,9% de gel d''aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou matin et soir.', NULL, '/products/page-41.jpg', '60 ml', false, false, NULL, 62),
  ('p64', 'infinite-demaquillant-hydratant', 'Infinite — Démaquillant Hydratant', 'إنفينيت - مزيل مكياج مرطب', 'Infinite', 32, 4.6, 41, 'Nettoie et hydrate la peau en un seul geste.', 'ينظف ويرطب البشرة بخطوة واحدة.', 'Le Démaquillant Hydratant nettoie et hydrate la peau en un seul geste. L''actif nettoyant utilisé, extrait naturel de noix de coco, est hypoallergénique et non irritant.', NULL, '["35% de gel d''aloès","Extrait naturel de noix de coco"]'::jsonb, NULL, 'Utiliser le matin et le soir pour nettoyer le visage et le cou.', NULL, '/products/page-42.jpg', '177 ml', false, false, NULL, 63),
  ('p65', 'infinite-serum-raffermissant', 'Infinite — Sérum Raffermissant', 'إنفينيت - سيروم الشد', 'Infinite', 58, 4.8, 67, 'Un véritable élixir de jeunesse à la chaîne de 3 acides aminés.', 'إكسير شباب حقيقي بسلسلة من 3 أحماض أمينية.', 'Le Sérum Raffermissant est un véritable élixir de jeunesse. Il combat les signes visibles de l''âge en intensifiant la puissance de l''Aloe vera grâce à une chaîne spécifique de trois acides aminés.', 'السيروم المشدد هو إكسير شباب حقيقي. يحارب علامات التقدم في السن الظاهرة من خلال تكثيف قوة الألوفيرا بفضل سلسلة محددة من ثلاثة أحماض أمينية.', '["49% gel d''aloès"]'::jsonb, '["49% جل ألوة"]'::jsonb, 'Appliquer sur le visage et le cou préalablement nettoyés avec le Démaquillant Hydratant.', 'يُطبق على الوجه والرقبة بعد التنظيف بمزيل المكياج المرطب.', '/products/page-42.jpg', '48,2 ml', true, false, NULL, 64),
  ('p66', 'infinite-creme-reparatrice', 'Infinite — Crème Réparatrice', 'إنفينيت - كريم مُصلح', 'Infinite', 54, 4.7, 59, 'Texture légère et onctueuse, double action hydratante et réparatrice.', 'قوام خفيف وناعم، مزدوج الفعالية للترطيب والإصلاح.', 'La Crème Réparatrice, d''une texture légère et onctueuse, est riche en Aloe vera, extraits de plantes, huile de jojoba et vitamine B3. Le visage est visiblement repulpé, retrouvant jeunesse et élasticité.', NULL, '["38% gel d''aloès","Huile de jojoba","Vitamine B3"]'::jsonb, NULL, 'Utiliser le soir au coucher après application du Sérum Raffermissant.', NULL, '/products/page-42.jpg', '555 ml', false, false, NULL, 65),
  ('p67', 'infinite-complexe-raffermissant', 'Infinite — Complexe Raffermissant', 'إنفينيت - مركب الشد', 'Infinite', 49, 4.6, 38, 'Lutte de l''intérieur contre les signes apparents de l''âge.', 'يحارب من الداخل علامات التقدم في السن الظاهرة.', 'Le Complexe Raffermissant lutte de l''intérieur contre les signes apparents de l''âge. Il contient un extrait breveté de melon français, des phytocéramides ainsi que du collagène.', NULL, '["Collagène (poisson)","Vitamine C","Céramides (blé)","Extrait de melon"]'::jsonb, NULL, 'Prendre 2 comprimés par jour avec un grand verre d''eau.', NULL, '/products/page-42.jpg', '60 comprimés', false, false, NULL, 66),
  ('p68', 'infinite-lotion-tonifiante', 'Infinite — Lotion Tonifiante', 'إنفينيت - لوشن منعش', 'Infinite', 34, 4.6, 33, 'Apporte un véritable coup d''éclat à la peau.', 'يمنح البشرة إشراقة حقيقية.', 'Cette lotion tonifiante apporte un véritable coup d''éclat à la peau. Elle parfait le démaquillage et débarrasse la peau des dernières impuretés. Riche en Aloe Vera, extrait de concombre et de thé blanc.', NULL, '["46,3% de gel d''aloès","Extrait de concombre","Thé blanc"]'::jsonb, NULL, 'Appliquer généreusement à l''aide d''un disque de coton sur le visage et le cou.', NULL, '/products/page-44.jpg', '177 ml', false, false, NULL, 67),
  ('p69', 'infinite-creme-contour-yeux', 'Infinite — Crème Contour des Yeux', 'إنفينيت - كريم محيط العين', 'Infinite', 46, 4.7, 51, 'Le secret d''un regard sublimé, à l''extrait de collagène.', 'سر نظرة متألقة، بمستخلص الكولاجين.', 'La crème contour des yeux est le secret d''un regard sublimé. Elle allie l''Aloe vera à un extrait de collagène pour un regard visiblement rajeuni et à l''extrait d''arbre à soie pour effacer les signes de fatigue.', NULL, '["35,2% de gel d''aloès","Extrait de collagène","Extrait d''arbre à soie"]'::jsonb, NULL, 'Appliquer par petites touches autour des yeux en tapotant délicatement.', NULL, '/products/page-44.jpg', '21 g', false, false, NULL, 68),
  ('p70', 'infinite-soin-exfoliant', 'Infinite — Soin Exfoliant', 'إنفينيت - مقشر للبشرة', 'Infinite', 36, 4.6, 29, 'Faire peau neuve grâce au bromélaïne, papaïne et perles de jojoba.', 'بشرة جديدة بفضل البروميلين والبابايين ولؤلؤ الجوجوبا.', 'Le Soin Exfoliant est l''allié idéal pour faire peau neuve et affinée. Votre peau est exfoliée et nettoyée en profondeur grâce au bromélaïne, papaïne, perles de jojoba et de bambou.', NULL, '["34% de gel d''aloès","Bromélaïne","Papaïne","Perles de jojoba et de bambou"]'::jsonb, NULL, 'Appliquer sur le visage humide en mouvements circulaires, rincer abondamment.', NULL, '/products/page-45.jpg', '60 ml', false, false, NULL, 69),
  ('p71', 'infinite-activateur-aloes', 'Infinite — Activateur Aloès', 'إنفينيت - منشط الألوة', 'Infinite', 30, 4.6, 26, 'Soin indispensable pour parfaire le démaquillage et vitaliser le teint.', 'عناية أساسية لإتمام إزالة المكياج وتنشيط البشرة.', 'Découvrez l''Activateur Aloès, soin indispensable qui peut être utilisé seul pour parfaire le démaquillage, hydrater la peau et vitaliser le teint.', NULL, '["98,7% de gel d''Aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou à l''aide d''un coton.', NULL, '/products/page-45.jpg', '130 ml', false, false, NULL, 70),
  ('p72', 'infinite-serum-hydratant', 'Infinite — Sérum Hydratant', 'إنفينيت - سيروم الترطيب', 'Infinite', 52, 4.8, 47, '4 acides hyaluroniques pour cibler chaque couche de la peau.', '4 أحماض هيالورونيك لاستهداف كل طبقات البشرة.', 'Le Sérum Hydratant repulpe et hydrate parfaitement votre épiderme tout en réduisant l''apparence des ridules et des rides grâce à l''association de 4 acides hyaluroniques.', NULL, '["Gel d''aloès","4 acides hyaluroniques"]'::jsonb, NULL, 'Appliquer 1 à 2 pressions sur tout le visage et le cou.', NULL, '/products/page-46.jpg', '18 ml', false, false, NULL, 71)
on conflict (id) do nothing;


-- >>> FILE: 04_enable-public-forms.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the public submit contact messages and place cash-on-delivery orders
-- directly (no backend function needed) — the same way product reviews already
-- work. Orders can only be created as 'pending', so nobody can fake a paid order.

-- Remember how each order was paid (cash on delivery vs. card).
alter table orders add column if not exists payment_method text;

-- Public can submit contact messages (they land in the admin "Messages" tab).
drop policy if exists "Public can insert contact messages" on contact_messages;
create policy "Public can insert contact messages"
  on contact_messages for insert
  to anon
  with check (true);

-- Public can place pending (cash-on-delivery) orders (admin "Commandes" tab).
drop policy if exists "Public can insert pending orders" on orders;
create policy "Public can insert pending orders"
  on orders for insert
  to anon
  with check (payment_status = 'pending');


-- >>> FILE: 05_order-tracking.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds the order fulfilment workflow (confirm / ship / deliver / cancel) and a
-- secure way for customers to track their own order without any email service.

-- 1. Fulfilment status + a human-friendly reference (e.g. FL12345678).
alter table orders add column if not exists status text not null default 'pending';
alter table orders add column if not exists order_ref text;

-- 2. Let the logged-in admin change an order (confirm, ship, cancel, etc.).
drop policy if exists "Admin can update orders" on orders;
create policy "Admin can update orders"
  on orders for update
  to authenticated
  using (true)
  with check (true);

-- 3. Public order tracking. A customer looks up ONE order using its reference
--    AND the email used on the order. `security definer` lets this function read
--    that single row without exposing the whole orders table to the public.
create or replace function track_order(p_ref text, p_email text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select order_ref, status, created_at, total
  from orders
  where order_ref = p_ref
    and lower(customer_email) = lower(p_email)
  limit 1;
$$;

grant execute on function track_order(text, text) to anon;


-- >>> FILE: 06_order-confirmation.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Email confirmation flow: the customer confirms or cancels their order from the
-- email buttons, and any order left unconfirmed for 24h is auto-cancelled.

-- 1. Secret token that makes the confirm/cancel email links safe (unguessable).
alter table orders add column if not exists confirm_token uuid not null default gen_random_uuid();

-- 2. The action the customer's email buttons trigger (via the /commande page).
--    Only a 'pending' order can be changed this way, and only with the right token.
create or replace function respond_order(p_ref text, p_token uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_status text;
  new_status text;
begin
  select status into cur_status
  from orders
  where order_ref = p_ref and confirm_token = p_token;

  if cur_status is null then
    return 'invalid';
  end if;

  -- Already handled (confirmed / cancelled / shipped…) → just report it back.
  if cur_status <> 'pending' then
    return cur_status;
  end if;

  if p_action = 'confirm' then
    new_status := 'confirmed';
  elsif p_action = 'cancel' then
    new_status := 'cancelled';
  else
    return 'invalid';
  end if;

  update orders set status = new_status
  where order_ref = p_ref and confirm_token = p_token;

  return new_status;
end;
$$;

grant execute on function respond_order(text, uuid, text) to anon;

-- 3. Auto-cancel: every hour, cancel pending orders older than 24h.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('auto-cancel-pending-orders');
exception when others then
  null;
end $$;

select cron.schedule(
  'auto-cancel-pending-orders',
  '0 * * * *',
  $cron$update orders set status = 'cancelled'
     where status = 'pending' and created_at < now() - interval '24 hours'$cron$
);


-- >>> FILE: 07_admin-delete-and-cleanup.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the logged-in admin delete orders and contact messages from the panel.
-- (Reviews already had a delete policy.)

drop policy if exists "Admin can delete orders" on orders;
create policy "Admin can delete orders"
  on orders for delete to authenticated using (true);

drop policy if exists "Admin can delete contact messages" on contact_messages;
create policy "Admin can delete contact messages"
  on contact_messages for delete to authenticated using (true);

-- ------------------------------------------------------------------
-- Optional one-time cleanup of the test data created during setup.
-- Review these, then remove the leading "-- " to run the ones you want.
-- ------------------------------------------------------------------
-- delete from orders where order_ref like 'FLTEST%' or customer_email like '%@example.com';
-- delete from contact_messages where email like '%@example.com';
-- delete from reviews where approved = false and author ilike 'test%';


-- >>> FILE: 08_new-features.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds product stock control and promo/discount codes.

-- 1. Stock per product. NULL = not tracked (always available); 0 = out of stock.
alter table products add column if not exists stock integer;

-- 2. Promo / discount codes.
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null default 'percent',   -- 'percent' | 'fixed'
  value numeric not null,
  min_subtotal numeric,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table discount_codes enable row level security;

drop policy if exists "Admin manage discount codes" on discount_codes;
create policy "Admin manage discount codes"
  on discount_codes for all
  to authenticated
  using (true) with check (true);

-- Customers validate a code at checkout through this function only
-- (they can't read the codes table directly).
create or replace function validate_discount(p_code text)
returns table (code text, type text, value numeric, min_subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- 3. Record the applied discount on each order.
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount numeric not null default 0;


-- >>> FILE: 09_stock-decrement.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets a cash-on-delivery order reduce product stock automatically.
-- Customers can't UPDATE products directly (RLS), so this runs as a trusted
-- function that only ever subtracts the ordered quantities — and never below 0.
-- Products with stock = NULL (not tracked) are left untouched.

create or replace function decrement_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update products
      set stock = greatest(0, stock - (item->>'quantity')::int)
      where id = (item->>'id')
        and stock is not null;
  end loop;
end;
$$;

grant execute on function decrement_stock(jsonb) to anon;


-- >>> FILE: 10_growth-features.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds newsletter subscribers, distributor recruitment leads, delivery zones
-- by city, and a lightweight referral program.

-- ---------------------------------------------------------------------------
-- 1. Newsletter subscribers
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);
alter table subscribers enable row level security;

drop policy if exists "Public can subscribe" on subscribers;
create policy "Public can subscribe"
  on subscribers for insert
  to anon
  with check (true);

drop policy if exists "Admin can read subscribers" on subscribers;
create policy "Admin can read subscribers"
  on subscribers for select
  to authenticated
  using (true);

drop policy if exists "Admin can delete subscribers" on subscribers;
create policy "Admin can delete subscribers"
  on subscribers for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. "Devenir distributeur" recruitment leads
-- ---------------------------------------------------------------------------
create table if not exists distributor_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  city text,
  message text,
  handled boolean not null default false
);
alter table distributor_leads enable row level security;

drop policy if exists "Public can submit distributor lead" on distributor_leads;
create policy "Public can submit distributor lead"
  on distributor_leads for insert
  to anon
  with check (true);

drop policy if exists "Admin can read distributor leads" on distributor_leads;
create policy "Admin can read distributor leads"
  on distributor_leads for select
  to authenticated
  using (true);

drop policy if exists "Admin can update distributor leads" on distributor_leads;
create policy "Admin can update distributor leads"
  on distributor_leads for update
  to authenticated
  using (true);

drop policy if exists "Admin can delete distributor leads" on distributor_leads;
create policy "Admin can delete distributor leads"
  on distributor_leads for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Delivery zones — shipping fee per city
-- ---------------------------------------------------------------------------
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city text unique not null,
  fee numeric not null default 0,
  free_threshold numeric,
  active boolean not null default true
);
alter table delivery_zones enable row level security;

drop policy if exists "Public can read active delivery zones" on delivery_zones;
create policy "Public can read active delivery zones"
  on delivery_zones for select
  to anon
  using (active = true);

drop policy if exists "Admin manage delivery zones" on delivery_zones;
create policy "Admin manage delivery zones"
  on delivery_zones for all
  to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 4. Referral program
-- ---------------------------------------------------------------------------
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referrer_ref text not null,
  referred_order_ref text not null,
  rewarded boolean not null default false
);
alter table referrals enable row level security;

drop policy if exists "Admin can read referrals" on referrals;
create policy "Admin can read referrals"
  on referrals for select
  to authenticated
  using (true);

drop policy if exists "Admin can update referrals" on referrals;
create policy "Admin can update referrals"
  on referrals for update
  to authenticated
  using (true);

-- Customers submit a referral only through this function — it checks the
-- referrer's order actually exists, so nobody can insert junk data directly
-- (the referrals table has no public insert policy).
create or replace function submit_referral(p_referrer_ref text, p_referred_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_exists boolean;
begin
  if p_referrer_ref is null or p_referred_ref is null or p_referrer_ref = p_referred_ref then
    return false;
  end if;

  select exists(select 1 from orders where order_ref = p_referrer_ref) into referrer_exists;
  if not referrer_exists then
    return false;
  end if;

  insert into referrals (referrer_ref, referred_order_ref) values (p_referrer_ref, p_referred_ref);
  return true;
end;
$$;

grant execute on function submit_referral(text, text) to anon;


-- >>> FILE: 11_product-visibility.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a "hidden" flag so the admin can hide/show a product on the public site
-- without deleting it. NULL/false = visible; true = hidden (admin only).
alter table products add column if not exists hidden boolean not null default false;


-- >>> FILE: 12_loyalty-program.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Email-based loyalty points: customers earn 1 point per € automatically when
-- you mark their order "Livrée" (delivered). No customer login required.

create table if not exists loyalty_points (
  email text primary key,
  points integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table loyalty_points enable row level security;

drop policy if exists "Admin can read loyalty points" on loyalty_points;
create policy "Admin can read loyalty points"
  on loyalty_points for select
  to authenticated
  using (true);

-- Guard column so points are only ever awarded once per order.
alter table orders add column if not exists loyalty_awarded boolean not null default false;

-- When an order becomes "delivered", credit the customer's points once.
create or replace function award_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'delivered'
     and coalesce(OLD.loyalty_awarded, false) = false
     and NEW.customer_email is not null
     and NEW.customer_email <> '' then
    insert into loyalty_points (email, points)
      values (lower(NEW.customer_email), floor(NEW.total)::int)
    on conflict (email) do update
      set points = loyalty_points.points + floor(NEW.total)::int,
          updated_at = now();
    NEW.loyalty_awarded := true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_loyalty on orders;
create trigger trg_award_loyalty
  before update on orders
  for each row
  execute function award_loyalty_points();

-- Customers look up their own balance by email (returns 0 if none).
create or replace function get_loyalty(p_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select points from loyalty_points where email = lower(p_email)), 0);
$$;

grant execute on function get_loyalty(text) to anon;


-- >>> FILE: 13_order-notes.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a free-text "notes" field to orders for the customer's delivery
-- instructions (e.g. "call before arriving", nearest landmark, floor).
alter table orders add column if not exists notes text;


-- >>> FILE: 14_site-settings.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- A single-row settings table for site-wide options the admin can edit — starting
-- with the promo announcement bar shown at the top of every page.

create table if not exists site_settings (
  id int primary key default 1,
  announcement_fr text,
  announcement_ar text,
  announcement_active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into site_settings (id, announcement_fr, announcement_ar, announcement_active)
  values (1, 'Livraison offerte dès 500 DH 🚚', 'شحن مجاني ابتداءً من 500 درهم 🚚', true)
  on conflict (id) do nothing;

alter table site_settings enable row level security;

-- Everyone can read the banner; only the logged-in admin can change it.
drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings"
  on site_settings for select
  using (true);

drop policy if exists "Admin can update site settings" on site_settings;
create policy "Admin can update site settings"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 15_product-gallery.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds extra product photos (a gallery) shown on the product page, in addition
-- to the main image. Stored as a list of image URLs.
alter table products add column if not exists gallery text[];


-- >>> FILE: 15_social-proof.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Powers the "social proof" popups on the storefront ("Fatima à Casablanca vient
-- de commander…"). Exposes ONLY a first name + city + product — never phone,
-- email, address or amount — through a trusted read-only function.

create or replace function recent_orders_public(p_limit int default 8)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
  from (
    select
      split_part(trim(customer_name), ' ', 1) as name,
      city,
      (items -> 0 ->> 'name') as product,
      created_at
    from orders
    where status <> 'cancelled'
      and coalesce(trim(customer_name), '') <> ''
    order by created_at desc
    limit greatest(1, least(p_limit, 20))
  ) x;
$$;

grant execute on function recent_orders_public(int) to anon;


-- >>> FILE: 16_subscriptions.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- "Recevoir chaque mois" — customers subscribe to a monthly re-delivery of a
-- consumable product. Cash-on-delivery friendly: no auto-charge — the admin sees
-- who's due and prepares the order (with the manual-order tool) each month.

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  product_id text not null,
  product_name text not null,
  quantity int not null default 1,
  frequency text not null default 'monthly',
  next_date date not null default (current_date + interval '1 month'),
  active boolean not null default true
);

alter table subscriptions enable row level security;

-- Public can create a subscription (like the other storefront forms).
drop policy if exists "Public can create subscription" on subscriptions;
create policy "Public can create subscription"
  on subscriptions for insert
  to anon
  with check (active = true);

-- Only the admin manages them.
drop policy if exists "Admin can read subscriptions" on subscriptions;
create policy "Admin can read subscriptions"
  on subscriptions for select to authenticated using (true);
drop policy if exists "Admin can update subscriptions" on subscriptions;
create policy "Admin can update subscriptions"
  on subscriptions for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete subscriptions" on subscriptions;
create policy "Admin can delete subscriptions"
  on subscriptions for delete to authenticated using (true);


-- >>> FILE: 17_blog.sql >>>
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
drop policy if exists "Public can read published posts" on blog_posts;
create policy "Public can read published posts"
  on blog_posts for select using (published = true);
drop policy if exists "Admin can read all posts" on blog_posts;
create policy "Admin can read all posts"
  on blog_posts for select to authenticated using (true);
drop policy if exists "Admin can insert posts" on blog_posts;
create policy "Admin can insert posts"
  on blog_posts for insert to authenticated with check (true);
drop policy if exists "Admin can update posts" on blog_posts;
create policy "Admin can update posts"
  on blog_posts for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete posts" on blog_posts;
create policy "Admin can delete posts"
  on blog_posts for delete to authenticated using (true);


-- >>> FILE: 18_fix-orders-security.sql >>>
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

drop policy if exists "Public can insert pending orders" on orders;
create policy "Public can insert pending orders"
  on orders for insert
  to anon, authenticated
  with check (status = 'pending' and payment_status = 'pending');


-- >>> FILE: 19_delivery-zones-maroc.sql >>>
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


-- >>> FILE: 20_track-by-phone.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Suivi de commande par TÉLÉPHONE ou email. Indispensable depuis que l'email
-- est facultatif au checkout : le client entre son n° de commande + le contact
-- utilisé (téléphone ou email). Les numéros marocains correspondent quel que
-- soit le format saisi (0612345678, 212612345678, +212 6 12 34 56 78…) : on
-- compare les 9 derniers chiffres.

create or replace function track_order_v2(p_ref text, p_contact text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select o.order_ref, o.status, o.created_at, o.total
  from orders o
  where o.order_ref = trim(p_ref)
    and (
      -- correspondance par email…
      lower(o.customer_email) = lower(trim(p_contact))
      -- …ou par téléphone (9 derniers chiffres, peu importe le format)
      or (
        length(regexp_replace(p_contact, '\D', '', 'g')) >= 9
        and right(regexp_replace(coalesce(o.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(p_contact, '\D', '', 'g'), 9)
      )
    )
  limit 1;
$$;

grant execute on function track_order_v2(text, text) to anon;


-- >>> FILE: 21_stock-alerts.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- « Prévenez-moi quand c'est disponible » : capture la demande sur les produits
-- en rupture de stock, pour savoir quoi réapprovisionner et qui recontacter.

create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  product_name text not null,
  contact text not null,
  notified boolean not null default false
);

alter table stock_alerts enable row level security;

drop policy if exists "Public can create stock alert" on stock_alerts;
create policy "Public can create stock alert"
  on stock_alerts for insert to anon, authenticated with check (true);
drop policy if exists "Admin can read stock alerts" on stock_alerts;
create policy "Admin can read stock alerts"
  on stock_alerts for select to authenticated using (true);
drop policy if exists "Admin can update stock alerts" on stock_alerts;
create policy "Admin can update stock alerts"
  on stock_alerts for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete stock alerts" on stock_alerts;
create policy "Admin can delete stock alerts"
  on stock_alerts for delete to authenticated using (true);


-- >>> FILE: 22_arabic-descriptions.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Descriptions arabes pour LES 72 produits. Après exécution, chaque fiche
-- produit s'affiche en arabe quand le client passe le site en arabe.
-- (Idempotent : peut être relancé sans risque.)

update products set description_ar = 'تجدد ألوفيرا فوريفر مظهره! بفضل خبرة 40 عاماً، أعادت فوريفر تصميم منتجها المميز وابتكرت نسخة جديدة كلياً بدون مواد حافظة وغنية بفيتامين سي، في عبوة قابلة لإعادة التدوير بنسبة 100%. السر: 99.7% جل ألوفيرا وجرعة تآزرية من فيتامين سي.' where slug = 'aloe-vera-gel-330ml';
update products set description_ar = 'تجمع التركيبة الجديدة لألوفيرا بالخوخ بين الألوفيرا (84.5%) وهريس الخوخ وعصير العنب الأبيض المركّز لنكهة ناعمة، إضافة إلى جرعة تآزرية من فيتامين سي. عبوة قابلة لإعادة التدوير 100%.' where slug = 'aloe-peche-330ml';
update products set description_ar = 'جرعة كبيرة (90.7%) من لب الألوفيرا، مع لمسة من عصير التفاح والتوت البري، وفيتامين سي، بدون أي مواد حافظة، وعبوة قابلة لإعادة التدوير 100%.' where slug = 'aloe-berry-nectar-330ml';
update products set description_ar = 'بفضل 86% من جل الألوفيرا وهريس المانجو الطبيعي، يمنح هذا الإصدار الجديد دفعة إضافية من التغذية والنكهة. بدون مواد حافظة، ومصدر لفيتامين سي.' where slug = 'aloe-mangue-1l';
update products set description_ar = 'بطعمه المنعش اللذيذ، يحتوي ألوفيرا بيري نكتار على مستخلص التوت البري مع لب الألوفيرا. تساهم النبتة في دعم الدفاعات الطبيعية للجسم.' where slug = 'aloe-berry-nectar-1l';
update products set description_ar = 'لب الألوة المثبت هو المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية. تساهم الألوفيرا في دعم الجهاز المناعي وتحتوي على مضادات أكسدة قوية.' where slug = 'pulpe-aloe-vera-stabilisee-1l';
update products set description_ar = 'لذيذ وناعم، قلب الألوة مُخصّب بمركّز عصير الخوخ. تساعد الألوفيرا على تحفيز الأيض وتساهم في الدفاعات الطبيعية للجسم.' where slug = 'aloe-bits-n-peaches-1l';
update products set description_ar = 'العسل، المعروف بـ«ذهب الخلية»، ينتجه النحل من رحيق الأزهار. بفضل قوامه السائل، يسهل إضافة عسل فوريفر إلى الطعام، وعبوته عملية لتحديد الجرعة.' where slug = 'forever-bee-honey';
update products set description_ar = 'العكبر (البروبوليس) راتينج يجمعه نحل العسل من الأشجار ويحوّله. تُستخدم هذه المادة ذات الخصائص المضادة للميكروبات لحماية الخلية من الفطريات والبكتيريا.' where slug = 'forever-propolis';
update products set description_ar = 'يجمعه النحل من الأزهار، ويحسّن حبوب لقاح فوريفر حيوية الجسم ومقاومته عند تغيّر الفصول.' where slug = 'forever-bee-pollen';
update products set description_ar = 'الغذاء الملكي مثالي للوقاية من تداعيات فصل الشتاء. يعزّز الغذاء الملكي من فوريفر بلطف الدفاعات الطبيعية للجسم.' where slug = 'forever-royal-jelly';
update products set description_ar = 'تتكون فلورا الأمعاء من مليارات البكتيريا التي تساهم في حسن سير عمل الجسم. يجمع Forever Active Pro-B بشكل تآزري بين البروبيوتيك والبريبايوتيك.' where slug = 'forever-active-pro-b';
update products set description_ar = 'يحتوي فوريفر كيدز على 12 فيتاميناً (A، B، C، D، E) ومعدنين (الحديد والزنك). يساهم هذا المزيج في الأداء الطبيعي للجهاز المناعي، ويقلل التعب، ويدعم النمو الذهني.' where slug = 'forever-kids';
update products set description_ar = 'يُستخلص فيلدز أوف جرينز من براعم نباتية فتية: أوراق الشعير والقمح والفصفصة وفلفل الكايين.' where slug = 'fields-of-greens';
update products set description_ar = 'يساهم فيتامين سي في تقليل التعب واستعادة النشاط والطاقة. وهو ضروري لتقوية مقاومة الجسم.' where slug = 'forever-absorbent-c';
update products set description_ar = 'هيّئ عينيك لنمط حياة متصل بالشاشات! فوريفر آي فيجن مكمّل غذائي للرؤية بتركيبة كاملة من فيتامينات A وC وE والزنك.' where slug = 'forever-ivision';
update products set description_ar = 'يحتوي فوريفر سوبر جرينز على أكثر من 20 نوعاً من الفواكه والخضار، والألوفيرا، وفيتامين سي، والمغنيسيوم. يدعم هذا المزيج الدفاعات الطبيعية والتعافي العضلي.' where slug = 'forever-supergreens';
update products set description_ar = 'فوريفر إيميوبلند، مزيج من الفيتامينات والمعادن والفطريات المستخدمة تقليدياً في آسيا، يساهم في تحفيز الدفاعات المناعية للحفاظ على رصيدك الصحي.' where slug = 'forever-immublend';
update products set description_ar = 'تركيبة حصرية من 55 مكوناً تجمع بين عناصر مركّب AOS (أوليغوسكاريدات الألوة) والفيتامينات والمعادن والمغذيات النباتية من مستخلصات الفواكه والخضار.' where slug = 'forever-daily';
update products set description_ar = 'الثوم والزعتر من فوريفر مزيج فريد من مستخلصين نباتيين معروفين بتحسين الراحة الهضمية. كبسولة بدون رائحة تعادل 1000 ملغ من الثوم الطازج.' where slug = 'forever-ail-thym';
update products set description_ar = 'يوفر فوريفر فايبر 5 غرامات من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء واستعادة راحة هضمية جيدة.' where slug = 'forever-fiber';
update products set description_ar = 'يجمع هذا المنقوع بنكهته اللطيفة الرقيقة بين الطعم المنعش لقشر البرتقال والليمون، والنكهات المتبّلة للقرفة والقرنفل. يمنح راحة هضمية.' where slug = 'infusion-fleur-aloes';
update products set description_ar = 'صُمّم هذا المزيج الطبيعي من النباتات والفيتامينات والمعادن خصيصاً للنساء. يساعد فيتامين B6 على تنظيم التوازن الهرموني، وتساعد زهرة الآلام على تقليل التوتر.' where slug = 'vitolize-femmes';
update products set description_ar = 'يحتوي فيتولايز للرجال على فيتامينات ومعادن وفيتوستيرول للحفاظ على أداء جيد للبروستاتا. ويساهم الزنك في الحفاظ على الخصوبة الطبيعية.' where slug = 'vitolize-hommes';
update products set description_ar = 'فوريفر موف مزيج من مكوّنين مسجّلين ببراءة اختراع: غشاء قشر البيض NEM® وكركم BioCurc®. يعملان بتآزر لدعم راحة مفصلية مثالية.' where slug = 'forever-move';
update products set description_ar = 'يحتوي فوريفر كالسيوم على فيتاميني C وD ومعادن (كالسيوم، مغنيسيوم، منغنيز، زنك، نحاس) للمساهمة في الحفاظ على عظام ووظيفة عضلية طبيعية.' where slug = 'forever-calcium';
update products set description_ar = 'يحتوي Forever Arctic-Sea على أحماض دهنية غير مشبعة، أوميغا-3، بما في ذلك EPA وDHA الموجودة في زيوت الأسماك والحبار. تساهم في الوظيفة الطبيعية للدماغ والقلب.' where slug = 'forever-arctic-sea';
update products set description_ar = 'الميثيل سلفونيل ميثان (MSM) مصدر مستقر وطبيعي للكبريت العضوي، موجود بتركيز عالٍ في المفاصل، ويساهم في الحفاظ على سلامة النسيج الضام.' where slug = 'aloe-msm-gel';
update products set description_ar = 'كريم التدليك هذا مكمّل مثالي لتخفيف آلام المفاصل أو تهيئة العضلات للمجهود بفضل المنثول وزيوت الأوكالبتوس والسمسم والجوجوبا والمشمش.' where slug = 'emulsion-thermogene';
update products set description_ar = 'حيوية وقوة وتحمّل ورياضة قصوى: يجمع فوريفر أرجي+ بين أل-أرجينين ومزيج فريد من الفيتامينات ومستخلصات الفواكه لمرافقة مثالية أثناء المجهود.' where slug = 'forever-argi-plus';
update products set description_ar = 'تتميز الألياف المستخلصة من صبار الأوبونتيا بقدرتها على جذب الدهون والسكريات واحتجازها. وتساعد بذور الفاصولياء البيضاء والكروم على تقليل السعرات الحرارية اليومية.' where slug = 'forever-lean';
update products set description_ar = 'فوريفر ثيرم حارق للدهون يحتوي على مستخلصات نباتية (الشاي الأخضر، القهوة الخضراء، الجوارانا) مع فيتامينات المجموعة B وفيتامين سي. يساعد على التحكم بالوزن وتقليل التعب.' where slug = 'forever-therm';
update products set description_ar = 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.' where slug = 'forever-lite-ultra-vanille';
update products set description_ar = 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.' where slug = 'forever-lite-ultra-chocolat';
update products set description_ar = 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.' where slug = 'pack-detox-pulpe';
update products set description_ar = 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.' where slug = 'pack-detox-berry';
update products set description_ar = 'اكتشف منتجاتنا عبر هذه الحزمة الجديدة: 4 منتجات من أساسياتنا لتحصل على أفضل ما في فوريفر بين يديك.' where slug = 'smart-consumer-pack';
update products set description_ar = 'تجمع حزمة العناية اليومية أساسيات فوريفر للعناية بالجسم والوجه يومياً.' where slug = 'pack-hygiene';
update products set description_ar = 'يجمع برنامج العافية بين التغذية والعناية بالجسم لبرنامج عافية يومي متكامل.' where slug = 'programme-bien-etre';
update products set description_ar = 'يجمع برنامج GO2FBO تشكيلة واسعة من المنتجات المميزة لاكتشاف جميع مجموعات فوريفر.' where slug = 'pack-go2fbo';
update products set description_ar = 'حزمة مصممة لمرافقة خطواتك الأولى مع منتجات فوريفر يومياً.' where slug = 'start-your-journey-pack';
update products set description_ar = 'Aloe First هو الرذاذ الذي يُستخدم يومياً لترطيب وإنعاش وتنشيط بشرة الوجه والجسم بفضل تركيبته الغنية بـ11 مستخلصاً نباتياً والألوفيرا والبروبوليس والألانتوين. درجة حموضته المتعادلة تناسب حتى أكثر البشرات حساسية.' where slug = 'aloe-first';
update products set description_ar = 'الألوة المرتبطة بالبروبوليس تجعل من هذا الكريم ذي القوام الغني عناية حقيقية مضادة للبكتيريا ومُصلحة. البابونج والألانتوين وفيتامينات A وE تمنح البشرة نعومة ومرونة.' where slug = 'aloe-propolis-creme';
update products set description_ar = 'غني جداً بالألوفيرا، يمتلك هذا الجل الشفاف غير الدهني كل فضائل النبتة. يرطب البشرة ويجددها. مثالي ضد تهيجات الجلد وحروق الشمس.' where slug = 'gelee-aloes';
update products set description_ar = 'يهدئ لوشن الجسم بالألوة ويرطب ويحمي البشرة من الجفاف. بفضل تركيزه من جل الألوفيرا وزيت الأركان وفيتامين E وزيت المكاداميا، يتغلغل بسرعة ويترك البشرة ناعمة. بدون سيليكون.' where slug = 'aloe-body-lotion';
update products set description_ar = 'صابون الألوة السائل صابون للوجه والجسم والشعر لكل أفراد العائلة. تركيبته اللطيفة جداً تنظف برفق، وتحترم البشرة والشعر، وترطب وتقي من الجفاف.' where slug = 'aloe-liquid-soap';
update products set description_ar = 'جل الأسنان هذا، الخالي من الفلورايد وغير الكاشط، يُجدد مينا أسنانك. مركبه من الكلوروفيل، بدون منثول، يمنح إحساساً طبيعياً بالانتعاش بفضل البروبوليس والألوة.' where slug = 'forever-bright-toothgel';
update products set description_ar = 'بدون كحول أو أملاح الألومنيوم ومعطر بلطف، يوفر هذا المزيل حماية فعالة بدون ترك بقع على ملابسك. تركيبته بالألوة تلين وترطب البشرة.' where slug = 'stick-deodorant-aloes';
update products set description_ar = 'تركيبة جل لتنظيف يديك بأمان أينما كنت. مُخصبة بالألوفيرا، تعطر تركيبته اليدين بلطف دون أن تجففهما.' where slug = 'instant-hand-cleanser';
update products set description_ar = 'تركيبة مرطبة وواقية للغاية لهذا البلسم الذي يجمع بين الألوفيرا وزيت الجوجوبا وشمع العسل. يوفر راحة مُصلحة للشفاه الأكثر جفافاً.' where slug = 'aloe-lips';
update products set description_ar = 'مُخصب بزبدة الأفوكادو، صابون الأفوكادو ينظف جميع أنواع البشرة حتى الأكثر حساسية مع ترطيبها. عطره الخفيف من زهور الليمون يمنح متعة حقيقية.' where slug = 'savon-avocat';
update products set description_ar = 'يجمع Aloe Sunscreen بين القوة المهدئة للألوة وأكسيد الزنك الطبيعي لحماية SPF 30 متقدمة من أشعة UVA وUVB. مناسب لجميع أنواع البشرة.' where slug = 'ecran-solaire-aloes';
update products set description_ar = 'جنتلمانز برايد كريم سائل خفيف بخصائص مهدئة لتهدئة تهيج الحلاقة والاحمرار. عطره اللطيف يمنح لمسة أناقة هادئة.' where slug = 'gentlemans-pride';
update products set description_ar = 'تحمي هذه العناية وتغذي وتقلل من علامات شيخوخة البشرة. قوامها الذائب، المُخصب بالكولاجين والإيلاستين، يرطب ويملأ البشرة. مناسبة للبشرة الحساسة.' where slug = 'aloe-moisturizing-lotion';
update products set description_ar = 'يُصلح، يجدد، يملأ. تدعم هذه العناية التقشير الطبيعي للبشرة وتقلل من ظهور المسام. تُنعَّم التجاعيد والخطوط الدقيقة، ويصبح ملمس البشرة أدق.' where slug = 'r3-factor';
update products set description_ar = 'درع حقيقي مضاد للشيخوخة، يجمع هذا السيروم بين مضادات أكسدة قوية لتقليل علامات التقدم في السن والعوامل المؤثرة على البشرة. تستعيد البشرة إشراقتها.' where slug = 'serum-alpha-e-factor';
update products set description_ar = 'بفضل تركيبته اللطيفة جداً، ينظف غسول الجسم بالألوة البشرة وينشطها برفق. قوامه المنعش يترك عطراً أخّاذاً وبشرة نظيفة وناعمة ومرطبة جيداً.' where slug = 'aloe-body-wash';
update products set description_ar = 'مصمم لتنظيف جميع أنواع الشعر بعمق وترطيبها. بجمعه بين الألوفيرا النقية وزيت الجوجوبا المقوّي وزيت الأركان، هذا الشامبو مثالي للاستخدام اليومي. بدون كبريتات مضافة.' where slug = 'shampoing-aloe-jojoba';
update products set description_ar = 'البلسم عناية أساسية لتنعيم الشعر وفك تشابكه وتغذيته ومنحه لمعاناً. يحفّز أيضاً ترطيب الشعر وفروة الرأس، بدون كبريتات.' where slug = 'apres-shampoing-aloe-jojoba';
update products set description_ar = 'يقدم جل التنظيف من سونيا تجربة جديدة كلياً لإزالة المكياج. يذوب على البشرة ويشكّل رغوة ناعمة، تاركاً البشرة ناعمة ومرطبة.' where slug = 'sonya-gel-nettoyant';
update products set description_ar = 'استعيدي إشراقة بشرتك الطبيعية بفضل جل الإشراقة من سونيا. ترطب الألوفيرا والمكونات النباتية البشرة، بينما يخفي أحد الببتيدات الشوائب ويوحّد لون البشرة.' where slug = 'sonya-gel-eclat';
update products set description_ar = 'يُطبق قبل النوم مباشرة، يتحول قناع الجل من سونيا إلى قوام منعش لذيذ سريع الامتصاص، ما يحسّن عملية تجدد البشرة الليلي.' where slug = 'sonya-masque-gel';
update products set description_ar = 'يذوب جل الترطيب من سونيا على البشرة، ويغلفها بستار من النعومة ويوحّد لونها. يجمع بين الألوفيرا والعديد من المستخلصات النباتية لترطيب أمثل.' where slug = 'sonya-gel-hydratant';
update products set description_ar = 'ينظف مزيل المكياج المرطب البشرة ويرطبها بخطوة واحدة. المكوّن المنظّف المستخدم، مستخلص طبيعي من جوز الهند، مضاد للحساسية وغير مهيّج.' where slug = 'infinite-demaquillant-hydratant';
update products set description_ar = 'السيروم المشدد هو إكسير شباب حقيقي. يحارب علامات التقدم في السن الظاهرة من خلال تكثيف قوة الألوفيرا بفضل سلسلة محددة من ثلاثة أحماض أمينية.' where slug = 'infinite-serum-raffermissant';
update products set description_ar = 'الكريم المُصلح، بقوامه الخفيف الناعم، غني بالألوفيرا والمستخلصات النباتية وزيت الجوجوبا وفيتامين B3. يبدو الوجه ممتلئاً بوضوح، مستعيداً شبابه ومرونته.' where slug = 'infinite-creme-reparatrice';
update products set description_ar = 'يحارب مركّب الشد من الداخل علامات التقدم في السن الظاهرة. يحتوي على مستخلص شمّام فرنسي مسجّل ببراءة اختراع، وسيراميدات نباتية، وكولاجين.' where slug = 'infinite-complexe-raffermissant';
update products set description_ar = 'يمنح هذا اللوشن المنعش البشرة إشراقة حقيقية. يُتمّ إزالة المكياج ويخلّص البشرة من آخر الشوائب. غني بالألوفيرا ومستخلص الخيار والشاي الأبيض.' where slug = 'infinite-lotion-tonifiante';
update products set description_ar = 'كريم محيط العين سر نظرة متألقة. يجمع بين الألوفيرا ومستخلص الكولاجين لنظرة أصغر سناً بوضوح، ومستخلص شجرة الحرير لمحو علامات التعب.' where slug = 'infinite-creme-contour-yeux';
update products set description_ar = 'المقشّر هو الحليف المثالي لبشرة جديدة وأكثر نقاءً. تُقشَّر بشرتك وتُنظَّف بعمق بفضل البروميلين والبابايين ولؤلؤ الجوجوبا والخيزران.' where slug = 'infinite-soin-exfoliant';
update products set description_ar = 'اكتشف منشّط الألوة، عناية أساسية يمكن استخدامها وحدها لإتمام إزالة المكياج وترطيب البشرة وتنشيط لونها.' where slug = 'infinite-activateur-aloes';
update products set description_ar = 'يملأ سيروم الترطيب بشرتك ويرطبها بشكل مثالي مع تقليل ظهور الخطوط الدقيقة والتجاعيد بفضل مزيج من 4 أحماض هيالورونيك.' where slug = 'infinite-serum-hydratant';


-- >>> FILE: 23_abandoned-carts.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- « Paniers abandonnés » : dès que le client saisit nom + téléphone au checkout,
-- on enregistre son panier — même s'il ne confirme pas. Vous le relancez ensuite
-- par WhatsApp depuis l'admin. (Récupère typiquement 15-30% des ventes perdues.)

create table if not exists abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  phone text,
  city text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  recovered boolean not null default false
);

alter table abandoned_carts enable row level security;

-- The visitor can create/refresh their own row (keyed by a random session id
-- stored in their browser). Low-risk data; admin manages it.
drop policy if exists "Public can upsert abandoned cart" on abandoned_carts;
create policy "Public can upsert abandoned cart"
  on abandoned_carts for insert to anon, authenticated with check (true);
drop policy if exists "Public can update own abandoned cart" on abandoned_carts;
create policy "Public can update own abandoned cart"
  on abandoned_carts for update to anon, authenticated using (true) with check (true);
drop policy if exists "Admin can read abandoned carts" on abandoned_carts;
create policy "Admin can read abandoned carts"
  on abandoned_carts for select to authenticated using (true);
drop policy if exists "Admin can delete abandoned carts" on abandoned_carts;
create policy "Admin can delete abandoned carts"
  on abandoned_carts for delete to authenticated using (true);


-- >>> FILE: 24_review-photos.sql >>>
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
drop policy if exists "review photos public upload" on storage.objects;
create policy "review photos public upload"
  on storage.objects for insert
  with check (bucket_id = 'review-photos');

-- …et tout le monde peut les voir (bucket public).
drop policy if exists "review photos public read" on storage.objects;
drop policy if exists "review photos public read" on storage.objects;
create policy "review photos public read"
  on storage.objects for select
  using (bucket_id = 'review-photos');


-- >>> FILE: 25_youcanpay.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Colonne pour relier une commande à son paiement YouCan Pay (carte bancaire).
alter table orders add column if not exists youcanpay_token text;


-- >>> FILE: 26_feature-flags.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Gestionnaire de fonctions : chaque fonctionnalité du site peut être activée
-- ou désactivée individuellement depuis Admin → Réglages, sans redéploiement.
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table feature_flags enable row level security;

-- Tout le monde peut lire l'état des fonctions (le site en a besoin)…
drop policy if exists "feature flags public read" on feature_flags;
drop policy if exists "feature flags public read" on feature_flags;
create policy "feature flags public read"
  on feature_flags for select
  using (true);

-- …mais seul l'admin connecté peut les modifier.
drop policy if exists "feature flags admin write" on feature_flags;
drop policy if exists "feature flags admin write" on feature_flags;
create policy "feature flags admin write"
  on feature_flags for all
  to authenticated
  using (true)
  with check (true);

-- État initial de chaque fonction (modifiable ensuite depuis l'admin).
insert into feature_flags (key, enabled) values
  ('routines', true),          -- Page « Routines » + liens de navigation
  ('bundle_discount', true),   -- Remise routine automatique −10% dès 3 articles
  ('bundle_nudge', true),      -- Bandeau « Ajoutez X produit(s) pour −10% » dans le panier
  ('abandoned_cart', true),    -- Sauvegarde des paniers abandonnés au checkout
  ('photo_reviews', true),     -- Champ photo dans le formulaire d'avis
  ('order_sound', true),       -- Son + badge « nouvelle commande » dans l'admin
  ('reviews_badge', true),     -- Badge « avis en attente » sur l'onglet Avis
  ('card_payment', false),     -- Option « Payer par carte » au checkout (nécessite YouCan Pay)
  ('order_wa_confirm', true),  -- Bouton « Confirmer ma commande sur WhatsApp » après commande
  ('checkout_badges', true),   -- Badges de confiance au moment du paiement
  ('followups', true),         -- Onglet admin « Relance fidélité » (réassort à J+20)
  ('product_wa_order', true),  -- Bouton « Commander sur WhatsApp » sur les pages produit
  ('pack_cross_sell', true),   -- Bandeau « fait partie du pack X » sur les pages produit
  ('story_section', true),     -- Section « Qui suis-je » sur l'accueil
  ('wa_testimonials', true),   -- Témoignages WhatsApp (captures) sur l'accueil
  ('checkout_prefill', true)   -- Pré-remplissage des coordonnées d'un client déjà connu
on conflict (key) do nothing;
-- Script réexécutable sans risque : les lignes existantes ne sont pas modifiées.


-- >>> FILE: 27_packs.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Packs gérés depuis l'admin : chaque pack contient des produits précis (avec
-- quantités), un nom FR/AR et un objectif FR/AR. Affichés sur la page Routines.
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  active boolean not null default true,
  icon text not null default '🌿',
  name_fr text not null,
  name_ar text,
  goal_fr text,
  goal_ar text,
  -- Photo du pack (facultative) : si définie, elle remplace la grille de
  -- produits sur la carte du pack.
  image text,
  -- [{ "id": "p01", "quantity": 1 }, ...]
  items jsonb not null default '[]'::jsonb
);

-- Si vous aviez déjà exécuté ce script avant l'ajout de la photo :
alter table packs add column if not exists image text;

alter table packs enable row level security;

-- Le site lit les packs (les inactifs sont filtrés côté site)…
drop policy if exists "packs public read" on packs;
drop policy if exists "packs public read" on packs;
create policy "packs public read"
  on packs for select
  using (true);

-- …seul l'admin connecté peut créer / modifier / supprimer.
drop policy if exists "packs admin write" on packs;
drop policy if exists "packs admin write" on packs;
create policy "packs admin write"
  on packs for all
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 28_story-testimonials.sql >>>
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
drop policy if exists "testimonials public read" on testimonials;
create policy "testimonials public read"
  on testimonials for select
  using (true);

drop policy if exists "testimonials admin write" on testimonials;
drop policy if exists "testimonials admin write" on testimonials;
create policy "testimonials admin write"
  on testimonials for all
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 29_promo-usage-limits.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Limite d'utilisation des codes promo : chaque code peut avoir un nombre
-- maximum d'utilisations (ex : un code fidélité utilisable 2 fois, un code
-- unique utilisable 1 fois). Vide = illimité, comme avant.

alter table discount_codes add column if not exists max_uses int;
alter table discount_codes add column if not exists used_count int not null default 0;

-- Le code n'est plus valide une fois la limite atteinte.
create or replace function validate_discount(p_code text)
returns table (code text, type text, value numeric, min_subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- Chaque commande passée avec un code compte une utilisation. Le compteur est
-- incrémenté par un trigger côté base : le client ne peut ni l'éviter ni le
-- manipuler. (Le code automatique « ROUTINE-10% » ne correspond à aucune ligne
-- de la table, donc il n'est simplement pas compté.)
create or replace function count_discount_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.discount_code is not null then
    update discount_codes
      set used_count = used_count + 1
      where upper(code) = upper(new.discount_code);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_count_discount_use on orders;
create trigger orders_count_discount_use
  after insert on orders
  for each row
  execute function count_discount_use();


-- >>> FILE: 30_finance.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Panneau Finances : prix d'achat Forever par produit (table réservée à
-- l'admin — jamais lisible publiquement, vos coûts restent secrets) + coût
-- réel de livraison par défaut.

create table if not exists product_costs (
  product_id text primary key,
  cost numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table product_costs enable row level security;

-- Admin uniquement (lecture ET écriture) — aucun accès public.
drop policy if exists "product costs admin all" on product_costs;
drop policy if exists "product costs admin all" on product_costs;
create policy "product costs admin all"
  on product_costs for all
  to authenticated
  using (true)
  with check (true);

-- Ce que VOUS payez au livreur pour une livraison (Amana/CTM…), utilisé pour
-- calculer le bénéfice net. Modifiable depuis l'onglet Finances.
alter table site_settings add column if not exists courier_cost numeric not null default 35;


-- >>> FILE: 31_repair-public-access.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- RÉPARATION — restaure l'accès public du site après une remédiation de
-- sécurité trop agressive. N'affecte PAS la sécurité admin (private.is_admin).
-- Idempotent : ré-exécutable sans risque.

-- ===========================================================================
-- 1) Formulaires publics : l'anon doit pouvoir INSÉRER (contact + distributeur)
-- ===========================================================================
drop policy if exists "Public can insert contact messages" on public.contact_messages;
drop policy if exists "Public can insert contact messages" on public.contact_messages;
create policy "Public can insert contact messages"
  on public.contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "Public can submit distributor lead" on public.distributor_leads;
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


-- >>> FILE: 40_zyvora.sql >>>
-- ZYVORA Wave 0 — platform foundation (accounts + server-side Business Memory)
-- Apply in the Supabase SQL editor (same workflow as 30_finance.sql).
--
-- Constitutional enforcement at the database layer:
--   * Workspace isolation: RLS restricts every row to its owner (CODEX 00 F.2/F.3).
--   * Business Memory is append-only: INSERT + SELECT only — no UPDATE/DELETE
--     policies exist on zyvora_events (Article V, ADR-0002).

create table if not exists public.zyvora_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.zyvora_workspaces enable row level security;

drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
create policy "zyvora_ws_select_own" on public.zyvora_workspaces
  for select using (auth.uid() = owner);

drop policy if exists "zyvora_ws_insert_own" on public.zyvora_workspaces;
create policy "zyvora_ws_insert_own" on public.zyvora_workspaces
  for insert with check (auth.uid() = owner);

drop policy if exists "zyvora_ws_update_own" on public.zyvora_workspaces;
create policy "zyvora_ws_update_own" on public.zyvora_workspaces
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

-- Business Memory event store: the four streams, append-only.
create table if not exists public.zyvora_events (
  id uuid primary key, -- client-generated; makes offline retries idempotent
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  ts bigint not null,
  stream text not null check (stream in ('fact','interpretation','decision','outcome')),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zyvora_events_ws_ts on public.zyvora_events (workspace_id, ts);

alter table public.zyvora_events enable row level security;

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
create policy "zyvora_ev_select_own" on public.zyvora_events
  for select using (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
create policy "zyvora_ev_insert_own" on public.zyvora_events
  for insert with check (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

-- Deliberately NO update policy and NO delete policy on zyvora_events:
-- Business Memory is permanent and append-only (ADR-0002).


-- >>> FILE: 41_zyvora_teams.sql >>>
-- ZYVORA Wave 0 completion — multi-user: memberships, invitations, roles, RLS.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000027 invitation & membership, FEAT-000028 roles & permission grants,
--   FEAT-000029 policy evaluation (enforced here at the data layer via RLS).
-- Apply AFTER 40_zyvora.sql (same SQL-editor workflow).
--
-- Model: one Workspace has many Memberships (user + role). Access to a Workspace
-- and its Business Memory is granted by membership, not just ownership. The owner
-- always has an implicit 'owner' membership. Roles: owner > manager > staff > viewer.

-- 1. Memberships -----------------------------------------------------------
create table if not exists public.zyvora_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists zyvora_memberships_user on public.zyvora_memberships (user_id);

-- Helper: is the current user a member of a workspace (optionally with a role floor)?
create or replace function public.zyvora_is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.zyvora_memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.zyvora_workspaces w
    where w.id = ws and w.owner = auth.uid()
  );
$$;

create or replace function public.zyvora_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.zyvora_memberships m where m.workspace_id = ws and m.user_id = auth.uid()),
    (select 'owner' from public.zyvora_workspaces w where w.id = ws and w.owner = auth.uid())
  );
$$;

alter table public.zyvora_memberships enable row level security;

-- Members can see the roster of their own workspaces.
drop policy if exists "zyvora_mem_select" on public.zyvora_memberships;
create policy "zyvora_mem_select" on public.zyvora_memberships
  for select using (public.zyvora_is_member(workspace_id));

-- Only owner/manager may add or change memberships.
drop policy if exists "zyvora_mem_write" on public.zyvora_memberships;
create policy "zyvora_mem_write" on public.zyvora_memberships
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- 2. Invitations (email-based; accepted when that user signs in) ------------
create table if not exists public.zyvora_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('manager','staff','viewer')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
create index if not exists zyvora_inv_email on public.zyvora_invitations (lower(email));

alter table public.zyvora_invitations enable row level security;

-- Owner/manager manage invitations for their workspace.
drop policy if exists "zyvora_inv_manage" on public.zyvora_invitations;
create policy "zyvora_inv_manage" on public.zyvora_invitations
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- An invited user may see invitations addressed to their own email (to accept).
drop policy if exists "zyvora_inv_see_mine" on public.zyvora_invitations;
create policy "zyvora_inv_see_mine" on public.zyvora_invitations
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 3. Widen workspace + event access from owner-only to any member -----------
-- (drop BOTH the old owner-only name and the new member name, so re-runs are safe)
drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
drop policy if exists "zyvora_ws_select_member" on public.zyvora_workspaces;
create policy "zyvora_ws_select_member" on public.zyvora_workspaces
  for select using (public.zyvora_is_member(id));

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_select_member" on public.zyvora_events;
create policy "zyvora_ev_select_member" on public.zyvora_events
  for select using (public.zyvora_is_member(workspace_id));

-- Members with an operational role may append events; viewers cannot.
drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_insert_member" on public.zyvora_events;
create policy "zyvora_ev_insert_member" on public.zyvora_events
  for insert with check (public.zyvora_role(workspace_id) in ('owner','manager','staff'));

-- Still NO update/delete on zyvora_events — append-only (ADR-0002).


-- >>> FILE: 42_zyvora_telemetry.sql >>>
-- ZYVORA productization Stone 2 — error telemetry.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000032 audit & observability (client-error channel).
-- Apply AFTER 41_zyvora_teams.sql (same SQL-editor workflow).
--
-- Purpose: when the app breaks on a customer's machine, the vendor (you) can see
-- it. Clients may INSERT their own error reports; nobody can update or delete
-- them from the client (append-only, like Business Memory); reading is for the
-- service role only (Supabase dashboard / future admin console).

create table if not exists public.zyvora_client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,
  message text not null,
  stack text,
  place text,               -- where in the app it happened (view / boundary / promise)
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists zyvora_client_errors_time on public.zyvora_client_errors (created_at desc);

alter table public.zyvora_client_errors enable row level security;

-- Signed-in users may report their own errors. No select/update/delete policies:
-- reports are write-only from the client.
drop policy if exists zyvora_client_errors_insert on public.zyvora_client_errors;
create policy zyvora_client_errors_insert on public.zyvora_client_errors
  for insert to authenticated
  with check (user_id = auth.uid());


-- >>> FILE: 43_zyvora_billing.sql >>>
-- ZYVORA productization Stone 4 — billing (Stripe subscriptions).
-- Vendor productization (monetization of ZYVORA itself; no canonical CAP/FEAT id).
-- Apply AFTER 42_zyvora_telemetry.sql (same SQL-editor workflow).
--
-- Model: one subscription per OWNER (auth user). The Stripe webhook Edge
-- Function (service role) is the only writer; clients may only read their own
-- row. Truth about payment lives in Stripe; this table is the mirror the app
-- reads.

create table if not exists public.zyvora_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none'
    check (status in ('none','trialing','active','past_due','canceled','unpaid')),
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zyvora_subscriptions enable row level security;

-- Clients: read your own subscription. No insert/update/delete policies —
-- only the webhook (service role, bypasses RLS) writes here.
drop policy if exists zyvora_subscriptions_select on public.zyvora_subscriptions;
create policy zyvora_subscriptions_select on public.zyvora_subscriptions
  for select to authenticated
  using (user_id = auth.uid());


-- >>> FILE: 99_convert-to-dirham.sql >>>
-- ⚠️ RUN THIS ONCE ONLY. Running it twice will double-convert your prices.
--
-- Converts prices that were entered in Euros into Moroccan Dirham using an
-- approximate rate of 1 € ≈ 10.8 DH, rounded to a whole Dirham. After running,
-- fine-tune any individual prices in the admin panel as you like.
--
-- Run in Supabase → SQL Editor → New query → Run.

-- Product prices
update products
set price = round(price * 10.8);

-- Delivery zone fees (if you added any city-specific shipping)
update delivery_zones
set fee = round(fee * 10.8),
    free_threshold = case when free_threshold is not null then round(free_threshold * 10.8) end;

-- Discount codes: convert fixed-amount values and minimum-basket thresholds.
-- Percentage codes are left untouched (a % doesn't change with currency).
update discount_codes
set value = case when type = 'fixed' then round(value * 10.8) else value end,
    min_subtotal = case when min_subtotal is not null then round(min_subtotal * 10.8) end;


-- >>> FILE: APPLY_NATURALOE.sql >>>
-- ============================================================
-- NATURALOE store ONLY - COMBINED SCHEMA (auto-generated, no Zyvora)
-- Paste this ONE file into the fresh Naturaloe Supabase project and Run.
-- Policies are idempotent (safe to re-run). BUT 99_convert-to-dirham
-- multiplies prices by 10.8 - run the whole file ONCE only.
-- ============================================================

-- >>> FILE: 01_schema.sql >>>
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Creates the three tables the store needs plus row-level security policies
-- so the public site can only insert data (never read orders/contact messages,
-- and only read reviews that have been approved).

create extension if not exists "pgcrypto";

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  phone text,
  address text,
  city text,
  region text,
  zip text,
  country text,
  items jsonb not null,
  subtotal numeric not null,
  shipping numeric not null,
  total numeric not null,
  currency text not null default 'eur',
  stripe_session_id text unique,
  payment_status text not null default 'pending',
  locale text
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  handled boolean not null default false
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false
);

alter table orders enable row level security;
alter table contact_messages enable row level security;
alter table reviews enable row level security;

-- Orders: only the create-checkout-session / stripe-webhook Edge Functions touch this
-- table (using the service role key, which bypasses RLS). No public policies needed.

-- Contact messages: same — only written by the send-contact-email Edge Function
-- via the service role key. No public policies needed.

-- Reviews: public can submit (unapproved) and read only approved reviews.
drop policy if exists "Public can insert reviews" on reviews;
drop policy if exists "Public can insert reviews" on reviews;
create policy "Public can insert reviews"
  on reviews for insert
  to anon
  with check (approved = false);

drop policy if exists "Public can read approved reviews" on reviews;
drop policy if exists "Public can read approved reviews" on reviews;
create policy "Public can read approved reviews"
  on reviews for select
  to anon
  using (approved = true);


-- >>> FILE: 02_products-and-admin.sql >>>
-- Run this in Supabase → SQL Editor AFTER schema.sql.
-- Creates the products table (so you can edit products from the admin panel
-- instead of code), plus a public storage bucket for product images.
-- The admin panel writes here using a logged-in (authenticated) account;
-- the public website only reads.

create table if not exists products (
  id text primary key,
  slug text unique not null,
  name text not null,
  name_ar text,
  category text not null,
  price numeric not null default 0,
  rating numeric not null default 5,
  review_count int not null default 0,
  tagline text,
  tagline_ar text,
  description text,
  description_ar text,
  ingredients jsonb not null default '[]',
  ingredients_ar jsonb,
  how_to_use text,
  how_to_use_ar text,
  image text,
  size text,
  best_seller boolean not null default false,
  is_new boolean not null default false,
  pack_contents jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- Everyone can read products (that's the public shop).
drop policy if exists "Public can read products" on products;
drop policy if exists "Public can read products" on products;
create policy "Public can read products"
  on products for select
  to anon, authenticated
  using (true);

-- Only a logged-in admin can change them.
drop policy if exists "Admin can insert products" on products;
drop policy if exists "Admin can insert products" on products;
create policy "Admin can insert products"
  on products for insert to authenticated with check (true);
drop policy if exists "Admin can update products" on products;
drop policy if exists "Admin can update products" on products;
create policy "Admin can update products"
  on products for update to authenticated using (true);
drop policy if exists "Admin can delete products" on products;
drop policy if exists "Admin can delete products" on products;
create policy "Admin can delete products"
  on products for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for product images (drag-and-drop uploads from the admin).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin can upload product images" on storage.objects;
drop policy if exists "Admin can upload product images" on storage.objects;
create policy "Admin can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Admin can update product images" on storage.objects;
drop policy if exists "Admin can update product images" on storage.objects;
create policy "Admin can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin can delete product images" on storage.objects;
drop policy if exists "Admin can delete product images" on storage.objects;
create policy "Admin can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- Admin (logged-in) access to orders, contact messages, and review moderation,
-- so they can be viewed/managed from the /admin panel instead of the Supabase
-- Table Editor. The public still cannot read orders or messages.
-- ---------------------------------------------------------------------------
drop policy if exists "Admin can read orders" on orders;
drop policy if exists "Admin can read orders" on orders;
create policy "Admin can read orders"
  on orders for select to authenticated using (true);

drop policy if exists "Admin can read contact messages" on contact_messages;
drop policy if exists "Admin can read contact messages" on contact_messages;
create policy "Admin can read contact messages"
  on contact_messages for select to authenticated using (true);
drop policy if exists "Admin can update contact messages" on contact_messages;
drop policy if exists "Admin can update contact messages" on contact_messages;
create policy "Admin can update contact messages"
  on contact_messages for update to authenticated using (true);

drop policy if exists "Admin can read all reviews" on reviews;
drop policy if exists "Admin can read all reviews" on reviews;
create policy "Admin can read all reviews"
  on reviews for select to authenticated using (true);
drop policy if exists "Admin can update reviews" on reviews;
drop policy if exists "Admin can update reviews" on reviews;
create policy "Admin can update reviews"
  on reviews for update to authenticated using (true);
drop policy if exists "Admin can delete reviews" on reviews;
drop policy if exists "Admin can delete reviews" on reviews;
create policy "Admin can delete reviews"
  on reviews for delete to authenticated using (true);


-- >>> FILE: 03_products-seed.sql >>>
-- Auto-generated by scripts/gen-products-seed.cjs — do not edit by hand.
-- Run in Supabase → SQL Editor after products-and-admin.sql.

insert into products (id, slug, name, name_ar, category, price, rating, review_count, tagline, tagline_ar, description, description_ar, ingredients, ingredients_ar, how_to_use, how_to_use_ar, image, size, best_seller, is_new, pack_contents, sort_order) values
  ('p01', 'aloe-vera-gel-330ml', 'Forever Aloe Vera Gel 330ml', 'جل ألوفيرا فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.9, 412, 'Notre produit signature, désormais sans conservateur et riche en vitamine C.', 'المنتج المميز، الآن بدون مواد حافظة وغني بفيتامين سي.', 'L''Aloe Vera Forever fait peau neuve ! Riche d''un savoir-faire de 40 ans, Forever a revisité son produit signature et créé une toute nouvelle version sans conservateur et riche en vitamine C, dans un emballage 100% recyclable. Le secret : 99,7% de gel d''Aloe vera et une dose synergique de vitamine C.', 'تجدد ألوفيرا فوريفر مظهره! بفضل خبرة 40 عاماً، أعادت فوريفر تصميم منتجها المميز وابتكرت نسخة جديدة كلياً بدون مواد حافظة وغنية بفيتامين سي، في عبوة قابلة لإعادة التدوير بنسبة 100%. السر: 99.7% جل ألوفيرا وجرعة تآزرية من فيتامين سي.', '["99,7% de gel d''Aloe vera","Vitamine C"]'::jsonb, '["99.7% جل ألوفيرا","فيتامين سي"]'::jsonb, '30 à 40 ml, 3 fois par jour.', '30 إلى 40 مل، 3 مرات يومياً.', '/products/p01-aloe-vera-gel.png', '330 ml', true, false, NULL, 0),
  ('p02', 'aloe-peche-330ml', 'Forever Aloe Pêche 330ml', 'ألوفيرا بالخوخ فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.7, 188, 'Aloe vera, purée de pêche naturelle et vitamine C pour une saveur douce et savoureuse.', 'ألوفيرا، هريس الخوخ الطبيعي وفيتامين سي بنكهة لذيذة وناعمة.', 'La nouvelle formule de l''Aloe Pêche associe de l''Aloe vera (84,5%), de la purée de pêche et du jus concentré de raisin blanc pour une saveur douce, ainsi qu''une dose synergique de vitamine C. Packaging 100% recyclable.', NULL, '["84,5% de pulpe d''Aloe vera","Purée de pêche naturelle","Jus concentré de raisin blanc","Arôme pêche"]'::jsonb, NULL, '30 à 40 ml, 3 fois par jour.', NULL, '/products/p02-aloe-peche.png', '330 ml', false, false, NULL, 1),
  ('p03', 'aloe-berry-nectar-330ml', 'Forever Aloe Berry Nectar 330ml', 'ألوفيرا بيري نكتار فوريفر 330 مل', 'Pulpe d''Aloe Vera', 7, 4.8, 203, 'Une large dose de pulpe d''Aloe vera, jus de pomme et canneberge, sans conservateur.', 'جرعة كبيرة من لب الألوفيرا، عصير التفاح والتوت البري، بدون مواد حافظة.', 'Une large dose (90,7%) de pulpe d''Aloe vera, un soupçon de jus de pomme et de canneberge, de la vitamine C, aucun conservateur et un emballage 100% recyclable.', NULL, '["90,7% de pulpe d''Aloe vera","Jus concentré de pomme","Jus concentré de canneberge"]'::jsonb, NULL, '30 à 40 ml, 3 fois par jour.', NULL, '/products/p03-aloe-berry-nectar.png', '330 ml', false, false, NULL, 2),
  ('p04', 'aloe-mangue-1l', 'Forever Aloe Mangue', 'ألوفيرا مانجو فوريفر', 'Pulpe d''Aloe Vera', 38, 4.8, 96, 'Gel Aloe vera et purée de mangue naturelle pour un boost de nutrition et de saveur.', 'جل ألوفيرا وهريس مانجو طبيعي لدفعة إضافية من التغذية والنكهة.', 'Avec ses 86% de gel d''Aloe vera et sa purée de mangue naturelle, cette nouvelle déclinaison apporte un boost supplémentaire de nutrition et de saveur. Sans conservateurs, source de vitamine C.', NULL, '["86% de gel d''Aloe vera pur","Vitamine C","Concentré de purée de mangue"]'::jsonb, NULL, 'Secouer légèrement avant de servir — 30 à 40 ml dilués dans 240 ml d''eau ou de jus de fruit, 3 fois par jour.', NULL, '/products/page-08.jpg', '1 litre', false, true, NULL, 3),
  ('p05', 'aloe-berry-nectar-1l', 'Aloe Berry Nectar 1L', 'ألوفيرا بيري نكتار 1 لتر', 'Pulpe d''Aloe Vera', 38, 4.7, 121, 'Goût acidulé, extrait de canneberge et pulpe Aloe Vera riche en antioxydants.', 'طعم منعش، مستخلص التوت البري ولب الألوفيرا الغني بمضادات الأكسدة.', 'Au goût délicieusement acidulé, l''Aloe Berry Nectar contient de l''extrait de canneberge associé à la pulpe d''Aloe Vera. La plante contribue aux défenses naturelles de l''organisme.', NULL, '["90,6% de pulpe d''Aloe vera stabilisée","1,71% d''extraits de canneberge et de pomme"]'::jsonb, NULL, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', NULL, '/products/page-09.jpg', '1 litre', false, false, NULL, 4),
  ('p06', 'pulpe-aloe-vera-stabilisee-1l', 'Pulpe d''Aloe Vera Stabilisée', 'لب الألوفيرا المثبت', 'Pulpe d''Aloe Vera', 38, 4.9, 267, 'Le produit à utiliser quotidiennement pour conserver un bien-être optimal.', 'المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية.', 'La pulpe d''Aloès stabilisée est le produit à utiliser quotidiennement pour conserver un bien-être optimal. L''Aloe vera contribue au maintien du système immunitaire et possède de puissants antioxydants.', 'لب الألوة المثبت هو المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية. تساهم الألوفيرا في دعم الجهاز المناعي وتحتوي على مضادات أكسدة قوية.', '["96,2% de pulpe d''Aloe vera stabilisée"]'::jsonb, '["96.2% لب ألوفيرا مثبت"]'::jsonb, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', '30 إلى 40 مل يومياً، 3 مرات يومياً أي ما بين 90 و120 مل يومياً.', '/products/page-09.jpg', '1 litre', true, false, NULL, 5),
  ('p07', 'aloe-bits-n-peaches-1l', 'Forever Aloe Bits N'' Peaches', 'ألوفيرا بيتس آند بيتشز فوريفر', 'Pulpe d''Aloe Vera', 38, 4.6, 84, 'Cœur d''Aloès enrichi en concentré de jus de pêche, savoureux et doux.', 'قلب الألوة المُخصّب بمركز عصير الخوخ، لذيذ وناعم.', 'Savoureux et doux, le Cœur d''Aloès est enrichi en concentré de jus de pêche. L''Aloe Vera aide à stimuler le métabolisme et contribue aux défenses naturelles de l''organisme.', NULL, '["91,17% de pulpe d''Aloe Vera stabilisée","0,1% de concentré de jus de pêche"]'::jsonb, NULL, '30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.', NULL, '/products/page-09.jpg', '1 litre', false, false, NULL, 6),
  ('p08', 'forever-bee-honey', 'Forever Bee Honey', 'عسل النحل فوريفر', 'Produits de la Ruche', 22, 4.8, 156, '« L''or de la ruche », produit par les abeilles à partir du nectar des fleurs.', '«ذهب الخلية»، ينتجه النحل من رحيق الأزهار.', 'Le miel aussi appelé « or de la ruche » est produit par les abeilles à partir du nectar des fleurs. Avec sa texture fluide, le Forever Bee Honey s''ajoute facilement à l''alimentation. Son flacon est facile à utiliser pour doser.', NULL, '["100% miel naturel"]'::jsonb, NULL, 'Pour une consommation personnelle. Enfants : à consommer à partir de 12 mois.', NULL, '/products/page-10.jpg', '500 g', false, false, NULL, 7),
  ('p09', 'forever-propolis', 'Forever Propolis', 'بروبوليس فوريفر', 'Produits de la Ruche', 24, 4.6, 73, 'Résine collectée par les abeilles, aux propriétés antimicrobiennes.', 'راتينج يجمعه النحل، بخصائص مضادة للميكروبات.', 'La propolis est une résine collectée et métabolisée par les abeilles mellifères à partir des arbres. Cette substance aux propriétés antimicrobiennes est utilisée pour protéger la ruche de la prolifération de champignons et de bactéries.', NULL, '["69,6% de poudre de propolis","7% de miel","Contient soja et amande"]'::jsonb, NULL, 'Prendre 2 comprimés par jour.', NULL, '/products/page-11.jpg', '60 comprimés', false, false, NULL, 8),
  ('p10', 'forever-bee-pollen', 'Forever Bee Pollen', 'حبوب لقاح النحل فوريفر', 'Produits de la Ruche', 22, 4.7, 91, 'Collecté sur les fleurs, améliore la vitalité lors des changements de saison.', 'يُجمع من الأزهار، يحسّن الحيوية عند تغير الفصول.', 'Collecté sur les fleurs par les abeilles, le Pollen Forever améliore la vitalité et la résistance de l''organisme lors des changements de saison.', NULL, '["86% pollen (500 mg par comprimé)","12% miel"]'::jsonb, NULL, '3 comprimés par jour pendant les repas.', NULL, '/products/page-11.jpg', '100 comprimés', false, false, NULL, 9),
  ('p11', 'forever-royal-jelly', 'Forever Royal Jelly', 'الغذاء الملكي فوريفر', 'Produits de la Ruche', 28, 4.8, 110, 'Idéale pour se prémunir contre les conséquences de la période hivernale.', 'مثالي للوقاية من تداعيات فصل الشتاء.', 'La Gelée Royale est idéale pour se prémunir contre les conséquences de la période hivernale. Forever Royal Jelly renforce en douceur les défenses naturelles de l''organisme.', NULL, '["75,8 mg de gelée royale lyophilisée (équivalent à 250 mg de gelée royale fraîche par comprimé)"]'::jsonb, NULL, 'Prendre 1 à 2 comprimés à croquer par jour.', NULL, '/products/page-11.jpg', '60 comprimés', false, false, NULL, 10),
  ('p12', 'forever-active-pro-b', 'Forever Active Pro-B', 'أكتيف برو-بي فوريفر', 'Nutrition', 32, 4.8, 245, 'Probiotiques et prébiotiques pour un coup de pouce à la flore intestinale.', 'بروبيوتيك وبريبايوتيك لدعم فلورا الأمعاء.', 'La flore intestinale est composée de plusieurs milliards de bactéries qui participent au bon fonctionnement de l''organisme. Forever Active Pro-B associe de façon synergique des probiotiques et des prébiotiques.', 'تتكون فلورا الأمعاء من مليارات البكتيريا التي تساهم في حسن سير عمل الجسم. يجمع Forever Active Pro-B بشكل تآزري بين البروبيوتيك والبريبايوتيك.', '["Probiotiques","Prébiotiques"]'::jsonb, '["بروبيوتيك","بريبايوتيك"]'::jsonb, 'Prendre 1 gélule par jour avec un verre d''eau, 30 minutes avant le repas.', 'تناول كبسولة واحدة يومياً مع كوب ماء، قبل 30 دقيقة من الوجبة.', '/products/page-12.jpg', '30 capsules', true, false, NULL, 11),
  ('p13', 'forever-kids', 'Forever Kids', 'فوريفر كيدز', 'Nutrition', 26, 4.7, 102, '12 vitamines et 2 minéraux pour le développement de l''enfant.', '12 فيتاميناً ومعدنين لنمو الطفل.', 'Forever Kids contient 12 vitamines (A, B, C, D, E) et 2 minéraux (fer, zinc). Cette association contribue au fonctionnement normal du système immunitaire, réduit la fatigue et favorise le développement cognitif.', NULL, '["12 vitamines","Fer","Zinc"]'::jsonb, NULL, 'Enfants à partir de 4 ans et jeunes adultes : 4 comprimés à croquer par jour.', NULL, '/products/page-13.jpg', '48 comprimés', false, false, NULL, 12),
  ('p14', 'fields-of-greens', 'Fields of Greens', 'فيلدز أوف جرينز', 'Nutrition', 30, 4.5, 68, 'Jeunes pousses végétales : orge, blé, luzerne et piments de Cayenne.', 'براعم نباتية فتية: الشعير، القمح، الجلبان وفلفل الكايين.', 'Fields of Greens est obtenu à partir de jeunes pousses végétales : feuilles d''orge, de blé, de luzerne et de piments de Cayenne.', NULL, '["19% poudre de feuilles d''orge","19% poudre de pousse de blé","19% poudre de feuilles de luzerne","0,2% poudre de piments de Cayenne"]'::jsonb, NULL, 'Prendre 2 comprimés par jour.', NULL, '/products/page-13.jpg', '68 comprimés', false, false, NULL, 13),
  ('p15', 'forever-absorbent-c', 'Forever Absorbent-C', 'أبسوربنت-سي فوريفر', 'Nutrition', 24, 4.7, 178, 'Vitamine C pour réduire la fatigue et renforcer la résistance de l''organisme.', 'فيتامين سي لتقليل التعب وتقوية مقاومة الجسم.', 'La vitamine C contribue à réduire la fatigue et permet de retrouver tonus et énergie. Elle est indispensable pour renforcer la résistance de l''organisme.', NULL, '["42% de fibres naturelles d''avoine","5,2% d''acide ascorbique (vitamine C)","9,5% de miel"]'::jsonb, NULL, '1 comprimé à croquer par jour, le matin.', NULL, '/products/page-13.png', '100 comprimés', false, false, NULL, 14),
  ('p16', 'forever-ivision', 'Forever iVision', 'آي فيجن فوريفر', 'Nutrition', 34, 4.6, 59, 'Vitamines A, C, E et zinc pour protéger les yeux face aux écrans.', 'فيتامينات A وC وE والزنك لحماية العينين من الشاشات.', 'Adaptez vos yeux à un style de vie connecté ! Forever iVision est le complément alimentaire pour notre vision avec un apport complet de vitamines A, C, E et de zinc.', NULL, '["Vitamines A, C, E","Zinc","Lutemax 2020","Contient soja et poisson"]'::jsonb, NULL, 'Prendre 2 capsules par jour avec un demi-verre d''eau. Déconseillé aux fumeurs (bêta-carotène).', NULL, '/products/page-14.jpg', '60 comprimés', false, false, NULL, 15),
  ('p17', 'forever-supergreens', 'Forever Supergreens', 'سوبر جرينز فوريفر', 'Nutrition', 36, 4.6, 77, 'Plus de 20 variétés de fruits et légumes, Aloe vera, vitamine C et magnésium.', 'أكثر من 20 نوعاً من الفواكه والخضار، ألوفيرا، فيتامين سي والمغنيسيوم.', 'Forever Supergreens contient plus de 20 variétés de fruits et légumes, de l''Aloe vera, de la vitamine C et du magnésium. Ce mélange favorise le maintien des défenses naturelles et la récupération musculaire.', NULL, '["Pomme","Betterave","Tomate","Citrouille","Carotte","Épinards","Brocolis","Aloe vera","Chou Kale","Thé vert","Baies de Goji"]'::jsonb, NULL, 'Verser un stick dans votre boisson à l''Aloe Vera préférée ou dans de l''eau, mélanger et boire.', NULL, '/products/page-14.jpg', '30 sachets', false, false, NULL, 16),
  ('p18', 'forever-immublend', 'Forever ImmuBlend', 'إيميوبلند فوريفر', 'Nutrition', 33, 4.7, 94, 'Vitamines, minéraux et champignons traditionnels pour stimuler l''immunité.', 'فيتامينات ومعادن وفطريات تقليدية لتحفيز المناعة.', 'Forever ImmuBlend, association de vitamines, minéraux et de champignons traditionnellement utilisés en Asie, contribue à stimuler les défenses immunitaires pour optimiser son capital santé.', NULL, '["Mélange de champignons","Vitamines C, D3","Zinc"]'::jsonb, NULL, 'Prendre 1 comprimé par jour.', NULL, '/products/page-15.jpg', '60 capsules', false, false, NULL, 17),
  ('p19', 'forever-daily', 'Forever Daily', 'فوريفر ديلي', 'Nutrition', 40, 4.8, 134, 'Formule exclusive de 55 ingrédients pour un bien-être optimal au quotidien.', 'تركيبة حصرية من 55 مكوناً لعافية مثالية يومياً.', 'Formule exclusive de 55 ingrédients qui associe les nutriments du Complexe AOS (Aloe OligoSaccharides) à des vitamines, minéraux et phytonutriments d''extraits de fruits et légumes.', NULL, '["Complexe AOS","12 vitamines (A, B1, B2, B3, B5, B6, B8, B9, B12, C, D, E)","8 minéraux essentiels","Forever FVX20 (20 extraits de fruits et légumes)"]'::jsonb, NULL, 'Prendre 2 comprimés tous les matins.', NULL, '/products/page-16.jpg', '60 comprimés', false, false, NULL, 18),
  ('p20', 'forever-ail-thym', 'Forever Ail et Thym', 'الثوم والزعتر فوريفر', 'Nutrition', 22, 4.5, 52, 'Combinaison unique de 2 extraits de plantes pour le confort digestif.', 'مزيج فريد من مستخلصين نباتيين للراحة الهضمية.', 'Forever Ail et Thym est une combinaison unique de 2 extraits de plantes connues pour améliorer le confort digestif. Capsule sans odeur équivalent à 1000 mg d''ail frais.', NULL, '["3% d''extrait de bulbe d''ail","15,4% poudre de thym (feuilles)","Contient du soja"]'::jsonb, NULL, 'Prendre 1 capsule 3 fois par jour, de préférence pendant les repas.', NULL, '/products/page-16.jpg', '100 comprimés', false, false, NULL, 19),
  ('p21', 'forever-fiber', 'Forever Fiber', 'فايبر فوريفر', 'Nutrition', 28, 4.6, 65, '5g de fibres hydrosolubles pour stimuler les fonctions intestinales.', '5 غ من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء.', 'Forever Fiber apporte 5g de fibres hydrosolubles pour stimuler les fonctions intestinales et retrouver un bon confort digestif.', NULL, '["5 g de fibres solubles"]'::jsonb, NULL, 'Prendre 1 sachet tous les matins, à diluer dans de l''eau ou avec de la pulpe stabilisée.', NULL, '/products/page-17.jpg', '30 sachets de 6,1 g', false, false, NULL, 20),
  ('p22', 'infusion-fleur-aloes', 'Infusion Fleur d''Aloès', 'منقوع زهرة الألوة', 'Nutrition', 18, 4.6, 48, 'Écorce d''orange, zeste de citron, cannelle et clou de girofle.', 'قشر البرتقال، قشر الليمون، القرفة والقرنفل.', 'Cette infusion à l''arôme subtil et délicat associe les goûts acidulés de l''écorce d''orange et de zeste de citron, les saveurs épicées de la cannelle et du clou de girofle. Apporte un bien-être digestif.', NULL, '["Cannelle","Zestes d''orange","Clous de girofle","Feuilles de mûrier","Poivre de Jamaïque","Fleur d''aloès","Camomille"]'::jsonb, NULL, 'Laisser infuser 1 sachet dans environ 1 litre d''eau.', NULL, '/products/page-17.jpg', '25 sachets', false, false, NULL, 21),
  ('p23', 'vitolize-femmes', 'Vitolize Femmes', 'فيتولايز للنساء', 'Nutrition', 36, 4.6, 71, 'Plantes, vitamines et minéraux conçus spécialement pour les femmes.', 'نباتات وفيتامينات ومعادن مصممة خصيصاً للنساء.', 'Ce mélange naturel de plantes, vitamines et minéraux a été spécialement conçu pour les femmes. La vitamine B6 aide à réguler l''équilibre hormonal et la passiflore aide à diminuer le stress.', NULL, '["Poudre de pomme","Baies de Schisandra","Poudre de fruits de canneberge","Magnésium","Vitamines C, D, B12"]'::jsonb, NULL, '4 capsules par jour.', NULL, '/products/page-18.jpg', '60 capsules', false, false, NULL, 22),
  ('p24', 'vitolize-hommes', 'Vitolize Hommes', 'فيتولايز للرجال', 'Nutrition', 38, 4.6, 64, 'Vitamines, minéraux et phytostérols pour le bon fonctionnement de la prostate.', 'فيتامينات ومعادن وفيتوستيرول لدعم البروستاتا.', 'Vitolize Hommes contient des vitamines et des minéraux, ainsi que des phytostérols pour conserver un bon fonctionnement de la prostate. Le zinc contribue au maintien normal de la fertilité.', NULL, '["Huile de pépins de citrouille","Vitamines B6, C, D, E","Zinc","Sélénium","Contient soja et poisson"]'::jsonb, NULL, '2 capsules par jour.', NULL, '/products/page-18.jpg', '120 capsules', false, false, NULL, 23),
  ('p25', 'forever-move', 'Forever Move', 'فوريفر موف', 'Nutrition', 42, 4.7, 88, 'Membrane de coquille d''œuf NEM® et curcuma BioCurc® pour le confort articulaire.', 'غشاء قشر البيض NEM® وكركم BioCurc® لراحة المفاصل.', 'Forever Move est l''association de deux ingrédients brevetés, la membrane de coquille d''œuf NEM® et le curcuma BioCurc®. Ils agissent en synergie pour favoriser un confort articulaire optimal.', NULL, '["Membrane de coquille d''œuf NEM®","Extrait de rhizome de curcuma BioCurc®"]'::jsonb, NULL, 'Prendre 3 capsules par jour.', NULL, '/products/page-19.jpg', '90 capsules', false, false, NULL, 24),
  ('p26', 'forever-calcium', 'Forever Calcium', 'كالسيوم فوريفر', 'Nutrition', 26, 4.6, 57, 'Calcium, magnésium et vitamines pour une ossature normale.', 'كالسيوم ومغنيسيوم وفيتامينات لعظام طبيعية.', 'Forever Calcium contient des vitamines C et D ainsi que des minéraux (calcium, magnésium, manganèse, zinc, cuivre) pour contribuer au maintien d''une ossature et d''une fonction musculaire normales.', NULL, '["Calcium","Magnésium","Vitamine C","Zinc","Manganèse","Cuivre","Vitamine D"]'::jsonb, NULL, '4 comprimés par jour.', NULL, '/products/page-20.jpg', '376 comprimés', false, false, NULL, 25),
  ('p27', 'forever-arctic-sea', 'Forever Arctic-Sea', 'آركتيك-سي فوريفر', 'Nutrition', 40, 4.8, 142, 'Oméga-3 (EPA et DHA) pour le fonctionnement normal du cerveau et du cœur.', 'أوميغا-3 (EPA وDHA) لوظيفة طبيعية للدماغ والقلب.', 'Forever Arctic-Sea contient des acides gras insaturés, des oméga-3, dont de l''EPA et du DHA présents dans les huiles de poissons et de calamar. Ils contribuent au fonctionnement normal du cerveau et du cœur.', 'يحتوي Forever Arctic-Sea على أحماض دهنية غير مشبعة، أوميغا-3، بما في ذلك EPA وDHA الموجودة في زيوت الأسماك والحبار. تساهم في الوظيفة الطبيعية للدماغ والقلب.', '["45,9% huile de poissons","16,6% huile de calamar","11,3% huile d''olive extravierge","Contient du poisson"]'::jsonb, '["45.9% زيت السمك","16.6% زيت الحبار","11.3% زيت زيتون بكر ممتاز","يحتوي على السمك"]'::jsonb, 'Prendre 2 capsules 3 fois par jour, soit 6 capsules par jour.', 'تناول كبسولتين 3 مرات يومياً، أي 6 كبسولات في اليوم.', '/products/page-20.jpg', '90 capsules', true, false, NULL, 26),
  ('p28', 'aloe-msm-gel', 'Aloe MSM Gel', 'جل الألوفيرا إم إس إم', 'Nutrition', 25, 4.7, 99, 'Soufre organique pour favoriser le maintien du tissu conjonctif.', 'كبريت عضوي لدعم النسيج الضام.', 'Le methyl sulfonyl méthane (MSM) est une source stable et naturelle de soufre organique, présent en concentration élevée dans les articulations, favorisant le maintien de l''intégrité du tissu conjonctif.', 'الميثيل سلفونيل ميثان (MSM) مصدر مستقر وطبيعي للكبريت العضوي، موجود بتركيز عالٍ في المفاصل، ويساهم في الحفاظ على سلامة النسيج الضام.', '["Gel d''aloès","15% de MSM"]'::jsonb, '["جل الألوة","15% MSM"]'::jsonb, 'Appliquer en massages généreux sur les zones nécessaires.', 'يُطبق بتدليك سخي على المناطق المطلوبة.', '/products/page-21.jpg', '118 ml', true, false, NULL, 27),
  ('p29', 'emulsion-thermogene', 'Émulsion Thermogène', 'مستحلب التدفئة', 'Nutrition', 27, 4.5, 46, 'Crème de massage au menthol pour soulager les articulations.', 'كريم تدليك بالمنثول لتخفيف آلام المفاصل.', 'Cette crème de massage est le complément idéal pour soulager les articulations ou préparer les muscles à l''effort grâce au menthol et aux huiles d''eucalyptus, de sésame, de jojoba et d''abricot.', NULL, '["35,9% menthol et huiles essentielles"]'::jsonb, NULL, 'Appliquer en massages. Ne pas appliquer sur le visage.', NULL, '/products/page-21.jpg', '118 ml', false, false, NULL, 28),
  ('p30', 'forever-argi-plus', 'Forever Argi+', 'أرجي+ فوريفر', 'Nutrition', 44, 4.7, 103, 'L-Arginine et cocktail de vitamines pour l''effort extrême.', 'أل-أرجينين ومزيج فيتامينات للمجهود الشديد.', 'Vitalité, force, endurance, sport extrême : Forever Argi+ combine la L-Arginine à un cocktail unique de vitamines et d''extraits de fruits pour un accompagnement idéal pendant l''effort.', NULL, '["51% de L-Arginine","Mélange d''extraits de fruits rouges","Vitamines C, B6, B9"]'::jsonb, NULL, 'Mélanger une dosette à 240 ml de boisson (eau, jus de fruits ou Pulpe d''Aloe Vera).', NULL, '/products/page-22.jpg', '30 sachets de 10 g', false, false, NULL, 29),
  ('p31', 'forever-lean', 'Forever Lean', 'فوريفر لين', 'Fitness & Minceur', 39, 4.6, 87, 'Fibres de cactus Opuntia pour aider à contrôler le poids.', 'ألياف الصبار أوبونتيا للمساعدة في التحكم بالوزن.', 'Les fibres extraites du cactus Opuntia ficus-indica ont la capacité d''attirer et retenir les graisses et les sucres. Les graines de haricots blancs et le chrome aident à réduire l''apport calorique journalier.', NULL, '["Feuilles de Neopuntia®","Extrait de graines de haricot sec","Chrome"]'::jsonb, NULL, 'Prendre 1 capsule avec un verre d''eau avant le repas. Jusqu''à 4 capsules par jour.', NULL, '/products/page-23.jpg', '63 capsules', false, false, NULL, 30),
  ('p32', 'forever-therm', 'Forever Therm', 'فوريفر ثيرم', 'Fitness & Minceur', 41, 4.6, 79, 'Thé vert, café vert et guarana pour contrôler le poids et l''énergie.', 'شاي أخضر، قهوة خضراء وجوارانا للتحكم بالوزن والطاقة.', 'Forever Therm est un brûleur de graisses qui contient des extraits de plantes (thé vert, café vert, guarana) associés à des vitamines du groupe B et de la vitamine C. Aide à contrôler le poids et réduire la fatigue.', NULL, '["Thé vert","Guarana","Café vert","8 vitamines (B1, B2, B3, B5, B6, B9, B12, C)"]'::jsonb, NULL, 'Prendre 2 comprimés le matin.', NULL, '/products/page-23.jpg', '60 comprimés', false, false, NULL, 31),
  ('p33', 'forever-lite-ultra-vanille', 'Forever Lite Ultra — Vanille', 'لايت ألترا فوريفر - فانيليا', 'Fitness & Minceur', 48, 4.8, 211, '24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.', '24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.', 'Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.', 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.', '["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E","Protéines","Contient soja et lait"]'::jsonb, '["فيتامينات B1، B2، B3، B5، B6، B8، B9، B12، D، E","بروتينات","يحتوي على الصويا والحليب"]'::jsonb, 'Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.', 'في الخلاط: ملعقة قياس واحدة، 240 مل من السائل، فواكه حسب الاختيار ومكعبات ثلج. اخلط لمدة 20 إلى 30 ثانية.', '/products/page-25.jpg', '470 g', true, false, NULL, 32),
  ('p34', 'forever-lite-ultra-chocolat', 'Forever Lite Ultra — Chocolat', 'لايت ألترا فوريفر - شوكولاتة', 'Fitness & Minceur', 48, 4.7, 174, '24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.', '24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.', 'Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.', NULL, '["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E","Protéines","Contient soja et lait"]'::jsonb, NULL, 'Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.', NULL, '/products/page-25.jpg', '471 g', false, false, NULL, 33),
  ('p35', 'pack-detox-pulpe', 'Pack Detox — Pulpe d''Aloès', 'حزمة ديتوكس - لب الألوة', 'Packs', 95, 4.8, 63, 'Détoxifier le corps, sensation de légèreté et énergie retrouvée.', 'تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.', 'Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.', 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلص من السموم، شعور بالخفة وطاقة متجددة.', '[]'::jsonb, NULL, 'Suivre le livret de programme inclus pendant la durée du programme Detox.', 'اتبع كتيب البرنامج المرفق طوال مدة برنامج ديتوكس.', '/products/page-26.jpg', '1 programme', true, false, '["1x Forever Ultra Lite (Vanille ou Chocolat)","2x Pulpes d''Aloès Stabilisée","1x Forever Fields of Greens","1x Forever Active Pro-B","1x Livret de suivi du programme"]'::jsonb, 34),
  ('p36', 'pack-detox-berry', 'Pack Detox — Aloe Berry Nectar', 'حزمة ديتوكس - ألوفيرا بيري نكتار', 'Packs', 95, 4.7, 51, 'Détoxifier le corps, sensation de légèreté et énergie retrouvée.', 'تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.', 'Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.', NULL, '[]'::jsonb, NULL, 'Suivre le livret de programme inclus pendant la durée du programme Detox.', NULL, '/products/page-26.jpg', '1 programme', false, false, '["1x Forever Ultra Lite (Vanille ou Chocolat)","2x Aloe Berry Nectar","1x Forever Fields of Greens","1x Forever Active Pro-B","1x Livret de suivi du programme"]'::jsonb, 35),
  ('p37', 'smart-consumer-pack', 'Smart Consumer Pack', 'حزمة المستهلك الذكية', 'Packs', 49, 4.6, 38, '4 produits essentiels à utiliser tous les jours.', '4 منتجات أساسية للاستخدام اليومي.', 'Découvrez nos produits grâce à ce nouveau pack : 4 produits parmi nos essentiels pour avoir le meilleur de Forever à portée de main.', NULL, '[]'::jsonb, NULL, 'À utiliser dans le cadre de votre routine quotidienne.', NULL, '/products/page-27.jpg', '4 produits', false, false, '["Forever Aloe Lips with Jojoba","Forever Bright Aloe Body Lotion","Forever Aloe Pêche 330 ml","Totebag siglé Forever Living Products"]'::jsonb, 36),
  ('p38', 'pack-hygiene', 'Pack Hygiène', 'حزمة العناية اليومية', 'Packs', 89, 4.7, 44, 'Produits d''hygiène et cosmétiques pour toute la famille.', 'منتجات عناية ونظافة لكل العائلة.', 'Le pack Hygiène réunit les indispensables Forever pour le soin du corps et du visage au quotidien.', NULL, '[]'::jsonb, NULL, 'À intégrer dans votre routine quotidienne.', NULL, '/products/page-28.jpg', '5 produits', false, false, '["1x Aloe First","1x Aloe Liquid Soap","2x Stick Déodorant Aloès","1x Avocado Face & Body Soap","1x Shampoing Aloe-Jojoba","1x Après-shampoing Aloe-Jojoba"]'::jsonb, 37),
  ('p39', 'programme-bien-etre', 'Programme Bien-être', 'برنامج العافية', 'Packs', 119, 4.8, 57, 'Un bien-être au quotidien, de l''intérieur comme de l''extérieur.', 'عافية يومية، من الداخل والخارج.', 'Le pack Bien-être associe nutrition et soin du corps pour un programme complet de bien-être quotidien.', NULL, '[]'::jsonb, NULL, 'À suivre quotidiennement, en complément d''une alimentation équilibrée.', NULL, '/products/page-28.jpg', '6 produits', false, false, '["1x Pulpe d''Aloès Stabilisée","1x Aloe Berry Nectar","1x Forever Active Pro-B","1x Forever Absorbent-C","1x Forever Fields of Greens","2x Forever Bright Aloès"]'::jsonb, 38),
  ('p40', 'pack-go2fbo', 'Pack de Démarrage — GO2FBO', 'حزمة الانطلاق - GO2FBO', 'Packs', 175, 4.8, 29, 'Le pack de démarrage complet pour découvrir l''univers Forever.', 'حزمة الانطلاق الكاملة لاكتشاف عالم فوريفر.', 'Le programme GO2FBO réunit une large sélection de produits phares pour découvrir l''ensemble des gammes Forever.', NULL, '[]'::jsonb, NULL, 'Idéal pour démarrer votre activité de distributeur ou découvrir la marque.', NULL, '/products/page-29.jpg', 'Pack complet', false, true, '["2x Mini Aloe Vera Gel","Aloe-Jojoba Shampoo & Conditioner","Aloe Heat Lotion","Forever Arctic Sea","Aloe Avocado Soap","Aloe Sunscreen","Forever Absorbent-C","Forever Ail & Thym","Forever Bee Pollen","Forever Daily","Forever Kids"]'::jsonb, 39),
  ('p41', 'start-your-journey-pack', 'Start Your Journey Pack', 'حزمة بداية الرحلة', 'Packs', 149, 4.7, 33, 'Quatre produits essentiels pour démarrer votre routine Forever.', 'أربعة منتجات أساسية لبدء روتينك مع فوريفر.', 'Un pack pensé pour accompagner vos premiers pas avec les produits Forever au quotidien.', NULL, '[]'::jsonb, NULL, 'À utiliser quotidiennement pour intégrer les essentiels Forever à votre routine.', NULL, '/products/page-29.jpg', 'Pack complet', false, true, '["4x Forever Aloe Lips with Jojoba","2x Forever Bright Toothgel","1x Aloe Propolis Crème","1x Aloe Vera Gelly","2x Aloe Ever-Shield Deodorant","1x Aloe Moisturizing Lotion","1x Aloe Body Wash","1x Aloe Body Lotion"]'::jsonb, 40),
  ('p42', 'aloe-first', 'Aloe First', 'ألوي فيرست', 'Beauté', 27, 4.8, 198, 'La brume quotidienne pour hydrater, rafraîchir et tonifier l''épiderme.', 'الرذاذ اليومي للترطيب والانتعاش وتنشيط البشرة.', 'Aloe First est la brume à utiliser quotidiennement pour hydrater, rafraîchir et tonifier l''épiderme du visage et du corps grâce à sa formule enrichie de 11 extraits de plantes, d''Aloe Vera, de propolis et d''allantoïne. Son pH neutre s''adapte aux peaux les plus sensibles.', 'Aloe First هو الرذاذ الذي يُستخدم يومياً لترطيب وإنعاش وتنشيط بشرة الوجه والجسم بفضل تركيبته الغنية بـ11 مستخلصاً نباتياً والألوفيرا والبروبوليس والألانتوين. درجة حموضته المتعادلة تناسب حتى أكثر البشرات حساسية.', '["80,3% de gel d''aloès","11 extraits de plantes","Propolis","Allantoïne"]'::jsonb, '["80.3% جل ألوة","11 مستخلصاً نباتياً","بروبوليس","ألانتوين"]'::jsonb, 'Avant l''application de soins cosmétiques et à tout moment de la journée pour hydrater la peau.', 'قبل تطبيق العناية التجميلية وفي أي وقت من اليوم لترطيب البشرة.', '/products/page-31.jpg', '118 ml', true, false, NULL, 41),
  ('p43', 'aloe-propolis-creme', 'Aloe Propolis Crème', 'كريم البروبوليس بالألوة', 'Beauté', 24, 4.8, 167, 'Un véritable soin anti-bactérien et réparateur pour les irritations cutanées.', 'عناية حقيقية مضادة للبكتيريا ومُصلحة لتهيجات البشرة.', 'L''aloès associé à la propolis font de cette crème à la texture riche un véritable soin anti-bactérien et réparateur. La camomille, l''allantoïne et les vitamines A et E apportent à la peau douceur et souplesse.', 'الألوة المرتبطة بالبروبوليس تجعل من هذا الكريم ذي القوام الغني عناية حقيقية مضادة للبكتيريا ومُصلحة. البابونج والألانتوين وفيتامينات A وE تمنح البشرة نعومة ومرونة.', '["74,1% de gel d''aloès","0,5% propolis","Camomille","Allantoïne","Vitamines A et E"]'::jsonb, '["74.1% جل ألوة","0.5% بروبوليس","بابونج","ألانتوين","فيتامينات A وE"]'::jsonb, 'Appliquer sur une peau parfaitement nettoyée.', 'يُطبق على بشرة نظيفة تماماً.', '/products/page-31.jpg', '113 g', true, false, NULL, 42),
  ('p44', 'gelee-aloes', 'Gelée Aloès', 'جل الألوة', 'Beauté', 19, 4.7, 112, 'Gel transparent non gras, idéal contre irritations et coups de soleil.', 'جل شفاف غير دهني، مثالي للتهيجات وحروق الشمس.', 'Particulièrement riche en Aloe Vera, ce gel transparent non gras possède toutes les vertus de la plante. Il hydrate et régénère l''épiderme. Idéal contre les irritations de la peau et les coups de soleil.', NULL, '["84,4% de gel d''aloès"]'::jsonb, NULL, 'Appliquer généreusement sur une peau parfaitement nettoyée.', NULL, '/products/page-31.jpg', '473 ml', false, false, NULL, 43),
  ('p45', 'aloe-body-lotion', 'Aloe Body Lotion', 'لوشن الجسم بالألوة', 'Beauté', 23, 4.8, 156, 'Apaise, hydrate et protège la peau du dessèchement.', 'يهدئ ويرطب ويحمي البشرة من الجفاف.', 'L''Aloe Body Lotion apaise, hydrate et protège la peau du dessèchement. Grâce à sa concentration en gel d''Aloe Vera, huile d''argan, vitamine E et huile de macadamia, elle pénètre rapidement et laisse la peau souple. Sans silicone.', NULL, '["Gel Aloe Vera","Huile d''argan","Vitamine E","Huile de graines de macadamia"]'::jsonb, NULL, 'Appliquer généreusement et masser doucement jusqu''à absorption complète.', NULL, '/products/page-32.jpg', '236 ml', false, false, NULL, 44),
  ('p46', 'aloe-liquid-soap', 'Aloe Liquid Soap', 'صابون الألوة السائل', 'Beauté', 18, 4.7, 121, 'Savon doux pour le visage, le corps et les cheveux, dès 3 ans.', 'صابون لطيف للوجه والجسم والشعر، من سن 3 سنوات.', 'L''Aloe Liquid Soap est un savon pour le visage, le corps et les cheveux à destination de toute la famille. Sa formule très douce nettoie délicatement, respecte la peau et les cheveux, hydrate et préserve du dessèchement.', NULL, '["39% de Gel d''Aloe vera","Agents lavants de noix de coco","Extrait de concombre et jojoba","Huile d''Argan","Glycérine végétale"]'::jsonb, NULL, 'Émulsionner sur peau ou cheveux mouillés, rincer abondamment.', NULL, '/products/page-33.jpg', '473 ml', false, true, NULL, 45),
  ('p47', 'forever-bright-toothgel', 'Forever Bright Toothgel', 'معجون الأسنان برايت فوريفر', 'Beauté', 14, 4.7, 143, 'Gel dentaire sans fluor qui ravive l''émail des dents.', 'جل أسنان بدون فلورايد يُجدد مينا الأسنان.', 'Ce gel dentaire, sans fluor et non abrasif, ravive l''émail de vos dents. Son complexe à la chlorophylle, sans menthol, procure une sensation de fraîcheur naturelle grâce à la propolis et à l''aloès.', 'جل الأسنان هذا، الخالي من الفلورايد وغير الكاشط، يُجدد مينا أسنانك. مركبه من الكلوروفيل، بدون منثول، يمنح إحساساً طبيعياً بالانتعاش بفضل البروبوليس والألوة.', '["35,5% de gel d''aloès","Chlorophylle","Propolis"]'::jsonb, '["35.5% جل ألوة","كلوروفيل","بروبوليس"]'::jsonb, 'Se brosser les dents après chaque repas.', 'تنظيف الأسنان بالفرشاة بعد كل وجبة.', '/products/page-34.jpg', '130 g', true, false, NULL, 46),
  ('p48', 'stick-deodorant-aloes', 'Aloe Ever-Shield — Stick Déodorant', 'مزيل العرق إيفر-شيلد بالألوة', 'Beauté', 13, 4.7, 132, 'Sans alcool, sans sels d''aluminium, protection efficace sans tacher.', 'بدون كحول أو أملاح الألومنيوم، حماية فعالة بدون بقع.', 'Sans alcool, sans sels d''aluminium et discrètement parfumé, ce déodorant assure une protection efficace sans tacher vos vêtements. Sa formule à l''aloès adoucit et hydrate la peau.', 'بدون كحول أو أملاح الألومنيوم ومعطر بلطف، يوفر هذا المزيل حماية فعالة بدون ترك بقع على ملابسك. تركيبته بالألوة تلين وترطب البشرة.', '["Gel d''aloès"]'::jsonb, '["جل الألوة"]'::jsonb, 'Appliquer le matin ou avant l''effort sur une peau propre et sèche.', 'يُطبق في الصباح أو قبل المجهود على بشرة نظيفة وجافة.', '/products/page-34.jpg', '67 g', true, false, NULL, 47),
  ('p49', 'instant-hand-cleanser', 'Instant Hand Cleanser', 'منظف اليدين الفوري', 'Beauté', 9, 4.5, 88, 'Nettoie les mains en toute sécurité où que vous soyez.', 'ينظف اليدين بأمان أينما كنت.', 'Une formule gel pour nettoyer vos mains en toute sécurité où que vous soyez. Enrichie en Aloe Vera, sa formule parfume délicatement les mains sans les dessécher.', NULL, '["Alcool","Aloe Vera"]'::jsonb, NULL, 'Verser une noisette de gel et frotter les mains jusqu''à ce qu''elles soient sèches.', NULL, '/products/page-34.jpg', '28 g', false, false, NULL, 48),
  ('p50', 'aloe-lips', 'Aloe Lèvres (Aloe Lips)', 'بلسم الشفاه بالألوة', 'Beauté', 8, 4.9, 287, 'Baume ultra-hydratant à l''Aloe Vera, huile de jojoba et cire d''abeille.', 'بلسم مرطب جداً بالألوفيرا وزيت الجوجوبا وشمع العسل.', 'Une formule ultra-hydratante et protectrice pour ce baume à lèvres qui associe Aloe Vera, huile de jojoba et cire d''abeille. Apporte un confort réparateur pour les lèvres les plus desséchées.', 'تركيبة مرطبة وواقية للغاية لهذا البلسم الذي يجمع بين الألوفيرا وزيت الجوجوبا وشمع العسل. يوفر راحة مُصلحة للشفاه الأكثر جفافاً.', '["27,5% de gel d''aloès","20,4% d''huile de jojoba","Cire d''abeille"]'::jsonb, '["27.5% جل ألوة","20.4% زيت جوجوبا","شمع العسل"]'::jsonb, 'Appliquer sur les lèvres dès que le besoin se fait sentir.', 'يُطبق على الشفاه عند الحاجة.', '/products/page-35.jpg', '4,5 g', true, false, NULL, 49),
  ('p51', 'savon-avocat', 'Forever Avocado Face & Body Soap', 'صابون الأفوكادو للوجه والجسم', 'Beauté', 12, 4.7, 119, 'Beurre d''avocat, nettoie toutes les peaux même les plus sensibles.', 'زبدة الأفوكادو، تنظف حتى أكثر البشرات حساسية.', 'Enrichi en beurre d''avocat, le Savon à l''Avocat nettoie toutes les peaux même les plus sensibles en les hydratant. Son léger parfum de fleurs de citronnier apporte un véritable plaisir.', 'مُخصب بزبدة الأفوكادو، صابون الأفوكادو ينظف جميع أنواع البشرة حتى الأكثر حساسية مع ترطيبها. عطره الخفيف من زهور الليمون يمنح متعة حقيقية.', '["Beurre d''avocat"]'::jsonb, '["زبدة الأفوكادو"]'::jsonb, 'Émulsionner chaque jour sur peau mouillée.', 'يُستحلب يومياً على بشرة مبللة.', '/products/page-35.jpg', '284 g', true, false, NULL, 50),
  ('p52', 'ecran-solaire-aloes', 'Aloe Sunscreen SPF 30', 'واقي الشمس بالألوة SPF 30', 'Beauté', 26, 4.6, 95, 'Protection SPF 30 avancée contre les UVA et UVB, sans effet blanc.', 'حماية SPF 30 متقدمة من الأشعة UVA وUVB، بدون أثر أبيض.', 'Aloe Sunscreen combine le pouvoir apaisant de l''aloès avec de l''oxyde de zinc naturel pour une protection SPF 30 avancée contre les rayons UVA et UVB. Adaptée à tous les types de peau.', 'يجمع Aloe Sunscreen بين القوة المهدئة للألوة وأكسيد الزنك الطبيعي لحماية SPF 30 متقدمة من أشعة UVA وUVB. مناسب لجميع أنواع البشرة.', '["Aloe vera","Vitamine E","Oxyde de zinc"]'::jsonb, '["ألوفيرا","فيتامين E","أكسيد الزنك"]'::jsonb, 'Appliquer uniformément avant toute exposition au soleil. Renouveler toutes les 2 heures.', 'يُطبق بانتظام وبسخاء قبل أي تعرض للشمس. يُجدد كل ساعتين.', '/products/page-36.jpg', '177 ml', true, false, NULL, 51),
  ('p53', 'gentlemans-pride', 'Gentleman''s Pride', 'جنتلمانز برايد', 'Beauté', 21, 4.6, 73, 'Crème fluide et apaisante pour calmer le feu du rasoir.', 'كريم سائل مهدئ لتهدئة تهيج الحلاقة.', 'Gentleman''s Pride est une crème fluide et légère, aux propriétés apaisantes pour calmer le feu du rasoir et les irritations. Son parfum subtil apporte une note d''élégance discrète.', NULL, '["41,8% de gel d''aloès"]'::jsonb, NULL, 'Appliquer quotidiennement sur tout le visage après le rasage.', NULL, '/products/page-36.jpg', '118 ml', false, false, NULL, 52),
  ('p54', 'aloe-moisturizing-lotion', 'Aloe Moisturizing Lotion', 'لوشن الترطيب بالألوة', 'Beauté', 22, 4.6, 81, 'Protège, nourrit et réduit les signes du vieillissement cutané.', 'يحمي ويغذي ويقلل من علامات شيخوخة البشرة.', 'Ce soin protège, nourrit et réduit les signes du vieillissement cutané. Sa texture fondante, enrichie en collagène et en élastine, hydrate et repulpe. Convient aux peaux sensibles.', NULL, '["36,5% de gel d''aloès","Collagène","Élastine"]'::jsonb, NULL, 'Appliquer matin et soir après l''Aloe First.', NULL, '/products/page-36.jpg', '120 ml', false, false, NULL, 53),
  ('p55', 'r3-factor', 'R3 Factor', 'آر3 فاكتور', 'Beauté', 39, 4.7, 76, 'Répare, renouvelle, repulpe — exfoliation naturelle de la peau.', 'يُصلح، يجدد، يملأ - تقشير طبيعي للبشرة.', 'Répare, renouvelle, repulpe. Ce soin favorise l''exfoliation naturelle de la peau et diminue l''apparence des pores. Les rides et ridules sont lissées, le grain de peau est plus fin.', NULL, '["35,48% de gel d''aloès"]'::jsonb, NULL, 'Appliquer matin et soir sur peau nettoyée. Par temps ensoleillé, protéger la peau avec l''Écran Solaire Aloès.', NULL, '/products/page-37.jpg', '69 g', false, false, NULL, 54),
  ('p56', 'serum-alpha-e-factor', 'Sérum Alpha-E Factor', 'سيروم ألفا-إي فاكتور', 'Beauté', 44, 4.7, 68, 'Véritable bouclier anti-âge aux antioxydants puissants.', 'درع حقيقي مضاد للشيخوخة بمضادات أكسدة قوية.', 'Véritable bouclier anti-âge, ce sérum allie des antioxydants puissants pour réduire les signes du vieillissement et les agressions cutanées. La peau retrouve son éclat.', NULL, '["Vitamines A et E","Bisabolol","Huile de bourrache","Gel d''aloès"]'::jsonb, NULL, 'Appliquer seul ou avant votre soin.', NULL, '/products/page-37.jpg', '187 ml', false, false, NULL, 55),
  ('p57', 'aloe-body-wash', 'Aloe Body Wash', 'غسول الجسم بالألوة', 'Beauté', 20, 4.7, 104, 'Nettoie et revitalise la peau délicatement tout en respectant son équilibre.', 'ينظف وينشط البشرة بلطف مع الحفاظ على توازنها.', 'Grâce à sa formule très douce, l''Aloe Body Wash nettoie et revitalise la peau délicatement. Sa texture émulsion-gel fraîche laisse un parfum envoûtant et une peau propre, douce et bien hydratée.', NULL, '["Gel Aloe Vera","Vitamines A, C, E"]'::jsonb, NULL, 'Appliquer sur un luffa ou une éponge, savonner en mouvements circulaires, bien rincer.', NULL, '/products/page-38.jpg', '236 ml', false, false, NULL, 56),
  ('p58', 'shampoing-aloe-jojoba', 'Shampoing Aloe-Jojoba', 'شامبو الألوة والجوجوبا', 'Cheveux', 21, 4.7, 138, 'Nettoie en profondeur et hydrate tous les types de cheveux.', 'ينظف بعمق ويرطب جميع أنواع الشعر.', 'Conçu pour nettoyer en profondeur et hydrater tous les types de cheveux. En associant l''Aloe vera pur à l''huile de jojoba fortifiante et l''huile d''argan, ce shampoing est parfait pour un usage quotidien. Sans sulfates ajoutés.', NULL, '["39,7% de gel d''aloès","Huile de jojoba","Huile d''argan","Huile d''églantier"]'::jsonb, NULL, 'Appliquer une noix de produit, masser, rincer abondamment.', NULL, '/products/page-39.jpg', '296 ml', false, false, NULL, 57),
  ('p59', 'apres-shampoing-aloe-jojoba', 'Après-Shampoing Aloe-Jojoba', 'بلسم الألوة والجوجوبا', 'Cheveux', 21, 4.7, 109, 'Adoucit, démêle, nourrit les cheveux et leur donne de la brillance.', 'يلين وينعم ويغذي الشعر ويمنحه لمعاناً.', 'L''après-shampoing est un soin indispensable pour adoucir, démêler, nourrir les cheveux et leur donner de la brillance. Stimule également l''hydratation des cheveux et du cuir chevelu, sans sulfate.', NULL, '["40,7% de gel d''aloès","Huile de jojoba","Huile d''argan","Huile d''églantier"]'::jsonb, NULL, 'Appliquer sur l''ensemble de la chevelure en insistant sur les pointes, laisser agir puis rincer.', NULL, '/products/page-39.jpg', '296 ml', false, false, NULL, 58),
  ('p60', 'sonya-gel-nettoyant', 'Sonya — Gel Nettoyant', 'سونيا - جل التنظيف', 'Sonya', 24, 4.6, 62, 'Une toute nouvelle expérience du démaquillage, riche en Aloe vera et huile de Baobab.', 'تجربة جديدة كلياً لإزالة المكياج، غنية بالألوفيرا وزيت الباوباب.', 'Le gel Nettoyant Sonya offre une toute nouvelle expérience du démaquillage. Il fond sur la peau et forme une mousse onctueuse, laissant la peau douce et hydratée.', NULL, '["39,2% de gel d''aloès","Huile de Baobab"]'::jsonb, NULL, 'Utiliser matin et soir pour nettoyer le visage et le cou.', NULL, '/products/page-41.jpg', '177 ml', false, false, NULL, 59),
  ('p61', 'sonya-gel-eclat', 'Sonya — Gel Éclat', 'سونيا - جل الإشراقة', 'Sonya', 26, 4.6, 54, 'Retrouvez l''éclat naturel de votre teint.', 'استعيدي إشراقة بشرتك الطبيعية.', 'Retrouvez l''éclat naturel de votre teint grâce au gel Éclat Sonya. L''Aloe vera et des actifs végétaux hydratent la peau tandis qu''un peptide gomme les imperfections et uniformise le teint.', NULL, '["42,9% de gel d''aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou matin et soir.', NULL, '/products/page-41.jpg', '28,3 g', false, false, NULL, 60),
  ('p62', 'sonya-masque-gel', 'Sonya — Masque Gel', 'سونيا - قناع جل', 'Sonya', 28, 4.7, 58, 'À appliquer avant le coucher pour optimiser la récupération nocturne.', 'يُطبق قبل النوم لتحسين التجدد الليلي.', 'À appliquer juste avant le coucher, le masque gel Sonya se transforme en une texture délicieusement fraîche et vite absorbée, optimisant le processus de récupération nocturne de la peau.', NULL, '["43,2% de gel d''aloès"]'::jsonb, NULL, 'Appliquer au coucher et rincer au réveil, 2 à 3 fois par semaine.', NULL, '/products/page-41.jpg', '59 ml', false, false, NULL, 61),
  ('p63', 'sonya-gel-hydratant', 'Sonya — Gel Hydratant', 'سونيا - جل الترطيب', 'Sonya', 27, 4.7, 49, 'Fond sur la peau et unifie le teint, riche en Aloe vera.', 'يذوب على البشرة ويوحد لون البشرة، غني بالألوفيرا.', 'Le Gel Hydratant Sonya fond sur la peau, l''enveloppe d''un voile de douceur et unifie le teint. Il associe l''Aloe vera à de nombreux extraits végétaux pour optimiser l''hydratation.', NULL, '["37,9% de gel d''aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou matin et soir.', NULL, '/products/page-41.jpg', '60 ml', false, false, NULL, 62),
  ('p64', 'infinite-demaquillant-hydratant', 'Infinite — Démaquillant Hydratant', 'إنفينيت - مزيل مكياج مرطب', 'Infinite', 32, 4.6, 41, 'Nettoie et hydrate la peau en un seul geste.', 'ينظف ويرطب البشرة بخطوة واحدة.', 'Le Démaquillant Hydratant nettoie et hydrate la peau en un seul geste. L''actif nettoyant utilisé, extrait naturel de noix de coco, est hypoallergénique et non irritant.', NULL, '["35% de gel d''aloès","Extrait naturel de noix de coco"]'::jsonb, NULL, 'Utiliser le matin et le soir pour nettoyer le visage et le cou.', NULL, '/products/page-42.jpg', '177 ml', false, false, NULL, 63),
  ('p65', 'infinite-serum-raffermissant', 'Infinite — Sérum Raffermissant', 'إنفينيت - سيروم الشد', 'Infinite', 58, 4.8, 67, 'Un véritable élixir de jeunesse à la chaîne de 3 acides aminés.', 'إكسير شباب حقيقي بسلسلة من 3 أحماض أمينية.', 'Le Sérum Raffermissant est un véritable élixir de jeunesse. Il combat les signes visibles de l''âge en intensifiant la puissance de l''Aloe vera grâce à une chaîne spécifique de trois acides aminés.', 'السيروم المشدد هو إكسير شباب حقيقي. يحارب علامات التقدم في السن الظاهرة من خلال تكثيف قوة الألوفيرا بفضل سلسلة محددة من ثلاثة أحماض أمينية.', '["49% gel d''aloès"]'::jsonb, '["49% جل ألوة"]'::jsonb, 'Appliquer sur le visage et le cou préalablement nettoyés avec le Démaquillant Hydratant.', 'يُطبق على الوجه والرقبة بعد التنظيف بمزيل المكياج المرطب.', '/products/page-42.jpg', '48,2 ml', true, false, NULL, 64),
  ('p66', 'infinite-creme-reparatrice', 'Infinite — Crème Réparatrice', 'إنفينيت - كريم مُصلح', 'Infinite', 54, 4.7, 59, 'Texture légère et onctueuse, double action hydratante et réparatrice.', 'قوام خفيف وناعم، مزدوج الفعالية للترطيب والإصلاح.', 'La Crème Réparatrice, d''une texture légère et onctueuse, est riche en Aloe vera, extraits de plantes, huile de jojoba et vitamine B3. Le visage est visiblement repulpé, retrouvant jeunesse et élasticité.', NULL, '["38% gel d''aloès","Huile de jojoba","Vitamine B3"]'::jsonb, NULL, 'Utiliser le soir au coucher après application du Sérum Raffermissant.', NULL, '/products/page-42.jpg', '555 ml', false, false, NULL, 65),
  ('p67', 'infinite-complexe-raffermissant', 'Infinite — Complexe Raffermissant', 'إنفينيت - مركب الشد', 'Infinite', 49, 4.6, 38, 'Lutte de l''intérieur contre les signes apparents de l''âge.', 'يحارب من الداخل علامات التقدم في السن الظاهرة.', 'Le Complexe Raffermissant lutte de l''intérieur contre les signes apparents de l''âge. Il contient un extrait breveté de melon français, des phytocéramides ainsi que du collagène.', NULL, '["Collagène (poisson)","Vitamine C","Céramides (blé)","Extrait de melon"]'::jsonb, NULL, 'Prendre 2 comprimés par jour avec un grand verre d''eau.', NULL, '/products/page-42.jpg', '60 comprimés', false, false, NULL, 66),
  ('p68', 'infinite-lotion-tonifiante', 'Infinite — Lotion Tonifiante', 'إنفينيت - لوشن منعش', 'Infinite', 34, 4.6, 33, 'Apporte un véritable coup d''éclat à la peau.', 'يمنح البشرة إشراقة حقيقية.', 'Cette lotion tonifiante apporte un véritable coup d''éclat à la peau. Elle parfait le démaquillage et débarrasse la peau des dernières impuretés. Riche en Aloe Vera, extrait de concombre et de thé blanc.', NULL, '["46,3% de gel d''aloès","Extrait de concombre","Thé blanc"]'::jsonb, NULL, 'Appliquer généreusement à l''aide d''un disque de coton sur le visage et le cou.', NULL, '/products/page-44.jpg', '177 ml', false, false, NULL, 67),
  ('p69', 'infinite-creme-contour-yeux', 'Infinite — Crème Contour des Yeux', 'إنفينيت - كريم محيط العين', 'Infinite', 46, 4.7, 51, 'Le secret d''un regard sublimé, à l''extrait de collagène.', 'سر نظرة متألقة، بمستخلص الكولاجين.', 'La crème contour des yeux est le secret d''un regard sublimé. Elle allie l''Aloe vera à un extrait de collagène pour un regard visiblement rajeuni et à l''extrait d''arbre à soie pour effacer les signes de fatigue.', NULL, '["35,2% de gel d''aloès","Extrait de collagène","Extrait d''arbre à soie"]'::jsonb, NULL, 'Appliquer par petites touches autour des yeux en tapotant délicatement.', NULL, '/products/page-44.jpg', '21 g', false, false, NULL, 68),
  ('p70', 'infinite-soin-exfoliant', 'Infinite — Soin Exfoliant', 'إنفينيت - مقشر للبشرة', 'Infinite', 36, 4.6, 29, 'Faire peau neuve grâce au bromélaïne, papaïne et perles de jojoba.', 'بشرة جديدة بفضل البروميلين والبابايين ولؤلؤ الجوجوبا.', 'Le Soin Exfoliant est l''allié idéal pour faire peau neuve et affinée. Votre peau est exfoliée et nettoyée en profondeur grâce au bromélaïne, papaïne, perles de jojoba et de bambou.', NULL, '["34% de gel d''aloès","Bromélaïne","Papaïne","Perles de jojoba et de bambou"]'::jsonb, NULL, 'Appliquer sur le visage humide en mouvements circulaires, rincer abondamment.', NULL, '/products/page-45.jpg', '60 ml', false, false, NULL, 69),
  ('p71', 'infinite-activateur-aloes', 'Infinite — Activateur Aloès', 'إنفينيت - منشط الألوة', 'Infinite', 30, 4.6, 26, 'Soin indispensable pour parfaire le démaquillage et vitaliser le teint.', 'عناية أساسية لإتمام إزالة المكياج وتنشيط البشرة.', 'Découvrez l''Activateur Aloès, soin indispensable qui peut être utilisé seul pour parfaire le démaquillage, hydrater la peau et vitaliser le teint.', NULL, '["98,7% de gel d''Aloès"]'::jsonb, NULL, 'Appliquer sur le visage et le cou à l''aide d''un coton.', NULL, '/products/page-45.jpg', '130 ml', false, false, NULL, 70),
  ('p72', 'infinite-serum-hydratant', 'Infinite — Sérum Hydratant', 'إنفينيت - سيروم الترطيب', 'Infinite', 52, 4.8, 47, '4 acides hyaluroniques pour cibler chaque couche de la peau.', '4 أحماض هيالورونيك لاستهداف كل طبقات البشرة.', 'Le Sérum Hydratant repulpe et hydrate parfaitement votre épiderme tout en réduisant l''apparence des ridules et des rides grâce à l''association de 4 acides hyaluroniques.', NULL, '["Gel d''aloès","4 acides hyaluroniques"]'::jsonb, NULL, 'Appliquer 1 à 2 pressions sur tout le visage et le cou.', NULL, '/products/page-46.jpg', '18 ml', false, false, NULL, 71)
on conflict (id) do nothing;


-- >>> FILE: 04_enable-public-forms.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the public submit contact messages and place cash-on-delivery orders
-- directly (no backend function needed) — the same way product reviews already
-- work. Orders can only be created as 'pending', so nobody can fake a paid order.

-- Remember how each order was paid (cash on delivery vs. card).
alter table orders add column if not exists payment_method text;

-- Public can submit contact messages (they land in the admin "Messages" tab).
drop policy if exists "Public can insert contact messages" on contact_messages;
drop policy if exists "Public can insert contact messages" on contact_messages;
create policy "Public can insert contact messages"
  on contact_messages for insert
  to anon
  with check (true);

-- Public can place pending (cash-on-delivery) orders (admin "Commandes" tab).
drop policy if exists "Public can insert pending orders" on orders;
drop policy if exists "Public can insert pending orders" on orders;
create policy "Public can insert pending orders"
  on orders for insert
  to anon
  with check (payment_status = 'pending');


-- >>> FILE: 05_order-tracking.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds the order fulfilment workflow (confirm / ship / deliver / cancel) and a
-- secure way for customers to track their own order without any email service.

-- 1. Fulfilment status + a human-friendly reference (e.g. FL12345678).
alter table orders add column if not exists status text not null default 'pending';
alter table orders add column if not exists order_ref text;

-- 2. Let the logged-in admin change an order (confirm, ship, cancel, etc.).
drop policy if exists "Admin can update orders" on orders;
drop policy if exists "Admin can update orders" on orders;
create policy "Admin can update orders"
  on orders for update
  to authenticated
  using (true)
  with check (true);

-- 3. Public order tracking. A customer looks up ONE order using its reference
--    AND the email used on the order. `security definer` lets this function read
--    that single row without exposing the whole orders table to the public.
create or replace function track_order(p_ref text, p_email text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select order_ref, status, created_at, total
  from orders
  where order_ref = p_ref
    and lower(customer_email) = lower(p_email)
  limit 1;
$$;

grant execute on function track_order(text, text) to anon;


-- >>> FILE: 06_order-confirmation.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Email confirmation flow: the customer confirms or cancels their order from the
-- email buttons, and any order left unconfirmed for 24h is auto-cancelled.

-- 1. Secret token that makes the confirm/cancel email links safe (unguessable).
alter table orders add column if not exists confirm_token uuid not null default gen_random_uuid();

-- 2. The action the customer's email buttons trigger (via the /commande page).
--    Only a 'pending' order can be changed this way, and only with the right token.
create or replace function respond_order(p_ref text, p_token uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_status text;
  new_status text;
begin
  select status into cur_status
  from orders
  where order_ref = p_ref and confirm_token = p_token;

  if cur_status is null then
    return 'invalid';
  end if;

  -- Already handled (confirmed / cancelled / shipped…) → just report it back.
  if cur_status <> 'pending' then
    return cur_status;
  end if;

  if p_action = 'confirm' then
    new_status := 'confirmed';
  elsif p_action = 'cancel' then
    new_status := 'cancelled';
  else
    return 'invalid';
  end if;

  update orders set status = new_status
  where order_ref = p_ref and confirm_token = p_token;

  return new_status;
end;
$$;

grant execute on function respond_order(text, uuid, text) to anon;

-- 3. Auto-cancel: every hour, cancel pending orders older than 24h.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('auto-cancel-pending-orders');
exception when others then
  null;
end $$;

select cron.schedule(
  'auto-cancel-pending-orders',
  '0 * * * *',
  $cron$update orders set status = 'cancelled'
     where status = 'pending' and created_at < now() - interval '24 hours'$cron$
);


-- >>> FILE: 07_admin-delete-and-cleanup.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets the logged-in admin delete orders and contact messages from the panel.
-- (Reviews already had a delete policy.)

drop policy if exists "Admin can delete orders" on orders;
drop policy if exists "Admin can delete orders" on orders;
create policy "Admin can delete orders"
  on orders for delete to authenticated using (true);

drop policy if exists "Admin can delete contact messages" on contact_messages;
drop policy if exists "Admin can delete contact messages" on contact_messages;
create policy "Admin can delete contact messages"
  on contact_messages for delete to authenticated using (true);

-- ------------------------------------------------------------------
-- Optional one-time cleanup of the test data created during setup.
-- Review these, then remove the leading "-- " to run the ones you want.
-- ------------------------------------------------------------------
-- delete from orders where order_ref like 'FLTEST%' or customer_email like '%@example.com';
-- delete from contact_messages where email like '%@example.com';
-- delete from reviews where approved = false and author ilike 'test%';


-- >>> FILE: 08_new-features.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds product stock control and promo/discount codes.

-- 1. Stock per product. NULL = not tracked (always available); 0 = out of stock.
alter table products add column if not exists stock integer;

-- 2. Promo / discount codes.
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null default 'percent',   -- 'percent' | 'fixed'
  value numeric not null,
  min_subtotal numeric,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table discount_codes enable row level security;

drop policy if exists "Admin manage discount codes" on discount_codes;
drop policy if exists "Admin manage discount codes" on discount_codes;
create policy "Admin manage discount codes"
  on discount_codes for all
  to authenticated
  using (true) with check (true);

-- Customers validate a code at checkout through this function only
-- (they can't read the codes table directly).
create or replace function validate_discount(p_code text)
returns table (code text, type text, value numeric, min_subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- 3. Record the applied discount on each order.
alter table orders add column if not exists discount_code text;
alter table orders add column if not exists discount_amount numeric not null default 0;


-- >>> FILE: 09_stock-decrement.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Lets a cash-on-delivery order reduce product stock automatically.
-- Customers can't UPDATE products directly (RLS), so this runs as a trusted
-- function that only ever subtracts the ordered quantities — and never below 0.
-- Products with stock = NULL (not tracked) are left untouched.

create or replace function decrement_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update products
      set stock = greatest(0, stock - (item->>'quantity')::int)
      where id = (item->>'id')
        and stock is not null;
  end loop;
end;
$$;

grant execute on function decrement_stock(jsonb) to anon;


-- >>> FILE: 10_growth-features.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds newsletter subscribers, distributor recruitment leads, delivery zones
-- by city, and a lightweight referral program.

-- ---------------------------------------------------------------------------
-- 1. Newsletter subscribers
-- ---------------------------------------------------------------------------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);
alter table subscribers enable row level security;

drop policy if exists "Public can subscribe" on subscribers;
drop policy if exists "Public can subscribe" on subscribers;
create policy "Public can subscribe"
  on subscribers for insert
  to anon
  with check (true);

drop policy if exists "Admin can read subscribers" on subscribers;
drop policy if exists "Admin can read subscribers" on subscribers;
create policy "Admin can read subscribers"
  on subscribers for select
  to authenticated
  using (true);

drop policy if exists "Admin can delete subscribers" on subscribers;
drop policy if exists "Admin can delete subscribers" on subscribers;
create policy "Admin can delete subscribers"
  on subscribers for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. "Devenir distributeur" recruitment leads
-- ---------------------------------------------------------------------------
create table if not exists distributor_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  city text,
  message text,
  handled boolean not null default false
);
alter table distributor_leads enable row level security;

drop policy if exists "Public can submit distributor lead" on distributor_leads;
drop policy if exists "Public can submit distributor lead" on distributor_leads;
create policy "Public can submit distributor lead"
  on distributor_leads for insert
  to anon
  with check (true);

drop policy if exists "Admin can read distributor leads" on distributor_leads;
drop policy if exists "Admin can read distributor leads" on distributor_leads;
create policy "Admin can read distributor leads"
  on distributor_leads for select
  to authenticated
  using (true);

drop policy if exists "Admin can update distributor leads" on distributor_leads;
drop policy if exists "Admin can update distributor leads" on distributor_leads;
create policy "Admin can update distributor leads"
  on distributor_leads for update
  to authenticated
  using (true);

drop policy if exists "Admin can delete distributor leads" on distributor_leads;
drop policy if exists "Admin can delete distributor leads" on distributor_leads;
create policy "Admin can delete distributor leads"
  on distributor_leads for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Delivery zones — shipping fee per city
-- ---------------------------------------------------------------------------
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  city text unique not null,
  fee numeric not null default 0,
  free_threshold numeric,
  active boolean not null default true
);
alter table delivery_zones enable row level security;

drop policy if exists "Public can read active delivery zones" on delivery_zones;
drop policy if exists "Public can read active delivery zones" on delivery_zones;
create policy "Public can read active delivery zones"
  on delivery_zones for select
  to anon
  using (active = true);

drop policy if exists "Admin manage delivery zones" on delivery_zones;
drop policy if exists "Admin manage delivery zones" on delivery_zones;
create policy "Admin manage delivery zones"
  on delivery_zones for all
  to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 4. Referral program
-- ---------------------------------------------------------------------------
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  referrer_ref text not null,
  referred_order_ref text not null,
  rewarded boolean not null default false
);
alter table referrals enable row level security;

drop policy if exists "Admin can read referrals" on referrals;
drop policy if exists "Admin can read referrals" on referrals;
create policy "Admin can read referrals"
  on referrals for select
  to authenticated
  using (true);

drop policy if exists "Admin can update referrals" on referrals;
drop policy if exists "Admin can update referrals" on referrals;
create policy "Admin can update referrals"
  on referrals for update
  to authenticated
  using (true);

-- Customers submit a referral only through this function — it checks the
-- referrer's order actually exists, so nobody can insert junk data directly
-- (the referrals table has no public insert policy).
create or replace function submit_referral(p_referrer_ref text, p_referred_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_exists boolean;
begin
  if p_referrer_ref is null or p_referred_ref is null or p_referrer_ref = p_referred_ref then
    return false;
  end if;

  select exists(select 1 from orders where order_ref = p_referrer_ref) into referrer_exists;
  if not referrer_exists then
    return false;
  end if;

  insert into referrals (referrer_ref, referred_order_ref) values (p_referrer_ref, p_referred_ref);
  return true;
end;
$$;

grant execute on function submit_referral(text, text) to anon;


-- >>> FILE: 11_product-visibility.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a "hidden" flag so the admin can hide/show a product on the public site
-- without deleting it. NULL/false = visible; true = hidden (admin only).
alter table products add column if not exists hidden boolean not null default false;


-- >>> FILE: 12_loyalty-program.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Email-based loyalty points: customers earn 1 point per € automatically when
-- you mark their order "Livrée" (delivered). No customer login required.

create table if not exists loyalty_points (
  email text primary key,
  points integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table loyalty_points enable row level security;

drop policy if exists "Admin can read loyalty points" on loyalty_points;
drop policy if exists "Admin can read loyalty points" on loyalty_points;
create policy "Admin can read loyalty points"
  on loyalty_points for select
  to authenticated
  using (true);

-- Guard column so points are only ever awarded once per order.
alter table orders add column if not exists loyalty_awarded boolean not null default false;

-- When an order becomes "delivered", credit the customer's points once.
create or replace function award_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'delivered'
     and coalesce(OLD.loyalty_awarded, false) = false
     and NEW.customer_email is not null
     and NEW.customer_email <> '' then
    insert into loyalty_points (email, points)
      values (lower(NEW.customer_email), floor(NEW.total)::int)
    on conflict (email) do update
      set points = loyalty_points.points + floor(NEW.total)::int,
          updated_at = now();
    NEW.loyalty_awarded := true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_loyalty on orders;
create trigger trg_award_loyalty
  before update on orders
  for each row
  execute function award_loyalty_points();

-- Customers look up their own balance by email (returns 0 if none).
create or replace function get_loyalty(p_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select points from loyalty_points where email = lower(p_email)), 0);
$$;

grant execute on function get_loyalty(text) to anon;


-- >>> FILE: 13_order-notes.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds a free-text "notes" field to orders for the customer's delivery
-- instructions (e.g. "call before arriving", nearest landmark, floor).
alter table orders add column if not exists notes text;


-- >>> FILE: 14_site-settings.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- A single-row settings table for site-wide options the admin can edit — starting
-- with the promo announcement bar shown at the top of every page.

create table if not exists site_settings (
  id int primary key default 1,
  announcement_fr text,
  announcement_ar text,
  announcement_active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into site_settings (id, announcement_fr, announcement_ar, announcement_active)
  values (1, 'Livraison offerte dès 500 DH 🚚', 'شحن مجاني ابتداءً من 500 درهم 🚚', true)
  on conflict (id) do nothing;

alter table site_settings enable row level security;

-- Everyone can read the banner; only the logged-in admin can change it.
drop policy if exists "Public can read site settings" on site_settings;
drop policy if exists "Public can read site settings" on site_settings;
create policy "Public can read site settings"
  on site_settings for select
  using (true);

drop policy if exists "Admin can update site settings" on site_settings;
drop policy if exists "Admin can update site settings" on site_settings;
create policy "Admin can update site settings"
  on site_settings for update
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 15_product-gallery.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Adds extra product photos (a gallery) shown on the product page, in addition
-- to the main image. Stored as a list of image URLs.
alter table products add column if not exists gallery text[];


-- >>> FILE: 15_social-proof.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Powers the "social proof" popups on the storefront ("Fatima à Casablanca vient
-- de commander…"). Exposes ONLY a first name + city + product — never phone,
-- email, address or amount — through a trusted read-only function.

create or replace function recent_orders_public(p_limit int default 8)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
  from (
    select
      split_part(trim(customer_name), ' ', 1) as name,
      city,
      (items -> 0 ->> 'name') as product,
      created_at
    from orders
    where status <> 'cancelled'
      and coalesce(trim(customer_name), '') <> ''
    order by created_at desc
    limit greatest(1, least(p_limit, 20))
  ) x;
$$;

grant execute on function recent_orders_public(int) to anon;


-- >>> FILE: 16_subscriptions.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- "Recevoir chaque mois" — customers subscribe to a monthly re-delivery of a
-- consumable product. Cash-on-delivery friendly: no auto-charge — the admin sees
-- who's due and prepares the order (with the manual-order tool) each month.

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  product_id text not null,
  product_name text not null,
  quantity int not null default 1,
  frequency text not null default 'monthly',
  next_date date not null default (current_date + interval '1 month'),
  active boolean not null default true
);

alter table subscriptions enable row level security;

-- Public can create a subscription (like the other storefront forms).
drop policy if exists "Public can create subscription" on subscriptions;
drop policy if exists "Public can create subscription" on subscriptions;
create policy "Public can create subscription"
  on subscriptions for insert
  to anon
  with check (active = true);

-- Only the admin manages them.
drop policy if exists "Admin can read subscriptions" on subscriptions;
drop policy if exists "Admin can read subscriptions" on subscriptions;
create policy "Admin can read subscriptions"
  on subscriptions for select to authenticated using (true);
drop policy if exists "Admin can update subscriptions" on subscriptions;
drop policy if exists "Admin can update subscriptions" on subscriptions;
create policy "Admin can update subscriptions"
  on subscriptions for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete subscriptions" on subscriptions;
drop policy if exists "Admin can delete subscriptions" on subscriptions;
create policy "Admin can delete subscriptions"
  on subscriptions for delete to authenticated using (true);


-- >>> FILE: 17_blog.sql >>>
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
drop policy if exists "Public can read published posts" on blog_posts;
drop policy if exists "Public can read published posts" on blog_posts;
create policy "Public can read published posts"
  on blog_posts for select using (published = true);
drop policy if exists "Admin can read all posts" on blog_posts;
drop policy if exists "Admin can read all posts" on blog_posts;
create policy "Admin can read all posts"
  on blog_posts for select to authenticated using (true);
drop policy if exists "Admin can insert posts" on blog_posts;
drop policy if exists "Admin can insert posts" on blog_posts;
create policy "Admin can insert posts"
  on blog_posts for insert to authenticated with check (true);
drop policy if exists "Admin can update posts" on blog_posts;
drop policy if exists "Admin can update posts" on blog_posts;
create policy "Admin can update posts"
  on blog_posts for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete posts" on blog_posts;
drop policy if exists "Admin can delete posts" on blog_posts;
create policy "Admin can delete posts"
  on blog_posts for delete to authenticated using (true);


-- >>> FILE: 18_fix-orders-security.sql >>>
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

drop policy if exists "Public can insert pending orders" on orders;
drop policy if exists "Public can insert pending orders" on orders;
create policy "Public can insert pending orders"
  on orders for insert
  to anon, authenticated
  with check (status = 'pending' and payment_status = 'pending');


-- >>> FILE: 19_delivery-zones-maroc.sql >>>
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


-- >>> FILE: 20_track-by-phone.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Suivi de commande par TÉLÉPHONE ou email. Indispensable depuis que l'email
-- est facultatif au checkout : le client entre son n° de commande + le contact
-- utilisé (téléphone ou email). Les numéros marocains correspondent quel que
-- soit le format saisi (0612345678, 212612345678, +212 6 12 34 56 78…) : on
-- compare les 9 derniers chiffres.

create or replace function track_order_v2(p_ref text, p_contact text)
returns table (order_ref text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select o.order_ref, o.status, o.created_at, o.total
  from orders o
  where o.order_ref = trim(p_ref)
    and (
      -- correspondance par email…
      lower(o.customer_email) = lower(trim(p_contact))
      -- …ou par téléphone (9 derniers chiffres, peu importe le format)
      or (
        length(regexp_replace(p_contact, '\D', '', 'g')) >= 9
        and right(regexp_replace(coalesce(o.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(p_contact, '\D', '', 'g'), 9)
      )
    )
  limit 1;
$$;

grant execute on function track_order_v2(text, text) to anon;


-- >>> FILE: 21_stock-alerts.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- « Prévenez-moi quand c'est disponible » : capture la demande sur les produits
-- en rupture de stock, pour savoir quoi réapprovisionner et qui recontacter.

create table if not exists stock_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id text not null,
  product_name text not null,
  contact text not null,
  notified boolean not null default false
);

alter table stock_alerts enable row level security;

drop policy if exists "Public can create stock alert" on stock_alerts;
drop policy if exists "Public can create stock alert" on stock_alerts;
create policy "Public can create stock alert"
  on stock_alerts for insert to anon, authenticated with check (true);
drop policy if exists "Admin can read stock alerts" on stock_alerts;
drop policy if exists "Admin can read stock alerts" on stock_alerts;
create policy "Admin can read stock alerts"
  on stock_alerts for select to authenticated using (true);
drop policy if exists "Admin can update stock alerts" on stock_alerts;
drop policy if exists "Admin can update stock alerts" on stock_alerts;
create policy "Admin can update stock alerts"
  on stock_alerts for update to authenticated using (true) with check (true);
drop policy if exists "Admin can delete stock alerts" on stock_alerts;
drop policy if exists "Admin can delete stock alerts" on stock_alerts;
create policy "Admin can delete stock alerts"
  on stock_alerts for delete to authenticated using (true);


-- >>> FILE: 22_arabic-descriptions.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Descriptions arabes pour LES 72 produits. Après exécution, chaque fiche
-- produit s'affiche en arabe quand le client passe le site en arabe.
-- (Idempotent : peut être relancé sans risque.)

update products set description_ar = 'تجدد ألوفيرا فوريفر مظهره! بفضل خبرة 40 عاماً، أعادت فوريفر تصميم منتجها المميز وابتكرت نسخة جديدة كلياً بدون مواد حافظة وغنية بفيتامين سي، في عبوة قابلة لإعادة التدوير بنسبة 100%. السر: 99.7% جل ألوفيرا وجرعة تآزرية من فيتامين سي.' where slug = 'aloe-vera-gel-330ml';
update products set description_ar = 'تجمع التركيبة الجديدة لألوفيرا بالخوخ بين الألوفيرا (84.5%) وهريس الخوخ وعصير العنب الأبيض المركّز لنكهة ناعمة، إضافة إلى جرعة تآزرية من فيتامين سي. عبوة قابلة لإعادة التدوير 100%.' where slug = 'aloe-peche-330ml';
update products set description_ar = 'جرعة كبيرة (90.7%) من لب الألوفيرا، مع لمسة من عصير التفاح والتوت البري، وفيتامين سي، بدون أي مواد حافظة، وعبوة قابلة لإعادة التدوير 100%.' where slug = 'aloe-berry-nectar-330ml';
update products set description_ar = 'بفضل 86% من جل الألوفيرا وهريس المانجو الطبيعي، يمنح هذا الإصدار الجديد دفعة إضافية من التغذية والنكهة. بدون مواد حافظة، ومصدر لفيتامين سي.' where slug = 'aloe-mangue-1l';
update products set description_ar = 'بطعمه المنعش اللذيذ، يحتوي ألوفيرا بيري نكتار على مستخلص التوت البري مع لب الألوفيرا. تساهم النبتة في دعم الدفاعات الطبيعية للجسم.' where slug = 'aloe-berry-nectar-1l';
update products set description_ar = 'لب الألوة المثبت هو المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية. تساهم الألوفيرا في دعم الجهاز المناعي وتحتوي على مضادات أكسدة قوية.' where slug = 'pulpe-aloe-vera-stabilisee-1l';
update products set description_ar = 'لذيذ وناعم، قلب الألوة مُخصّب بمركّز عصير الخوخ. تساعد الألوفيرا على تحفيز الأيض وتساهم في الدفاعات الطبيعية للجسم.' where slug = 'aloe-bits-n-peaches-1l';
update products set description_ar = 'العسل، المعروف بـ«ذهب الخلية»، ينتجه النحل من رحيق الأزهار. بفضل قوامه السائل، يسهل إضافة عسل فوريفر إلى الطعام، وعبوته عملية لتحديد الجرعة.' where slug = 'forever-bee-honey';
update products set description_ar = 'العكبر (البروبوليس) راتينج يجمعه نحل العسل من الأشجار ويحوّله. تُستخدم هذه المادة ذات الخصائص المضادة للميكروبات لحماية الخلية من الفطريات والبكتيريا.' where slug = 'forever-propolis';
update products set description_ar = 'يجمعه النحل من الأزهار، ويحسّن حبوب لقاح فوريفر حيوية الجسم ومقاومته عند تغيّر الفصول.' where slug = 'forever-bee-pollen';
update products set description_ar = 'الغذاء الملكي مثالي للوقاية من تداعيات فصل الشتاء. يعزّز الغذاء الملكي من فوريفر بلطف الدفاعات الطبيعية للجسم.' where slug = 'forever-royal-jelly';
update products set description_ar = 'تتكون فلورا الأمعاء من مليارات البكتيريا التي تساهم في حسن سير عمل الجسم. يجمع Forever Active Pro-B بشكل تآزري بين البروبيوتيك والبريبايوتيك.' where slug = 'forever-active-pro-b';
update products set description_ar = 'يحتوي فوريفر كيدز على 12 فيتاميناً (A، B، C، D، E) ومعدنين (الحديد والزنك). يساهم هذا المزيج في الأداء الطبيعي للجهاز المناعي، ويقلل التعب، ويدعم النمو الذهني.' where slug = 'forever-kids';
update products set description_ar = 'يُستخلص فيلدز أوف جرينز من براعم نباتية فتية: أوراق الشعير والقمح والفصفصة وفلفل الكايين.' where slug = 'fields-of-greens';
update products set description_ar = 'يساهم فيتامين سي في تقليل التعب واستعادة النشاط والطاقة. وهو ضروري لتقوية مقاومة الجسم.' where slug = 'forever-absorbent-c';
update products set description_ar = 'هيّئ عينيك لنمط حياة متصل بالشاشات! فوريفر آي فيجن مكمّل غذائي للرؤية بتركيبة كاملة من فيتامينات A وC وE والزنك.' where slug = 'forever-ivision';
update products set description_ar = 'يحتوي فوريفر سوبر جرينز على أكثر من 20 نوعاً من الفواكه والخضار، والألوفيرا، وفيتامين سي، والمغنيسيوم. يدعم هذا المزيج الدفاعات الطبيعية والتعافي العضلي.' where slug = 'forever-supergreens';
update products set description_ar = 'فوريفر إيميوبلند، مزيج من الفيتامينات والمعادن والفطريات المستخدمة تقليدياً في آسيا، يساهم في تحفيز الدفاعات المناعية للحفاظ على رصيدك الصحي.' where slug = 'forever-immublend';
update products set description_ar = 'تركيبة حصرية من 55 مكوناً تجمع بين عناصر مركّب AOS (أوليغوسكاريدات الألوة) والفيتامينات والمعادن والمغذيات النباتية من مستخلصات الفواكه والخضار.' where slug = 'forever-daily';
update products set description_ar = 'الثوم والزعتر من فوريفر مزيج فريد من مستخلصين نباتيين معروفين بتحسين الراحة الهضمية. كبسولة بدون رائحة تعادل 1000 ملغ من الثوم الطازج.' where slug = 'forever-ail-thym';
update products set description_ar = 'يوفر فوريفر فايبر 5 غرامات من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء واستعادة راحة هضمية جيدة.' where slug = 'forever-fiber';
update products set description_ar = 'يجمع هذا المنقوع بنكهته اللطيفة الرقيقة بين الطعم المنعش لقشر البرتقال والليمون، والنكهات المتبّلة للقرفة والقرنفل. يمنح راحة هضمية.' where slug = 'infusion-fleur-aloes';
update products set description_ar = 'صُمّم هذا المزيج الطبيعي من النباتات والفيتامينات والمعادن خصيصاً للنساء. يساعد فيتامين B6 على تنظيم التوازن الهرموني، وتساعد زهرة الآلام على تقليل التوتر.' where slug = 'vitolize-femmes';
update products set description_ar = 'يحتوي فيتولايز للرجال على فيتامينات ومعادن وفيتوستيرول للحفاظ على أداء جيد للبروستاتا. ويساهم الزنك في الحفاظ على الخصوبة الطبيعية.' where slug = 'vitolize-hommes';
update products set description_ar = 'فوريفر موف مزيج من مكوّنين مسجّلين ببراءة اختراع: غشاء قشر البيض NEM® وكركم BioCurc®. يعملان بتآزر لدعم راحة مفصلية مثالية.' where slug = 'forever-move';
update products set description_ar = 'يحتوي فوريفر كالسيوم على فيتاميني C وD ومعادن (كالسيوم، مغنيسيوم، منغنيز، زنك، نحاس) للمساهمة في الحفاظ على عظام ووظيفة عضلية طبيعية.' where slug = 'forever-calcium';
update products set description_ar = 'يحتوي Forever Arctic-Sea على أحماض دهنية غير مشبعة، أوميغا-3، بما في ذلك EPA وDHA الموجودة في زيوت الأسماك والحبار. تساهم في الوظيفة الطبيعية للدماغ والقلب.' where slug = 'forever-arctic-sea';
update products set description_ar = 'الميثيل سلفونيل ميثان (MSM) مصدر مستقر وطبيعي للكبريت العضوي، موجود بتركيز عالٍ في المفاصل، ويساهم في الحفاظ على سلامة النسيج الضام.' where slug = 'aloe-msm-gel';
update products set description_ar = 'كريم التدليك هذا مكمّل مثالي لتخفيف آلام المفاصل أو تهيئة العضلات للمجهود بفضل المنثول وزيوت الأوكالبتوس والسمسم والجوجوبا والمشمش.' where slug = 'emulsion-thermogene';
update products set description_ar = 'حيوية وقوة وتحمّل ورياضة قصوى: يجمع فوريفر أرجي+ بين أل-أرجينين ومزيج فريد من الفيتامينات ومستخلصات الفواكه لمرافقة مثالية أثناء المجهود.' where slug = 'forever-argi-plus';
update products set description_ar = 'تتميز الألياف المستخلصة من صبار الأوبونتيا بقدرتها على جذب الدهون والسكريات واحتجازها. وتساعد بذور الفاصولياء البيضاء والكروم على تقليل السعرات الحرارية اليومية.' where slug = 'forever-lean';
update products set description_ar = 'فوريفر ثيرم حارق للدهون يحتوي على مستخلصات نباتية (الشاي الأخضر، القهوة الخضراء، الجوارانا) مع فيتامينات المجموعة B وفيتامين سي. يساعد على التحكم بالوزن وتقليل التعب.' where slug = 'forever-therm';
update products set description_ar = 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.' where slug = 'forever-lite-ultra-vanille';
update products set description_ar = 'Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.' where slug = 'forever-lite-ultra-chocolat';
update products set description_ar = 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.' where slug = 'pack-detox-pulpe';
update products set description_ar = 'الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.' where slug = 'pack-detox-berry';
update products set description_ar = 'اكتشف منتجاتنا عبر هذه الحزمة الجديدة: 4 منتجات من أساسياتنا لتحصل على أفضل ما في فوريفر بين يديك.' where slug = 'smart-consumer-pack';
update products set description_ar = 'تجمع حزمة العناية اليومية أساسيات فوريفر للعناية بالجسم والوجه يومياً.' where slug = 'pack-hygiene';
update products set description_ar = 'يجمع برنامج العافية بين التغذية والعناية بالجسم لبرنامج عافية يومي متكامل.' where slug = 'programme-bien-etre';
update products set description_ar = 'يجمع برنامج GO2FBO تشكيلة واسعة من المنتجات المميزة لاكتشاف جميع مجموعات فوريفر.' where slug = 'pack-go2fbo';
update products set description_ar = 'حزمة مصممة لمرافقة خطواتك الأولى مع منتجات فوريفر يومياً.' where slug = 'start-your-journey-pack';
update products set description_ar = 'Aloe First هو الرذاذ الذي يُستخدم يومياً لترطيب وإنعاش وتنشيط بشرة الوجه والجسم بفضل تركيبته الغنية بـ11 مستخلصاً نباتياً والألوفيرا والبروبوليس والألانتوين. درجة حموضته المتعادلة تناسب حتى أكثر البشرات حساسية.' where slug = 'aloe-first';
update products set description_ar = 'الألوة المرتبطة بالبروبوليس تجعل من هذا الكريم ذي القوام الغني عناية حقيقية مضادة للبكتيريا ومُصلحة. البابونج والألانتوين وفيتامينات A وE تمنح البشرة نعومة ومرونة.' where slug = 'aloe-propolis-creme';
update products set description_ar = 'غني جداً بالألوفيرا، يمتلك هذا الجل الشفاف غير الدهني كل فضائل النبتة. يرطب البشرة ويجددها. مثالي ضد تهيجات الجلد وحروق الشمس.' where slug = 'gelee-aloes';
update products set description_ar = 'يهدئ لوشن الجسم بالألوة ويرطب ويحمي البشرة من الجفاف. بفضل تركيزه من جل الألوفيرا وزيت الأركان وفيتامين E وزيت المكاداميا، يتغلغل بسرعة ويترك البشرة ناعمة. بدون سيليكون.' where slug = 'aloe-body-lotion';
update products set description_ar = 'صابون الألوة السائل صابون للوجه والجسم والشعر لكل أفراد العائلة. تركيبته اللطيفة جداً تنظف برفق، وتحترم البشرة والشعر، وترطب وتقي من الجفاف.' where slug = 'aloe-liquid-soap';
update products set description_ar = 'جل الأسنان هذا، الخالي من الفلورايد وغير الكاشط، يُجدد مينا أسنانك. مركبه من الكلوروفيل، بدون منثول، يمنح إحساساً طبيعياً بالانتعاش بفضل البروبوليس والألوة.' where slug = 'forever-bright-toothgel';
update products set description_ar = 'بدون كحول أو أملاح الألومنيوم ومعطر بلطف، يوفر هذا المزيل حماية فعالة بدون ترك بقع على ملابسك. تركيبته بالألوة تلين وترطب البشرة.' where slug = 'stick-deodorant-aloes';
update products set description_ar = 'تركيبة جل لتنظيف يديك بأمان أينما كنت. مُخصبة بالألوفيرا، تعطر تركيبته اليدين بلطف دون أن تجففهما.' where slug = 'instant-hand-cleanser';
update products set description_ar = 'تركيبة مرطبة وواقية للغاية لهذا البلسم الذي يجمع بين الألوفيرا وزيت الجوجوبا وشمع العسل. يوفر راحة مُصلحة للشفاه الأكثر جفافاً.' where slug = 'aloe-lips';
update products set description_ar = 'مُخصب بزبدة الأفوكادو، صابون الأفوكادو ينظف جميع أنواع البشرة حتى الأكثر حساسية مع ترطيبها. عطره الخفيف من زهور الليمون يمنح متعة حقيقية.' where slug = 'savon-avocat';
update products set description_ar = 'يجمع Aloe Sunscreen بين القوة المهدئة للألوة وأكسيد الزنك الطبيعي لحماية SPF 30 متقدمة من أشعة UVA وUVB. مناسب لجميع أنواع البشرة.' where slug = 'ecran-solaire-aloes';
update products set description_ar = 'جنتلمانز برايد كريم سائل خفيف بخصائص مهدئة لتهدئة تهيج الحلاقة والاحمرار. عطره اللطيف يمنح لمسة أناقة هادئة.' where slug = 'gentlemans-pride';
update products set description_ar = 'تحمي هذه العناية وتغذي وتقلل من علامات شيخوخة البشرة. قوامها الذائب، المُخصب بالكولاجين والإيلاستين، يرطب ويملأ البشرة. مناسبة للبشرة الحساسة.' where slug = 'aloe-moisturizing-lotion';
update products set description_ar = 'يُصلح، يجدد، يملأ. تدعم هذه العناية التقشير الطبيعي للبشرة وتقلل من ظهور المسام. تُنعَّم التجاعيد والخطوط الدقيقة، ويصبح ملمس البشرة أدق.' where slug = 'r3-factor';
update products set description_ar = 'درع حقيقي مضاد للشيخوخة، يجمع هذا السيروم بين مضادات أكسدة قوية لتقليل علامات التقدم في السن والعوامل المؤثرة على البشرة. تستعيد البشرة إشراقتها.' where slug = 'serum-alpha-e-factor';
update products set description_ar = 'بفضل تركيبته اللطيفة جداً، ينظف غسول الجسم بالألوة البشرة وينشطها برفق. قوامه المنعش يترك عطراً أخّاذاً وبشرة نظيفة وناعمة ومرطبة جيداً.' where slug = 'aloe-body-wash';
update products set description_ar = 'مصمم لتنظيف جميع أنواع الشعر بعمق وترطيبها. بجمعه بين الألوفيرا النقية وزيت الجوجوبا المقوّي وزيت الأركان، هذا الشامبو مثالي للاستخدام اليومي. بدون كبريتات مضافة.' where slug = 'shampoing-aloe-jojoba';
update products set description_ar = 'البلسم عناية أساسية لتنعيم الشعر وفك تشابكه وتغذيته ومنحه لمعاناً. يحفّز أيضاً ترطيب الشعر وفروة الرأس، بدون كبريتات.' where slug = 'apres-shampoing-aloe-jojoba';
update products set description_ar = 'يقدم جل التنظيف من سونيا تجربة جديدة كلياً لإزالة المكياج. يذوب على البشرة ويشكّل رغوة ناعمة، تاركاً البشرة ناعمة ومرطبة.' where slug = 'sonya-gel-nettoyant';
update products set description_ar = 'استعيدي إشراقة بشرتك الطبيعية بفضل جل الإشراقة من سونيا. ترطب الألوفيرا والمكونات النباتية البشرة، بينما يخفي أحد الببتيدات الشوائب ويوحّد لون البشرة.' where slug = 'sonya-gel-eclat';
update products set description_ar = 'يُطبق قبل النوم مباشرة، يتحول قناع الجل من سونيا إلى قوام منعش لذيذ سريع الامتصاص، ما يحسّن عملية تجدد البشرة الليلي.' where slug = 'sonya-masque-gel';
update products set description_ar = 'يذوب جل الترطيب من سونيا على البشرة، ويغلفها بستار من النعومة ويوحّد لونها. يجمع بين الألوفيرا والعديد من المستخلصات النباتية لترطيب أمثل.' where slug = 'sonya-gel-hydratant';
update products set description_ar = 'ينظف مزيل المكياج المرطب البشرة ويرطبها بخطوة واحدة. المكوّن المنظّف المستخدم، مستخلص طبيعي من جوز الهند، مضاد للحساسية وغير مهيّج.' where slug = 'infinite-demaquillant-hydratant';
update products set description_ar = 'السيروم المشدد هو إكسير شباب حقيقي. يحارب علامات التقدم في السن الظاهرة من خلال تكثيف قوة الألوفيرا بفضل سلسلة محددة من ثلاثة أحماض أمينية.' where slug = 'infinite-serum-raffermissant';
update products set description_ar = 'الكريم المُصلح، بقوامه الخفيف الناعم، غني بالألوفيرا والمستخلصات النباتية وزيت الجوجوبا وفيتامين B3. يبدو الوجه ممتلئاً بوضوح، مستعيداً شبابه ومرونته.' where slug = 'infinite-creme-reparatrice';
update products set description_ar = 'يحارب مركّب الشد من الداخل علامات التقدم في السن الظاهرة. يحتوي على مستخلص شمّام فرنسي مسجّل ببراءة اختراع، وسيراميدات نباتية، وكولاجين.' where slug = 'infinite-complexe-raffermissant';
update products set description_ar = 'يمنح هذا اللوشن المنعش البشرة إشراقة حقيقية. يُتمّ إزالة المكياج ويخلّص البشرة من آخر الشوائب. غني بالألوفيرا ومستخلص الخيار والشاي الأبيض.' where slug = 'infinite-lotion-tonifiante';
update products set description_ar = 'كريم محيط العين سر نظرة متألقة. يجمع بين الألوفيرا ومستخلص الكولاجين لنظرة أصغر سناً بوضوح، ومستخلص شجرة الحرير لمحو علامات التعب.' where slug = 'infinite-creme-contour-yeux';
update products set description_ar = 'المقشّر هو الحليف المثالي لبشرة جديدة وأكثر نقاءً. تُقشَّر بشرتك وتُنظَّف بعمق بفضل البروميلين والبابايين ولؤلؤ الجوجوبا والخيزران.' where slug = 'infinite-soin-exfoliant';
update products set description_ar = 'اكتشف منشّط الألوة، عناية أساسية يمكن استخدامها وحدها لإتمام إزالة المكياج وترطيب البشرة وتنشيط لونها.' where slug = 'infinite-activateur-aloes';
update products set description_ar = 'يملأ سيروم الترطيب بشرتك ويرطبها بشكل مثالي مع تقليل ظهور الخطوط الدقيقة والتجاعيد بفضل مزيج من 4 أحماض هيالورونيك.' where slug = 'infinite-serum-hydratant';


-- >>> FILE: 23_abandoned-carts.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- « Paniers abandonnés » : dès que le client saisit nom + téléphone au checkout,
-- on enregistre son panier — même s'il ne confirme pas. Vous le relancez ensuite
-- par WhatsApp depuis l'admin. (Récupère typiquement 15-30% des ventes perdues.)

create table if not exists abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  phone text,
  city text,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  recovered boolean not null default false
);

alter table abandoned_carts enable row level security;

-- The visitor can create/refresh their own row (keyed by a random session id
-- stored in their browser). Low-risk data; admin manages it.
drop policy if exists "Public can upsert abandoned cart" on abandoned_carts;
drop policy if exists "Public can upsert abandoned cart" on abandoned_carts;
create policy "Public can upsert abandoned cart"
  on abandoned_carts for insert to anon, authenticated with check (true);
drop policy if exists "Public can update own abandoned cart" on abandoned_carts;
drop policy if exists "Public can update own abandoned cart" on abandoned_carts;
create policy "Public can update own abandoned cart"
  on abandoned_carts for update to anon, authenticated using (true) with check (true);
drop policy if exists "Admin can read abandoned carts" on abandoned_carts;
drop policy if exists "Admin can read abandoned carts" on abandoned_carts;
create policy "Admin can read abandoned carts"
  on abandoned_carts for select to authenticated using (true);
drop policy if exists "Admin can delete abandoned carts" on abandoned_carts;
drop policy if exists "Admin can delete abandoned carts" on abandoned_carts;
create policy "Admin can delete abandoned carts"
  on abandoned_carts for delete to authenticated using (true);


-- >>> FILE: 24_review-photos.sql >>>
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
drop policy if exists "review photos public upload" on storage.objects;
drop policy if exists "review photos public upload" on storage.objects;
create policy "review photos public upload"
  on storage.objects for insert
  with check (bucket_id = 'review-photos');

-- …et tout le monde peut les voir (bucket public).
drop policy if exists "review photos public read" on storage.objects;
drop policy if exists "review photos public read" on storage.objects;
drop policy if exists "review photos public read" on storage.objects;
create policy "review photos public read"
  on storage.objects for select
  using (bucket_id = 'review-photos');


-- >>> FILE: 25_youcanpay.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Colonne pour relier une commande à son paiement YouCan Pay (carte bancaire).
alter table orders add column if not exists youcanpay_token text;


-- >>> FILE: 26_feature-flags.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Gestionnaire de fonctions : chaque fonctionnalité du site peut être activée
-- ou désactivée individuellement depuis Admin → Réglages, sans redéploiement.
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table feature_flags enable row level security;

-- Tout le monde peut lire l'état des fonctions (le site en a besoin)…
drop policy if exists "feature flags public read" on feature_flags;
drop policy if exists "feature flags public read" on feature_flags;
drop policy if exists "feature flags public read" on feature_flags;
create policy "feature flags public read"
  on feature_flags for select
  using (true);

-- …mais seul l'admin connecté peut les modifier.
drop policy if exists "feature flags admin write" on feature_flags;
drop policy if exists "feature flags admin write" on feature_flags;
drop policy if exists "feature flags admin write" on feature_flags;
create policy "feature flags admin write"
  on feature_flags for all
  to authenticated
  using (true)
  with check (true);

-- État initial de chaque fonction (modifiable ensuite depuis l'admin).
insert into feature_flags (key, enabled) values
  ('routines', true),          -- Page « Routines » + liens de navigation
  ('bundle_discount', true),   -- Remise routine automatique −10% dès 3 articles
  ('bundle_nudge', true),      -- Bandeau « Ajoutez X produit(s) pour −10% » dans le panier
  ('abandoned_cart', true),    -- Sauvegarde des paniers abandonnés au checkout
  ('photo_reviews', true),     -- Champ photo dans le formulaire d'avis
  ('order_sound', true),       -- Son + badge « nouvelle commande » dans l'admin
  ('reviews_badge', true),     -- Badge « avis en attente » sur l'onglet Avis
  ('card_payment', false),     -- Option « Payer par carte » au checkout (nécessite YouCan Pay)
  ('order_wa_confirm', true),  -- Bouton « Confirmer ma commande sur WhatsApp » après commande
  ('checkout_badges', true),   -- Badges de confiance au moment du paiement
  ('followups', true),         -- Onglet admin « Relance fidélité » (réassort à J+20)
  ('product_wa_order', true),  -- Bouton « Commander sur WhatsApp » sur les pages produit
  ('pack_cross_sell', true),   -- Bandeau « fait partie du pack X » sur les pages produit
  ('story_section', true),     -- Section « Qui suis-je » sur l'accueil
  ('wa_testimonials', true),   -- Témoignages WhatsApp (captures) sur l'accueil
  ('checkout_prefill', true)   -- Pré-remplissage des coordonnées d'un client déjà connu
on conflict (key) do nothing;
-- Script réexécutable sans risque : les lignes existantes ne sont pas modifiées.


-- >>> FILE: 27_packs.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Packs gérés depuis l'admin : chaque pack contient des produits précis (avec
-- quantités), un nom FR/AR et un objectif FR/AR. Affichés sur la page Routines.
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sort_order int not null default 0,
  active boolean not null default true,
  icon text not null default '🌿',
  name_fr text not null,
  name_ar text,
  goal_fr text,
  goal_ar text,
  -- Photo du pack (facultative) : si définie, elle remplace la grille de
  -- produits sur la carte du pack.
  image text,
  -- [{ "id": "p01", "quantity": 1 }, ...]
  items jsonb not null default '[]'::jsonb
);

-- Si vous aviez déjà exécuté ce script avant l'ajout de la photo :
alter table packs add column if not exists image text;

alter table packs enable row level security;

-- Le site lit les packs (les inactifs sont filtrés côté site)…
drop policy if exists "packs public read" on packs;
drop policy if exists "packs public read" on packs;
drop policy if exists "packs public read" on packs;
create policy "packs public read"
  on packs for select
  using (true);

-- …seul l'admin connecté peut créer / modifier / supprimer.
drop policy if exists "packs admin write" on packs;
drop policy if exists "packs admin write" on packs;
drop policy if exists "packs admin write" on packs;
create policy "packs admin write"
  on packs for all
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 28_story-testimonials.sql >>>
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
drop policy if exists "testimonials public read" on testimonials;
drop policy if exists "testimonials public read" on testimonials;
create policy "testimonials public read"
  on testimonials for select
  using (true);

drop policy if exists "testimonials admin write" on testimonials;
drop policy if exists "testimonials admin write" on testimonials;
drop policy if exists "testimonials admin write" on testimonials;
create policy "testimonials admin write"
  on testimonials for all
  to authenticated
  using (true)
  with check (true);


-- >>> FILE: 29_promo-usage-limits.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Limite d'utilisation des codes promo : chaque code peut avoir un nombre
-- maximum d'utilisations (ex : un code fidélité utilisable 2 fois, un code
-- unique utilisable 1 fois). Vide = illimité, comme avant.

alter table discount_codes add column if not exists max_uses int;
alter table discount_codes add column if not exists used_count int not null default 0;

-- Le code n'est plus valide une fois la limite atteinte.
create or replace function validate_discount(p_code text)
returns table (code text, type text, value numeric, min_subtotal numeric)
language sql
security definer
set search_path = public
as $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  limit 1;
$$;

grant execute on function validate_discount(text) to anon;

-- Chaque commande passée avec un code compte une utilisation. Le compteur est
-- incrémenté par un trigger côté base : le client ne peut ni l'éviter ni le
-- manipuler. (Le code automatique « ROUTINE-10% » ne correspond à aucune ligne
-- de la table, donc il n'est simplement pas compté.)
create or replace function count_discount_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.discount_code is not null then
    update discount_codes
      set used_count = used_count + 1
      where upper(code) = upper(new.discount_code);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_count_discount_use on orders;
create trigger orders_count_discount_use
  after insert on orders
  for each row
  execute function count_discount_use();


-- >>> FILE: 30_finance.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- Panneau Finances : prix d'achat Forever par produit (table réservée à
-- l'admin — jamais lisible publiquement, vos coûts restent secrets) + coût
-- réel de livraison par défaut.

create table if not exists product_costs (
  product_id text primary key,
  cost numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table product_costs enable row level security;

-- Admin uniquement (lecture ET écriture) — aucun accès public.
drop policy if exists "product costs admin all" on product_costs;
drop policy if exists "product costs admin all" on product_costs;
drop policy if exists "product costs admin all" on product_costs;
create policy "product costs admin all"
  on product_costs for all
  to authenticated
  using (true)
  with check (true);

-- Ce que VOUS payez au livreur pour une livraison (Amana/CTM…), utilisé pour
-- calculer le bénéfice net. Modifiable depuis l'onglet Finances.
alter table site_settings add column if not exists courier_cost numeric not null default 35;


-- >>> FILE: 31_repair-public-access.sql >>>
-- Run in Supabase → SQL Editor → New query → Run.
-- RÉPARATION — restaure l'accès public du site après une remédiation de
-- sécurité trop agressive. N'affecte PAS la sécurité admin (private.is_admin).
-- Idempotent : ré-exécutable sans risque.

-- ===========================================================================
-- 1) Formulaires publics : l'anon doit pouvoir INSÉRER (contact + distributeur)
-- ===========================================================================
drop policy if exists "Public can insert contact messages" on public.contact_messages;
drop policy if exists "Public can insert contact messages" on public.contact_messages;
drop policy if exists "Public can insert contact messages" on public.contact_messages;
create policy "Public can insert contact messages"
  on public.contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "Public can submit distributor lead" on public.distributor_leads;
drop policy if exists "Public can submit distributor lead" on public.distributor_leads;
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


-- >>> FILE: 99_convert-to-dirham.sql >>>
-- ⚠️ RUN THIS ONCE ONLY. Running it twice will double-convert your prices.
--
-- Converts prices that were entered in Euros into Moroccan Dirham using an
-- approximate rate of 1 € ≈ 10.8 DH, rounded to a whole Dirham. After running,
-- fine-tune any individual prices in the admin panel as you like.
--
-- Run in Supabase → SQL Editor → New query → Run.

-- Product prices
update products
set price = round(price * 10.8);

-- Delivery zone fees (if you added any city-specific shipping)
update delivery_zones
set fee = round(fee * 10.8),
    free_threshold = case when free_threshold is not null then round(free_threshold * 10.8) end;

-- Discount codes: convert fixed-amount values and minimum-basket thresholds.
-- Percentage codes are left untouched (a % doesn't change with currency).
update discount_codes
set value = case when type = 'fixed' then round(value * 10.8) else value end,
    min_subtotal = case when min_subtotal is not null then round(min_subtotal * 10.8) end;



-- >>> FILE: APPLY_ZYVORA.sql >>>
-- ============================================================
-- ZYVORA - COMBINED SCHEMA (auto-generated, ZYVORA tables only)
-- Paste this into the ZYVORA project's SQL editor and Run.
-- Does NOT include the Naturaloe store schema (that lives in its own project).
-- ============================================================

-- >>> FILE: 40_zyvora.sql >>>
-- ZYVORA Wave 0 — platform foundation (accounts + server-side Business Memory)
-- Apply in the Supabase SQL editor (same workflow as 30_finance.sql).
--
-- Constitutional enforcement at the database layer:
--   * Workspace isolation: RLS restricts every row to its owner (CODEX 00 F.2/F.3).
--   * Business Memory is append-only: INSERT + SELECT only — no UPDATE/DELETE
--     policies exist on zyvora_events (Article V, ADR-0002).

create table if not exists public.zyvora_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.zyvora_workspaces enable row level security;

drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
create policy "zyvora_ws_select_own" on public.zyvora_workspaces
  for select using (auth.uid() = owner);

drop policy if exists "zyvora_ws_insert_own" on public.zyvora_workspaces;
create policy "zyvora_ws_insert_own" on public.zyvora_workspaces
  for insert with check (auth.uid() = owner);

drop policy if exists "zyvora_ws_update_own" on public.zyvora_workspaces;
create policy "zyvora_ws_update_own" on public.zyvora_workspaces
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

-- Business Memory event store: the four streams, append-only.
create table if not exists public.zyvora_events (
  id uuid primary key, -- client-generated; makes offline retries idempotent
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  ts bigint not null,
  stream text not null check (stream in ('fact','interpretation','decision','outcome')),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zyvora_events_ws_ts on public.zyvora_events (workspace_id, ts);

alter table public.zyvora_events enable row level security;

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
create policy "zyvora_ev_select_own" on public.zyvora_events
  for select using (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
create policy "zyvora_ev_insert_own" on public.zyvora_events
  for insert with check (
    exists (
      select 1 from public.zyvora_workspaces w
      where w.id = workspace_id and w.owner = auth.uid()
    )
  );

-- Deliberately NO update policy and NO delete policy on zyvora_events:
-- Business Memory is permanent and append-only (ADR-0002).


-- >>> FILE: 41_zyvora_teams.sql >>>
-- ZYVORA Wave 0 completion — multi-user: memberships, invitations, roles, RLS.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000027 invitation & membership, FEAT-000028 roles & permission grants,
--   FEAT-000029 policy evaluation (enforced here at the data layer via RLS).
-- Apply AFTER 40_zyvora.sql (same SQL-editor workflow).
--
-- Model: one Workspace has many Memberships (user + role). Access to a Workspace
-- and its Business Memory is granted by membership, not just ownership. The owner
-- always has an implicit 'owner' membership. Roles: owner > manager > staff > viewer.

-- 1. Memberships -----------------------------------------------------------
create table if not exists public.zyvora_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists zyvora_memberships_user on public.zyvora_memberships (user_id);

-- Helper: is the current user a member of a workspace (optionally with a role floor)?
create or replace function public.zyvora_is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.zyvora_memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.zyvora_workspaces w
    where w.id = ws and w.owner = auth.uid()
  );
$$;

create or replace function public.zyvora_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.zyvora_memberships m where m.workspace_id = ws and m.user_id = auth.uid()),
    (select 'owner' from public.zyvora_workspaces w where w.id = ws and w.owner = auth.uid())
  );
$$;

alter table public.zyvora_memberships enable row level security;

-- Members can see the roster of their own workspaces.
drop policy if exists "zyvora_mem_select" on public.zyvora_memberships;
create policy "zyvora_mem_select" on public.zyvora_memberships
  for select using (public.zyvora_is_member(workspace_id));

-- Only owner/manager may add or change memberships.
drop policy if exists "zyvora_mem_write" on public.zyvora_memberships;
create policy "zyvora_mem_write" on public.zyvora_memberships
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- 2. Invitations (email-based; accepted when that user signs in) ------------
create table if not exists public.zyvora_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.zyvora_workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('manager','staff','viewer')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);
create index if not exists zyvora_inv_email on public.zyvora_invitations (lower(email));

alter table public.zyvora_invitations enable row level security;

-- Owner/manager manage invitations for their workspace.
drop policy if exists "zyvora_inv_manage" on public.zyvora_invitations;
create policy "zyvora_inv_manage" on public.zyvora_invitations
  for all using (public.zyvora_role(workspace_id) in ('owner','manager'))
  with check (public.zyvora_role(workspace_id) in ('owner','manager'));

-- An invited user may see invitations addressed to their own email (to accept).
drop policy if exists "zyvora_inv_see_mine" on public.zyvora_invitations;
create policy "zyvora_inv_see_mine" on public.zyvora_invitations
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 3. Widen workspace + event access from owner-only to any member -----------
-- (drop BOTH the old owner-only name and the new member name, so re-runs are safe)
drop policy if exists "zyvora_ws_select_own" on public.zyvora_workspaces;
drop policy if exists "zyvora_ws_select_member" on public.zyvora_workspaces;
create policy "zyvora_ws_select_member" on public.zyvora_workspaces
  for select using (public.zyvora_is_member(id));

drop policy if exists "zyvora_ev_select_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_select_member" on public.zyvora_events;
create policy "zyvora_ev_select_member" on public.zyvora_events
  for select using (public.zyvora_is_member(workspace_id));

-- Members with an operational role may append events; viewers cannot.
drop policy if exists "zyvora_ev_insert_own" on public.zyvora_events;
drop policy if exists "zyvora_ev_insert_member" on public.zyvora_events;
create policy "zyvora_ev_insert_member" on public.zyvora_events
  for insert with check (public.zyvora_role(workspace_id) in ('owner','manager','staff'));

-- Still NO update/delete on zyvora_events — append-only (ADR-0002).


-- >>> FILE: 42_zyvora_telemetry.sql >>>
-- ZYVORA productization Stone 2 — error telemetry.
-- Canonical (governance/): CAP-000004 Identity, Workspace, Permissions & Audit —
--   FEAT-000032 audit & observability (client-error channel).
-- Apply AFTER 41_zyvora_teams.sql (same SQL-editor workflow).
--
-- Purpose: when the app breaks on a customer's machine, the vendor (you) can see
-- it. Clients may INSERT their own error reports; nobody can update or delete
-- them from the client (append-only, like Business Memory); reading is for the
-- service role only (Supabase dashboard / future admin console).

create table if not exists public.zyvora_client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,
  message text not null,
  stack text,
  place text,               -- where in the app it happened (view / boundary / promise)
  app_version text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists zyvora_client_errors_time on public.zyvora_client_errors (created_at desc);

alter table public.zyvora_client_errors enable row level security;

-- Signed-in users may report their own errors. No select/update/delete policies:
-- reports are write-only from the client.
drop policy if exists zyvora_client_errors_insert on public.zyvora_client_errors;
create policy zyvora_client_errors_insert on public.zyvora_client_errors
  for insert to authenticated
  with check (user_id = auth.uid());


-- >>> FILE: 43_zyvora_billing.sql >>>
-- ZYVORA productization Stone 4 — billing (Stripe subscriptions).
-- Vendor productization (monetization of ZYVORA itself; no canonical CAP/FEAT id).
-- Apply AFTER 42_zyvora_telemetry.sql (same SQL-editor workflow).
--
-- Model: one subscription per OWNER (auth user). The Stripe webhook Edge
-- Function (service role) is the only writer; clients may only read their own
-- row. Truth about payment lives in Stripe; this table is the mirror the app
-- reads.

create table if not exists public.zyvora_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none'
    check (status in ('none','trialing','active','past_due','canceled','unpaid')),
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zyvora_subscriptions enable row level security;

-- Clients: read your own subscription. No insert/update/delete policies —
-- only the webhook (service role, bypasses RLS) writes here.
drop policy if exists zyvora_subscriptions_select on public.zyvora_subscriptions;
create policy zyvora_subscriptions_select on public.zyvora_subscriptions
  for select to authenticated
  using (user_id = auth.uid());


