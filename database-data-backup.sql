SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict B1logGddTj5Pl6QOWN9ggI38LHfzeXa7Zu2Mac1RkNetS2CHZPTDsm4e5sDVGLe

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at", "custom_claims_allowlist") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	authenticated	authenticated	zakaria.m.errami@gmail.com	$2a$10$cDrXOgzywnx1yG6Z1zznUeS.B0n5fk7WWQoHgIBWiCvFy5Scbs0V2	2026-07-14 12:55:09.658257+00	\N		\N		\N			\N	2026-07-14 13:29:41.934335+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-07-14 12:55:09.631956+00	2026-07-14 14:58:35.938471+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	{"sub": "0ed3aee1-c8f0-40e2-9245-a5a0e58e3997", "email": "zakaria.m.errami@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-07-14 12:55:09.649092+00	2026-07-14 12:55:09.649158+00	2026-07-14 12:55:09.649158+00	a1240647-e9ac-4fd4-9d29-7e05a7ce7e99
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
48d8c5b7-ce68-4bd5-87ff-36d87d8da1b6	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	2026-07-14 13:29:41.93506+00	2026-07-14 14:33:21.236558+00	\N	aal1	\N	2026-07-14 14:33:21.236443	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	160.176.131.119	\N	\N	\N	\N	\N
7d6f28ce-7679-475c-953a-69b9bf3ac4ed	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	2026-07-14 12:55:20.958102+00	2026-07-14 14:58:35.957663+00	\N	aal1	\N	2026-07-14 14:58:35.957545	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	160.176.131.119	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
7d6f28ce-7679-475c-953a-69b9bf3ac4ed	2026-07-14 12:55:20.981621+00	2026-07-14 12:55:20.981621+00	password	729870eb-a263-4a65-81cf-de4dc989abb1
48d8c5b7-ce68-4bd5-87ff-36d87d8da1b6	2026-07-14 13:29:41.990794+00	2026-07-14 13:29:41.990794+00	password	5bef40e5-d317-4e4b-9349-a8e0d06c9d8a
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	2	hu2oyvc6qeav	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	t	2026-07-14 13:29:41.966859+00	2026-07-14 14:33:21.194827+00	\N	48d8c5b7-ce68-4bd5-87ff-36d87d8da1b6
00000000-0000-0000-0000-000000000000	3	xzqlwticit2v	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	f	2026-07-14 14:33:21.209512+00	2026-07-14 14:33:21.209512+00	hu2oyvc6qeav	48d8c5b7-ce68-4bd5-87ff-36d87d8da1b6
00000000-0000-0000-0000-000000000000	1	eymx5sodv7gd	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	t	2026-07-14 12:55:20.969438+00	2026-07-14 14:58:35.91967+00	\N	7d6f28ce-7679-475c-953a-69b9bf3ac4ed
00000000-0000-0000-0000-000000000000	4	34hpxmqhipx4	0ed3aee1-c8f0-40e2-9245-a5a0e58e3997	f	2026-07-14 14:58:35.932362+00	2026-07-14 14:58:35.932362+00	eymx5sodv7gd	7d6f28ce-7679-475c-953a-69b9bf3ac4ed
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: abandoned_carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."abandoned_carts" ("id", "session_id", "created_at", "updated_at", "name", "phone", "city", "items", "subtotal", "recovered") FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."blog_posts" ("id", "slug", "title", "title_ar", "excerpt", "excerpt_ar", "content", "content_ar", "image", "tag", "tag_ar", "date", "read_time", "published", "created_at") FROM stdin;
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."contact_messages" ("id", "created_at", "name", "email", "subject", "message", "handled") FROM stdin;
\.


--
-- Data for Name: delivery_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."delivery_zones" ("id", "city", "fee", "free_threshold", "active") FROM stdin;
4c79a164-8377-4b7c-9bbe-099577c8aa8a	El Kelaa des Sraghna	216	5400	t
2236e83f-6f68-486a-bdf3-c6fdb2ccfde5	Kelaa des Sraghna	216	5400	t
33487241-28bf-42ce-b156-e8283e5069de	Kelaa	216	5400	t
889ddcb5-132b-43d5-b553-4dc62d8ebb97	Casablanca	378	5400	t
9b7d2388-d9dd-423c-b1a2-4790203f5de5	Casa	378	5400	t
190b86dc-e3a4-4249-aaa2-2e3a532ea89f	Rabat	378	5400	t
bd37da4f-beb4-4c1f-af3e-6b2ecb8e8e97	Marrakech	378	5400	t
0db146a7-6606-4d93-99d3-f3a45a73d3a0	Fès	378	5400	t
3c960e86-439b-4c0d-bb43-cb1ab87b23f0	Fes	378	5400	t
436e35d0-2059-4a74-8438-f90e7734565b	Tanger	378	5400	t
026b1c58-b584-4318-b5e4-3c456c182702	Agadir	378	5400	t
8d47f03a-2378-4df5-9cb7-afea826d2360	Salé	378	5400	t
8103211d-98fb-473b-b73b-5c92c234d286	Sale	378	5400	t
8264554e-5985-4302-bc60-e7dda02e5fa2	Meknès	378	5400	t
b19c392c-c75f-463a-b3c3-04d0a0c002a0	Meknes	378	5400	t
98765e84-4734-4c6a-9167-5c56cce1a4f3	Oujda	378	5400	t
85163815-99e6-433b-b0b8-85126258c41c	Kénitra	378	5400	t
f3a9f1eb-95b7-4c52-a681-fbe2c34a4b8f	Kenitra	378	5400	t
a9614d2a-d1f6-4ea8-8843-2b0dc3d01baf	Tétouan	378	5400	t
d32f396b-d05e-4288-81e3-a92cce4d3fc6	Tetouan	378	5400	t
7a5bc5ba-b234-4402-a85b-62bc00eaf435	Mohammedia	378	5400	t
9d161ae2-db7d-40c0-81aa-063f8f5f349e	El Jadida	378	5400	t
853634a3-2eff-4948-8f53-d59f3f54caba	Temara	378	5400	t
0a600098-2691-42de-b4fa-0c91578dd7c1	Ouarzazate	540	5400	t
8faf1025-7719-4560-9703-1d4a3f260210	Errachidia	540	5400	t
794be6f3-9335-47aa-9071-0d1aece3f6f6	Zagora	594	5400	t
756fea89-1b9b-419a-8596-c430bba87aac	Tinghir	540	5400	t
38bd3bbd-420a-4fc8-9dbc-e5d8a7df8a8e	Guelmim	594	5400	t
7a277a49-c5d5-41c4-9c11-d5807dbb285a	Tan-Tan	594	5400	t
e4febaea-c9c5-4ae0-b614-f387872af359	Laâyoune	648	5400	t
6749fd40-5fca-4d44-8f02-5a96a08c216f	Laayoune	648	5400	t
c0bfb110-8e8d-49a7-ab74-a4b279e4c674	Dakhla	648	5400	t
\.


--
-- Data for Name: discount_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."discount_codes" ("id", "code", "type", "value", "min_subtotal", "active", "expires_at", "created_at", "max_uses", "used_count") FROM stdin;
\.


--
-- Data for Name: distributor_leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."distributor_leads" ("id", "created_at", "name", "email", "phone", "city", "message", "handled") FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."feature_flags" ("key", "enabled", "updated_at") FROM stdin;
routines	t	2026-07-11 22:12:17.137381+00
bundle_discount	t	2026-07-11 22:12:17.137381+00
abandoned_cart	t	2026-07-11 22:12:17.137381+00
photo_reviews	t	2026-07-11 22:12:17.137381+00
order_sound	t	2026-07-11 22:12:17.137381+00
reviews_badge	t	2026-07-11 22:12:17.137381+00
card_payment	f	2026-07-11 22:12:17.137381+00
order_wa_confirm	t	2026-07-11 22:12:17.137381+00
checkout_badges	t	2026-07-11 22:12:17.137381+00
followups	t	2026-07-11 22:12:17.137381+00
product_wa_order	t	2026-07-11 22:12:17.137381+00
pack_cross_sell	t	2026-07-11 22:12:17.137381+00
story_section	t	2026-07-11 22:12:17.137381+00
wa_testimonials	t	2026-07-11 22:12:17.137381+00
checkout_prefill	t	2026-07-11 22:12:17.137381+00
bundle_nudge	f	2026-07-14 13:32:50.461+00
\.


--
-- Data for Name: loyalty_points; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."loyalty_points" ("email", "points", "updated_at") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."orders" ("id", "created_at", "customer_name", "customer_email", "phone", "address", "city", "region", "zip", "country", "items", "subtotal", "shipping", "total", "currency", "stripe_session_id", "payment_status", "locale", "payment_method", "status", "order_ref", "confirm_token", "discount_code", "discount_amount", "loyalty_awarded", "notes", "youcanpay_token") FROM stdin;
\.


--
-- Data for Name: packs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."packs" ("id", "created_at", "sort_order", "active", "icon", "name_fr", "name_ar", "goal_fr", "goal_ar", "image", "items") FROM stdin;
\.


