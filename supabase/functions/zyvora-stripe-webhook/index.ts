// ZYVORA — Stripe subscription webhook (Supabase Edge Function).
// Vendor productization (monetization of ZYVORA itself; no canonical CAP/FEAT id).
//
// NOTE: `stripe-webhook` (without prefix) belongs to the parent Naturaloe store
// (order payments). This one is ZYVORA's, for SUBSCRIPTION lifecycle events; we
// mirror the truth into zyvora_subscriptions (service role — clients never write it).
//
// Deploy:  supabase functions deploy zyvora-stripe-webhook --no-verify-jwt
//          (Stripe cannot send a Supabase JWT; authenticity is proven by the
//           signature check below instead.)
// Secrets: supabase secrets set ZYVORA_STRIPE_WEBHOOK_SECRET=whsec_...
// Stripe Dashboard → Developers → Webhooks → add endpoint:
//   https://<project-ref>.supabase.co/functions/v1/zyvora-stripe-webhook
//   events: checkout.session.completed, customer.subscription.created,
//           customer.subscription.updated, customer.subscription.deleted

import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("ZYVORA_STRIPE_WEBHOOK_SECRET");
  if (!secretKey || !webhookSecret) return new Response("Not configured", { status: 500 });
  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // 1. Verify the event really came from Stripe.
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`Bad signature: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 2. Mirror subscription state.
  const upsert = async (userId: string, sub: Stripe.Subscription) => {
    await admin.from("zyvora_subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      status: mapStatus(sub.status),
      plan: sub.items.data[0]?.price?.id ?? null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsert(userId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id
          ?? (await findUserByCustomer(admin, String(sub.customer)));
        if (userId) await upsert(userId, sub);
        break;
      }
    }
  } catch (e) {
    return new Response(`Handler error: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    default: return "canceled"; // canceled, incomplete, incomplete_expired, paused
  }
}

async function findUserByCustomer(
  admin: ReturnType<typeof createClient>,
  customerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("zyvora_subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}
