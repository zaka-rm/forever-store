/**
 * Projections — read-only state derived by folding the fact stream.
 * One Source of Truth (CODEX 00 D.9, ADR-0003): facts live once in Business Memory;
 * everything here is a rebuildable, never independently editable, derivation.
 * Canonical (governance/): CAP-000006 Inventory (FEAT-000043 stock ledger,
 * FEAT-000044 reservations), CAP-000005 Finance (FEAT-000037 payments,
 * FEAT-000039 cash forecast), CAP-000007 CRM (FEAT-000054 customer value/health).
 */
import type {
  ExpenseRecorded,
  Invoice,
  InvoiceIssued,
  InvoicePaid,
  MemoryEvent,
  Order,
  OrderCashReceived,
  OrderCreated,
  OrderStatusChanged,
  GoalMetric,
  GoalSet,
  Product,
  ProductAdded,
  Promo,
  PromoCreated,
  PromoDeactivated,
  RecordedDecision,
  StockAdjusted,
  WorkspaceState,
} from "./types";

export function projectState(events: readonly MemoryEvent[]): WorkspaceState {
  const invoices = new Map<string, Invoice>();
  const products = new Map<string, Product>();
  const orders = new Map<string, Order>();
  const promoDefs = new Map<string, PromoCreated>();
  const promoActive = new Map<string, boolean>();
  const goals: Partial<Record<GoalMetric, number>> = {};
  const expenses: ExpenseRecorded[] = [];

  for (const e of events) {
    if (e.stream !== "fact") continue;
    switch (e.type) {
      case "invoice_issued": {
        const p = e.payload as unknown as InvoiceIssued;
        invoices.set(p.invoiceId, { ...p });
        break;
      }
      case "invoice_paid": {
        const p = e.payload as unknown as InvoicePaid;
        const inv = invoices.get(p.invoiceId);
        if (inv) inv.paidAt = p.paidAt;
        break;
      }
      case "expense_recorded": {
        expenses.push(e.payload as unknown as ExpenseRecorded);
        break;
      }
      case "product_added": {
        const p = e.payload as unknown as ProductAdded;
        products.set(p.productId, { ...p });
        break;
      }
      case "stock_adjusted": {
        const p = e.payload as unknown as StockAdjusted;
        const prod = products.get(p.productId);
        if (prod) prod.stock += p.delta;
        break;
      }
      case "order_created": {
        const p = e.payload as unknown as OrderCreated;
        orders.set(p.orderId, { ...p, status: "pending" });
        break;
      }
      case "order_status_changed": {
        const p = e.payload as unknown as OrderStatusChanged;
        const o = orders.get(p.orderId);
        if (!o) break;
        const prev = o.status;
        o.status = p.status;
        // Stock effects (ZPL-041 §17): deduct on delivery; restock on return.
        if (p.status === "delivered" && prev !== "delivered") {
          o.deliveredAt = p.at;
          for (const line of o.lines) {
            const prod = products.get(line.productId);
            if (prod) prod.stock -= line.qty;
          }
        }
        if (p.status === "returned" && prev === "delivered") {
          for (const line of o.lines) {
            const prod = products.get(line.productId);
            if (prod) prod.stock += line.qty;
          }
        }
        break;
      }
      case "order_cash_received": {
        const p = e.payload as unknown as OrderCashReceived;
        const o = orders.get(p.orderId);
        if (o) o.cashReceivedAt = p.at;
        break;
      }
      case "promo_created": {
        const p = e.payload as unknown as PromoCreated;
        promoDefs.set(p.promoId, { ...p });
        promoActive.set(p.promoId, true);
        break;
      }
      case "promo_deactivated": {
        const p = e.payload as unknown as PromoDeactivated;
        promoActive.set(p.promoId, false);
        break;
      }
      case "goal_set": {
        const p = e.payload as unknown as GoalSet;
        goals[p.metric] = p.target; // events are chronological; latest wins
        break;
      }
      default:
        break;
    }
  }

  // Promo usage is server-counted: redemptions = non-cancelled orders bearing the code.
  const usageByCode = new Map<string, number>();
  for (const o of orders.values()) {
    if (o.promoCode && o.status !== "cancelled") {
      usageByCode.set(o.promoCode, (usageByCode.get(o.promoCode) ?? 0) + 1);
    }
  }
  const promos: Promo[] = [...promoDefs.values()].map((def) => ({
    ...def,
    active: promoActive.get(def.promoId) ?? false,
    timesUsed: usageByCode.get(def.code) ?? 0,
  }));

  // Reservations: open orders hold stock (available = stock − reserved).
  const reserved: Record<string, number> = {};
  for (const o of orders.values()) {
    if (o.status === "pending" || o.status === "confirmed" || o.status === "shipped") {
      for (const line of o.lines) {
        reserved[line.productId] = (reserved[line.productId] ?? 0) + line.qty;
      }
    }
  }

  return {
    invoices: [...invoices.values()].sort((a, b) => b.issuedAt - a.issuedAt),
    expenses: expenses.sort((a, b) => b.date - a.date),
    products: [...products.values()],
    orders: [...orders.values()].sort((a, b) => b.createdAt - a.createdAt),
    promos: promos.sort((a, b) => b.createdAt - a.createdAt),
    goals,
    reserved,
  };
}

