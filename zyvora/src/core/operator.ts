import { money } from "./format";
import { DAY, orderCashDue, orderRefusalLoss, projectContacts, projectCustomerProfiles } from "./projections";
import type { MemoryEvent, WorkspaceState } from "./types";

export type OperatorKind = "cod-confirmations" | "winback-campaign" | "budget-reorder" | "courier-profit-recovery";

export interface OperatorTarget {
  targetId: string;
  customer: string;
  phone?: string;
  body: string;
  orderId?: string;
  evidence: string;
}

export interface OperatorPlan {
  planId: string;
  kind: OperatorKind;
  title: string;
  problem: string;
  evidence: { label: string; value: string }[];
  proposedAction: string;
  targets: OperatorTarget[];
  excluded: { customer: string; reason: string }[];
  measurement: string;
  purchaseOrder?: {
    lines: { productId: string; productName: string; qty: number; unitCost: number; evidence: string }[];
    total: number;
    expectedAt: number;
  };
  tasks?: {
    taskId: string;
    orderId: string;
    customer: string;
    title: string;
    note: string;
    dueAt: number;
    evidence: string;
  }[];
  preparedAt: number;
}

export interface OperatorRun {
  planId: string;
  kind: OperatorKind;
  title: string;
  targetIds: string[];
  customers: string[];
  executedAt: number;
  expectedAt?: number;
  outcome?: { successes: number; total: number; result: "worked" | "mixed" | "no-result-yet"; measuredAt: number };
}

const wantsCod = (q: string) => /cod|cash.?on.?delivery/i.test(q) && /confirm|prepare|message|today|send/i.test(q);
const wantsWinback = (q: string) => /win.?back|re.?engag|quiet customer|come back/i.test(q) && /campaign|prepare|create|message|send/i.test(q);
const wantsBudgetReorder = (q: string) => /reorder|restock|purchase order|buy stock/i.test(q) && /budget|with|spend|afford|mad|dh|dirham/i.test(q);
const wantsCourierProfit = (q: string) => /courier|delivery partner|carrier/i.test(q) && /profit|hurting|loss|worst|cost|perform/i.test(q);

