/**
 * Entitlement math — vendor productization (no canonical CAP/FEAT id; ZPL-030 Art. 8).
 * Pure (no I/O) so the verify suite can prove the trial/subscription rules.
 * The Stripe mirror is fetched in billing.ts; this decides what it means.
 */
export const TRIAL_DAYS = 14;
const DAY = 86_400_000;

export interface Subscription {
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  currentPeriodEnd: number | null;
}

/**
 * Is this workspace allowed full use right now?
 * Paying (or in Stripe trial) → yes. past_due keeps access (grace period while
 * Stripe retries the card — we never cut a business off over a bank hiccup).
 * Never subscribed / canceled → the in-app trial window from workspace creation.
 */
export function entitlement(
  sub: Subscription,
  workspaceCreatedAt: number,
  now = Date.now()
): { active: boolean; trialDaysLeft: number } {
  const trialEnd = workspaceCreatedAt + TRIAL_DAYS * DAY;
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / DAY));
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    return { active: true, trialDaysLeft };
  }
  return { active: trialDaysLeft > 0, trialDaysLeft };
}