// ---------- Goals, break-even, simulator (Wave 3 — one calculation owner) ----------

const monthStart = (now: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

/** Actual value this calendar month for a goal metric — same recognition rules as the rest of the app. */
export function goalActual(state: WorkspaceState, metric: GoalMetric, now: number = Date.now()): number {
  const start = monthStart(now);
  const deliveredThisMonth = state.orders.filter((o) => o.deliveredAt && o.deliveredAt >= start);
  if (metric === "orders") return deliveredThisMonth.length;
  if (metric === "revenue") {
    return (
      deliveredThisMonth.reduce((s, o) => s + orderRevenue(o), 0) +
      state.invoices.filter((i) => i.paidAt && (i.paidAt as number) >= start).reduce((s, i) => s + i.amount, 0)
    );
  }
  // profit (COD orders carry cost data; invoices don't)
  return deliveredThisMonth.reduce((s, o) => s + orderNetProfit(o), 0);
}

export interface BreakEven {
  monthlyFixedExpenses: number;
  avgProfitPerOrder: number;
  avgOrderValue: number;
  breakEvenOrders: number | null; // null when avg profit per order ≤ 0 (unreachable)
  breakEvenRevenue: number | null;
  ordersThisMonth: number;
}

/**
 * Break-even (ZPL-041 §12): how many delivered orders/month cover fixed expenses,
 * given the average net profit each order contributes. Honest about impossibility:
 * if orders don't net a profit, break-even is unreachable and returns null.
 */
export function breakEven(state: WorkspaceState, now: number = Date.now()): BreakEven {
  const DAYS90 = 90 * DAY;
  const fixed3mo = state.expenses.filter((e) => now - e.date <= DAYS90).reduce((s, e) => s + e.amount, 0);
  const monthlyFixed = fixed3mo / 3;

  const delivered = state.orders.filter((o) => o.status === "delivered");
  const avgProfit = delivered.length ? delivered.reduce((s, o) => s + orderNetProfit(o), 0) / delivered.length : 0;
  const avgValue = delivered.length ? delivered.reduce((s, o) => s + orderRevenue(o), 0) / delivered.length : 0;

  const beOrders = avgProfit > 0 ? Math.ceil(monthlyFixed / avgProfit) : null;
  return {
    monthlyFixedExpenses: monthlyFixed,
    avgProfitPerOrder: avgProfit,
    avgOrderValue: avgValue,
    breakEvenOrders: beOrders,
    breakEvenRevenue: beOrders !== null ? beOrders * avgValue : null,
    ordersThisMonth: state.orders.filter((o) => o.deliveredAt && o.deliveredAt >= monthStart(now)).length,
  };
}

export interface SimInput {
  sellingPrice: number;
  buyingCost: number;
  quantity: number;
  discount: number; // per unit
  shippingCost: number; // per order
  packagingCost: number; // per order
  advertisingCost: number; // per order
}

export interface SimResult {
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number; // net / revenue
  roiPct: number; // net / total cost
  breakEvenUnits: number | null; // units to cover per-order fixed (ship+pack+ad)
}

export interface Forecast {
  revenueProjection: { low: number; mid: number; high: number } | null;
  daysElapsed: number;
  daysInMonth: number;
  cashNext30: number | null;
  assumptions: string[];
  stockouts: { name: string; daysLeft: number }[];
}

/**
 * Forecasting (ZPL-041 §14) — run-rate projections with explicit assumptions
 * and a range, never a false point value. Returns null components when the data
 * is too thin to project honestly (CODEX 00 C.13).
 */
export function forecast(state: WorkspaceState, now: number = Date.now()): Forecast {
  const d = new Date(now);
  const daysElapsed = d.getDate();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const assumptions: string[] = [];

  // Revenue: extrapolate this month's pace to month-end, ±15% band.
  const revSoFar = goalActual(state, "revenue", now);
  let revenueProjection: Forecast["revenueProjection"] = null;
  if (daysElapsed >= 5 && revSoFar > 0) {
    const mid = (revSoFar / daysElapsed) * daysInMonth;
    revenueProjection = { low: mid * 0.85, mid, high: mid * 1.15 };
    assumptions.push(`Revenue assumes the current month's pace holds for all ${daysInMonth} days.`);
  } else {
    assumptions.push("Too few days into the month to project revenue honestly yet.");
  }

  // Cash next 30 days: available + pending COD − average monthly outgoings.
  const collected =
    state.invoices.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0) +
    state.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt).reduce((s, o) => s + orderRevenue(o), 0);
  const cashAvailable = collected - state.expenses.reduce((s, e) => s + e.amount, 0);
  const pendingCod = state.orders
    .filter((o) => o.status === "delivered" && !o.cashReceivedAt)
    .reduce((s, o) => s + orderRevenue(o), 0);
  const exp90items = state.expenses.filter((e) => now - e.date <= 90 * DAY);
  const exp90 = exp90items.reduce((s, e) => s + e.amount, 0);
  let cashNext30: number | null = null;
  if (exp90items.length >= 3) {
    cashNext30 = cashAvailable + pendingCod - exp90 / 3;
    assumptions.push("Cash forecast counts pending COD collections and your 90-day average outgoings, but no new orders.");
  }

  const stockouts = state.products
    .filter((p) => p.weeklySales > 0)
    .map((p) => {
      const available = p.stock - (state.reserved[p.productId] ?? 0);
      return { name: p.name, daysLeft: Math.round(available / (p.weeklySales / 7)) };
    })
    .filter((x) => x.daysLeft <= 21)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return { revenueProjection, daysElapsed, daysInMonth, cashNext30, assumptions, stockouts };
}

