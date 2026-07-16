/**
 * Billing client — vendor productization (monetization of ZYVORA itself; not a
 * canonical Builder capability, so no CAP/FEAT id — ZPL-030 Art. 8).
 * Truth about payment lives in Stripe; the app reads the mirror table
 * `zyvora_subscriptions` (written only by the zyvora-stripe-webhook function)
 * and starts checkout/portal sessions via the auth-gated `zyvora-billing`
 * Edge Function. Local device mode is free forever — billing is a cloud concern.
 */
import { cloudConfigured, supabase } from "./cloud";
import type { Subscription } from "./entitlement";

export { TRIAL_DAYS, entitlement, type Subscription } from "./entitlement";

export const billingConfigured = cloudConfigured;

/** The owner's subscription, or status "none" when they never subscribed. */
export async function fetchSubscription(): Promise<Subscription> {
  if (!supabase) return { status: "none", currentPeriodEnd: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "none", currentPeriodEnd: null };
  const { data } = await supabase
    .from("zyvora_subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { status: "none", currentPeriodEnd: null };
  return {
    status: (data.status as Subscription["status"]) ?? "none",
    currentPeriodEnd: data.current_period_end ? Date.parse(data.current_period_end) : null,
  };
}

async function billingAction(action: "checkout" | "portal"): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Billing needs account mode." };
  const { data, error } = await supabase.functions.invoke("zyvora-billing", { body: { action } });
  if (error) return { error: error.message };
  const d = data as { ok?: boolean; url?: string; error?: string };
  if (d?.ok && d.url) return { url: d.url };
  return { error: d?.error ?? "Billing service failed." };
}

/** Open Stripe Checkout (monthly plan, 14-day trial). Redirects on success. */
export async function startCheckout(): Promise<string | null> {
  const r = await billingAction("checkout");
  if (r.url) { window.location.href = r.url; return null; }
  return r.error ?? "Could not start checkout.";
}

/** Open the Stripe Billing Portal (manage / cancel / change card). */
export async function openPortal(): Promise<string | null> {
  const r = await billingAction("portal");
  if (r.url) { window.location.href = r.url; return null; }
  return r.error ?? "Could not open the billing portal.";
}
