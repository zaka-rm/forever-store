/**
 * Billing view — vendor productization (no canonical CAP/FEAT id; ZPL-030 Art. 8).
 * Honest by design: shows exactly what the subscription state is, what the
 * trial window is, and never hides the cancel path (the Stripe portal handles
 * cancel/card changes — we never build a dark pattern around it).
 */
import { useEffect, useState } from "react";
import {
  TRIAL_DAYS,
  entitlement,
  fetchSubscription,
  openPortal,
  startCheckout,
  type Subscription,
} from "../core/billing";
import { PageHeader } from "./PageHeader";

const STATUS_LABEL: Record<Subscription["status"], string> = {
  none: "No subscription",
  trialing: "Free trial (via Stripe)",
  active: "Active",
  past_due: "Payment issue — access kept while Stripe retries",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

export function BillingView({ workspaceCreatedAt, isOwner }: { workspaceCreatedAt: number; isOwner: boolean }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void fetchSubscription().then(setSub); }, []);

  if (!sub) return (
    <div>
      <PageHeader
        title="Billing"
        description="ZYVORA Pro — one plan, everything included. Local device mode stays free forever, and your Business Memory remains exportable."
      />
      <div className="quiet">Loading subscription…</div>
    </div>
  );
  const ent = entitlement(sub, workspaceCreatedAt);
  const paying = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";

  const act = async (fn: () => Promise<string | null>) => {
    setBusy(true); setError(null);
    const err = await fn();
    if (err) { setError(err); setBusy(false); }
    // on success the page redirects to Stripe — no state to restore
  };

  return (
    <div>
      <PageHeader
        title="Billing"
        description="ZYVORA Pro — one plan, everything included. Local device mode stays free forever; your Business Memory is exportable at any time, subscribed or not."
      />

      <div className="panel" style={{ maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>Status: {STATUS_LABEL[sub.status]}</h2>
        {sub.currentPeriodEnd && paying && (
          <p className="quiet">Current period ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}.</p>
        )}
        {!paying && (
          <p className="quiet">
            {ent.trialDaysLeft > 0
              ? `Free trial: ${ent.trialDaysLeft} day(s) left (${TRIAL_DAYS}-day trial from workspace creation).`
              : "Your free trial has ended. Subscribe to keep full access — your data is untouched and always exportable."}
          </p>
        )}

        {!isOwner ? (
          <p className="quiet">Only the workspace owner manages billing.</p>
        ) : paying ? (
          <button className="btn" disabled={busy} onClick={() => void act(openPortal)}>
            {busy ? "Opening…" : "Manage subscription (cancel, card, invoices)"}
          </button>
        ) : (
          <button className="btn" disabled={busy} onClick={() => void act(startCheckout)}>
            {busy ? "Opening…" : "Subscribe to ZYVORA Pro"}
          </button>
        )}
        {error && <p className="confidence-note" style={{ color: "var(--amber)" }}>{error}</p>}
      </div>
    </div>
  );
}

/** Slim banner for the app shell when the trial is over and nobody subscribed. */
export function TrialBanner({ daysLeft, expired, onOpenBilling }: {
  daysLeft: number; expired: boolean; onOpenBilling: () => void;
}) {
  if (!expired && daysLeft > 7) return null;
  return (
    <div className="quiet" style={{ marginBottom: 16, textAlign: "left" }}>
      {expired
        ? <>Your free trial has ended — <strong>your data is safe and exportable</strong>, but new entries need a subscription. </>
        : <>Free trial: <strong>{daysLeft} day(s) left</strong>. </>}
      <button className="btn ghost" style={{ marginLeft: 8 }} onClick={onOpenBilling}>Open Billing</button>
    </div>
  );
}
