// ZYVORA — billing actions (Supabase Edge Function).
// Vendor productization (monetization of ZYVORA itself; no canonical CAP/FEAT id).
//
// Actions (POST { action }):
//   "checkout" → Stripe Checkout session for the monthly plan (14-day free trial)
//   "portal"   → Stripe Billing Portal session (manage / cancel / update card)
//
// Deploy:  supabase functions deploy zyvora-billing
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... APP_URL=https://your-app-url

import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // 1. Require an authenticated ZYVORA user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  // 2. Config.
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRICE_ID");
  const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5199";
  if (!secretKey || !priceId) return json({ error: "Billing not configured (set STRIPE_* secrets)" }, 500);
  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let payload: { action?: string };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Existing mirror row (for customer id reuse).
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sub } = await admin
    .from("zyvora_subscriptions").select("*").eq("user_id", user.id).maybeSingle();

  if (payload.action === "portal") {
    if (!sub?.stripe_customer_id) return json({ error: "No subscription yet" }, 400);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: appUrl,
    });
    return json({ ok: true, url: session.url });
  }

  if (payload.action === "checkout") {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: sub?.stripe_customer_id || undefined,
      customer_email: sub?.stripe_customer_id ? undefined : user.email,
      subscription_data: { trial_period_days: 14, metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      success_url: `${appUrl}?billing=success`,
      cancel_url: `${appUrl}?billing=canceled`,
      allow_promotion_codes: true,
    });
    return json({ ok: true, url: session.url });
  }

  return json({ error: "Unknown action" }, 400);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
