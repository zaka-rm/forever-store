/**
 * Retention analytics — RFM segmentation, the reorder-due report, and
 * co-purchase suggestions. One calculation owner: every surface showing a
 * segment, a reorder call list, or an upsell hint reads these functions.
 *
 * RFM (recency/frequency/monetary) is the standard e-commerce retention map:
 * deterministic quintile scores from the customer's own history — no model,
 * no black box, every score explainable from the three inputs (Law IX).
 */
import { DAY, type CustomerProfile } from "./projections";
import type { Order, WorkspaceState } from "./types";

export type RfmSegment =
  | "champion"      // recent, frequent, high spend — protect them
  | "loyal"         // frequent, still active
  | "new"           // first purchases, recent
  | "promising"     // recent, low frequency so far
  | "at-risk"       // was frequent, gone quiet
  | "cant-lose"     // high spend, gone quiet — the expensive silence
  | "hibernating"   // low activity, long quiet
  | "regular";      // steady middle

export const SEGMENT_LABEL: Record<RfmSegment, string> = {
  champion: "Champion",
  loyal: "Loyal",
  new: "New",
  promising: "Promising",
  "at-risk": "At risk",
  "cant-lose": "Can't lose",
  hibernating: "Hibernating",
  regular: "Regular",
};

/** Tone for UI chips — success/attention/critical/info discipline. */
export const SEGMENT_TONE: Record<RfmSegment, "success" | "info" | "attention" | "critical"> = {
  champion: "success",
  loyal: "success",
  new: "info",
  promising: "info",
  regular: "info",
  "at-risk": "attention",
  "cant-lose": "critical",
  hibernating: "attention",
};

export interface RfmScore {
  r: number; // 1..5, 5 = most recent
  f: number; // 1..5, 5 = most frequent
  m: number; // 1..5, 5 = highest lifetime spend
  segment: RfmSegment;
}

/** Rank-based quintile score (1..5) of `value` within `all` (ascending = better → 5). */
function quintile(value: number, all: number[]): number {
  if (all.length <= 1) return 3;
  const below = all.filter((v) => v < value).length;
  return 1 + Math.min(4, Math.floor((below / all.length) * 5));
}

function classify(r: number, f: number, m: number): RfmSegment {
  if (r >= 4 && f >= 4 && m >= 4) return "champion";
  if (r <= 2 && m >= 4) return "cant-lose";
  if (r <= 2 && f >= 3) return "at-risk";
  if (r <= 2) return "hibernating";
  if (f >= 4) return "loyal";
  if (f <= 2 && r >= 4) return m >= 3 ? "promising" : "new";
  return "regular";
}

/** RFM scores per customer name. Deterministic; quintiles are vs. your own customer base. */
export function computeRfm(
  profiles: CustomerProfile[],
  now: number = Date.now()
): Map<string, RfmScore> {
  const recencies = profiles.map((p) => -(now - p.lastActivityAt)); // higher (less negative) = more recent
  const freqs = profiles.map((p) => p.interactions);
  const monies = profiles.map((p) => p.lifetimeRevenue);
  const out = new Map<string, RfmScore>();
  for (const p of profiles) {
    const r = quintile(-(now - p.lastActivityAt), recencies);
    const f = quintile(p.interactions, freqs);
    const m = quintile(p.lifetimeRevenue, monies);
    out.set(p.name, { r, f, m, segment: classify(r, f, m) });
  }
  return out;
}

// ------------------------------------------------------ Reorder-due report --

export interface ReorderDue {
  name: string;
  daysSince: number;
  usualGapDays: number;
  daysOverdue: number;          // beyond their own rhythm
  expectedValue: number;        // their average order value
  lifetimeRevenue: number;
}

/**
 * "Which customers are overdue to reorder" — the wholesale call sheet.
 * A customer is due when their silence exceeds their own median gap
 * (needs >= 2 recorded interactions to have a rhythm at all).
 */
export function reorderDueList(
  profiles: CustomerProfile[],
  archived: string[],
  now: number = Date.now()
): ReorderDue[] {
  const hidden = new Set(archived);
  const out: ReorderDue[] = [];
  for (const p of profiles) {
    if (hidden.has(p.name)) continue;
    if (p.medianGapDays === null || p.medianGapDays <= 0 || p.interactions < 3) continue;
    const daysSince = (now - p.lastActivityAt) / DAY;
    const overdue = daysSince - p.medianGapDays;
    if (overdue > 0) {
      out.push({
        name: p.name,
        daysSince: Math.round(daysSince),
        usualGapDays: Math.round(p.medianGapDays),
        daysOverdue: Math.round(overdue),
        expectedValue: p.avgOrderValue,
        lifetimeRevenue: p.lifetimeRevenue,
      });
    }
  }
  // Most valuable-and-overdue first: weight overdue days by expected order value.
  return out.sort((a, b) => b.daysOverdue * b.expectedValue - a.daysOverdue * a.expectedValue);
}

// --------------------------------------------------- Co-purchase suggestion --

export interface UpsellSuggestion {
  productId: string;
  productName: string;
  timesTogether: number;
  price: number;
}

/**
 * "Customers who bought X also took Y" — counted from your own non-cancelled
 * orders, never invented. Returns the strongest companion product not already
 * in the basket (and not discontinued), or null if the data can't say.
 */
export function upsellSuggestion(
  state: WorkspaceState,
  basketProductIds: string[],
  minTimesTogether = 2
): UpsellSuggestion | null {
  if (basketProductIds.length === 0) return null;
  const inBasket = new Set(basketProductIds);
  const counts = new Map<string, number>();
  for (const o of state.orders as Order[]) {
    if (o.status === "cancelled") continue;
    const ids = new Set(o.lines.map((l) => l.productId));
    if (![...inBasket].some((id) => ids.has(id))) continue;
    for (const id of ids) {
      if (!inBasket.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  let best: UpsellSuggestion | null = null;
  for (const [id, n] of counts) {
    if (n < minTimesTogether) continue;
    const p = state.products.find((x) => x.productId === id && !x.discontinued);
    if (!p) continue;
    if (!best || n > best.timesTogether) {
      best = { productId: id, productName: p.name, timesTogether: n, price: p.price };
    }
  }
  return best;
}