/** Pure profit simulator (ZPL-041 §13) — a calculator, no events. */
export function simulateProfit(i: SimInput): SimResult {
  const perUnitNet = i.sellingPrice - i.discount - i.buyingCost;
  const revenue = (i.sellingPrice - i.discount) * i.quantity + 0;
  const cogs = i.buyingCost * i.quantity;
  const orderFixed = i.shippingCost + i.packagingCost + i.advertisingCost;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - orderFixed;
  const totalCost = cogs + orderFixed;
  return {
    revenue,
    cogs,
    grossProfit,
    netProfit,
    marginPct: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    roiPct: totalCost > 0 ? (netProfit / totalCost) * 100 : 0,
    breakEvenUnits: perUnitNet > 0 ? Math.ceil(orderFixed / perUnitNet) : null,
  };
}

// ---------- Discounts & promos (one calculation owner — ZPL-041 Principle 1) ----------

export type PromoCheck =
  | { ok: true; discount: number; promo: Promo }
  | { ok: false; reason: string };

/**
 * Validate a promo code against a basket and compute its discount.
 * Enforces existence, active state, expiry, minimum basket, and usage limit.
 * Stacking is prevented upstream: an order carries at most one code.
 */
export function checkPromo(
  state: WorkspaceState,
  code: string,
  basketSubtotal: number,
  now: number = Date.now()
): PromoCheck {
  const promo = state.promos.find((p) => p.code === code.trim().toUpperCase());
  if (!promo) return { ok: false, reason: "No promo with that code." };
  if (!promo.active) return { ok: false, reason: "This promo has been deactivated." };
  if (promo.expiresAt && now > promo.expiresAt) return { ok: false, reason: "This promo has expired." };
  if (basketSubtotal < promo.minBasket)
    return { ok: false, reason: `Basket must be at least ${promo.minBasket} to use this promo.` };
  if (promo.usageLimit !== undefined && promo.timesUsed >= promo.usageLimit)
    return { ok: false, reason: "This promo has reached its usage limit." };

  let discount =
    promo.type === "percentage" ? (basketSubtotal * promo.value) / 100 : promo.value;
  if (promo.maxDiscount !== undefined) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.min(discount, basketSubtotal); // never discount below zero
  return { ok: true, discount: Math.round(discount * 100) / 100, promo };
}

