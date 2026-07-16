


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."award_loyalty_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."award_loyalty_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_discount_use"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.discount_code is not null then
    update discount_codes
      set used_count = used_count + 1
      where upper(code) = upper(new.discount_code);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."count_discount_use"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."decrement_stock"("p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_loyalty"("p_email" "text") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((select points from loyalty_points where email = lower(p_email)), 0);
$$;


ALTER FUNCTION "public"."get_loyalty"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recent_orders_public"("p_limit" integer DEFAULT 8) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."recent_orders_public"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_order"("p_ref" "text", "p_token" "uuid", "p_action" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."respond_order"("p_ref" "text", "p_token" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_referral"("p_referrer_ref" "text", "p_referred_ref" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."submit_referral"("p_referrer_ref" "text", "p_referred_ref" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_order"("p_ref" "text", "p_email" "text") RETURNS TABLE("order_ref" "text", "status" "text", "created_at" timestamp with time zone, "total" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select order_ref, status, created_at, total
  from orders
  where order_ref = p_ref
    and lower(customer_email) = lower(p_email)
  limit 1;
$$;


ALTER FUNCTION "public"."track_order"("p_ref" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_order_v2"("p_ref" "text", "p_contact" "text") RETURNS TABLE("order_ref" "text", "status" "text", "created_at" timestamp with time zone, "total" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."track_order_v2"("p_ref" "text", "p_contact" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_discount"("p_code" "text") RETURNS TABLE("code" "text", "type" "text", "value" numeric, "min_subtotal" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select code, type, value, min_subtotal
  from discount_codes
  where upper(code) = upper(p_code)
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  limit 1;
$$;


ALTER FUNCTION "public"."validate_discount"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."zyvora_is_member"("ws" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.zyvora_memberships m
    where m.workspace_id = ws and m.user_id = auth.uid()
  ) or exists (
    select 1 from public.zyvora_workspaces w
    where w.id = ws and w.owner = auth.uid()
  );
$$;


ALTER FUNCTION "public"."zyvora_is_member"("ws" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."zyvora_role"("ws" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select role from public.zyvora_memberships m where m.workspace_id = ws and m.user_id = auth.uid()),
    (select 'owner' from public.zyvora_workspaces w where w.id = ws and w.owner = auth.uid())
  );
$$;


ALTER FUNCTION "public"."zyvora_role"("ws" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."abandoned_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "phone" "text",
    "city" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "subtotal" numeric DEFAULT 0 NOT NULL,
    "recovered" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."abandoned_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "title_ar" "text",
    "excerpt" "text",
    "excerpt_ar" "text",
    "content" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "content_ar" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "image" "text",
    "tag" "text",
    "tag_ar" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "read_time" "text",
    "published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text",
    "message" "text" NOT NULL,
    "handled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text" NOT NULL,
    "fee" numeric DEFAULT 0 NOT NULL,
    "free_threshold" numeric,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."delivery_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discount_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" DEFAULT 'percent'::"text" NOT NULL,
    "value" numeric NOT NULL,
    "min_subtotal" numeric,
    "active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_uses" integer,
    "used_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."discount_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."distributor_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "city" "text",
    "message" "text",
    "handled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."distributor_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_points" (
    "email" "text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loyalty_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "city" "text",
    "region" "text",
    "zip" "text",
    "country" "text",
    "items" "jsonb" NOT NULL,
    "subtotal" numeric NOT NULL,
    "shipping" numeric NOT NULL,
    "total" numeric NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "stripe_session_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "locale" "text",
    "payment_method" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "order_ref" "text",
    "confirm_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discount_code" "text",
    "discount_amount" numeric DEFAULT 0 NOT NULL,
    "loyalty_awarded" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "youcanpay_token" "text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."packs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "icon" "text" DEFAULT '🌿'::"text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "name_ar" "text",
    "goal_fr" "text",
    "goal_ar" "text",
    "image" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."packs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_costs" (
    "product_id" "text" NOT NULL,
    "cost" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "name_ar" "text",
    "category" "text" NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "rating" numeric DEFAULT 5 NOT NULL,
    "review_count" integer DEFAULT 0 NOT NULL,
    "tagline" "text",
    "tagline_ar" "text",
    "description" "text",
    "description_ar" "text",
    "ingredients" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "ingredients_ar" "jsonb",
    "how_to_use" "text",
    "how_to_use_ar" "text",
    "image" "text",
    "size" "text",
    "best_seller" boolean DEFAULT false NOT NULL,
    "is_new" boolean DEFAULT false NOT NULL,
    "pack_contents" "jsonb",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stock" integer,
    "hidden" boolean DEFAULT false NOT NULL,
    "gallery" "text"[]
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "referrer_ref" "text" NOT NULL,
    "referred_order_ref" "text" NOT NULL,
    "rewarded" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" "text" NOT NULL,
    "author" "text" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text" NOT NULL,
    "approved" boolean DEFAULT false NOT NULL,
    "photo_url" "text",
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "announcement_fr" "text",
    "announcement_ar" "text",
    "announcement_active" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "story_fr" "text",
    "story_ar" "text",
    "courier_cost" numeric DEFAULT 35 NOT NULL,
    CONSTRAINT "site_settings_single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "contact" "text" NOT NULL,
    "notified" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."stock_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "product_id" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "next_date" "date" DEFAULT (CURRENT_DATE + '1 mon'::interval) NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "image" "text" NOT NULL,
    "caption" "text"
);


ALTER TABLE "public"."testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_client_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "workspace_id" "uuid",
    "message" "text" NOT NULL,
    "stack" "text",
    "place" "text",
    "app_version" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zyvora_client_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_events" (
    "id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "ts" bigint NOT NULL,
    "stream" "text" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zyvora_events_stream_check" CHECK (("stream" = ANY (ARRAY['fact'::"text", 'interpretation'::"text", 'decision'::"text", 'outcome'::"text"])))
);


ALTER TABLE "public"."zyvora_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zyvora_invitations_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'staff'::"text", 'viewer'::"text"]))),
    CONSTRAINT "zyvora_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."zyvora_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zyvora_memberships_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."zyvora_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_subscriptions" (
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'none'::"text" NOT NULL,
    "plan" "text",
    "current_period_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "zyvora_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['none'::"text", 'trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'unpaid'::"text"])))
);


ALTER TABLE "public"."zyvora_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zyvora_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."zyvora_workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_zones"
    ADD CONSTRAINT "delivery_zones_city_key" UNIQUE ("city");



ALTER TABLE ONLY "public"."delivery_zones"
    ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discount_codes"
    ADD CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distributor_leads"
    ADD CONSTRAINT "distributor_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."packs"
    ADD CONSTRAINT "packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_costs"
    ADD CONSTRAINT "product_costs_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zyvora_client_errors"
    ADD CONSTRAINT "zyvora_client_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zyvora_events"
    ADD CONSTRAINT "zyvora_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zyvora_invitations"
    ADD CONSTRAINT "zyvora_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zyvora_memberships"
    ADD CONSTRAINT "zyvora_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zyvora_memberships"
    ADD CONSTRAINT "zyvora_memberships_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."zyvora_subscriptions"
    ADD CONSTRAINT "zyvora_subscriptions_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."zyvora_workspaces"
    ADD CONSTRAINT "zyvora_workspaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "zyvora_client_errors_time" ON "public"."zyvora_client_errors" USING "btree" ("created_at" DESC);



CREATE INDEX "zyvora_events_ws_ts" ON "public"."zyvora_events" USING "btree" ("workspace_id", "ts");



CREATE INDEX "zyvora_inv_email" ON "public"."zyvora_invitations" USING "btree" ("lower"("email"));



CREATE INDEX "zyvora_memberships_user" ON "public"."zyvora_memberships" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "orders_count_discount_use" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."count_discount_use"();



CREATE OR REPLACE TRIGGER "trg_award_loyalty" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."award_loyalty_points"();



ALTER TABLE ONLY "public"."zyvora_client_errors"
    ADD CONSTRAINT "zyvora_client_errors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."zyvora_events"
    ADD CONSTRAINT "zyvora_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."zyvora_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zyvora_invitations"
    ADD CONSTRAINT "zyvora_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."zyvora_invitations"
    ADD CONSTRAINT "zyvora_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."zyvora_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zyvora_memberships"
    ADD CONSTRAINT "zyvora_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zyvora_memberships"
    ADD CONSTRAINT "zyvora_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."zyvora_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zyvora_subscriptions"
    ADD CONSTRAINT "zyvora_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zyvora_workspaces"
    ADD CONSTRAINT "zyvora_workspaces_owner_fkey" FOREIGN KEY ("owner") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete abandoned carts" ON "public"."abandoned_carts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete contact messages" ON "public"."contact_messages" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete distributor leads" ON "public"."distributor_leads" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete orders" ON "public"."orders" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete posts" ON "public"."blog_posts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete products" ON "public"."products" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete reviews" ON "public"."reviews" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete stock alerts" ON "public"."stock_alerts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete subscribers" ON "public"."subscribers" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can delete subscriptions" ON "public"."subscriptions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Admin can insert posts" ON "public"."blog_posts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Admin can insert products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Admin can read abandoned carts" ON "public"."abandoned_carts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read all posts" ON "public"."blog_posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read all reviews" ON "public"."reviews" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read contact messages" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read distributor leads" ON "public"."distributor_leads" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read loyalty points" ON "public"."loyalty_points" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read referrals" ON "public"."referrals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read stock alerts" ON "public"."stock_alerts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read subscribers" ON "public"."subscribers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can read subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Admin can update contact messages" ON "public"."contact_messages" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update distributor leads" ON "public"."distributor_leads" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin can update posts" ON "public"."blog_posts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin can update products" ON "public"."products" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update referrals" ON "public"."referrals" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Admin can update site settings" ON "public"."site_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin can update stock alerts" ON "public"."stock_alerts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin can update subscriptions" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin manage delivery zones" ON "public"."delivery_zones" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin manage discount codes" ON "public"."discount_codes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Public can create stock alert" ON "public"."stock_alerts" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Public can create subscription" ON "public"."subscriptions" FOR INSERT TO "anon" WITH CHECK (("active" = true));



CREATE POLICY "Public can insert contact messages" ON "public"."contact_messages" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Public can insert pending orders" ON "public"."orders" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("status" = 'pending'::"text") AND ("payment_status" = 'pending'::"text")));



CREATE POLICY "Public can insert reviews" ON "public"."reviews" FOR INSERT TO "anon" WITH CHECK (("approved" = false));



CREATE POLICY "Public can read active delivery zones" ON "public"."delivery_zones" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read approved reviews" ON "public"."reviews" FOR SELECT TO "anon" USING (("approved" = true));



CREATE POLICY "Public can read products" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read published posts" ON "public"."blog_posts" FOR SELECT USING (("published" = true));



CREATE POLICY "Public can read site settings" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "Public can submit distributor lead" ON "public"."distributor_leads" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Public can subscribe" ON "public"."subscribers" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Public can update own abandoned cart" ON "public"."abandoned_carts" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Public can upsert abandoned cart" ON "public"."abandoned_carts" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."abandoned_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discount_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."distributor_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature flags admin write" ON "public"."feature_flags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "feature flags public read" ON "public"."feature_flags" FOR SELECT USING (true);



ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."packs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "packs admin write" ON "public"."packs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "packs public read" ON "public"."packs" FOR SELECT USING (true);



CREATE POLICY "product costs admin all" ON "public"."product_costs" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."product_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "testimonials admin write" ON "public"."testimonials" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "testimonials public read" ON "public"."testimonials" FOR SELECT USING (true);



ALTER TABLE "public"."zyvora_client_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zyvora_client_errors_insert" ON "public"."zyvora_client_errors" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "zyvora_ev_insert_member" ON "public"."zyvora_events" FOR INSERT WITH CHECK (("public"."zyvora_role"("workspace_id") = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"])));



CREATE POLICY "zyvora_ev_insert_own" ON "public"."zyvora_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."zyvora_workspaces" "w"
  WHERE (("w"."id" = "zyvora_events"."workspace_id") AND ("w"."owner" = "auth"."uid"())))));



CREATE POLICY "zyvora_ev_select_member" ON "public"."zyvora_events" FOR SELECT USING ("public"."zyvora_is_member"("workspace_id"));



CREATE POLICY "zyvora_ev_select_own" ON "public"."zyvora_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zyvora_workspaces" "w"
  WHERE (("w"."id" = "zyvora_events"."workspace_id") AND ("w"."owner" = "auth"."uid"())))));



ALTER TABLE "public"."zyvora_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zyvora_inv_manage" ON "public"."zyvora_invitations" USING (("public"."zyvora_role"("workspace_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("public"."zyvora_role"("workspace_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



CREATE POLICY "zyvora_inv_see_mine" ON "public"."zyvora_invitations" FOR SELECT USING (("lower"("email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))));



ALTER TABLE "public"."zyvora_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zyvora_mem_select" ON "public"."zyvora_memberships" FOR SELECT USING ("public"."zyvora_is_member"("workspace_id"));



CREATE POLICY "zyvora_mem_write" ON "public"."zyvora_memberships" USING (("public"."zyvora_role"("workspace_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"]))) WITH CHECK (("public"."zyvora_role"("workspace_id") = ANY (ARRAY['owner'::"text", 'manager'::"text"])));



ALTER TABLE "public"."zyvora_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zyvora_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zyvora_subscriptions_select" ON "public"."zyvora_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."zyvora_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zyvora_ws_insert_own" ON "public"."zyvora_workspaces" FOR INSERT WITH CHECK (("auth"."uid"() = "owner"));



CREATE POLICY "zyvora_ws_select_member" ON "public"."zyvora_workspaces" FOR SELECT USING ("public"."zyvora_is_member"("id"));



CREATE POLICY "zyvora_ws_select_own" ON "public"."zyvora_workspaces" FOR SELECT USING (("auth"."uid"() = "owner"));



CREATE POLICY "zyvora_ws_update_own" ON "public"."zyvora_workspaces" FOR UPDATE USING (("auth"."uid"() = "owner")) WITH CHECK (("auth"."uid"() = "owner"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."award_loyalty_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_loyalty_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_loyalty_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_discount_use"() TO "anon";
GRANT ALL ON FUNCTION "public"."count_discount_use"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_discount_use"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_stock"("p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_stock"("p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_loyalty"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_loyalty"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_loyalty"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recent_orders_public"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."recent_orders_public"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recent_orders_public"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."respond_order"("p_ref" "text", "p_token" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_order"("p_ref" "text", "p_token" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_order"("p_ref" "text", "p_token" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_referral"("p_referrer_ref" "text", "p_referred_ref" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_referral"("p_referrer_ref" "text", "p_referred_ref" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_referral"("p_referrer_ref" "text", "p_referred_ref" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_order"("p_ref" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_order"("p_ref" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_order"("p_ref" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_order_v2"("p_ref" "text", "p_contact" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_order_v2"("p_ref" "text", "p_contact" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_order_v2"("p_ref" "text", "p_contact" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_discount"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_discount"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_discount"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."zyvora_is_member"("ws" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."zyvora_is_member"("ws" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."zyvora_is_member"("ws" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."zyvora_role"("ws" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."zyvora_role"("ws" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."zyvora_role"("ws" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."abandoned_carts" TO "anon";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_zones" TO "anon";
GRANT ALL ON TABLE "public"."delivery_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_zones" TO "service_role";



GRANT ALL ON TABLE "public"."discount_codes" TO "anon";
GRANT ALL ON TABLE "public"."discount_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_codes" TO "service_role";



GRANT ALL ON TABLE "public"."distributor_leads" TO "anon";
GRANT ALL ON TABLE "public"."distributor_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."distributor_leads" TO "service_role";



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_points" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_points" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_points" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."packs" TO "anon";
GRANT ALL ON TABLE "public"."packs" TO "authenticated";
GRANT ALL ON TABLE "public"."packs" TO "service_role";



GRANT ALL ON TABLE "public"."product_costs" TO "anon";
GRANT ALL ON TABLE "public"."product_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_costs" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."stock_alerts" TO "anon";
GRANT ALL ON TABLE "public"."stock_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."testimonials" TO "anon";
GRANT ALL ON TABLE "public"."testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_client_errors" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_client_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_client_errors" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_events" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_events" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_events" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_invitations" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_memberships" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."zyvora_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."zyvora_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."zyvora_workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































