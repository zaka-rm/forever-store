/**
 * This week in review — the partner that shows up on schedule. Week-over-week
 * deltas on the numbers a COD store lives on, computed from recorded facts
 * (delivered/paid dates, dated status changes, decision timestamps). Each metric
 * carries its own "higher is better" polarity so the UI can colour honestly.
 * Deterministic; the optional AI narration only phrases what this returns.
 */
import { DAY, orderRevenue, projectState } from "./projections";
import type { MemoryEvent, OrderStatusChanged } from "./types";

export interface WeeklyMetric {
  key: "revenue" | "ordersDelivered" | "refusals" | "cashCollected" | "expenses" | "decisions";
  label: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;          // thisWeek − lastWeek
  higherIsBetter: boolean;
  money: boolean;         // format as currency vs. count
}

export interface WeeklyReview {
  metrics: WeeklyMetric[];
  from: number;           // start of "this week" window
  hasPriorWeek: boolean;  // false when there's no last-week data to compare
}

export function weeklyReview(events: readonly MemoryEvent[], now: number = Date.now()): WeeklyReview {
  const state = projectState(events);
  const thisStart = now - 7 * DAY;
  const lastStart = now - 14 * DAY;
  const inThis = (t: number) => t >= thisStart && t < now;
  const inLast = (t: number) => t >= lastStart && t < thisStart;

  // Revenue earned: delivered orders (by delivery date) + paid invoices (by pay date).
  const revenue = (test: (t: number) => boolean) =>
    state.orders.filter((o) => o.deliveredAt && test(o.deliveredAt)).reduce((s, o) => s + orderRevenue(o), 0) +
    state.invoices.filter((i) => i.paidAt && test(i.paidAt)).reduce((s, i) => s + i.amount, 0);

  const ordersDelivered = (test: (t: number) => boolean) =>
    state.orders.filter((o) => o.deliveredAt && test(o.deliveredAt)).length;

  // Refusals are dated by their status-change event.
  const refusals = (test: (t: number) => boolean) =>
    events.filter((e) => {
      if (e.stream !== "fact" || e.type !== "order_status_changed") return false;
      const p = e.payload as unknown as OrderStatusChanged;
      return p.status === "refused" && test(p.at);
    }).length;

  const cashCollected = (test: (t: number) => boolean) =>
    state.orders.filter((o) => o.cashReceivedAt && test(o.cashReceivedAt)).reduce((s, o) => s + orderRevenue(o), 0) +
    state.invoices.filter((i) => i.paidAt && test(i.paidAt)).reduce((s, i) => s + i.amount, 0);

  const expenses = (test: (t: number) => boolean) =>
    state.expenses.filter((e) => test(e.date)).reduce((s, e) => s + e.amount, 0);

  const decisions = (test: (t: number) => boolean) =>
    events.filter((e) => e.stream === "decision" && e.type === "decision_recorded" && test(e.ts)).length;

  const build = (
    key: WeeklyMetric["key"], label: string, fn: (t: (x: number) => boolean) => number,
    higherIsBetter: boolean, money: boolean
  ): WeeklyMetric => {
    const thisWeek = fn(inThis);
    const lastWeek = fn(inLast);
    return { key, label, thisWeek, lastWeek, delta: thisWeek - lastWeek, higherIsBetter, money };
  };

  const metrics = [
    build("revenue", "Revenue earned", revenue, true, true),
    build("ordersDelivered", "Orders delivered", ordersDelivered, true, false),
    build("cashCollected", "Cash collected", cashCollected, true, true),
    build("refusals", "COD refusals", refusals, false, false),
    build("expenses", "Expenses", expenses, false, true),
    build("decisions", "Decisions recorded", decisions, true, false),
  ];

  return {
    metrics,
    from: thisStart,
    hasPriorWeek: metrics.some((m) => m.lastWeek !== 0),
  };
}