// ---------- Order financials (one calculation owner — ZPL-041 Principle 1) ----------

export function orderLinesTotal(o: Order): number {
  return o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

/** Revenue = lines − discount + shipping charged to the customer. Recognized on delivery only. */
export function orderRevenue(o: Order): number {
  return orderLinesTotal(o) - o.discount + o.shippingCharged;
}

export function orderCogs(o: Order): number {
  return o.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
}

/** Net profit = revenue − COGS − shipping cost − COD fee − packaging. */
export function orderNetProfit(o: Order): number {
  return orderRevenue(o) - orderCogs(o) - o.shippingCost - o.codFee - o.packagingCost;
}

/** Cost sunk on a refused COD order: round-trip shipping + packaging (goods come back). */
export function orderRefusalLoss(o: Order): number {
  return o.shippingCost * 2 + o.packagingCost;
}

export function projectDecisions(events: readonly MemoryEvent[]): RecordedDecision[] {
  const outcomes = new Set(
    events
      .filter((e) => e.stream === "outcome")
      .map((e) => String(e.payload.decisionEventId))
  );
  return events
    .filter((e) => e.stream === "decision")
    .map((e) => ({
      eventId: e.id,
      ts: e.ts,
      decisionKey: String(e.payload.decisionKey),
      claim: String(e.payload.claim),
      layer: e.payload.layer as RecordedDecision["layer"],
      optionId: String(e.payload.optionId),
      optionLabel: String(e.payload.optionLabel),
      rationale: String(e.payload.rationale ?? ""),
      hasOutcome: outcomes.has(e.id),
    }))
    .sort((a, b) => b.ts - a.ts);
}

/** Customers are a projection over invoices — they have no independent editable home. */
export interface CustomerView {
  name: string;
  invoiceCount: number;
  totalBilled: number;
  lastInvoiceAt: number;
  medianGapDays: number | null;
}

export function projectCustomers(state: WorkspaceState): CustomerView[] {
  const byCustomer = new Map<string, Invoice[]>();
  for (const inv of state.invoices) {
    const list = byCustomer.get(inv.customer) ?? [];
    list.push(inv);
    byCustomer.set(inv.customer, list);
  }
  const views: CustomerView[] = [];
  for (const [name, list] of byCustomer) {
    const sorted = [...list].sort((a, b) => a.issuedAt - b.issuedAt);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].issuedAt - sorted[i - 1].issuedAt) / DAY);
    }
    gaps.sort((a, b) => a - b);
    const median =
      gaps.length === 0
        ? null
        : gaps.length % 2
          ? gaps[(gaps.length - 1) / 2]
          : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
    views.push({
      name,
      invoiceCount: list.length,
      totalBilled: list.reduce((s, i) => s + i.amount, 0),
      lastInvoiceAt: sorted[sorted.length - 1].issuedAt,
      medianGapDays: median,
    });
  }
  return views.sort((a, b) => b.totalBilled - a.totalBilled);
}

// ---------- CRM: unified customer profiles (Wave 4) — invoices + orders ----------

