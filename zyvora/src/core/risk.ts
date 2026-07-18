/**
 * COD refusal-risk score — the biggest silent cost in Moroccan COD (15–30% of
 * orders refuse at the door; unconfirmed orders refuse ~2× more). Scores a
 * PENDING order 0–100 from recorded facts only, with every contributing factor
 * listed (Law IX: explainable, falsifiable). Advice, never a gate: the human
 * decides whether to ship, double-confirm, or ask for prepayment.
 */
import { orderRevenue } from "./projections";
import type { Contact } from "./projections";
import type { Order, WorkspaceState } from "./types";

export interface RiskFactor {
  label: string;
  points: number; // positive = raises risk
}

export interface RefusalRisk {
  score: number; // 0..100
  level: "low" | "medium" | "high";
  factors: RiskFactor[];
}

/** Sources whose buyers refuse more (impulse traffic) vs. less (warm traffic). */
const RISKY_SOURCES = new Set(["tiktok", "facebook", "instagram"]);
const WARM_SOURCES = new Set(["repeat", "referral", "whatsapp"]);

export function refusalRisk(
  state: WorkspaceState,
  order: Order,
  contacts: Map<string, Contact>
): RefusalRisk {
  const factors: RiskFactor[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) factors.push({ label, points });
  };

  const history = state.orders.filter(
    (o) => o.customer === order.customer && o.orderId !== order.orderId
  );
  const delivered = history.filter((o) => o.status === "delivered").length;
  const refused = history.filter((o) => o.status === "refused").length;

  if (delivered + refused === 0) {
    add("First-time customer (no COD history)", 18);
  } else {
    if (refused > 0) add(`${refused} past refusal${refused > 1 ? "s" : ""}`, Math.min(45, refused * 22));
    if (delivered > 0) add(`${delivered} past successful deliver${delivered > 1 ? "ies" : "y"}`, -Math.min(30, delivered * 10));
  }

  const phone = contacts.get(order.customer)?.phone?.trim();
  if (!phone) add("No phone saved — can't confirm before shipping", 16);

  const src = order.source?.toLowerCase();
  if (src && RISKY_SOURCES.has(src)) add(`Source: ${src} (impulse traffic refuses more)`, 10);
  if (src && WARM_SOURCES.has(src)) add(`Source: ${src} (warm traffic)`, -8);

  const deliveredOrders = state.orders.filter((o) => o.status === "delivered");
  if (deliveredOrders.length >= 3) {
    const avg = deliveredOrders.reduce((s, o) => s + orderRevenue(o), 0) / deliveredOrders.length;
    if (avg > 0 && orderRevenue(order) > 1.6 * avg) {
      add("Basket well above your average delivered order", 10);
    }
  }

  const raw = 22 + factors.reduce((s, f) => s + f.points, 0); // 22 = market base rate
  const score = Math.max(2, Math.min(96, raw));
  return {
    score,
    level: score >= 55 ? "high" : score >= 32 ? "medium" : "low",
    factors,
  };
}

export const RISK_TONE: Record<RefusalRisk["level"], "success" | "attention" | "critical"> = {
  low: "success",
  medium: "attention",
  high: "critical",
};