--
-- Data for Name: product_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."product_costs" ("product_id", "cost", "updated_at") FROM stdin;
p46	0	2026-07-14 13:40:35.572+00
p43	200	2026-07-14 13:40:44.118+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."products" ("id", "slug", "name", "name_ar", "category", "price", "rating", "review_count", "tagline", "tagline_ar", "description", "description_ar", "ingredients", "ingredients_ar", "how_to_use", "how_to_use_ar", "image", "size", "best_seller", "is_new", "pack_contents", "sort_order", "created_at", "stock", "hidden", "gallery") FROM stdin;
p05	aloe-berry-nectar-1l	Aloe Berry Nectar 1L	ألوفيرا بيري نكتار 1 لتر	Pulpe d'Aloe Vera	410	4.7	121	Goût acidulé, extrait de canneberge et pulpe Aloe Vera riche en antioxydants.	طعم منعش، مستخلص التوت البري ولب الألوفيرا الغني بمضادات الأكسدة.	Au goût délicieusement acidulé, l'Aloe Berry Nectar contient de l'extrait de canneberge associé à la pulpe d'Aloe Vera. La plante contribue aux défenses naturelles de l'organisme.	بطعمه المنعش اللذيذ، يحتوي ألوفيرا بيري نكتار على مستخلص التوت البري مع لب الألوفيرا. تساهم النبتة في دعم الدفاعات الطبيعية للجسم.	["90,6% de pulpe d'Aloe vera stabilisée", "1,71% d'extraits de canneberge et de pomme"]	\N	30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.	\N	/products/page-09.jpg	1 litre	f	f	\N	4	2026-07-11 22:12:17.137381+00	\N	f	\N
p47	forever-bright-toothgel	Forever Bright Toothgel	معجون الأسنان برايت فوريفر	Beauté	151	4.7	143	Gel dentaire sans fluor qui ravive l'émail des dents.	جل أسنان بدون فلورايد يُجدد مينا الأسنان.	Ce gel dentaire, sans fluor et non abrasif, ravive l'émail de vos dents. Son complexe à la chlorophylle, sans menthol, procure une sensation de fraîcheur naturelle grâce à la propolis et à l'aloès.	جل الأسنان هذا، الخالي من الفلورايد وغير الكاشط، يُجدد مينا أسنانك. مركبه من الكلوروفيل، بدون منثول، يمنح إحساساً طبيعياً بالانتعاش بفضل البروبوليس والألوة.	["35,5% de gel d'aloès", "Chlorophylle", "Propolis"]	["35.5% جل ألوة", "كلوروفيل", "بروبوليس"]	Se brosser les dents après chaque repas.	تنظيف الأسنان بالفرشاة بعد كل وجبة.	/products/page-34.jpg	130 g	t	f	\N	46	2026-07-11 22:12:17.137381+00	\N	t	\N
p13	forever-kids	Forever Kids	فوريفر كيدز	Nutrition	281	4.7	102	12 vitamines et 2 minéraux pour le développement de l'enfant.	12 فيتاميناً ومعدنين لنمو الطفل.	Forever Kids contient 12 vitamines (A, B, C, D, E) et 2 minéraux (fer, zinc). Cette association contribue au fonctionnement normal du système immunitaire, réduit la fatigue et favorise le développement cognitif.	يحتوي فوريفر كيدز على 12 فيتاميناً (A، B، C، D، E) ومعدنين (الحديد والزنك). يساهم هذا المزيج في الأداء الطبيعي للجهاز المناعي، ويقلل التعب، ويدعم النمو الذهني.	["12 vitamines", "Fer", "Zinc"]	\N	Enfants à partir de 4 ans et jeunes adultes : 4 comprimés à croquer par jour.	\N	/products/page-13.jpg	48 comprimés	f	f	\N	12	2026-07-11 22:12:17.137381+00	\N	t	\N
p61	sonya-gel-eclat	Sonya — Gel Éclat	سونيا - جل الإشراقة	Sonya	281	4.6	54	Retrouvez l'éclat naturel de votre teint.	استعيدي إشراقة بشرتك الطبيعية.	Retrouvez l'éclat naturel de votre teint grâce au gel Éclat Sonya. L'Aloe vera et des actifs végétaux hydratent la peau tandis qu'un peptide gomme les imperfections et uniformise le teint.	استعيدي إشراقة بشرتك الطبيعية بفضل جل الإشراقة من سونيا. ترطب الألوفيرا والمكونات النباتية البشرة، بينما يخفي أحد الببتيدات الشوائب ويوحّد لون البشرة.	["42,9% de gel d'aloès"]	\N	Appliquer sur le visage et le cou matin et soir.	\N	/products/page-41.jpg	28,3 g	f	f	\N	60	2026-07-11 22:12:17.137381+00	\N	t	\N
p22	infusion-fleur-aloes	Infusion Fleur d'Aloès	منقوع زهرة الألوة	Nutrition	194	4.6	48	Écorce d'orange, zeste de citron, cannelle et clou de girofle.	قشر البرتقال، قشر الليمون، القرفة والقرنفل.	Cette infusion à l'arôme subtil et délicat associe les goûts acidulés de l'écorce d'orange et de zeste de citron, les saveurs épicées de la cannelle et du clou de girofle. Apporte un bien-être digestif.	يجمع هذا المنقوع بنكهته اللطيفة الرقيقة بين الطعم المنعش لقشر البرتقال والليمون، والنكهات المتبّلة للقرفة والقرنفل. يمنح راحة هضمية.	["Cannelle", "Zestes d'orange", "Clous de girofle", "Feuilles de mûrier", "Poivre de Jamaïque", "Fleur d'aloès", "Camomille"]	\N	Laisser infuser 1 sachet dans environ 1 litre d'eau.	\N	/products/page-17.jpg	25 sachets	f	f	\N	21	2026-07-11 22:12:17.137381+00	\N	t	\N
p31	forever-lean	Forever Lean	فوريفر لين	Fitness & Minceur	421	4.6	87	Fibres de cactus Opuntia pour aider à contrôler le poids.	ألياف الصبار أوبونتيا للمساعدة في التحكم بالوزن.	Les fibres extraites du cactus Opuntia ficus-indica ont la capacité d'attirer et retenir les graisses et les sucres. Les graines de haricots blancs et le chrome aident à réduire l'apport calorique journalier.	تتميز الألياف المستخلصة من صبار الأوبونتيا بقدرتها على جذب الدهون والسكريات واحتجازها. وتساعد بذور الفاصولياء البيضاء والكروم على تقليل السعرات الحرارية اليومية.	["Feuilles de Neopuntia®", "Extrait de graines de haricot sec", "Chrome"]	\N	Prendre 1 capsule avec un verre d'eau avant le repas. Jusqu'à 4 capsules par jour.	\N	/products/page-23.jpg	63 capsules	f	f	\N	30	2026-07-11 22:12:17.137381+00	\N	t	\N
p37	smart-consumer-pack	Smart Consumer Pack	حزمة المستهلك الذكية	Packs	529	4.6	38	4 produits essentiels à utiliser tous les jours.	4 منتجات أساسية للاستخدام اليومي.	Découvrez nos produits grâce à ce nouveau pack : 4 produits parmi nos essentiels pour avoir le meilleur de Forever à portée de main.	اكتشف منتجاتنا عبر هذه الحزمة الجديدة: 4 منتجات من أساسياتنا لتحصل على أفضل ما في فوريفر بين يديك.	[]	\N	À utiliser dans le cadre de votre routine quotidienne.	\N	/products/page-27.jpg	4 produits	f	f	["Forever Aloe Lips with Jojoba", "Forever Bright Aloe Body Lotion", "Forever Aloe Pêche 330 ml", "Totebag siglé Forever Living Products"]	36	2026-07-11 22:12:17.137381+00	\N	t	\N
p42	aloe-first	Aloe First	ألوي فيرست	Beauté	292	4.8	198	La brume quotidienne pour hydrater, rafraîchir et tonifier l'épiderme.	الرذاذ اليومي للترطيب والانتعاش وتنشيط البشرة.	Aloe First est la brume à utiliser quotidiennement pour hydrater, rafraîchir et tonifier l'épiderme du visage et du corps grâce à sa formule enrichie de 11 extraits de plantes, d'Aloe Vera, de propolis et d'allantoïne. Son pH neutre s'adapte aux peaux les plus sensibles.	Aloe First هو الرذاذ الذي يُستخدم يومياً لترطيب وإنعاش وتنشيط بشرة الوجه والجسم بفضل تركيبته الغنية بـ11 مستخلصاً نباتياً والألوفيرا والبروبوليس والألانتوين. درجة حموضته المتعادلة تناسب حتى أكثر البشرات حساسية.	["80,3% de gel d'aloès", "11 extraits de plantes", "Propolis", "Allantoïne"]	["80.3% جل ألوة", "11 مستخلصاً نباتياً", "بروبوليس", "ألانتوين"]	Avant l'application de soins cosmétiques et à tout moment de la journée pour hydrater la peau.	قبل تطبيق العناية التجميلية وفي أي وقت من اليوم لترطيب البشرة.	/products/page-31.jpg	118 ml	t	f	\N	41	2026-07-11 22:12:17.137381+00	\N	t	\N
p54	aloe-moisturizing-lotion	Aloe Moisturizing Lotion	لوشن الترطيب بالألوة	Beauté	238	4.6	81	Protège, nourrit et réduit les signes du vieillissement cutané.	يحمي ويغذي ويقلل من علامات شيخوخة البشرة.	Ce soin protège, nourrit et réduit les signes du vieillissement cutané. Sa texture fondante, enrichie en collagène et en élastine, hydrate et repulpe. Convient aux peaux sensibles.	تحمي هذه العناية وتغذي وتقلل من علامات شيخوخة البشرة. قوامها الذائب، المُخصب بالكولاجين والإيلاستين، يرطب ويملأ البشرة. مناسبة للبشرة الحساسة.	["36,5% de gel d'aloès", "Collagène", "Élastine"]	\N	Appliquer matin et soir après l'Aloe First.	\N	/products/page-36.jpg	120 ml	f	f	\N	53	2026-07-11 22:12:17.137381+00	\N	t	\N
p56	serum-alpha-e-factor	Sérum Alpha-E Factor	سيروم ألفا-إي فاكتور	Beauté	475	4.7	68	Véritable bouclier anti-âge aux antioxydants puissants.	درع حقيقي مضاد للشيخوخة بمضادات أكسدة قوية.	Véritable bouclier anti-âge, ce sérum allie des antioxydants puissants pour réduire les signes du vieillissement et les agressions cutanées. La peau retrouve son éclat.	درع حقيقي مضاد للشيخوخة، يجمع هذا السيروم بين مضادات أكسدة قوية لتقليل علامات التقدم في السن والعوامل المؤثرة على البشرة. تستعيد البشرة إشراقتها.	["Vitamines A et E", "Bisabolol", "Huile de bourrache", "Gel d'aloès"]	\N	Appliquer seul ou avant votre soin.	\N	/products/page-37.jpg	187 ml	f	f	\N	55	2026-07-11 22:12:17.137381+00	\N	t	\N
p21	forever-fiber	Forever Fiber	فايبر فوريفر	Nutrition	302	4.6	65	5g de fibres hydrosolubles pour stimuler les fonctions intestinales.	5 غ من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء.	Forever Fiber apporte 5g de fibres hydrosolubles pour stimuler les fonctions intestinales et retrouver un bon confort digestif.	يوفر فوريفر فايبر 5 غرامات من الألياف الذائبة في الماء لتحفيز وظائف الأمعاء واستعادة راحة هضمية جيدة.	["5 g de fibres solubles"]	\N	Prendre 1 sachet tous les matins, à diluer dans de l'eau ou avec de la pulpe stabilisée.	\N	/products/page-17.jpg	30 sachets de 6,1 g	f	f	\N	20	2026-07-11 22:12:17.137381+00	\N	t	\N
p01	aloe-vera-gel-330ml	Forever Aloe Vera Gel 330ml	جل ألوفيرا فوريفر 330 مل	Pulpe d'Aloe Vera	76	4.9	412	Notre produit signature, désormais sans conservateur et riche en vitamine C.	المنتج المميز، الآن بدون مواد حافظة وغني بفيتامين سي.	L'Aloe Vera Forever fait peau neuve ! Riche d'un savoir-faire de 40 ans, Forever a revisité son produit signature et créé une toute nouvelle version sans conservateur et riche en vitamine C, dans un emballage 100% recyclable. Le secret : 99,7% de gel d'Aloe vera et une dose synergique de vitamine C.	تجدد ألوفيرا فوريفر مظهره! بفضل خبرة 40 عاماً، أعادت فوريفر تصميم منتجها المميز وابتكرت نسخة جديدة كلياً بدون مواد حافظة وغنية بفيتامين سي، في عبوة قابلة لإعادة التدوير بنسبة 100%. السر: 99.7% جل ألوفيرا وجرعة تآزرية من فيتامين سي.	["99,7% de gel d'Aloe vera", "Vitamine C"]	["99.7% جل ألوفيرا", "فيتامين سي"]	30 à 40 ml, 3 fois par jour.	30 إلى 40 مل، 3 مرات يومياً.	/products/p01-aloe-vera-gel.png	330 ml	t	f	\N	0	2026-07-11 22:12:17.137381+00	\N	f	\N
p04	aloe-mangue-1l	Forever Aloe Mangue	ألوفيرا مانجو فوريفر	Pulpe d'Aloe Vera	410	4.8	96	Gel Aloe vera et purée de mangue naturelle pour un boost de nutrition et de saveur.	جل ألوفيرا وهريس مانجو طبيعي لدفعة إضافية من التغذية والنكهة.	Avec ses 86% de gel d'Aloe vera et sa purée de mangue naturelle, cette nouvelle déclinaison apporte un boost supplémentaire de nutrition et de saveur. Sans conservateurs, source de vitamine C.	بفضل 86% من جل الألوفيرا وهريس المانجو الطبيعي، يمنح هذا الإصدار الجديد دفعة إضافية من التغذية والنكهة. بدون مواد حافظة، ومصدر لفيتامين سي.	["86% de gel d'Aloe vera pur", "Vitamine C", "Concentré de purée de mangue"]	\N	Secouer légèrement avant de servir — 30 à 40 ml dilués dans 240 ml d'eau ou de jus de fruit, 3 fois par jour.	\N	/products/page-08.jpg	1 litre	f	t	\N	3	2026-07-11 22:12:17.137381+00	\N	f	\N
p02	aloe-peche-330ml	Forever Aloe Pêche 330ml	ألوفيرا بالخوخ فوريفر 330 مل	Pulpe d'Aloe Vera	76	4.7	188	Aloe vera, purée de pêche naturelle et vitamine C pour une saveur douce et savoureuse.	ألوفيرا، هريس الخوخ الطبيعي وفيتامين سي بنكهة لذيذة وناعمة.	La nouvelle formule de l'Aloe Pêche associe de l'Aloe vera (84,5%), de la purée de pêche et du jus concentré de raisin blanc pour une saveur douce, ainsi qu'une dose synergique de vitamine C. Packaging 100% recyclable.	تجمع التركيبة الجديدة لألوفيرا بالخوخ بين الألوفيرا (84.5%) وهريس الخوخ وعصير العنب الأبيض المركّز لنكهة ناعمة، إضافة إلى جرعة تآزرية من فيتامين سي. عبوة قابلة لإعادة التدوير 100%.	["84,5% de pulpe d'Aloe vera", "Purée de pêche naturelle", "Jus concentré de raisin blanc", "Arôme pêche"]	\N	30 à 40 ml, 3 fois par jour.	\N	/products/p02-aloe-peche.png	330 ml	f	f	\N	1	2026-07-11 22:12:17.137381+00	\N	f	\N
p03	aloe-berry-nectar-330ml	Forever Aloe Berry Nectar 330ml	ألوفيرا بيري نكتار فوريفر 330 مل	Pulpe d'Aloe Vera	76	4.8	203	Une large dose de pulpe d'Aloe vera, jus de pomme et canneberge, sans conservateur.	جرعة كبيرة من لب الألوفيرا، عصير التفاح والتوت البري، بدون مواد حافظة.	Une large dose (90,7%) de pulpe d'Aloe vera, un soupçon de jus de pomme et de canneberge, de la vitamine C, aucun conservateur et un emballage 100% recyclable.	جرعة كبيرة (90.7%) من لب الألوفيرا، مع لمسة من عصير التفاح والتوت البري، وفيتامين سي، بدون أي مواد حافظة، وعبوة قابلة لإعادة التدوير 100%.	["90,7% de pulpe d'Aloe vera", "Jus concentré de pomme", "Jus concentré de canneberge"]	\N	30 à 40 ml, 3 fois par jour.	\N	/products/p03-aloe-berry-nectar.png	330 ml	f	f	\N	2	2026-07-11 22:12:17.137381+00	\N	f	\N
p06	pulpe-aloe-vera-stabilisee-1l	Pulpe d'Aloe Vera Stabilisée	لب الألوفيرا المثبت	Pulpe d'Aloe Vera	410	4.9	267	Le produit à utiliser quotidiennement pour conserver un bien-être optimal.	المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية.	La pulpe d'Aloès stabilisée est le produit à utiliser quotidiennement pour conserver un bien-être optimal. L'Aloe vera contribue au maintien du système immunitaire et possède de puissants antioxydants.	لب الألوة المثبت هو المنتج الذي يُستخدم يومياً للحفاظ على عافية مثالية. تساهم الألوفيرا في دعم الجهاز المناعي وتحتوي على مضادات أكسدة قوية.	["96,2% de pulpe d'Aloe vera stabilisée"]	["96.2% لب ألوفيرا مثبت"]	30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.	30 إلى 40 مل يومياً، 3 مرات يومياً أي ما بين 90 و120 مل يومياً.	/products/page-09.jpg	1 litre	t	f	\N	5	2026-07-11 22:12:17.137381+00	\N	t	\N
p07	aloe-bits-n-peaches-1l	Forever Aloe Bits N' Peaches	ألوفيرا بيتس آند بيتشز فوريفر	Pulpe d'Aloe Vera	410	4.6	84	Cœur d'Aloès enrichi en concentré de jus de pêche, savoureux et doux.	قلب الألوة المُخصّب بمركز عصير الخوخ، لذيذ وناعم.	Savoureux et doux, le Cœur d'Aloès est enrichi en concentré de jus de pêche. L'Aloe Vera aide à stimuler le métabolisme et contribue aux défenses naturelles de l'organisme.	لذيذ وناعم، قلب الألوة مُخصّب بمركّز عصير الخوخ. تساعد الألوفيرا على تحفيز الأيض وتساهم في الدفاعات الطبيعية للجسم.	["91,17% de pulpe d'Aloe Vera stabilisée", "0,1% de concentré de jus de pêche"]	\N	30 à 40 ml par jour, 3 fois par jour soit entre 90 et 120 ml par jour.	\N	/products/page-09.jpg	1 litre	f	f	\N	6	2026-07-11 22:12:17.137381+00	\N	t	\N
p08	forever-bee-honey	Forever Bee Honey	عسل النحل فوريفر	Produits de la Ruche	238	4.8	156	« L'or de la ruche », produit par les abeilles à partir du nectar des fleurs.	«ذهب الخلية»، ينتجه النحل من رحيق الأزهار.	Le miel aussi appelé « or de la ruche » est produit par les abeilles à partir du nectar des fleurs. Avec sa texture fluide, le Forever Bee Honey s'ajoute facilement à l'alimentation. Son flacon est facile à utiliser pour doser.	العسل، المعروف بـ«ذهب الخلية»، ينتجه النحل من رحيق الأزهار. بفضل قوامه السائل، يسهل إضافة عسل فوريفر إلى الطعام، وعبوته عملية لتحديد الجرعة.	["100% miel naturel"]	\N	Pour une consommation personnelle. Enfants : à consommer à partir de 12 mois.	\N	/products/page-10.jpg	500 g	f	f	\N	7	2026-07-11 22:12:17.137381+00	\N	t	\N
p09	forever-propolis	Forever Propolis	بروبوليس فوريفر	Produits de la Ruche	259	4.6	73	Résine collectée par les abeilles, aux propriétés antimicrobiennes.	راتينج يجمعه النحل، بخصائص مضادة للميكروبات.	La propolis est une résine collectée et métabolisée par les abeilles mellifères à partir des arbres. Cette substance aux propriétés antimicrobiennes est utilisée pour protéger la ruche de la prolifération de champignons et de bactéries.	العكبر (البروبوليس) راتينج يجمعه نحل العسل من الأشجار ويحوّله. تُستخدم هذه المادة ذات الخصائص المضادة للميكروبات لحماية الخلية من الفطريات والبكتيريا.	["69,6% de poudre de propolis", "7% de miel", "Contient soja et amande"]	\N	Prendre 2 comprimés par jour.	\N	/products/page-11.jpg	60 comprimés	f	f	\N	8	2026-07-11 22:12:17.137381+00	\N	t	\N
p10	forever-bee-pollen	Forever Bee Pollen	حبوب لقاح النحل فوريفر	Produits de la Ruche	238	4.7	91	Collecté sur les fleurs, améliore la vitalité lors des changements de saison.	يُجمع من الأزهار، يحسّن الحيوية عند تغير الفصول.	Collecté sur les fleurs par les abeilles, le Pollen Forever améliore la vitalité et la résistance de l'organisme lors des changements de saison.	يجمعه النحل من الأزهار، ويحسّن حبوب لقاح فوريفر حيوية الجسم ومقاومته عند تغيّر الفصول.	["86% pollen (500 mg par comprimé)", "12% miel"]	\N	3 comprimés par jour pendant les repas.	\N	/products/page-11.jpg	100 comprimés	f	f	\N	9	2026-07-11 22:12:17.137381+00	\N	t	\N
p11	forever-royal-jelly	Forever Royal Jelly	الغذاء الملكي فوريفر	Produits de la Ruche	302	4.8	110	Idéale pour se prémunir contre les conséquences de la période hivernale.	مثالي للوقاية من تداعيات فصل الشتاء.	La Gelée Royale est idéale pour se prémunir contre les conséquences de la période hivernale. Forever Royal Jelly renforce en douceur les défenses naturelles de l'organisme.	الغذاء الملكي مثالي للوقاية من تداعيات فصل الشتاء. يعزّز الغذاء الملكي من فوريفر بلطف الدفاعات الطبيعية للجسم.	["75,8 mg de gelée royale lyophilisée (équivalent à 250 mg de gelée royale fraîche par comprimé)"]	\N	Prendre 1 à 2 comprimés à croquer par jour.	\N	/products/page-11.jpg	60 comprimés	f	f	\N	10	2026-07-11 22:12:17.137381+00	\N	t	\N
p12	forever-active-pro-b	Forever Active Pro-B	أكتيف برو-بي فوريفر	Nutrition	346	4.8	245	Probiotiques et prébiotiques pour un coup de pouce à la flore intestinale.	بروبيوتيك وبريبايوتيك لدعم فلورا الأمعاء.	La flore intestinale est composée de plusieurs milliards de bactéries qui participent au bon fonctionnement de l'organisme. Forever Active Pro-B associe de façon synergique des probiotiques et des prébiotiques.	تتكون فلورا الأمعاء من مليارات البكتيريا التي تساهم في حسن سير عمل الجسم. يجمع Forever Active Pro-B بشكل تآزري بين البروبيوتيك والبريبايوتيك.	["Probiotiques", "Prébiotiques"]	["بروبيوتيك", "بريبايوتيك"]	Prendre 1 gélule par jour avec un verre d'eau, 30 minutes avant le repas.	تناول كبسولة واحدة يومياً مع كوب ماء، قبل 30 دقيقة من الوجبة.	/products/page-12.jpg	30 capsules	t	f	\N	11	2026-07-11 22:12:17.137381+00	\N	f	\N
p15	forever-absorbent-c	Forever Absorbent-C	أبسوربنت-سي فوريفر	Nutrition	259	4.7	178	Vitamine C pour réduire la fatigue et renforcer la résistance de l'organisme.	فيتامين سي لتقليل التعب وتقوية مقاومة الجسم.	La vitamine C contribue à réduire la fatigue et permet de retrouver tonus et énergie. Elle est indispensable pour renforcer la résistance de l'organisme.	يساهم فيتامين سي في تقليل التعب واستعادة النشاط والطاقة. وهو ضروري لتقوية مقاومة الجسم.	["42% de fibres naturelles d'avoine", "5,2% d'acide ascorbique (vitamine C)", "9,5% de miel"]	\N	1 comprimé à croquer par jour, le matin.	\N	/products/page-13.png	100 comprimés	f	f	\N	14	2026-07-11 22:12:17.137381+00	\N	f	\N
p18	forever-immublend	Forever ImmuBlend	إيميوبلند فوريفر	Nutrition	356	4.7	94	Vitamines, minéraux et champignons traditionnels pour stimuler l'immunité.	فيتامينات ومعادن وفطريات تقليدية لتحفيز المناعة.	Forever ImmuBlend, association de vitamines, minéraux et de champignons traditionnellement utilisés en Asie, contribue à stimuler les défenses immunitaires pour optimiser son capital santé.	فوريفر إيميوبلند، مزيج من الفيتامينات والمعادن والفطريات المستخدمة تقليدياً في آسيا، يساهم في تحفيز الدفاعات المناعية للحفاظ على رصيدك الصحي.	["Mélange de champignons", "Vitamines C, D3", "Zinc"]	\N	Prendre 1 comprimé par jour.	\N	/products/page-15.jpg	60 capsules	f	f	\N	17	2026-07-11 22:12:17.137381+00	\N	f	\N
p14	fields-of-greens	Fields of Greens	فيلدز أوف جرينز	Nutrition	324	4.5	68	Jeunes pousses végétales : orge, blé, luzerne et piments de Cayenne.	براعم نباتية فتية: الشعير، القمح، الجلبان وفلفل الكايين.	Fields of Greens est obtenu à partir de jeunes pousses végétales : feuilles d'orge, de blé, de luzerne et de piments de Cayenne.	يُستخلص فيلدز أوف جرينز من براعم نباتية فتية: أوراق الشعير والقمح والفصفصة وفلفل الكايين.	["19% poudre de feuilles d'orge", "19% poudre de pousse de blé", "19% poudre de feuilles de luzerne", "0,2% poudre de piments de Cayenne"]	\N	Prendre 2 comprimés par jour.	\N	/products/page-13.jpg	68 comprimés	f	f	\N	13	2026-07-11 22:12:17.137381+00	\N	t	\N
p16	forever-ivision	Forever iVision	آي فيجن فوريفر	Nutrition	367	4.6	59	Vitamines A, C, E et zinc pour protéger les yeux face aux écrans.	فيتامينات A وC وE والزنك لحماية العينين من الشاشات.	Adaptez vos yeux à un style de vie connecté ! Forever iVision est le complément alimentaire pour notre vision avec un apport complet de vitamines A, C, E et de zinc.	هيّئ عينيك لنمط حياة متصل بالشاشات! فوريفر آي فيجن مكمّل غذائي للرؤية بتركيبة كاملة من فيتامينات A وC وE والزنك.	["Vitamines A, C, E", "Zinc", "Lutemax 2020", "Contient soja et poisson"]	\N	Prendre 2 capsules par jour avec un demi-verre d'eau. Déconseillé aux fumeurs (bêta-carotène).	\N	/products/page-14.jpg	60 comprimés	f	f	\N	15	2026-07-11 22:12:17.137381+00	\N	t	\N
p17	forever-supergreens	Forever Supergreens	سوبر جرينز فوريفر	Nutrition	389	4.6	77	Plus de 20 variétés de fruits et légumes, Aloe vera, vitamine C et magnésium.	أكثر من 20 نوعاً من الفواكه والخضار، ألوفيرا، فيتامين سي والمغنيسيوم.	Forever Supergreens contient plus de 20 variétés de fruits et légumes, de l'Aloe vera, de la vitamine C et du magnésium. Ce mélange favorise le maintien des défenses naturelles et la récupération musculaire.	يحتوي فوريفر سوبر جرينز على أكثر من 20 نوعاً من الفواكه والخضار، والألوفيرا، وفيتامين سي، والمغنيسيوم. يدعم هذا المزيج الدفاعات الطبيعية والتعافي العضلي.	["Pomme", "Betterave", "Tomate", "Citrouille", "Carotte", "Épinards", "Brocolis", "Aloe vera", "Chou Kale", "Thé vert", "Baies de Goji"]	\N	Verser un stick dans votre boisson à l'Aloe Vera préférée ou dans de l'eau, mélanger et boire.	\N	/products/page-14.jpg	30 sachets	f	f	\N	16	2026-07-11 22:12:17.137381+00	\N	t	\N
p19	forever-daily	Forever Daily	فوريفر ديلي	Nutrition	432	4.8	134	Formule exclusive de 55 ingrédients pour un bien-être optimal au quotidien.	تركيبة حصرية من 55 مكوناً لعافية مثالية يومياً.	Formule exclusive de 55 ingrédients qui associe les nutriments du Complexe AOS (Aloe OligoSaccharides) à des vitamines, minéraux et phytonutriments d'extraits de fruits et légumes.	تركيبة حصرية من 55 مكوناً تجمع بين عناصر مركّب AOS (أوليغوسكاريدات الألوة) والفيتامينات والمعادن والمغذيات النباتية من مستخلصات الفواكه والخضار.	["Complexe AOS", "12 vitamines (A, B1, B2, B3, B5, B6, B8, B9, B12, C, D, E)", "8 minéraux essentiels", "Forever FVX20 (20 extraits de fruits et légumes)"]	\N	Prendre 2 comprimés tous les matins.	\N	/products/page-16.jpg	60 comprimés	f	f	\N	18	2026-07-11 22:12:17.137381+00	\N	t	\N
p20	forever-ail-thym	Forever Ail et Thym	الثوم والزعتر فوريفر	Nutrition	238	4.5	52	Combinaison unique de 2 extraits de plantes pour le confort digestif.	مزيج فريد من مستخلصين نباتيين للراحة الهضمية.	Forever Ail et Thym est une combinaison unique de 2 extraits de plantes connues pour améliorer le confort digestif. Capsule sans odeur équivalent à 1000 mg d'ail frais.	الثوم والزعتر من فوريفر مزيج فريد من مستخلصين نباتيين معروفين بتحسين الراحة الهضمية. كبسولة بدون رائحة تعادل 1000 ملغ من الثوم الطازج.	["3% d'extrait de bulbe d'ail", "15,4% poudre de thym (feuilles)", "Contient du soja"]	\N	Prendre 1 capsule 3 fois par jour, de préférence pendant les repas.	\N	/products/page-16.jpg	100 comprimés	f	f	\N	19	2026-07-11 22:12:17.137381+00	\N	t	\N
p25	forever-move	Forever Move	فوريفر موف	Nutrition	454	4.7	88	Membrane de coquille d'œuf NEM® et curcuma BioCurc® pour le confort articulaire.	غشاء قشر البيض NEM® وكركم BioCurc® لراحة المفاصل.	Forever Move est l'association de deux ingrédients brevetés, la membrane de coquille d'œuf NEM® et le curcuma BioCurc®. Ils agissent en synergie pour favoriser un confort articulaire optimal.	فوريفر موف مزيج من مكوّنين مسجّلين ببراءة اختراع: غشاء قشر البيض NEM® وكركم BioCurc®. يعملان بتآزر لدعم راحة مفصلية مثالية.	["Membrane de coquille d'œuf NEM®", "Extrait de rhizome de curcuma BioCurc®"]	\N	Prendre 3 capsules par jour.	\N	/products/page-19.jpg	90 capsules	f	f	\N	24	2026-07-11 22:12:17.137381+00	\N	f	\N
p23	vitolize-femmes	Vitolize Femmes	فيتولايز للنساء	Nutrition	389	4.6	71	Plantes, vitamines et minéraux conçus spécialement pour les femmes.	نباتات وفيتامينات ومعادن مصممة خصيصاً للنساء.	Ce mélange naturel de plantes, vitamines et minéraux a été spécialement conçu pour les femmes. La vitamine B6 aide à réguler l'équilibre hormonal et la passiflore aide à diminuer le stress.	صُمّم هذا المزيج الطبيعي من النباتات والفيتامينات والمعادن خصيصاً للنساء. يساعد فيتامين B6 على تنظيم التوازن الهرموني، وتساعد زهرة الآلام على تقليل التوتر.	["Poudre de pomme", "Baies de Schisandra", "Poudre de fruits de canneberge", "Magnésium", "Vitamines C, D, B12"]	\N	4 capsules par jour.	\N	/products/page-18.jpg	60 capsules	f	f	\N	22	2026-07-11 22:12:17.137381+00	\N	t	\N
p24	vitolize-hommes	Vitolize Hommes	فيتولايز للرجال	Nutrition	410	4.6	64	Vitamines, minéraux et phytostérols pour le bon fonctionnement de la prostate.	فيتامينات ومعادن وفيتوستيرول لدعم البروستاتا.	Vitolize Hommes contient des vitamines et des minéraux, ainsi que des phytostérols pour conserver un bon fonctionnement de la prostate. Le zinc contribue au maintien normal de la fertilité.	يحتوي فيتولايز للرجال على فيتامينات ومعادن وفيتوستيرول للحفاظ على أداء جيد للبروستاتا. ويساهم الزنك في الحفاظ على الخصوبة الطبيعية.	["Huile de pépins de citrouille", "Vitamines B6, C, D, E", "Zinc", "Sélénium", "Contient soja et poisson"]	\N	2 capsules par jour.	\N	/products/page-18.jpg	120 capsules	f	f	\N	23	2026-07-11 22:12:17.137381+00	\N	t	\N
p26	forever-calcium	Forever Calcium	كالسيوم فوريفر	Nutrition	281	4.6	57	Calcium, magnésium et vitamines pour une ossature normale.	كالسيوم ومغنيسيوم وفيتامينات لعظام طبيعية.	Forever Calcium contient des vitamines C et D ainsi que des minéraux (calcium, magnésium, manganèse, zinc, cuivre) pour contribuer au maintien d'une ossature et d'une fonction musculaire normales.	يحتوي فوريفر كالسيوم على فيتاميني C وD ومعادن (كالسيوم، مغنيسيوم، منغنيز، زنك، نحاس) للمساهمة في الحفاظ على عظام ووظيفة عضلية طبيعية.	["Calcium", "Magnésium", "Vitamine C", "Zinc", "Manganèse", "Cuivre", "Vitamine D"]	\N	4 comprimés par jour.	\N	/products/page-20.jpg	376 comprimés	f	f	\N	25	2026-07-11 22:12:17.137381+00	\N	t	\N
p27	forever-arctic-sea	Forever Arctic-Sea	آركتيك-سي فوريفر	Nutrition	432	4.8	142	Oméga-3 (EPA et DHA) pour le fonctionnement normal du cerveau et du cœur.	أوميغا-3 (EPA وDHA) لوظيفة طبيعية للدماغ والقلب.	Forever Arctic-Sea contient des acides gras insaturés, des oméga-3, dont de l'EPA et du DHA présents dans les huiles de poissons et de calamar. Ils contribuent au fonctionnement normal du cerveau et du cœur.	يحتوي Forever Arctic-Sea على أحماض دهنية غير مشبعة، أوميغا-3، بما في ذلك EPA وDHA الموجودة في زيوت الأسماك والحبار. تساهم في الوظيفة الطبيعية للدماغ والقلب.	["45,9% huile de poissons", "16,6% huile de calamar", "11,3% huile d'olive extravierge", "Contient du poisson"]	["45.9% زيت السمك", "16.6% زيت الحبار", "11.3% زيت زيتون بكر ممتاز", "يحتوي على السمك"]	Prendre 2 capsules 3 fois par jour, soit 6 capsules par jour.	تناول كبسولتين 3 مرات يومياً، أي 6 كبسولات في اليوم.	/products/page-20.jpg	90 capsules	t	f	\N	26	2026-07-11 22:12:17.137381+00	\N	t	\N
p28	aloe-msm-gel	Aloe MSM Gel	جل الألوفيرا إم إس إم	Nutrition	270	4.7	99	Soufre organique pour favoriser le maintien du tissu conjonctif.	كبريت عضوي لدعم النسيج الضام.	Le methyl sulfonyl méthane (MSM) est une source stable et naturelle de soufre organique, présent en concentration élevée dans les articulations, favorisant le maintien de l'intégrité du tissu conjonctif.	الميثيل سلفونيل ميثان (MSM) مصدر مستقر وطبيعي للكبريت العضوي، موجود بتركيز عالٍ في المفاصل، ويساهم في الحفاظ على سلامة النسيج الضام.	["Gel d'aloès", "15% de MSM"]	["جل الألوة", "15% MSM"]	Appliquer en massages généreux sur les zones nécessaires.	يُطبق بتدليك سخي على المناطق المطلوبة.	/products/page-21.jpg	118 ml	t	f	\N	27	2026-07-11 22:12:17.137381+00	\N	t	\N
p29	emulsion-thermogene	Émulsion Thermogène	مستحلب التدفئة	Nutrition	292	4.5	46	Crème de massage au menthol pour soulager les articulations.	كريم تدليك بالمنثول لتخفيف آلام المفاصل.	Cette crème de massage est le complément idéal pour soulager les articulations ou préparer les muscles à l'effort grâce au menthol et aux huiles d'eucalyptus, de sésame, de jojoba et d'abricot.	كريم التدليك هذا مكمّل مثالي لتخفيف آلام المفاصل أو تهيئة العضلات للمجهود بفضل المنثول وزيوت الأوكالبتوس والسمسم والجوجوبا والمشمش.	["35,9% menthol et huiles essentielles"]	\N	Appliquer en massages. Ne pas appliquer sur le visage.	\N	/products/page-21.jpg	118 ml	f	f	\N	28	2026-07-11 22:12:17.137381+00	\N	t	\N
p30	forever-argi-plus	Forever Argi+	أرجي+ فوريفر	Nutrition	475	4.7	103	L-Arginine et cocktail de vitamines pour l'effort extrême.	أل-أرجينين ومزيج فيتامينات للمجهود الشديد.	Vitalité, force, endurance, sport extrême : Forever Argi+ combine la L-Arginine à un cocktail unique de vitamines et d'extraits de fruits pour un accompagnement idéal pendant l'effort.	حيوية وقوة وتحمّل ورياضة قصوى: يجمع فوريفر أرجي+ بين أل-أرجينين ومزيج فريد من الفيتامينات ومستخلصات الفواكه لمرافقة مثالية أثناء المجهود.	["51% de L-Arginine", "Mélange d'extraits de fruits rouges", "Vitamines C, B6, B9"]	\N	Mélanger une dosette à 240 ml de boisson (eau, jus de fruits ou Pulpe d'Aloe Vera).	\N	/products/page-22.jpg	30 sachets de 10 g	f	f	\N	29	2026-07-11 22:12:17.137381+00	\N	f	\N
p32	forever-therm	Forever Therm	فوريفر ثيرم	Fitness & Minceur	443	4.6	79	Thé vert, café vert et guarana pour contrôler le poids et l'énergie.	شاي أخضر، قهوة خضراء وجوارانا للتحكم بالوزن والطاقة.	Forever Therm est un brûleur de graisses qui contient des extraits de plantes (thé vert, café vert, guarana) associés à des vitamines du groupe B et de la vitamine C. Aide à contrôler le poids et réduire la fatigue.	فوريفر ثيرم حارق للدهون يحتوي على مستخلصات نباتية (الشاي الأخضر، القهوة الخضراء، الجوارانا) مع فيتامينات المجموعة B وفيتامين سي. يساعد على التحكم بالوزن وتقليل التعب.	["Thé vert", "Guarana", "Café vert", "8 vitamines (B1, B2, B3, B5, B6, B9, B12, C)"]	\N	Prendre 2 comprimés le matin.	\N	/products/page-23.jpg	60 comprimés	f	f	\N	31	2026-07-11 22:12:17.137381+00	\N	t	\N
p33	forever-lite-ultra-vanille	Forever Lite Ultra — Vanille	لايت ألترا فوريفر - فانيليا	Fitness & Minceur	518	4.8	211	24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.	24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.	Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.	Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.	["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E", "Protéines", "Contient soja et lait"]	["فيتامينات B1، B2، B3، B5، B6، B8، B9، B12، D، E", "بروتينات", "يحتوي على الصويا والحليب"]	Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.	في الخلاط: ملعقة قياس واحدة، 240 مل من السائل، فواكه حسب الاختيار ومكعبات ثلج. اخلط لمدة 20 إلى 30 ثانية.	/products/page-25.jpg	470 g	t	f	\N	32	2026-07-11 22:12:17.137381+00	\N	t	\N
p34	forever-lite-ultra-chocolat	Forever Lite Ultra — Chocolat	لايت ألترا فوريفر - شوكولاتة	Fitness & Minceur	518	4.7	174	24g de protéines et 21 vitamines & minéraux par dose, le shake idéal.	24 غ من البروتين و21 فيتاميناً ومعدناً في كل جرعة.	Forever Lite Ultra est idéal pour compléter un repas léger et apporter protéines, glucides, vitamines et minéraux. Les protéines participent au maintien de la masse musculaire. 180 calories par portion.	Forever Lite Ultra مثالي لاستكمال وجبة خفيفة وتوفير البروتينات والكربوهيدرات والفيتامينات والمعادن. تساهم البروتينات في الحفاظ على الكتلة العضلية. 180 سعرة حرارية لكل حصة.	["Vitamines B1, B2, B3, B5, B6, B8, B9, B12, D, E", "Protéines", "Contient soja et lait"]	\N	Dans un mixeur : 1 cuillère doseuse, 240 ml de boisson, fruits au choix et glaçons. Mixer 20 à 30 secondes.	\N	/products/page-25.jpg	471 g	f	f	\N	33	2026-07-11 22:12:17.137381+00	\N	t	\N
p35	pack-detox-pulpe	Pack Detox — Pulpe d'Aloès	حزمة ديتوكس - لب الألوة	Packs	1026	4.8	63	Détoxifier le corps, sensation de légèreté et énergie retrouvée.	تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.	Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.	الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.	[]	\N	Suivre le livret de programme inclus pendant la durée du programme Detox.	اتبع كتيب البرنامج المرفق طوال مدة برنامج ديتوكس.	/products/page-26.jpg	1 programme	t	f	["1x Forever Ultra Lite (Vanille ou Chocolat)", "2x Pulpes d'Aloès Stabilisée", "1x Forever Fields of Greens", "1x Forever Active Pro-B", "1x Livret de suivi du programme"]	34	2026-07-11 22:12:17.137381+00	\N	t	\N
p36	pack-detox-berry	Pack Detox — Aloe Berry Nectar	حزمة ديتوكس - ألوفيرا بيري نكتار	Packs	1026	4.7	51	Détoxifier le corps, sensation de légèreté et énergie retrouvée.	تخليص الجسم من السموم، شعور بالخفة وطاقة متجددة.	Objectif : un corps ferme et tonique. Les résultats apparaissent dès les premiers jours : détoxification, sensation de légèreté et énergie retrouvée.	الهدف: جسم مشدود ومتناسق. تظهر النتائج منذ الأيام الأولى: تخلّص من السموم، شعور بالخفة، وطاقة متجددة.	[]	\N	Suivre le livret de programme inclus pendant la durée du programme Detox.	\N	/products/page-26.jpg	1 programme	f	f	["1x Forever Ultra Lite (Vanille ou Chocolat)", "2x Aloe Berry Nectar", "1x Forever Fields of Greens", "1x Forever Active Pro-B", "1x Livret de suivi du programme"]	35	2026-07-11 22:12:17.137381+00	\N	t	\N
p38	pack-hygiene	Pack Hygiène	حزمة العناية اليومية	Packs	961	4.7	44	Produits d'hygiène et cosmétiques pour toute la famille.	منتجات عناية ونظافة لكل العائلة.	Le pack Hygiène réunit les indispensables Forever pour le soin du corps et du visage au quotidien.	تجمع حزمة العناية اليومية أساسيات فوريفر للعناية بالجسم والوجه يومياً.	[]	\N	À intégrer dans votre routine quotidienne.	\N	/products/page-28.jpg	5 produits	f	f	["1x Aloe First", "1x Aloe Liquid Soap", "2x Stick Déodorant Aloès", "1x Avocado Face & Body Soap", "1x Shampoing Aloe-Jojoba", "1x Après-shampoing Aloe-Jojoba"]	37	2026-07-11 22:12:17.137381+00	\N	t	\N
p39	programme-bien-etre	Programme Bien-être	برنامج العافية	Packs	1285	4.8	57	Un bien-être au quotidien, de l'intérieur comme de l'extérieur.	عافية يومية، من الداخل والخارج.	Le pack Bien-être associe nutrition et soin du corps pour un programme complet de bien-être quotidien.	يجمع برنامج العافية بين التغذية والعناية بالجسم لبرنامج عافية يومي متكامل.	[]	\N	À suivre quotidiennement, en complément d'une alimentation équilibrée.	\N	/products/page-28.jpg	6 produits	f	f	["1x Pulpe d'Aloès Stabilisée", "1x Aloe Berry Nectar", "1x Forever Active Pro-B", "1x Forever Absorbent-C", "1x Forever Fields of Greens", "2x Forever Bright Aloès"]	38	2026-07-11 22:12:17.137381+00	\N	t	\N
p40	pack-go2fbo	Pack de Démarrage — GO2FBO	حزمة الانطلاق - GO2FBO	Packs	1890	4.8	29	Le pack de démarrage complet pour découvrir l'univers Forever.	حزمة الانطلاق الكاملة لاكتشاف عالم فوريفر.	Le programme GO2FBO réunit une large sélection de produits phares pour découvrir l'ensemble des gammes Forever.	يجمع برنامج GO2FBO تشكيلة واسعة من المنتجات المميزة لاكتشاف جميع مجموعات فوريفر.	[]	\N	Idéal pour démarrer votre activité de distributeur ou découvrir la marque.	\N	/products/page-29.jpg	Pack complet	f	t	["2x Mini Aloe Vera Gel", "Aloe-Jojoba Shampoo & Conditioner", "Aloe Heat Lotion", "Forever Arctic Sea", "Aloe Avocado Soap", "Aloe Sunscreen", "Forever Absorbent-C", "Forever Ail & Thym", "Forever Bee Pollen", "Forever Daily", "Forever Kids"]	39	2026-07-11 22:12:17.137381+00	\N	t	\N
p41	start-your-journey-pack	Start Your Journey Pack	حزمة بداية الرحلة	Packs	1609	4.7	33	Quatre produits essentiels pour démarrer votre routine Forever.	أربعة منتجات أساسية لبدء روتينك مع فوريفر.	Un pack pensé pour accompagner vos premiers pas avec les produits Forever au quotidien.	حزمة مصممة لمرافقة خطواتك الأولى مع منتجات فوريفر يومياً.	[]	\N	À utiliser quotidiennement pour intégrer les essentiels Forever à votre routine.	\N	/products/page-29.jpg	Pack complet	f	t	["4x Forever Aloe Lips with Jojoba", "2x Forever Bright Toothgel", "1x Aloe Propolis Crème", "1x Aloe Vera Gelly", "2x Aloe Ever-Shield Deodorant", "1x Aloe Moisturizing Lotion", "1x Aloe Body Wash", "1x Aloe Body Lotion"]	40	2026-07-11 22:12:17.137381+00	\N	t	\N
p44	gelee-aloes	Gelée Aloès	جل الألوة	Beauté	205	4.7	112	Gel transparent non gras, idéal contre irritations et coups de soleil.	جل شفاف غير دهني، مثالي للتهيجات وحروق الشمس.	Particulièrement riche en Aloe Vera, ce gel transparent non gras possède toutes les vertus de la plante. Il hydrate et régénère l'épiderme. Idéal contre les irritations de la peau et les coups de soleil.	غني جداً بالألوفيرا، يمتلك هذا الجل الشفاف غير الدهني كل فضائل النبتة. يرطب البشرة ويجددها. مثالي ضد تهيجات الجلد وحروق الشمس.	["84,4% de gel d'aloès"]	\N	Appliquer généreusement sur une peau parfaitement nettoyée.	\N	/products/page-31.jpg	473 ml	f	f	\N	43	2026-07-11 22:12:17.137381+00	\N	t	\N
p43	aloe-propolis-creme	Aloe Propolis Crème	كريم البروبوليس بالألوة	Beauté	259	4.8	167	Un véritable soin anti-bactérien et réparateur pour les irritations cutanées.	عناية حقيقية مضادة للبكتيريا ومُصلحة لتهيجات البشرة.	L'aloès associé à la propolis font de cette crème à la texture riche un véritable soin anti-bactérien et réparateur. La camomille, l'allantoïne et les vitamines A et E apportent à la peau douceur et souplesse.	الألوة المرتبطة بالبروبوليس تجعل من هذا الكريم ذي القوام الغني عناية حقيقية مضادة للبكتيريا ومُصلحة. البابونج والألانتوين وفيتامينات A وE تمنح البشرة نعومة ومرونة.	["74,1% de gel d'aloès", "0,5% propolis", "Camomille", "Allantoïne", "Vitamines A et E"]	["74.1% جل ألوة", "0.5% بروبوليس", "بابونج", "ألانتوين", "فيتامينات A وE"]	Appliquer sur une peau parfaitement nettoyée.	يُطبق على بشرة نظيفة تماماً.	/products/page-31.jpg	113 g	t	f	\N	42	2026-07-11 22:12:17.137381+00	\N	t	\N
p45	aloe-body-lotion	Aloe Body Lotion	لوشن الجسم بالألوة	Beauté	248	4.8	156	Apaise, hydrate et protège la peau du dessèchement.	يهدئ ويرطب ويحمي البشرة من الجفاف.	L'Aloe Body Lotion apaise, hydrate et protège la peau du dessèchement. Grâce à sa concentration en gel d'Aloe Vera, huile d'argan, vitamine E et huile de macadamia, elle pénètre rapidement et laisse la peau souple. Sans silicone.	يهدئ لوشن الجسم بالألوة ويرطب ويحمي البشرة من الجفاف. بفضل تركيزه من جل الألوفيرا وزيت الأركان وفيتامين E وزيت المكاداميا، يتغلغل بسرعة ويترك البشرة ناعمة. بدون سيليكون.	["Gel Aloe Vera", "Huile d'argan", "Vitamine E", "Huile de graines de macadamia"]	\N	Appliquer généreusement et masser doucement jusqu'à absorption complète.	\N	/products/page-32.jpg	236 ml	f	f	\N	44	2026-07-11 22:12:17.137381+00	\N	f	\N
p46	aloe-liquid-soap	Aloe Liquid Soap	صابون الألوة السائل	Beauté	194	4.7	121	Savon doux pour le visage, le corps et les cheveux, dès 3 ans.	صابون لطيف للوجه والجسم والشعر، من سن 3 سنوات.	L'Aloe Liquid Soap est un savon pour le visage, le corps et les cheveux à destination de toute la famille. Sa formule très douce nettoie délicatement, respecte la peau et les cheveux, hydrate et préserve du dessèchement.	صابون الألوة السائل صابون للوجه والجسم والشعر لكل أفراد العائلة. تركيبته اللطيفة جداً تنظف برفق، وتحترم البشرة والشعر، وترطب وتقي من الجفاف.	["39% de Gel d'Aloe vera", "Agents lavants de noix de coco", "Extrait de concombre et jojoba", "Huile d'Argan", "Glycérine végétale"]	\N	Émulsionner sur peau ou cheveux mouillés, rincer abondamment.	\N	/products/page-33.jpg	473 ml	f	t	\N	45	2026-07-11 22:12:17.137381+00	\N	f	\N
p48	stick-deodorant-aloes	Aloe Ever-Shield — Stick Déodorant	مزيل العرق إيفر-شيلد بالألوة	Beauté	140	4.7	132	Sans alcool, sans sels d'aluminium, protection efficace sans tacher.	بدون كحول أو أملاح الألومنيوم، حماية فعالة بدون بقع.	Sans alcool, sans sels d'aluminium et discrètement parfumé, ce déodorant assure une protection efficace sans tacher vos vêtements. Sa formule à l'aloès adoucit et hydrate la peau.	بدون كحول أو أملاح الألومنيوم ومعطر بلطف، يوفر هذا المزيل حماية فعالة بدون ترك بقع على ملابسك. تركيبته بالألوة تلين وترطب البشرة.	["Gel d'aloès"]	["جل الألوة"]	Appliquer le matin ou avant l'effort sur une peau propre et sèche.	يُطبق في الصباح أو قبل المجهود على بشرة نظيفة وجافة.	/products/page-34.jpg	67 g	t	f	\N	47	2026-07-11 22:12:17.137381+00	\N	t	\N
p49	instant-hand-cleanser	Instant Hand Cleanser	منظف اليدين الفوري	Beauté	97	4.5	88	Nettoie les mains en toute sécurité où que vous soyez.	ينظف اليدين بأمان أينما كنت.	Une formule gel pour nettoyer vos mains en toute sécurité où que vous soyez. Enrichie en Aloe Vera, sa formule parfume délicatement les mains sans les dessécher.	تركيبة جل لتنظيف يديك بأمان أينما كنت. مُخصبة بالألوفيرا، تعطر تركيبته اليدين بلطف دون أن تجففهما.	["Alcool", "Aloe Vera"]	\N	Verser une noisette de gel et frotter les mains jusqu'à ce qu'elles soient sèches.	\N	/products/page-34.jpg	28 g	f	f	\N	48	2026-07-11 22:12:17.137381+00	\N	t	\N
p50	aloe-lips	Aloe Lèvres (Aloe Lips)	بلسم الشفاه بالألوة	Beauté	86	4.9	287	Baume ultra-hydratant à l'Aloe Vera, huile de jojoba et cire d'abeille.	بلسم مرطب جداً بالألوفيرا وزيت الجوجوبا وشمع العسل.	Une formule ultra-hydratante et protectrice pour ce baume à lèvres qui associe Aloe Vera, huile de jojoba et cire d'abeille. Apporte un confort réparateur pour les lèvres les plus desséchées.	تركيبة مرطبة وواقية للغاية لهذا البلسم الذي يجمع بين الألوفيرا وزيت الجوجوبا وشمع العسل. يوفر راحة مُصلحة للشفاه الأكثر جفافاً.	["27,5% de gel d'aloès", "20,4% d'huile de jojoba", "Cire d'abeille"]	["27.5% جل ألوة", "20.4% زيت جوجوبا", "شمع العسل"]	Appliquer sur les lèvres dès que le besoin se fait sentir.	يُطبق على الشفاه عند الحاجة.	/products/page-35.jpg	4,5 g	t	f	\N	49	2026-07-11 22:12:17.137381+00	\N	t	\N
p51	savon-avocat	Forever Avocado Face & Body Soap	صابون الأفوكادو للوجه والجسم	Beauté	130	4.7	119	Beurre d'avocat, nettoie toutes les peaux même les plus sensibles.	زبدة الأفوكادو، تنظف حتى أكثر البشرات حساسية.	Enrichi en beurre d'avocat, le Savon à l'Avocat nettoie toutes les peaux même les plus sensibles en les hydratant. Son léger parfum de fleurs de citronnier apporte un véritable plaisir.	مُخصب بزبدة الأفوكادو، صابون الأفوكادو ينظف جميع أنواع البشرة حتى الأكثر حساسية مع ترطيبها. عطره الخفيف من زهور الليمون يمنح متعة حقيقية.	["Beurre d'avocat"]	["زبدة الأفوكادو"]	Émulsionner chaque jour sur peau mouillée.	يُستحلب يومياً على بشرة مبللة.	/products/page-35.jpg	284 g	t	f	\N	50	2026-07-11 22:12:17.137381+00	\N	t	\N
p52	ecran-solaire-aloes	Aloe Sunscreen SPF 30	واقي الشمس بالألوة SPF 30	Beauté	281	4.6	95	Protection SPF 30 avancée contre les UVA et UVB, sans effet blanc.	حماية SPF 30 متقدمة من الأشعة UVA وUVB، بدون أثر أبيض.	Aloe Sunscreen combine le pouvoir apaisant de l'aloès avec de l'oxyde de zinc naturel pour une protection SPF 30 avancée contre les rayons UVA et UVB. Adaptée à tous les types de peau.	يجمع Aloe Sunscreen بين القوة المهدئة للألوة وأكسيد الزنك الطبيعي لحماية SPF 30 متقدمة من أشعة UVA وUVB. مناسب لجميع أنواع البشرة.	["Aloe vera", "Vitamine E", "Oxyde de zinc"]	["ألوفيرا", "فيتامين E", "أكسيد الزنك"]	Appliquer uniformément avant toute exposition au soleil. Renouveler toutes les 2 heures.	يُطبق بانتظام وبسخاء قبل أي تعرض للشمس. يُجدد كل ساعتين.	/products/page-36.jpg	177 ml	t	f	\N	51	2026-07-11 22:12:17.137381+00	\N	t	\N
p57	aloe-body-wash	Aloe Body Wash	غسول الجسم بالألوة	Beauté	216	4.7	104	Nettoie et revitalise la peau délicatement tout en respectant son équilibre.	ينظف وينشط البشرة بلطف مع الحفاظ على توازنها.	Grâce à sa formule très douce, l'Aloe Body Wash nettoie et revitalise la peau délicatement. Sa texture émulsion-gel fraîche laisse un parfum envoûtant et une peau propre, douce et bien hydratée.	بفضل تركيبته اللطيفة جداً، ينظف غسول الجسم بالألوة البشرة وينشطها برفق. قوامه المنعش يترك عطراً أخّاذاً وبشرة نظيفة وناعمة ومرطبة جيداً.	["Gel Aloe Vera", "Vitamines A, C, E"]	\N	Appliquer sur un luffa ou une éponge, savonner en mouvements circulaires, bien rincer.	\N	/products/page-38.jpg	236 ml	f	f	\N	56	2026-07-11 22:12:17.137381+00	\N	f	\N
p58	shampoing-aloe-jojoba	Shampoing Aloe-Jojoba	شامبو الألوة والجوجوبا	Cheveux	227	4.7	138	Nettoie en profondeur et hydrate tous les types de cheveux.	ينظف بعمق ويرطب جميع أنواع الشعر.	Conçu pour nettoyer en profondeur et hydrater tous les types de cheveux. En associant l'Aloe vera pur à l'huile de jojoba fortifiante et l'huile d'argan, ce shampoing est parfait pour un usage quotidien. Sans sulfates ajoutés.	مصمم لتنظيف جميع أنواع الشعر بعمق وترطيبها. بجمعه بين الألوفيرا النقية وزيت الجوجوبا المقوّي وزيت الأركان، هذا الشامبو مثالي للاستخدام اليومي. بدون كبريتات مضافة.	["39,7% de gel d'aloès", "Huile de jojoba", "Huile d'argan", "Huile d'églantier"]	\N	Appliquer une noix de produit, masser, rincer abondamment.	\N	/products/page-39.jpg	296 ml	f	f	\N	57	2026-07-11 22:12:17.137381+00	\N	f	\N
p53	gentlemans-pride	Gentleman's Pride	جنتلمانز برايد	Beauté	227	4.6	73	Crème fluide et apaisante pour calmer le feu du rasoir.	كريم سائل مهدئ لتهدئة تهيج الحلاقة.	Gentleman's Pride est une crème fluide et légère, aux propriétés apaisantes pour calmer le feu du rasoir et les irritations. Son parfum subtil apporte une note d'élégance discrète.	جنتلمانز برايد كريم سائل خفيف بخصائص مهدئة لتهدئة تهيج الحلاقة والاحمرار. عطره اللطيف يمنح لمسة أناقة هادئة.	["41,8% de gel d'aloès"]	\N	Appliquer quotidiennement sur tout le visage après le rasage.	\N	/products/page-36.jpg	118 ml	f	f	\N	52	2026-07-11 22:12:17.137381+00	\N	t	\N
p55	r3-factor	R3 Factor	آر3 فاكتور	Beauté	421	4.7	76	Répare, renouvelle, repulpe — exfoliation naturelle de la peau.	يُصلح، يجدد، يملأ - تقشير طبيعي للبشرة.	Répare, renouvelle, repulpe. Ce soin favorise l'exfoliation naturelle de la peau et diminue l'apparence des pores. Les rides et ridules sont lissées, le grain de peau est plus fin.	يُصلح، يجدد، يملأ. تدعم هذه العناية التقشير الطبيعي للبشرة وتقلل من ظهور المسام. تُنعَّم التجاعيد والخطوط الدقيقة، ويصبح ملمس البشرة أدق.	["35,48% de gel d'aloès"]	\N	Appliquer matin et soir sur peau nettoyée. Par temps ensoleillé, protéger la peau avec l'Écran Solaire Aloès.	\N	/products/page-37.jpg	69 g	f	f	\N	54	2026-07-11 22:12:17.137381+00	\N	t	\N
p59	apres-shampoing-aloe-jojoba	Après-Shampoing Aloe-Jojoba	بلسم الألوة والجوجوبا	Cheveux	227	4.7	109	Adoucit, démêle, nourrit les cheveux et leur donne de la brillance.	يلين وينعم ويغذي الشعر ويمنحه لمعاناً.	L'après-shampoing est un soin indispensable pour adoucir, démêler, nourrir les cheveux et leur donner de la brillance. Stimule également l'hydratation des cheveux et du cuir chevelu, sans sulfate.	البلسم عناية أساسية لتنعيم الشعر وفك تشابكه وتغذيته ومنحه لمعاناً. يحفّز أيضاً ترطيب الشعر وفروة الرأس، بدون كبريتات.	["40,7% de gel d'aloès", "Huile de jojoba", "Huile d'argan", "Huile d'églantier"]	\N	Appliquer sur l'ensemble de la chevelure en insistant sur les pointes, laisser agir puis rincer.	\N	/products/page-39.jpg	296 ml	f	f	\N	58	2026-07-11 22:12:17.137381+00	\N	t	\N
p60	sonya-gel-nettoyant	Sonya — Gel Nettoyant	سونيا - جل التنظيف	Sonya	259	4.6	62	Une toute nouvelle expérience du démaquillage, riche en Aloe vera et huile de Baobab.	تجربة جديدة كلياً لإزالة المكياج، غنية بالألوفيرا وزيت الباوباب.	Le gel Nettoyant Sonya offre une toute nouvelle expérience du démaquillage. Il fond sur la peau et forme une mousse onctueuse, laissant la peau douce et hydratée.	يقدم جل التنظيف من سونيا تجربة جديدة كلياً لإزالة المكياج. يذوب على البشرة ويشكّل رغوة ناعمة، تاركاً البشرة ناعمة ومرطبة.	["39,2% de gel d'aloès", "Huile de Baobab"]	\N	Utiliser matin et soir pour nettoyer le visage et le cou.	\N	/products/page-41.jpg	177 ml	f	f	\N	59	2026-07-11 22:12:17.137381+00	\N	f	\N
p64	infinite-demaquillant-hydratant	Infinite — Démaquillant Hydratant	إنفينيت - مزيل مكياج مرطب	Infinite	346	4.6	41	Nettoie et hydrate la peau en un seul geste.	ينظف ويرطب البشرة بخطوة واحدة.	Le Démaquillant Hydratant nettoie et hydrate la peau en un seul geste. L'actif nettoyant utilisé, extrait naturel de noix de coco, est hypoallergénique et non irritant.	ينظف مزيل المكياج المرطب البشرة ويرطبها بخطوة واحدة. المكوّن المنظّف المستخدم، مستخلص طبيعي من جوز الهند، مضاد للحساسية وغير مهيّج.	["35% de gel d'aloès", "Extrait naturel de noix de coco"]	\N	Utiliser le matin et le soir pour nettoyer le visage et le cou.	\N	/products/page-42.jpg	177 ml	f	f	\N	63	2026-07-11 22:12:17.137381+00	\N	f	\N
p62	sonya-masque-gel	Sonya — Masque Gel	سونيا - قناع جل	Sonya	302	4.7	58	À appliquer avant le coucher pour optimiser la récupération nocturne.	يُطبق قبل النوم لتحسين التجدد الليلي.	À appliquer juste avant le coucher, le masque gel Sonya se transforme en une texture délicieusement fraîche et vite absorbée, optimisant le processus de récupération nocturne de la peau.	يُطبق قبل النوم مباشرة، يتحول قناع الجل من سونيا إلى قوام منعش لذيذ سريع الامتصاص، ما يحسّن عملية تجدد البشرة الليلي.	["43,2% de gel d'aloès"]	\N	Appliquer au coucher et rincer au réveil, 2 à 3 fois par semaine.	\N	/products/page-41.jpg	59 ml	f	f	\N	61	2026-07-11 22:12:17.137381+00	\N	t	\N
p63	sonya-gel-hydratant	Sonya — Gel Hydratant	سونيا - جل الترطيب	Sonya	292	4.7	49	Fond sur la peau et unifie le teint, riche en Aloe vera.	يذوب على البشرة ويوحد لون البشرة، غني بالألوفيرا.	Le Gel Hydratant Sonya fond sur la peau, l'enveloppe d'un voile de douceur et unifie le teint. Il associe l'Aloe vera à de nombreux extraits végétaux pour optimiser l'hydratation.	يذوب جل الترطيب من سونيا على البشرة، ويغلفها بستار من النعومة ويوحّد لونها. يجمع بين الألوفيرا والعديد من المستخلصات النباتية لترطيب أمثل.	["37,9% de gel d'aloès"]	\N	Appliquer sur le visage et le cou matin et soir.	\N	/products/page-41.jpg	60 ml	f	f	\N	62	2026-07-11 22:12:17.137381+00	\N	t	\N
p65	infinite-serum-raffermissant	Infinite — Sérum Raffermissant	إنفينيت - سيروم الشد	Infinite	626	4.8	67	Un véritable élixir de jeunesse à la chaîne de 3 acides aminés.	إكسير شباب حقيقي بسلسلة من 3 أحماض أمينية.	Le Sérum Raffermissant est un véritable élixir de jeunesse. Il combat les signes visibles de l'âge en intensifiant la puissance de l'Aloe vera grâce à une chaîne spécifique de trois acides aminés.	السيروم المشدد هو إكسير شباب حقيقي. يحارب علامات التقدم في السن الظاهرة من خلال تكثيف قوة الألوفيرا بفضل سلسلة محددة من ثلاثة أحماض أمينية.	["49% gel d'aloès"]	["49% جل ألوة"]	Appliquer sur le visage et le cou préalablement nettoyés avec le Démaquillant Hydratant.	يُطبق على الوجه والرقبة بعد التنظيف بمزيل المكياج المرطب.	/products/page-42.jpg	48,2 ml	t	f	\N	64	2026-07-11 22:12:17.137381+00	\N	t	\N
p66	infinite-creme-reparatrice	Infinite — Crème Réparatrice	إنفينيت - كريم مُصلح	Infinite	583	4.7	59	Texture légère et onctueuse, double action hydratante et réparatrice.	قوام خفيف وناعم، مزدوج الفعالية للترطيب والإصلاح.	La Crème Réparatrice, d'une texture légère et onctueuse, est riche en Aloe vera, extraits de plantes, huile de jojoba et vitamine B3. Le visage est visiblement repulpé, retrouvant jeunesse et élasticité.	الكريم المُصلح، بقوامه الخفيف الناعم، غني بالألوفيرا والمستخلصات النباتية وزيت الجوجوبا وفيتامين B3. يبدو الوجه ممتلئاً بوضوح، مستعيداً شبابه ومرونته.	["38% gel d'aloès", "Huile de jojoba", "Vitamine B3"]	\N	Utiliser le soir au coucher après application du Sérum Raffermissant.	\N	/products/page-42.jpg	555 ml	f	f	\N	65	2026-07-11 22:12:17.137381+00	\N	t	\N
p67	infinite-complexe-raffermissant	Infinite — Complexe Raffermissant	إنفينيت - مركب الشد	Infinite	529	4.6	38	Lutte de l'intérieur contre les signes apparents de l'âge.	يحارب من الداخل علامات التقدم في السن الظاهرة.	Le Complexe Raffermissant lutte de l'intérieur contre les signes apparents de l'âge. Il contient un extrait breveté de melon français, des phytocéramides ainsi que du collagène.	يحارب مركّب الشد من الداخل علامات التقدم في السن الظاهرة. يحتوي على مستخلص شمّام فرنسي مسجّل ببراءة اختراع، وسيراميدات نباتية، وكولاجين.	["Collagène (poisson)", "Vitamine C", "Céramides (blé)", "Extrait de melon"]	\N	Prendre 2 comprimés par jour avec un grand verre d'eau.	\N	/products/page-42.jpg	60 comprimés	f	f	\N	66	2026-07-11 22:12:17.137381+00	\N	t	\N
p68	infinite-lotion-tonifiante	Infinite — Lotion Tonifiante	إنفينيت - لوشن منعش	Infinite	367	4.6	33	Apporte un véritable coup d'éclat à la peau.	يمنح البشرة إشراقة حقيقية.	Cette lotion tonifiante apporte un véritable coup d'éclat à la peau. Elle parfait le démaquillage et débarrasse la peau des dernières impuretés. Riche en Aloe Vera, extrait de concombre et de thé blanc.	يمنح هذا اللوشن المنعش البشرة إشراقة حقيقية. يُتمّ إزالة المكياج ويخلّص البشرة من آخر الشوائب. غني بالألوفيرا ومستخلص الخيار والشاي الأبيض.	["46,3% de gel d'aloès", "Extrait de concombre", "Thé blanc"]	\N	Appliquer généreusement à l'aide d'un disque de coton sur le visage et le cou.	\N	/products/page-44.jpg	177 ml	f	f	\N	67	2026-07-11 22:12:17.137381+00	\N	t	\N
p70	infinite-soin-exfoliant	Infinite — Soin Exfoliant	إنفينيت - مقشر للبشرة	Infinite	389	4.6	29	Faire peau neuve grâce au bromélaïne, papaïne et perles de jojoba.	بشرة جديدة بفضل البروميلين والبابايين ولؤلؤ الجوجوبا.	Le Soin Exfoliant est l'allié idéal pour faire peau neuve et affinée. Votre peau est exfoliée et nettoyée en profondeur grâce au bromélaïne, papaïne, perles de jojoba et de bambou.	المقشّر هو الحليف المثالي لبشرة جديدة وأكثر نقاءً. تُقشَّر بشرتك وتُنظَّف بعمق بفضل البروميلين والبابايين ولؤلؤ الجوجوبا والخيزران.	["34% de gel d'aloès", "Bromélaïne", "Papaïne", "Perles de jojoba et de bambou"]	\N	Appliquer sur le visage humide en mouvements circulaires, rincer abondamment.	\N	/products/page-45.jpg	60 ml	f	f	\N	69	2026-07-11 22:12:17.137381+00	\N	f	\N
p69	infinite-creme-contour-yeux	Infinite — Crème Contour des Yeux	إنفينيت - كريم محيط العين	Infinite	497	4.7	51	Le secret d'un regard sublimé, à l'extrait de collagène.	سر نظرة متألقة، بمستخلص الكولاجين.	La crème contour des yeux est le secret d'un regard sublimé. Elle allie l'Aloe vera à un extrait de collagène pour un regard visiblement rajeuni et à l'extrait d'arbre à soie pour effacer les signes de fatigue.	كريم محيط العين سر نظرة متألقة. يجمع بين الألوفيرا ومستخلص الكولاجين لنظرة أصغر سناً بوضوح، ومستخلص شجرة الحرير لمحو علامات التعب.	["35,2% de gel d'aloès", "Extrait de collagène", "Extrait d'arbre à soie"]	\N	Appliquer par petites touches autour des yeux en tapotant délicatement.	\N	/products/page-44.jpg	21 g	f	f	\N	68	2026-07-11 22:12:17.137381+00	\N	t	\N
p71	infinite-activateur-aloes	Infinite — Activateur Aloès	إنفينيت - منشط الألوة	Infinite	324	4.6	26	Soin indispensable pour parfaire le démaquillage et vitaliser le teint.	عناية أساسية لإتمام إزالة المكياج وتنشيط البشرة.	Découvrez l'Activateur Aloès, soin indispensable qui peut être utilisé seul pour parfaire le démaquillage, hydrater la peau et vitaliser le teint.	اكتشف منشّط الألوة، عناية أساسية يمكن استخدامها وحدها لإتمام إزالة المكياج وترطيب البشرة وتنشيط لونها.	["98,7% de gel d'Aloès"]	\N	Appliquer sur le visage et le cou à l'aide d'un coton.	\N	/products/page-45.jpg	130 ml	f	f	\N	70	2026-07-11 22:12:17.137381+00	\N	t	\N
p72	infinite-serum-hydratant	Infinite — Sérum Hydratant	إنفينيت - سيروم الترطيب	Infinite	562	4.8	47	4 acides hyaluroniques pour cibler chaque couche de la peau.	4 أحماض هيالورونيك لاستهداف كل طبقات البشرة.	Le Sérum Hydratant repulpe et hydrate parfaitement votre épiderme tout en réduisant l'apparence des ridules et des rides grâce à l'association de 4 acides hyaluroniques.	يملأ سيروم الترطيب بشرتك ويرطبها بشكل مثالي مع تقليل ظهور الخطوط الدقيقة والتجاعيد بفضل مزيج من 4 أحماض هيالورونيك.	["Gel d'aloès", "4 acides hyaluroniques"]	\N	Appliquer 1 à 2 pressions sur tout le visage et le cou.	\N	/products/page-46.jpg	18 ml	f	f	\N	71	2026-07-11 22:12:17.137381+00	\N	t	\N
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."referrals" ("id", "created_at", "referrer_ref", "referred_order_ref", "rewarded") FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reviews" ("id", "created_at", "product_id", "author", "rating", "comment", "approved", "photo_url") FROM stdin;
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."site_settings" ("id", "announcement_fr", "announcement_ar", "announcement_active", "updated_at", "story_fr", "story_ar", "courier_cost") FROM stdin;
1	Livraison offerte dès 500 DH 🚚	شحن مجاني ابتداءً من 500 درهم 🚚	f	2026-07-14 13:32:37.932+00			35
\.