export type CustomerTag = "new" | "returning" | "vip" | "at-risk" | "high-refusal";

/**
 * A customer profile unifies every recorded interaction (invoices + COD orders)
 * for one customer name. It is a projection: customers have no independent
 * editable home (One Source of Truth, D.9). Lifetime profit counts only
 * delivered orders, which carry cost data; invoices contribute revenue only.
 */
export interface CustomerProfile {
  name: string;
  interactions: number; // invoices + orders
  lifetimeRevenue: number; // paid invoices + delivered order revenue
  lifetimeProfit: number; // delivered orders' net profit (invoices lack cost data)
  hasProfitData: boolean; // true if any delivered order exists
  avgOrderValue: number;
  ordersDelivered: number;
  ordersRefused: number;
  codReliability: number | null; // delivered / (delivered + refused), 0..1
  lastActivityAt: number;
  medianGapDays: number | null;
  tags: CustomerTag[];
}

export function projectCustomerProfiles(
  state: WorkspaceState,
  now: number = Date.now()
): CustomerProfile[] {
  const names = new Set<string>();
  for (const i of state.invoices) names.add(i.customer);
  for (const o of state.orders) names.add(o.customer);

  const profiles: CustomerProfile[] = [];
  for (const name of names) {
    const invoices = state.invoices.filter((i) => i.customer === name);
    const orders = state.orders.filter((o) => o.customer === name);
    const delivered = orders.filter((o) => o.status === "delivered");
    const refused = orders.filter((o) => o.status === "refused");

    const lifetimeRevenue =
      invoices.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0) +
      delivered.reduce((s, o) => s + orderRevenue(o), 0);
    const lifetimeProfit = delivered.reduce((s, o) => s + orderNetProfit(o), 0);

    // Activity timeline for rhythm + recency (issue dates + order creation dates).
    const activity = [
      ...invoices.map((i) => i.issuedAt),
      ...orders.map((o) => o.createdAt),
    ].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let k = 1; k < activity.length; k++) gaps.push((activity[k] - activity[k - 1]) / DAY);
    gaps.sort((a, b) => a - b);
    const median =
      gaps.length === 0
        ? null
        : gaps.length % 2
          ? gaps[(gaps.length - 1) / 2]
          : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;

    const interactions = invoices.length + orders.length;
    const revenueEvents = invoices.filter((i) => i.paidAt).length + delivered.length;
    const settledCod = delivered.length + refused.length;

    profiles.push({
      name,
      interactions,
      lifetimeRevenue,
      lifetimeProfit,
      hasProfitData: delivered.length > 0,
      avgOrderValue: revenueEvents > 0 ? lifetimeRevenue / revenueEvents : 0,
      ordersDelivered: delivered.length,
      ordersRefused: refused.length,
      codReliability: settledCod > 0 ? delivered.length / settledCod : null,
      lastActivityAt: activity[activity.length - 1] ?? 0,
      medianGapDays: median,
      tags: [],
    });
  }

  // Tags depend on cross-customer ranking, so assign after all profiles exist.
  const sortedByRevenue = [...profiles].sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
  const vipCount = Math.max(1, Math.round(profiles.length * 0.2)); // top 20%
  const vipNames = new Set(sortedByRevenue.slice(0, vipCount).map((p) => p.name));

  for (const p of profiles) {
    const tags: CustomerTag[] = [];
    if (p.interactions <= 1) tags.push("new");
    else tags.push("returning");
    if (vipNames.has(p.name) && p.lifetimeRevenue > 0) tags.push("vip");
    if (
      p.medianGapDays !== null &&
      p.medianGapDays > 0 &&
      (now - p.lastActivityAt) / DAY > Math.max(2 * p.medianGapDays, 30)
    ) {
      tags.push("at-risk");
    }
    if (p.codReliability !== null && p.ordersDelivered + p.ordersRefused >= 2 && p.codReliability < 0.6) {
      tags.push("high-refusal");
    }
    p.tags = tags;
  }

  return profiles.sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
}

export const DAY = 24 * 60 * 60 * 1000;
