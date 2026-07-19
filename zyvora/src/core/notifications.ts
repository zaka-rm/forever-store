/**
 * Notifications & alerts (Wave — CAP-000010 Notifications).
 * Canonical (governance/): CAP-000010 — FEAT-000073 unified notification events,
 * FEAT-000075 category & priority, FEAT-000079 digest & grouping, plus WF-000078
 * read/dismiss/act. Governed by BUILD-DRAFT CAP-000010.
 *
 * Design: notifications are DERIVED (never a second source of truth). They come
 * from two places — the Decision Engine's Guidance (things needing judgment) and
 * a small set of time-based operational triggers a COD store needs (confirm a
 * pending order, collect courier cash). Read/dismiss is per-device UI state
 * (localStorage), never written into append-only Business Memory. External
 * channel delivery (email/SMS/WhatsApp/push) is a documented adapter seam:
 * `deliver(notification, channel)` — not yet wired to a provider.
 */
import { formatMoney } from "./engine";
import { DAY, orderCashDue, orderRevenue, type Activity } from "./projections";
import type { Insight, WorkspaceState } from "./types";

export type NotifPriority = "high" | "medium" | "low";
export type NotifCategory = "orders" | "finance" | "inventory" | "customers" | "decision";

export interface Notification {
  key: string; // stable across recomputes, so dismiss persists
  priority: NotifPriority;
  category: NotifCategory;
  title: string;
  body: string;
  at: number; // when the underlying condition began (for age)
  /** which view to open when the user acts on it. */
  actionView: "orders" | "finance" | "inventory" | "customers" | "today";
}

const PRIORITY_RANK: Record<NotifPriority, number> = { high: 0, medium: 1, low: 2 };

const CONFIRM_HOURS = 12; // COD orders left unconfirmed this long lose sales to refusals
const COLLECT_DAYS = 3; // courier should have remitted cash within this window

function insightToNotification(i: Insight, now: number): Notification {
  const priority: NotifPriority =
    i.guidance ? (i.layer === "strategic" || i.layer === "tactical" ? "high" : "medium") : "low";
  const view: Notification["actionView"] =
    i.domain === "finance" || i.domain === "marketing" ? "finance"
    : i.domain === "inventory" ? "inventory"
    : i.domain === "customers" ? "customers"
    : "today";
  return {
    key: "insight:" + i.decisionKey,
    priority,
    category: (i.domain === "marketing" ? "finance" : i.domain) as NotifCategory,
    title: i.claim,
    body: i.reasoning,
    at: now,
    actionView: view,
  };
}

/** Pure generation of the full notification set (before read/dismiss filtering). */
export function generateNotifications(
  state: WorkspaceState,
  insights: Insight[],
  activities: Activity[] = [],
  now: number = Date.now()
): Notification[] {
  const out: Notification[] = insights.map((i) => insightToNotification(i, now));

  // Due/overdue customer follow-ups (CAP-000007) — forgotten follow-ups lose customers.
  for (const a of activities) {
    if (!a.done && a.dueAt && a.dueAt <= now) {
      const daysOver = Math.round((now - a.dueAt) / DAY);
      out.push({
        key: "followup:" + a.activityId,
        priority: "high",
        category: "customers",
        title: `Follow up with ${a.customer}${daysOver > 0 ? ` — ${daysOver}d overdue` : " — due today"}`,
        body: a.note,
        at: a.dueAt,
        actionView: "customers",
      });
    }
  }

  // Operational triggers not already surfaced as insights ---------------------

  // Confirm pending COD orders (the single biggest refusal-prevention lever).
  for (const o of state.orders) {
    if (o.status === "pending" && now - o.createdAt > CONFIRM_HOURS * 3600_000) {
      const hours = Math.round((now - o.createdAt) / 3600_000);
      out.push({
        key: "confirm:" + o.orderId,
        priority: "high",
        category: "orders",
        title: `Confirm ${o.customer}'s order — pending ${hours}h`,
        body: "Unconfirmed COD orders refuse far more often. A quick confirmation call protects the sale before you ship.",
        at: o.createdAt,
        actionView: "orders",
      });
    }
    // Courier hasn't remitted cash on a delivered order.
    if (o.status === "delivered" && !o.cashReceivedAt && o.deliveredAt && now - o.deliveredAt > COLLECT_DAYS * DAY) {
      const days = Math.round((now - o.deliveredAt) / DAY);
      out.push({
        key: "collect:" + o.orderId,
        priority: "medium",
        category: "finance",
        title: `Cash not collected from courier — ${o.customer}, ${formatMoney(orderCashDue(o))}`,
        body: `Delivered ${days} days ago but the courier hasn't remitted the cash. Chase the remittance so it isn't lost.`,
        at: o.deliveredAt,
        actionView: "orders",
      });
    }
  }

  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.at - b.at);
}

// ---- Read/dismiss state (per-device UI state, not Business Memory) ----------

const readKey = (wsId: string) => `zyvora.notif.read.${wsId}`;

export function loadReadSet(wsId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(readKey(wsId)) ?? "[]"));
  } catch {
    return new Set();
  }
}
export function markRead(wsId: string, key: string): void {
  const s = loadReadSet(wsId);
  s.add(key);
  localStorage.setItem(readKey(wsId), JSON.stringify([...s]));
}
export function markAllRead(wsId: string, keys: string[]): void {
  const s = loadReadSet(wsId);
  keys.forEach((k) => s.add(k));
  localStorage.setItem(readKey(wsId), JSON.stringify([...s]));
}

// ---- Daily briefing digest (WF-000076) --------------------------------------

export interface Briefing {
  greeting: string;
  revenueYesterday: number;
  ordersDeliveredYesterday: number;
  cashCollectedYesterday: number;
  needsAttention: number;
  headline: string;
}

export function dailyBriefing(
  state: WorkspaceState,
  notifications: Notification[],
  now: number = Date.now()
): Briefing {
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startYesterday = startToday.getTime() - DAY;
  const inYesterday = (ts?: number) => ts !== undefined && ts >= startYesterday && ts < startToday.getTime();

  const deliveredY = state.orders.filter((o) => inYesterday(o.deliveredAt));
  const revenueY = deliveredY.reduce((s, o) => s + orderRevenue(o), 0);
  const cashY = state.orders.filter((o) => inYesterday(o.cashReceivedAt)).reduce((s, o) => s + orderCashDue(o), 0);
  const high = notifications.filter((n) => n.priority === "high").length;

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const headline =
    high === 0
      ? "Nothing urgent needs you right now."
      : `${high} thing${high > 1 ? "s" : ""} need${high > 1 ? "" : "s"} your attention today.`;

  return {
    greeting,
    revenueYesterday: revenueY,
    ordersDeliveredYesterday: deliveredY.length,
    cashCollectedYesterday: cashY,
    needsAttention: high,
    headline,
  };
}