--
-- Data for Name: stock_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."stock_alerts" ("id", "created_at", "product_id", "product_name", "contact", "notified") FROM stdin;
\.


--
-- Data for Name: subscribers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."subscribers" ("id", "email", "created_at") FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."subscriptions" ("id", "created_at", "name", "phone", "email", "product_id", "product_name", "quantity", "frequency", "next_date", "active") FROM stdin;
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."testimonials" ("id", "created_at", "sort_order", "active", "image", "caption") FROM stdin;
\.


--
-- Data for Name: zyvora_client_errors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_client_errors" ("id", "user_id", "workspace_id", "message", "stack", "place", "app_version", "user_agent", "created_at") FROM stdin;
\.


--
-- Data for Name: zyvora_workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_workspaces" ("id", "owner", "name", "currency", "created_at") FROM stdin;
\.


--
-- Data for Name: zyvora_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_events" ("id", "workspace_id", "ts", "stream", "type", "payload", "created_at") FROM stdin;
\.


--
-- Data for Name: zyvora_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_invitations" ("id", "workspace_id", "email", "role", "invited_by", "status", "created_at") FROM stdin;
\.


--
-- Data for Name: zyvora_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_memberships" ("id", "workspace_id", "user_id", "role", "created_at") FROM stdin;
\.


--
-- Data for Name: zyvora_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."zyvora_subscriptions" ("user_id", "stripe_customer_id", "stripe_subscription_id", "status", "plan", "current_period_end", "updated_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
product-images	product-images	\N	2026-07-11 22:12:17.137381+00	2026-07-11 22:12:17.137381+00	t	f	\N	\N	\N	STANDARD
review-photos	review-photos	\N	2026-07-11 22:12:17.137381+00	2026-07-11 22:12:17.137381+00	t	f	\N	\N	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 4, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict B1logGddTj5Pl6QOWN9ggI38LHfzeXa7Zu2Mac1RkNetS2CHZPTDsm4e5sDVGLe

RESET ALL;
