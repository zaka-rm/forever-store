/**
 * Business health score — one explainable 0–100 heartbeat, built from five
 * components a COD store lives or dies by. NOT a black-box AI score: each
 * component is plain arithmetic on recorded facts, carries its own 0–100 and a
 * one-line reason, and the composite is a documented weighted average (Law IX).
 * A number the owner checks daily, where every point clicks through to why.
 */
import { DAY, cashCalendar, orderRevenue } from "./projections";
import { cashCenter } from "./engine";
import { money } from "./format";
import type { WorkspaceState } from "./types";

export interface HealthComponent {
  key: "cash" | "refusals" | "concentration" | "stock" | "pace";
  label: string;
  score: number;       // 0..100
  detail: string;      // one-line explanation from real figures
  weight: number;
}

export interface HealthScore {
  score: number;             // 0..100 weighted composite
  band: "strong" | "steady" | "watch" | "fragile";
  components: HealthComponent[];
  /** Null when there is not yet enough recorded data to score honestly. */
  ready: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function businessHealth(state: WorkspaceState, now: number = Date.now()): HealthScore {
  const components: HealthComponent[] = [];

  // 1. Cash cover — days of outgoings the available cash covers.
  const cash = cashCenter(state, now);
  const cal = cashCalendar(state, now);
  if (cal.avgDailyExpense && cal.avgDailyExpense > 0) {
    const coverDays = cash.cashAvailable / cal.avgDailyExpense;
    // 0 days → 0; 60+ days → 100 (two months' runway is healthy for a small store).
    const score = clamp((coverDays / 60) * 100);
    components.push({
      key: "cash", label: "Cash cover", score, weight: 0.30,
      detail: coverDays >= 0
        ? `${money(cash.cashAvailable)} covers ~${Math.round(coverDays)} days of your usual outgoings.`
        : `Recorded outgoings exceed collected cash by ${money(-cash.cashAvailable)}.`,
    });
  }

  // 2. Refusal rate — the COD margin killer.
  const settled = state.orders.filter((o) => o.status === "delivered" || o.status === "refused" || o.status === "returned");
  if (settled.length >= 5) {
    const refused = state.orders.filter((o) => o.status === "refused").length;
    const rate = refused / settled.length;
    // 0% → 100; 30%+ → 0 (Morocco's bad end of the range).
    const score = clamp(100 - (rate / 0.3) * 100);
    components.push({
      key: "refusals", label: "COD delivery", score, weight: 0.25,
      detail: `${Math.round(rate * 100)}% of settled orders refused at the door (${refused} of ${settled.length}).`,
    });
  }

  // 3. Customer concentration — reliance on a single buyer is fragility.
  const byCustomer = new Map<string, number>();
  const addRev = (name: string, v: number) => byCustomer.set(name, (byCustomer.get(name) ?? 0) + v);
  for (const i of state.invoices) if (i.paidAt) addRev(i.customer, i.amount);
  for (const o of state.orders) if (o.status === "delivered") addRev(o.customer, orderRevenue(o));
  const total = [...byCustomer.values()].reduce((s, v) => s + v, 0);
  if (byCustomer.size >= 3 && total > 0) {
    const top = Math.max(...byCustomer.values());
    const topShare = top / total;
    // <=20% share → 100; >=60% → 0 (one customer is more than half the business).
    const score = clamp(100 - ((topShare - 0.2) / 0.4) * 100);
    const topName = [...byCustomer.entries()].find(([, v]) => v === top)?.[0] ?? "one customer";
    components.push({
      key: "concentration", label: "Customer spread", score, weight: 0.15,
      detail: `Your top customer (${topName}) is ${Math.round(topShare * 100)}% of lifetime revenue.`,
    });
  }

  // 4. Stock health — share of active products at risk of stockout with none inbound.
  const active = state.products.filter((p) => !p.discontinued);
  if (active.length > 0) {
    const atRisk = active.filter((p) => {
      const avail = p.stock - (state.reserved[p.productId] ?? 0);
      const daysLeft = p.weeklySales > 0 ? avail / (p.weeklySales / 7) : Infinity;
      return daysLeft < p.leadTimeDays + 4 && (state.incoming[p.productId] ?? 0) === 0;
    }).length;
    const score = clamp(100 - (atRisk / active.length) * 100);
    components.push({
      key: "stock", label: "Stock health", score, weight: 0.15,
      detail: atRisk === 0 ? "No active product is at stockout risk." : `${atRisk} of ${active.length} products risk stockout with nothing inbound.`,
    });
  }

  // 5. Goal pace — on track for this month's revenue goal (if one is set).
  if (state.goals.revenue && state.goals.revenue > 0) {
    const d = new Date(now);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const earned =
      state.orders.filter((o) => o.deliveredAt && o.deliveredAt >= monthStart).reduce((s, o) => s + orderRevenue(o), 0) +
      state.invoices.filter((i) => i.paidAt && (i.paidAt as number) >= monthStart).reduce((s, i) => s + i.amount, 0);
    const expected = (state.goals.revenue * d.getDate()) / daysInMonth;
    const score = clamp(expected > 0 ? (earned / expected) * 100 : 100);
    components.push({
      key: "pace", label: "Goal pace", score, weight: 0.15,
      detail: `${money(earned)} earned vs ${money(expected)} on-pace by today (goal ${money(state.goals.revenue)}).`,
    });
  }

  if (components.length === 0) {
    return { score: 0, band: "watch", components, ready: false };
  }

  // Weighted composite over whichever components have enough data.
  const wsum = components.reduce((s, c) => s + c.weight, 0);
  const score = clamp(components.reduce((s, c) => s + c.score * c.weight, 0) / wsum);
  const band: HealthScore["band"] =
    score >= 75 ? "strong" : score >= 55 ? "steady" : score >= 35 ? "watch" : "fragile";
  // Sort weakest-first so the eye lands on what to fix.
  components.sort((a, b) => a.score - b.score);
  return { score, band, components, ready: true };
}

export const BAND_TONE: Record<HealthScore["band"], "success" | "info" | "attention" | "critical"> = {
  strong: "success",
  steady: "info",
  watch: "attention",
  fragile: "critical",
};
