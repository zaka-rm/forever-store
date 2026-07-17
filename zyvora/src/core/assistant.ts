/**
 * Ask ZYVORA — a deterministic assistant over the existing projections
 * (ZPL-041 §12/§20). It answers business questions from real recorded data,
 * always shows the figures it used, and never fabricates: if it can't answer,
 * it says so. This is the rules-based default; an LLM could later sit behind an
 * env flag, but the constitutional requirement (sourced, honest, permission-
 * aware) is satisfied here without one.
 * Canonical (governance/): CAP-000003 AI Engine — FEAT-000019 retrieval service,
 * FEAT-000022 explainability service.
 */
import { cashCenter, formatMoney, stateOfThings } from "./engine";
import { getActiveCurrency } from "./format";
import {
  DAY,
  breakEven,
  cashCalendar,
  goalActual,
  monthBounds,
  orderNetProfit,
  orderRevenue,
  profitAndLoss,
  projectCustomerProfiles,
} from "./projections";
import { SEGMENT_LABEL, computeRfm, reorderDueList } from "./retention";
import type { WorkspaceState } from "./types";

/**
 * Factual business brief for the LLM (CAP-000003 retrieval). Only real,
 * projection-derived numbers — the model answers from this, never invents.
 */
export function businessContext(state: WorkspaceState, now: number = Date.now()): string {
  const cash = cashCenter(state, now);
  const b = breakEven(state, now);
  const mb = monthBounds(new Date(now).getFullYear(), new Date(now).getMonth());
  const pnl = profitAndLoss(state, mb.start, mb.end, mb.label);
  const profiles = projectCustomerProfiles(state, now);
  const things = stateOfThings(state, now);

  const margins = state.products
    .filter((p) => p.price > 0)
    .map((p) => ({ n: p.name, m: ((p.price - p.unitCost) / p.price) * 100 }))
    .sort((a, b) => b.m - a.m);
  const lowStock = state.products.filter((p) => {
    const avail = p.stock - (state.reserved[p.productId] ?? 0);
    return p.weeklySales > 0 && avail / (p.weeklySales / 7) < p.leadTimeDays + 4 && (state.incoming[p.productId] ?? 0) === 0;
  });
  const atRisk = profiles.filter((p) => p.tags.includes("at-risk"));
  const overdue = state.invoices.filter((i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY);
  const losing = state.orders.filter((o) => o.status === "delivered" && orderNetProfit(o) < 0);

  const L: string[] = [];
  L.push(`Business currency: ${getActiveCurrency()}. Today: ${new Date(now).toDateString()}.`);
  L.push(`CASH: available ${formatMoney(cash.cashAvailable)}, pending with couriers ${formatMoney(cash.cashPendingCod)}, collected last 30 days ${formatMoney(cash.collected30)}, expenses last 30 days ${formatMoney(cash.expenses30)}.`);
  L.push(`THIS MONTH P&L (${pnl.periodLabel}): net revenue ${formatMoney(pnl.revenue.netRevenue)}, gross profit ${formatMoney(pnl.grossProfit)} (${pnl.grossMarginPct.toFixed(0)}%), net profit ${formatMoney(pnl.netProfit)} (${pnl.netMarginPct.toFixed(0)}%), ${pnl.ordersDelivered} orders delivered.`);
  L.push(`Revenue last 30 days: ${formatMoney(things.billedLast30)}. Average net profit per delivered order: ${formatMoney(b.avgProfitPerOrder)}. Break-even: ${b.breakEvenOrders === null ? "unreachable at current per-order profit" : `${b.breakEvenOrders} orders/month`}.`);
  L.push(`PRODUCTS (${state.products.length}). Highest margins: ${margins.slice(0, 5).map((x) => `${x.n} ${x.m.toFixed(0)}%`).join("; ") || "none"}.`);
  L.push(`Low stock needing reorder: ${lowStock.map((p) => p.name).join(", ") || "none"}.`);
  L.push(`CUSTOMERS (${profiles.length}). Top by lifetime revenue: ${profiles.slice(0, 5).map((c) => `${c.name} ${formatMoney(c.lifetimeRevenue)}`).join("; ") || "none"}. At-risk (gone quiet): ${atRisk.map((c) => c.name).join(", ") || "none"}.`);
  L.push(`ORDERS: ${things.openOrders} open. Delivered orders that lost money: ${losing.length}.`);
  L.push(`Overdue invoices: ${overdue.length}${overdue.length ? ` totalling ${formatMoney(overdue.reduce((s, i) => s + i.amount, 0))}` : ""}.`);

  // Retention intelligence (RFM) + dated cash expectations — so the assistant
  // can answer "who should I call today" and "what money is coming" honestly.
  const rfm = computeRfm(profiles, now);
  const segCounts = new Map<string, number>();
  for (const s of rfm.values()) segCounts.set(s.segment, (segCounts.get(s.segment) ?? 0) + 1);
  if (segCounts.size > 0) {
    L.push(
      `SEGMENTS (RFM): ${[...segCounts.entries()].map(([s, n]) => `${SEGMENT_LABEL[s as keyof typeof SEGMENT_LABEL]} ${n}`).join("; ")}.`
    );
  }
  const due = reorderDueList(profiles, state.archivedCustomers, now);
  if (due.length > 0) {
    L.push(
      `OVERDUE TO REORDER (past their own rhythm): ${due.slice(0, 5).map((d) => `${d.name} ${d.daysOverdue}d overdue, ≈${formatMoney(d.expectedValue)} expected`).join("; ")}.`
    );
  }
  const cal = cashCalendar(state, now);
  L.push(
    `CASH CALENDAR: overdue ${formatMoney(cal.overdue.total)} (${cal.overdue.count}), due ≤7d ${formatMoney(cal.next7.total)}, due 8–30d ${formatMoney(cal.next30.total)}, with couriers ${formatMoney(cal.codPending.total)}.`
  );
  return L.join("\n");
}

export interface Answer {
  text: string;
  evidence: { label: string; value: string }[];
  handled: boolean;
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export function askZyvora(state: WorkspaceState, question: string, now = Date.now()): Answer {
  const q = question.toLowerCase().trim();
  const things = stateOfThings(state, now);
  const cash = cashCenter(state, now);

  // --- Orders that lost money
  if (has(q, "lost money", "losing money", "unprofitable", "lose money")) {
    const losing = state.orders.filter((o) => o.status === "delivered" && orderNetProfit(o) < 0);
    if (losing.length === 0)
      return { handled: true, text: "None of your delivered orders lost money — every delivered order netted a profit after all costs.", evidence: [] };
    const total = losing.reduce((s, o) => s + orderNetProfit(o), 0);
    return {
      handled: true,
      text: `${losing.length} delivered order${losing.length > 1 ? "s" : ""} lost money — ${formatMoney(Math.abs(total))} in total, after product cost, shipping, COD fees, and packaging.`,
      evidence: losing.slice(0, 6).map((o) => ({
        label: `${o.customer} — ${o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`,
        value: `net ${formatMoney(orderNetProfit(o))}`,
      })),
    };
  }

  // --- Product margins
  if (has(q, "margin", "best product", "highest margin", "most profitable product", "worst product")) {
    const withMargin = state.products
      .filter((p) => p.price > 0)
      .map((p) => ({ name: p.name, marginPct: ((p.price - p.unitCost) / p.price) * 100, unit: p.price - p.unitCost }))
      .sort((a, b) => b.marginPct - a.marginPct);
    if (withMargin.length === 0)
      return { handled: true, text: "No products with a price recorded yet, so I can't compare margins.", evidence: [] };
    const worst = has(q, "worst", "lowest");
    const pick = worst ? withMargin[withMargin.length - 1] : withMargin[0];
    return {
      handled: true,
      text: `Your ${worst ? "lowest" : "highest"}-margin product is "${pick.name}" at ${pick.marginPct.toFixed(0)}% (${formatMoney(pick.unit)} per unit).`,
      evidence: withMargin.slice(0, 5).map((p) => ({ label: p.name, value: `${p.marginPct.toFixed(0)}% (${formatMoney(p.unit)}/unit)` })),
    };
  }

  // --- Cash to restock
  if (has(q, "restock", "reorder", "cash do i need", "afford to restock")) {
    const need = state.products
      .filter((p) => p.weeklySales > 0)
      .map((p) => {
        const available = p.stock - (state.reserved[p.productId] ?? 0);
        const daysLeft = available / (p.weeklySales / 7);
        const short = daysLeft < p.leadTimeDays + 4;
        const qty = Math.ceil(p.weeklySales * 4);
        return { name: p.name, short, cost: qty * p.unitCost, qty };
      })
      .filter((x) => x.short);
    if (need.length === 0)
      return { handled: true, text: "Nothing needs restocking right now — every selling product has enough stock to cover its resupply time.", evidence: [] };
    const total = need.reduce((s, x) => s + x.cost, 0);
    return {
      handled: true,
      text: `To restock the ${need.length} product${need.length > 1 ? "s" : ""} running low, you'd need about ${formatMoney(total)} (≈4 weeks of stock each). You currently have ${formatMoney(cash.cashAvailable)} available${cash.cashPendingCod > 0 ? ` plus ${formatMoney(cash.cashPendingCod)} pending with couriers` : ""}.`,
      evidence: need.map((x) => ({ label: `${x.name} — order ~${x.qty} units`, value: formatMoney(x.cost) })),
    };
  }

  // --- Customers who need attention
  if (has(q, "at risk", "at-risk", "need attention", "who needs", "churn", "quiet customer", "leaving")) {
    const atRisk = projectCustomerProfiles(state, now).filter((p) => p.tags.includes("at-risk"));
    if (atRisk.length === 0)
      return { handled: true, text: "No customers are flagged at-risk — none have gone quiet past twice their usual ordering rhythm.", evidence: [] };
    return {
      handled: true,
      text: `${atRisk.length} customer${atRisk.length > 1 ? "s are" : " is"} at-risk — gone quiet past their usual rhythm. Worth a low-pressure check-in.`,
      evidence: atRisk.slice(0, 6).map((c) => ({ label: c.name, value: `${formatMoney(c.lifetimeRevenue)} lifetime · last seen ${Math.round((now - c.lastActivityAt) / DAY)} days ago` })),
    };
  }

  // --- Top customer
  if (has(q, "top customer", "best customer", "biggest customer", "most valuable")) {
    const profiles = projectCustomerProfiles(state, now);
    if (profiles.length === 0) return { handled: true, text: "No customers recorded yet.", evidence: [] };
    const top = profiles[0];
    return {
      handled: true,
      text: `Your top customer by lifetime revenue is ${top.name} — ${formatMoney(top.lifetimeRevenue)} across ${top.interactions} interactions.`,
      evidence: profiles.slice(0, 5).map((c) => ({ label: c.name, value: formatMoney(c.lifetimeRevenue) })),
    };
  }

  // --- Profit
  if (has(q, "profit")) {
    const profit30 = state.orders
      .filter((o) => o.deliveredAt && now - o.deliveredAt <= 30 * DAY)
      .reduce((s, o) => s + orderNetProfit(o), 0);
    const b = breakEven(state, now);
    return {
      handled: true,
      text: `Net profit from COD orders delivered in the last 30 days is ${formatMoney(profit30)}. (Invoices are excluded — they carry no cost data.) On average, each delivered order nets ${formatMoney(b.avgProfitPerOrder)}.`,
      evidence: [
        { label: "Net profit, COD orders, last 30 days", value: formatMoney(profit30) },
        { label: "Average net profit per delivered order", value: formatMoney(b.avgProfitPerOrder) },
      ],
    };
  }

  // --- Revenue
  if (has(q, "revenue", "sales", "how much did i make", "earn")) {
    const thisMonth = goalActual(state, "revenue", now);
    return {
      handled: true,
      text: `Revenue in the last 30 days is ${formatMoney(things.billedLast30)}. This calendar month so far: ${formatMoney(thisMonth)}.`,
      evidence: [
        { label: "Revenue, last 30 days", value: formatMoney(things.billedLast30) },
        { label: "Revenue, this calendar month", value: formatMoney(thisMonth) },
      ],
    };
  }

  // --- Cash
  if (has(q, "cash", "money available", "how much money")) {
    return {
      handled: true,
      text: `You have ${formatMoney(cash.cashAvailable)} available now, with ${formatMoney(cash.cashPendingCod)} still pending collection from couriers on delivered COD orders.`,
      evidence: [
        { label: "Cash available", value: formatMoney(cash.cashAvailable) },
        { label: "Pending with couriers (COD)", value: formatMoney(cash.cashPendingCod) },
        { label: "Collected, last 30 days", value: formatMoney(cash.collected30) },
      ],
    };
  }

  // --- Fallback (honest about scope)
  return {
    handled: false,
    text: "I can answer questions about your profit, revenue, cash, product margins, orders that lost money, restocking needs, and customers who need attention — all from your own recorded data. Try one of the suggestions below.",
    evidence: [],
  };
}

export const SUGGESTED_QUESTIONS = [
  "How much profit did I make last month?",
  "Which product has the highest margin?",
  "Show orders that lost money",
  "How much cash do I need to restock?",
  "Which customers need attention?",
  "How much cash do I have?",
];