const requestBudget = (request: string): number | null => {
  const normalized = request.replace(/\s/g, "");
  const match = normalized.match(/(?:mad|dh|dirham)?([\d,.]+)(?:mad|dh|dirham)?/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
};

export function prepareOperatorPlan(state: WorkspaceState, events: readonly MemoryEvent[], request: string, now = Date.now()): OperatorPlan | null {
  const contacts = projectContacts(events);
  if (wantsCourierProfit(request)) {
    const groups = new Map<string, typeof state.orders>();
    for (const order of state.orders) {
      if (!order.courier) continue;
      const orders = groups.get(order.courier) ?? [];
      orders.push(order);
      groups.set(order.courier, orders);
    }
    const ranked = [...groups.entries()].map(([courier, orders]) => {
      const settled = orders.filter((order) => ["delivered", "refused", "returned"].includes(order.status));
      const delivered = orders.filter((order) => order.status === "delivered");
      const refused = orders.filter((order) => order.status === "refused");
      const failed = orders.filter((order) => order.shipmentStatus === "delivery_failed");
      const overdueCash = delivered.filter((order) => !order.cashReceivedAt && (order.expectedRemittanceAt ?? ((order.deliveredAt ?? now) + 7 * DAY)) < now);
      const refusalLoss = refused.reduce((sum, order) => sum + orderRefusalLoss(order), 0);
      const failedCostsAtRisk = failed.reduce((sum, order) => sum + order.shippingCost + order.codFee + order.packagingCost, 0);
      const pendingCash = overdueCash.reduce((sum, order) => sum + orderCashDue(order), 0);
      const deliveryRate = settled.length ? delivered.length / settled.length : 0;
      const damageScore = refusalLoss + failedCostsAtRisk + pendingCash * 0.1;
      return { courier, settled, delivered, refused, failed, overdueCash, refusalLoss, failedCostsAtRisk, pendingCash, deliveryRate, damageScore };
    }).filter((item) => item.settled.length || item.failed.length || item.overdueCash.length).sort((a, b) => b.damageScore - a.damageScore || a.deliveryRate - b.deliveryRate);
    const worst = ranked[0];
    if (!worst) return null;
    const tasks: NonNullable<OperatorPlan["tasks"]> = [];
    for (const order of worst.failed) tasks.push({
      taskId: crypto.randomUUID(), orderId: order.orderId, customer: order.customer,
      title: `Recover failed delivery ${order.orderId}`,
      note: `Contact ${order.customer} and ${worst.courier}; resolve delivery failure: ${order.lastDeliveryFailure || "reason not recorded"}. Record the next attempt or final outcome.`,
      dueAt: now + DAY, evidence: `${money(order.shippingCost + order.codFee + order.packagingCost)} operational cost at risk`,
    });
    for (const order of worst.overdueCash) tasks.push({
      taskId: crypto.randomUUID(), orderId: order.orderId, customer: order.customer,
      title: `Chase COD remittance ${order.orderId}`,
      note: `Ask ${worst.courier} to remit ${money(orderCashDue(order))} collected for order ${order.orderId}; record the payment when received.`,
      dueAt: now + DAY, evidence: `${money(orderCashDue(order))} cash overdue — liquidity risk, not booked as a profit loss`,
    });
    for (const order of worst.refused.slice(0, 5)) tasks.push({
      taskId: crypto.randomUUID(), orderId: order.orderId, customer: order.customer,
      title: `Review refusal ${order.orderId}`,
      note: `Review the refusal reason for ${order.customer} with ${worst.courier}; verify address and confirmation quality, then record a prevention action before reshipping.`,
      dueAt: now + 2 * DAY, evidence: `${money(orderRefusalLoss(order))} direct refusal loss`,
    });
    if (!tasks.length) return null;
    return {
      planId: crypto.randomUUID(), kind: "courier-profit-recovery", title: `Recover courier damage: ${worst.courier}`,
      problem: `${worst.courier} has the highest current economic-damage score. Direct losses and operating costs are separated from overdue COD cash, which is a liquidity risk rather than a profit loss.`,
      evidence: [
        { label: "Delivery rate", value: `${Math.round(worst.deliveryRate * 100)}% (${worst.delivered.length}/${worst.settled.length})` },
        { label: "Direct refusal loss", value: money(worst.refusalLoss) },
        { label: "Failed-delivery costs at risk", value: money(worst.failedCostsAtRisk) },
        { label: "Overdue COD cash", value: money(worst.pendingCash) },
        { label: "Interventions prepared", value: String(tasks.length) },
      ],
      proposedAction: `Create ${tasks.length} exact, order-linked follow-up task${tasks.length === 1 ? "" : "s"} for failed deliveries, refusals, and overdue remittances. No customer message or order status changes automatically.`,
      targets: [], excluded: ranked.slice(1).map((item) => ({ customer: item.courier, reason: `Lower current damage score: ${money(item.damageScore)}` })),
      measurement: "Count targeted orders whose failed delivery is resolved, refused-order review is recorded, or overdue COD cash is received.",
      tasks, preparedAt: now,
    };
  }
  if (wantsBudgetReorder(request)) {
    const budget = requestBudget(request);
    if (!budget) return null;
    const candidates = state.products.filter((product) => !product.discontinued && product.weeklySales > 0 && product.unitCost > 0).map((product) => {
      const available = Math.max(0, product.stock - (state.reserved[product.productId] ?? 0));
      const incoming = state.incoming[product.productId] ?? 0;
      const daysLeft = available / (product.weeklySales / 7);
      const coverDays = Math.max(28, product.leadTimeDays + 14);
      const targetUnits = Math.ceil(product.weeklySales * coverDays / 7);
      const need = Math.max(0, targetUnits - available - incoming);
      const urgency = product.leadTimeDays - daysLeft;
      const unitMargin = Math.max(0, product.price - product.unitCost);
      return { product, available, incoming, daysLeft, need, urgency, unitMargin };
    }).filter((candidate) => candidate.need > 0).sort((a, b) => b.urgency - a.urgency || b.unitMargin - a.unitMargin);
    let remaining = budget;
    const lines: NonNullable<OperatorPlan["purchaseOrder"]>["lines"] = [];
    for (const candidate of candidates) {
      const affordable = Math.floor(remaining / candidate.product.unitCost);
      const qty = Math.min(candidate.need, affordable);
      if (qty <= 0) continue;
      const cost = qty * candidate.product.unitCost;
      lines.push({ productId: candidate.product.productId, productName: candidate.product.name, qty, unitCost: candidate.product.unitCost, evidence: `${Math.round(candidate.daysLeft)} days left · ${candidate.product.leadTimeDays}-day lead · ${candidate.incoming} incoming · ${money(candidate.unitMargin)} unit margin` });
      remaining -= cost;
    }
    if (!lines.length) return null;
    const total = lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
    const expectedAt = now + Math.max(...lines.map((line) => state.products.find((product) => product.productId === line.productId)?.leadTimeDays ?? 7)) * DAY;
    return {
      planId: crypto.randomUUID(), kind: "budget-reorder", title: `Reorder within ${money(budget)}`,
      problem: `${candidates.length} selling product${candidates.length === 1 ? " needs" : "s need"} more coverage. The budget cannot be spent safely without prioritizing stockout urgency and unit economics.`,
      evidence: [
        { label: "Budget", value: money(budget) },
        { label: "Recommended commitment", value: money(total) },
        { label: "Budget left uncommitted", value: money(Math.max(0, budget - total)) },
        { label: "Products funded", value: `${lines.length}/${candidates.length}` },
      ],
      proposedAction: `Create one editable supplier purchase order for ${lines.reduce((sum, line) => sum + line.qty, 0)} units across ${lines.length} product${lines.length === 1 ? "" : "s"}. Nothing changes until approval.`,
      targets: [], excluded: candidates.filter((candidate) => !lines.some((line) => line.productId === candidate.product.productId)).map((candidate) => ({ customer: candidate.product.name, reason: "Outside the available budget after higher-urgency products" })),
      measurement: "After the expected arrival date, check whether every funded product stayed available and whether the ordered stock was received.",
      purchaseOrder: { lines, total, expectedAt }, preparedAt: now,
    };
  }
  if (wantsCod(request)) {
    const pending = state.orders.filter((order) => order.status === "pending").sort((a, b) => a.createdAt - b.createdAt);
    if (!pending.length) return null;
    const targets = pending.map((order) => {
      const items = order.lines.map((line) => `${line.qty}× ${line.productName}`).join(", ");
      const total = money(orderCashDue(order));
      return {
        targetId: order.orderId, orderId: order.orderId, customer: order.customer,
        phone: contacts.get(order.customer)?.phone?.trim() || order.customerPhone?.trim() || undefined,
        body: `Hello ${order.customer}, this is your store. Please confirm your order: ${items}. Total to pay on delivery: ${total}. Reply YES to confirm so we can ship it. Thank you!`,
        evidence: `${items} · COD ${total} · waiting since ${new Date(order.createdAt).toLocaleDateString()}`,
      };
    });
    const reachable = targets.filter((target) => target.phone).length;
    return {
      planId: crypto.randomUUID(), kind: "cod-confirmations", title: `Prepare ${pending.length} COD confirmation${pending.length === 1 ? "" : "s"}`,
      problem: `${pending.length} order${pending.length === 1 ? " is" : "s are"} waiting for customer confirmation, blocking fulfillment and increasing refusal risk.`,
      evidence: [
        { label: "Pending confirmation", value: String(pending.length) },
        { label: "COD value waiting", value: money(pending.reduce((sum, order) => sum + orderCashDue(order), 0)) },
        { label: "Reachable by WhatsApp", value: `${reachable}/${pending.length}` },
      ],
      proposedAction: `Send the prepared order-specific confirmation message to ${reachable} reachable customer${reachable === 1 ? "" : "s"}. Nothing is sent before approval.`,
      targets,
      excluded: targets.filter((target) => !target.phone).map((target) => ({ customer: target.customer, reason: "No phone saved" })),
      measurement: "Count how many targeted orders move from pending to confirmed, shipped, or delivered.", preparedAt: now,
    };
  }

  if (wantsWinback(request)) {
    const profiles = projectCustomerProfiles(state, now);
    const candidates = profiles.filter((profile) => profile.medianGapDays && (now - profile.lastActivityAt) / DAY > profile.medianGapDays);
    const safe = candidates.filter((profile) => !profile.tags.includes("high-refusal") && !state.archivedCustomers.includes(profile.name));
    const excluded = candidates.filter((profile) => profile.tags.includes("high-refusal")).map((profile) => ({ customer: profile.name, reason: "Previous COD refusal risk" }));
    if (!safe.length) return null;
    const targets = safe.slice(0, 20).map((profile) => {
      const days = Math.max(1, Math.round((now - profile.lastActivityAt) / DAY));
      return {
        targetId: profile.name, customer: profile.name, phone: contacts.get(profile.name)?.phone?.trim() || undefined,
        body: `Hello ${profile.name}! It's been about ${days} days since your last order — hope all is well. Anything you need this week? We can prepare your usual order. 🌿`,
        evidence: `${days} days quiet · usual rhythm ~${Math.round(profile.medianGapDays || 0)} days · ${money(profile.lifetimeRevenue)} lifetime`,
      };
    });
    const reachable = targets.filter((target) => target.phone).length;
    return {
      planId: crypto.randomUUID(), kind: "winback-campaign", title: `Win back ${targets.length} quiet customer${targets.length === 1 ? "" : "s"}`,
      problem: `${candidates.length} customer${candidates.length === 1 ? " has" : "s have"} passed their own reorder rhythm. Previous refusers should not receive a promotional nudge.`,
      evidence: [
        { label: "Quiet past own rhythm", value: String(candidates.length) },
        { label: "Previous refusers excluded", value: String(excluded.length) },
        { label: "Reachable safe recipients", value: `${reachable}/${targets.length}` },
      ],
      proposedAction: `Send a personal, low-pressure reorder message to the reachable safe segment. ${excluded.length} previous refuser${excluded.length === 1 ? "" : "s"} remain excluded.`,
      targets, excluded: [...excluded, ...targets.filter((target) => !target.phone).map((target) => ({ customer: target.customer, reason: "No phone saved" }))],
      measurement: "Measure customers who place a new order after the campaign, plus the revenue they generate.", preparedAt: now,
    };
  }
  return null;
}

export function projectOperatorRuns(events: readonly MemoryEvent[]): OperatorRun[] {
  const runs = new Map<string, OperatorRun>();
  for (const event of events) {
    if (event.type === "operator_run_executed") {
      const payload = event.payload as unknown as OperatorRun;
      runs.set(payload.planId, { ...payload });
    }
    if (event.type === "operator_outcome_recorded") {
      const payload = event.payload as unknown as { planId: string; successes: number; total: number; result: OperatorRun["outcome"] extends infer T ? T extends { result: infer R } ? R : never : never; measuredAt: number };
      const run = runs.get(payload.planId);
      if (run) run.outcome = { successes: payload.successes, total: payload.total, result: payload.result, measuredAt: payload.measuredAt };
    }
  }
  return [...runs.values()].sort((a, b) => b.executedAt - a.executedAt);
}

export function measureOperatorRun(run: OperatorRun, state: WorkspaceState): { successes: number; total: number; result: "worked" | "mixed" | "no-result-yet"; detail: string } {
  const total = run.targetIds.length;
  if (run.kind === "budget-reorder") {
    const received = run.targetIds.filter((productId) => state.products.some((product) => product.productId === productId && product.stock > 0) && !(state.incoming[productId] > 0)).length;
    if (run.expectedAt && Date.now() < run.expectedAt) return { successes: 0, total, result: "no-result-yet", detail: `${total} funded product${total === 1 ? "" : "s"} are being monitored until expected arrival.` };
    return { successes: received, total, result: received === 0 ? "no-result-yet" : received === total ? "worked" : "mixed", detail: `${received}/${total} funded products were received and remained available.` };
  }
  if (run.kind === "courier-profit-recovery") {
    const successes = run.targetIds.filter((id) => state.orders.some((order) => order.orderId === id && (Boolean(order.cashReceivedAt) || (order.shipmentStatus !== "delivery_failed" && order.status !== "refused")))).length;
    return { successes, total, result: successes === 0 ? "no-result-yet" : successes === total ? "worked" : "mixed", detail: `${successes}/${total} courier intervention orders are now resolved or remitted.` };
  }
  if (run.kind === "cod-confirmations") {
    const successes = run.targetIds.filter((id) => state.orders.some((order) => order.orderId === id && order.status !== "pending" && order.status !== "cancelled" && order.status !== "refused")).length;
    return { successes, total, result: successes === 0 ? "no-result-yet" : successes === total ? "worked" : "mixed", detail: `${successes}/${total} targeted orders progressed beyond pending confirmation.` };
  }
  const successes = run.customers.filter((customer) => state.orders.some((order) => order.customer === customer && order.createdAt > run.executedAt && order.status !== "cancelled" && order.status !== "refused")).length;
  const revenue = state.orders.filter((order) => run.customers.includes(order.customer) && order.createdAt > run.executedAt && order.status === "delivered").reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.qty * line.unitPrice, 0) - order.discount + order.shippingCharged, 0);
  return { successes, total, result: successes === 0 ? "no-result-yet" : successes === total ? "worked" : "mixed", detail: `${successes}/${total} customers reordered; delivered revenue ${money(revenue)}.` };
}
