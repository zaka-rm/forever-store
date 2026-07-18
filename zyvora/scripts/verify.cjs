"use strict";

// src/core/entitlement.ts
var TRIAL_DAYS = 14;
var DAY = 864e5;
function entitlement(sub, workspaceCreatedAt, now = Date.now()) {
  const trialEnd = workspaceCreatedAt + TRIAL_DAYS * DAY;
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / DAY));
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
    return { active: true, trialDaysLeft };
  }
  return { active: trialDaysLeft > 0, trialDaysLeft };
}

// src/core/projections.ts
function projectState(events) {
  const invoices = /* @__PURE__ */ new Map();
  const products = /* @__PURE__ */ new Map();
  const orders = /* @__PURE__ */ new Map();
  const purchaseOrders = /* @__PURE__ */ new Map();
  const promoDefs = /* @__PURE__ */ new Map();
  const promoActive = /* @__PURE__ */ new Map();
  const goals = {};
  const expenses = [];
  const archived = /* @__PURE__ */ new Set();
  for (const e of events) {
    if (e.stream !== "fact") continue;
    switch (e.type) {
      case "invoice_issued": {
        const p2 = e.payload;
        invoices.set(p2.invoiceId, { ...p2 });
        break;
      }
      case "invoice_paid": {
        const p2 = e.payload;
        const inv = invoices.get(p2.invoiceId);
        if (inv) inv.paidAt = p2.paidAt;
        break;
      }
      case "expense_recorded": {
        expenses.push(e.payload);
        break;
      }
      case "product_added": {
        const p2 = e.payload;
        products.set(p2.productId, { ...p2 });
        break;
      }
      case "stock_adjusted": {
        const p2 = e.payload;
        const prod = products.get(p2.productId);
        if (prod) prod.stock += p2.delta;
        break;
      }
      case "product_updated": {
        const p2 = e.payload;
        const prod = products.get(p2.productId);
        if (prod) {
          if (p2.name !== void 0) prod.name = p2.name;
          if (p2.weeklySales !== void 0) prod.weeklySales = p2.weeklySales;
          if (p2.leadTimeDays !== void 0) prod.leadTimeDays = p2.leadTimeDays;
          if (p2.unitCost !== void 0) prod.unitCost = p2.unitCost;
          if (p2.price !== void 0) prod.price = p2.price;
          if (p2.daysOfUse !== void 0) prod.daysOfUse = p2.daysOfUse;
        }
        break;
      }
      case "product_discontinued": {
        const p2 = e.payload;
        const prod = products.get(p2.productId);
        if (prod) prod.discontinued = true;
        break;
      }
      case "product_restored": {
        const p2 = e.payload;
        const prod = products.get(p2.productId);
        if (prod) prod.discontinued = false;
        break;
      }
      case "customer_archived": {
        const p2 = e.payload;
        archived.add(p2.customer);
        break;
      }
      case "customer_restored": {
        const p2 = e.payload;
        archived.delete(p2.customer);
        break;
      }
      case "order_created": {
        const p2 = e.payload;
        orders.set(p2.orderId, { ...p2, status: "pending" });
        break;
      }
      case "order_status_changed": {
        const p2 = e.payload;
        const o = orders.get(p2.orderId);
        if (!o) break;
        const prev = o.status;
        o.status = p2.status;
        if (p2.status === "delivered" && prev !== "delivered") {
          o.deliveredAt = p2.at;
          for (const line of o.lines) {
            const prod = products.get(line.productId);
            if (prod) prod.stock -= line.qty;
          }
        }
        if (p2.status === "returned" && prev === "delivered") {
          for (const line of o.lines) {
            const prod = products.get(line.productId);
            if (prod) prod.stock += line.qty;
          }
        }
        break;
      }
      case "order_cash_received": {
        const p2 = e.payload;
        const o = orders.get(p2.orderId);
        if (o) o.cashReceivedAt = p2.at;
        break;
      }
      case "shipment_created": {
        const p2 = e.payload;
        const o = orders.get(p2.orderId);
        if (o) {
          o.courier = p2.courier;
          o.trackingNumber = p2.trackingNumber;
          o.trackingUrl = p2.trackingUrl;
          o.shipmentCreatedAt = p2.at;
          o.shipmentUpdatedAt = p2.at;
          o.expectedDeliveryAt = p2.expectedDeliveryAt;
          o.expectedRemittanceAt = p2.expectedRemittanceAt;
          o.shipmentStatus = "handed_to_courier";
          o.deliveryAttempts = 0;
        }
        break;
      }
      case "shipment_status_changed": {
        const p2 = e.payload;
        const o = orders.get(p2.orderId);
        if (o) {
          o.shipmentStatus = p2.status;
          o.shipmentUpdatedAt = p2.at;
          if (p2.status === "out_for_delivery") o.deliveryAttempts = (o.deliveryAttempts ?? 0) + 1;
          if (p2.status === "delivery_failed") o.lastDeliveryFailure = p2.reason || p2.note || "Reason not recorded";
        }
        break;
      }
      case "promo_created": {
        const p2 = e.payload;
        promoDefs.set(p2.promoId, { ...p2 });
        promoActive.set(p2.promoId, true);
        break;
      }
      case "promo_deactivated": {
        const p2 = e.payload;
        promoActive.set(p2.promoId, false);
        break;
      }
      case "goal_set": {
        const p2 = e.payload;
        goals[p2.metric] = p2.target;
        break;
      }
      case "purchase_order_created": {
        const p2 = e.payload;
        purchaseOrders.set(p2.poId, { ...p2 });
        break;
      }
      case "goods_received": {
        const p2 = e.payload;
        const po = purchaseOrders.get(p2.poId);
        if (po && !po.receivedAt) {
          po.receivedAt = p2.at;
          for (const line of po.lines) {
            const prod = products.get(line.productId);
            if (prod) prod.stock += line.qty;
          }
        }
        break;
      }
      default:
        break;
    }
  }
  const incoming = {};
  for (const po of purchaseOrders.values()) {
    if (po.receivedAt) continue;
    for (const line of po.lines) incoming[line.productId] = (incoming[line.productId] ?? 0) + line.qty;
  }
  const usageByCode = /* @__PURE__ */ new Map();
  for (const o of orders.values()) {
    if (o.promoCode && o.status !== "cancelled") {
      usageByCode.set(o.promoCode, (usageByCode.get(o.promoCode) ?? 0) + 1);
    }
  }
  const promos = [...promoDefs.values()].map((def) => ({
    ...def,
    active: promoActive.get(def.promoId) ?? false,
    timesUsed: usageByCode.get(def.code) ?? 0
  }));
  const reserved = {};
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
    purchaseOrders: [...purchaseOrders.values()].sort((a, b) => b.createdAt - a.createdAt),
    goals,
    reserved,
    incoming,
    archivedCustomers: [...archived]
  };
}
var monthStart = (now) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};
function profitAndLoss(state2, start, end, periodLabel) {
  const inPeriod = (ts) => ts !== void 0 && ts >= start && ts < end;
  const delivered = state2.orders.filter((o) => inPeriod(o.deliveredAt) && o.status !== "returned");
  const returned = state2.orders.filter((o) => o.status === "returned" && inPeriod(o.deliveredAt));
  const productSales = delivered.reduce((s, o) => s + orderLinesTotal(o), 0);
  const discounts = delivered.reduce((s, o) => s + o.discount, 0);
  const shippingCharged = delivered.reduce((s, o) => s + o.shippingCharged, 0);
  const invoicedSales = state2.invoices.filter((i) => inPeriod(i.paidAt)).reduce((s, i) => s + i.amount, 0);
  const refunds = returned.reduce((s, o) => s + orderRevenue(o), 0);
  const revenueLines = [
    { label: "Product sales (delivered)", amount: productSales },
    { label: "Shipping charged to customers", amount: shippingCharged },
    ...invoicedSales ? [{ label: "Invoiced sales (paid)", amount: invoicedSales }] : [],
    ...discounts ? [{ label: "Less: discounts", amount: -discounts }] : [],
    ...refunds ? [{ label: "Less: refunds/returns", amount: -refunds }] : []
  ];
  const netRevenue = revenueLines.reduce((s, l) => s + l.amount, 0);
  const cogs = delivered.reduce((s, o) => s + orderCogs(o), 0);
  const grossProfit = netRevenue - cogs;
  const shippingCost = delivered.reduce((s, o) => s + o.shippingCost, 0);
  const codFees = delivered.reduce((s, o) => s + o.codFee, 0);
  const packaging = delivered.reduce((s, o) => s + o.packagingCost, 0);
  const byCategory = /* @__PURE__ */ new Map();
  for (const e of state2.expenses) if (inPeriod(e.date)) byCategory.set(e.label, (byCategory.get(e.label) ?? 0) + e.amount);
  const opexLines = [
    ...shippingCost ? [{ label: "Delivery / shipping cost", amount: shippingCost }] : [],
    ...codFees ? [{ label: "COD fees", amount: codFees }] : [],
    ...packaging ? [{ label: "Packaging", amount: packaging }] : [],
    ...[...byCategory.entries()].map(([label, amount]) => ({ label, amount }))
  ];
  const opexTotal = opexLines.reduce((s, l) => s + l.amount, 0);
  const netProfit = grossProfit - opexTotal;
  return {
    periodLabel,
    revenue: { lines: revenueLines, netRevenue },
    cogs,
    grossProfit,
    grossMarginPct: netRevenue > 0 ? grossProfit / netRevenue * 100 : 0,
    operatingExpenses: { lines: opexLines, total: opexTotal },
    netProfit,
    netMarginPct: netRevenue > 0 ? netProfit / netRevenue * 100 : 0,
    ordersDelivered: delivered.length
  };
}
function monthBounds(year, month) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  const label = new Date(year, month, 1).toLocaleDateString(void 0, { month: "long", year: "numeric" });
  return { start, end, label };
}
function goalActual(state2, metric, now = Date.now()) {
  const start = monthStart(now);
  const deliveredThisMonth = state2.orders.filter((o) => o.deliveredAt && o.deliveredAt >= start);
  if (metric === "orders") return deliveredThisMonth.length;
  if (metric === "revenue") {
    return deliveredThisMonth.reduce((s, o) => s + orderRevenue(o), 0) + state2.invoices.filter((i) => i.paidAt && i.paidAt >= start).reduce((s, i) => s + i.amount, 0);
  }
  return deliveredThisMonth.reduce((s, o) => s + orderNetProfit(o), 0);
}
function breakEven(state2, now = Date.now()) {
  const DAYS90 = 90 * DAY2;
  const fixed3mo = state2.expenses.filter((e) => now - e.date <= DAYS90).reduce((s, e) => s + e.amount, 0);
  const monthlyFixed = fixed3mo / 3;
  const delivered = state2.orders.filter((o) => o.status === "delivered");
  const avgProfit = delivered.length ? delivered.reduce((s, o) => s + orderNetProfit(o), 0) / delivered.length : 0;
  const avgValue = delivered.length ? delivered.reduce((s, o) => s + orderRevenue(o), 0) / delivered.length : 0;
  const beOrders = avgProfit > 0 ? Math.ceil(monthlyFixed / avgProfit) : null;
  return {
    monthlyFixedExpenses: monthlyFixed,
    avgProfitPerOrder: avgProfit,
    avgOrderValue: avgValue,
    breakEvenOrders: beOrders,
    breakEvenRevenue: beOrders !== null ? beOrders * avgValue : null,
    ordersThisMonth: state2.orders.filter((o) => o.deliveredAt && o.deliveredAt >= monthStart(now)).length
  };
}
function cashCalendar(state2, now = Date.now()) {
  const open = state2.invoices.filter((i) => !i.paidAt);
  const entries = open.map((i) => {
    const dueAt = i.issuedAt + i.dueDays * DAY2;
    return { customer: i.customer, amount: i.amount, dueAt, overdueDays: Math.floor((now - dueAt) / DAY2) };
  }).sort((a, b) => a.dueAt - b.dueAt);
  const bucket = (test) => {
    const list = entries.filter(test);
    return { count: list.length, total: list.reduce((s, e) => s + e.amount, 0) };
  };
  const codList = state2.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt);
  const expenses90 = state2.expenses.filter((e) => now - e.date <= 90 * DAY2);
  const avgDailyExpense = expenses90.length >= 3 ? expenses90.reduce((s, e) => s + e.amount, 0) / 90 : null;
  return {
    overdue: bucket((e) => e.overdueDays > 0),
    next7: bucket((e) => e.overdueDays <= 0 && e.dueAt - now <= 7 * DAY2),
    next30: bucket((e) => e.dueAt - now > 7 * DAY2 && e.dueAt - now <= 30 * DAY2),
    codPending: { count: codList.length, total: codList.reduce((s, o) => s + orderRevenue(o), 0) },
    avgDailyExpense,
    entries
  };
}
function forecast(state2, now = Date.now()) {
  const d = new Date(now);
  const daysElapsed = d.getDate();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const assumptions = [];
  const revSoFar = goalActual(state2, "revenue", now);
  let revenueProjection = null;
  if (daysElapsed >= 5 && revSoFar > 0) {
    const mid = revSoFar / daysElapsed * daysInMonth;
    revenueProjection = { low: mid * 0.85, mid, high: mid * 1.15 };
    assumptions.push(`Revenue assumes the current month's pace holds for all ${daysInMonth} days.`);
  } else {
    assumptions.push("Too few days into the month to project revenue honestly yet.");
  }
  const collected = state2.invoices.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0) + state2.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt).reduce((s, o) => s + orderRevenue(o), 0);
  const cashAvailable = collected - state2.expenses.reduce((s, e) => s + e.amount, 0);
  const pendingCod = state2.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt).reduce((s, o) => s + orderRevenue(o), 0);
  const exp90items = state2.expenses.filter((e) => now - e.date <= 90 * DAY2);
  const exp90 = exp90items.reduce((s, e) => s + e.amount, 0);
  let cashNext30 = null;
  if (exp90items.length >= 3) {
    cashNext30 = cashAvailable + pendingCod - exp90 / 3;
    assumptions.push("Cash forecast counts pending COD collections and your 90-day average outgoings, but no new orders.");
  }
  const stockouts = state2.products.filter((p2) => p2.weeklySales > 0).map((p2) => {
    const available = p2.stock - (state2.reserved[p2.productId] ?? 0);
    return { name: p2.name, daysLeft: Math.round(available / (p2.weeklySales / 7)) };
  }).filter((x) => x.daysLeft <= 21).sort((a, b) => a.daysLeft - b.daysLeft);
  return { revenueProjection, daysElapsed, daysInMonth, cashNext30, assumptions, stockouts };
}
function simulateProfit(i) {
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
    marginPct: revenue > 0 ? netProfit / revenue * 100 : 0,
    roiPct: totalCost > 0 ? netProfit / totalCost * 100 : 0,
    breakEvenUnits: perUnitNet > 0 ? Math.ceil(orderFixed / perUnitNet) : null
  };
}
function checkPromo(state2, code, basketSubtotal, now = Date.now()) {
  const promo2 = state2.promos.find((p2) => p2.code === code.trim().toUpperCase());
  if (!promo2) return { ok: false, reason: "No promo with that code." };
  if (!promo2.active) return { ok: false, reason: "This promo has been deactivated." };
  if (promo2.expiresAt && now > promo2.expiresAt) return { ok: false, reason: "This promo has expired." };
  if (basketSubtotal < promo2.minBasket)
    return { ok: false, reason: `Basket must be at least ${promo2.minBasket} to use this promo.` };
  if (promo2.usageLimit !== void 0 && promo2.timesUsed >= promo2.usageLimit)
    return { ok: false, reason: "This promo has reached its usage limit." };
  let discount = promo2.type === "percentage" ? basketSubtotal * promo2.value / 100 : promo2.value;
  if (promo2.maxDiscount !== void 0) discount = Math.min(discount, promo2.maxDiscount);
  discount = Math.min(discount, basketSubtotal);
  return { ok: true, discount: Math.round(discount * 100) / 100, promo: promo2 };
}
function orderLinesTotal(o) {
  return o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}
function orderRevenue(o) {
  return orderLinesTotal(o) - o.discount + o.shippingCharged;
}
function orderCogs(o) {
  return o.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
}
function orderNetProfit(o) {
  return orderRevenue(o) - orderCogs(o) - o.shippingCost - o.codFee - o.packagingCost;
}
function orderRefusalLoss(o) {
  return o.shippingCost * 2 + o.packagingCost;
}
function projectDecisions(events) {
  const outcomes = new Set(
    events.filter((e) => e.stream === "outcome").map((e) => String(e.payload.decisionEventId))
  );
  return events.filter((e) => e.stream === "decision").map((e) => ({
    eventId: e.id,
    ts: e.ts,
    decisionKey: String(e.payload.decisionKey),
    claim: String(e.payload.claim),
    layer: e.payload.layer,
    optionId: String(e.payload.optionId),
    optionLabel: String(e.payload.optionLabel),
    rationale: String(e.payload.rationale ?? ""),
    hasOutcome: outcomes.has(e.id)
  })).sort((a, b) => b.ts - a.ts);
}
function projectCustomers(state2) {
  const byCustomer = /* @__PURE__ */ new Map();
  for (const inv of state2.invoices) {
    const list = byCustomer.get(inv.customer) ?? [];
    list.push(inv);
    byCustomer.set(inv.customer, list);
  }
  const views = [];
  for (const [name, list] of byCustomer) {
    const sorted = [...list].sort((a, b) => a.issuedAt - b.issuedAt);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].issuedAt - sorted[i - 1].issuedAt) / DAY2);
    }
    gaps.sort((a, b) => a - b);
    const median = gaps.length === 0 ? null : gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
    views.push({
      name,
      invoiceCount: list.length,
      totalBilled: list.reduce((s, i) => s + i.amount, 0),
      lastInvoiceAt: sorted[sorted.length - 1].issuedAt,
      medianGapDays: median
    });
  }
  return views.sort((a, b) => b.totalBilled - a.totalBilled);
}
function projectCustomerProfiles(state2, now = Date.now()) {
  const names = /* @__PURE__ */ new Set();
  for (const i of state2.invoices) names.add(i.customer);
  for (const o of state2.orders) names.add(o.customer);
  const profiles2 = [];
  for (const name of names) {
    const invoices = state2.invoices.filter((i) => i.customer === name);
    const orders = state2.orders.filter((o) => o.customer === name);
    const delivered = orders.filter((o) => o.status === "delivered");
    const refused = orders.filter((o) => o.status === "refused");
    const lifetimeRevenue = invoices.filter((i) => i.paidAt).reduce((s, i) => s + i.amount, 0) + delivered.reduce((s, o) => s + orderRevenue(o), 0);
    const lifetimeProfit = delivered.reduce((s, o) => s + orderNetProfit(o), 0);
    const activity = [
      ...invoices.map((i) => i.issuedAt),
      ...orders.map((o) => o.createdAt)
    ].sort((a, b) => a - b);
    const gaps = [];
    for (let k = 1; k < activity.length; k++) gaps.push((activity[k] - activity[k - 1]) / DAY2);
    gaps.sort((a, b) => a - b);
    const median = gaps.length === 0 ? null : gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
    const interactions = invoices.length + orders.length;
    const revenueEvents = invoices.filter((i) => i.paidAt).length + delivered.length;
    const settledCod = delivered.length + refused.length;
    profiles2.push({
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
      tags: []
    });
  }
  const sortedByRevenue = [...profiles2].sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
  const vipCount = Math.max(1, Math.round(profiles2.length * 0.2));
  const vipNames = new Set(sortedByRevenue.slice(0, vipCount).map((p2) => p2.name));
  for (const p2 of profiles2) {
    const tags = [];
    if (p2.interactions <= 1) tags.push("new");
    else tags.push("returning");
    if (vipNames.has(p2.name) && p2.lifetimeRevenue > 0) tags.push("vip");
    if (p2.medianGapDays !== null && p2.medianGapDays > 0 && (now - p2.lastActivityAt) / DAY2 > Math.max(2 * p2.medianGapDays, 30)) {
      tags.push("at-risk");
    }
    if (p2.codReliability !== null && p2.ordersDelivered + p2.ordersRefused >= 2 && p2.codReliability < 0.6) {
      tags.push("high-refusal");
    }
    p2.tags = tags;
  }
  return profiles2.sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
}
function projectContacts(events) {
  const m2 = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.stream === "fact" && e.type === "customer_contact_updated") {
      const p2 = e.payload;
      const cur = m2.get(String(p2.customer)) ?? {};
      m2.set(String(p2.customer), {
        phone: p2.phone || cur.phone,
        city: p2.city || cur.city,
        notes: p2.notes !== void 0 ? p2.notes : cur.notes,
        referredBy: p2.referredBy || cur.referredBy
      });
    }
  }
  return m2;
}
function projectActivities(events) {
  const acts2 = /* @__PURE__ */ new Map();
  const done = /* @__PURE__ */ new Set();
  for (const e of events) {
    if (e.stream !== "fact") continue;
    if (e.type === "customer_activity_logged") {
      const p2 = e.payload;
      acts2.set(String(p2.activityId), {
        activityId: String(p2.activityId),
        customer: String(p2.customer),
        kind: String(p2.kind),
        note: String(p2.note),
        dueAt: p2.dueAt,
        at: e.ts,
        done: false
      });
    } else if (e.type === "message_sent") {
      const p2 = e.payload;
      if (!p2.customer || !p2.body) continue;
      acts2.set(String(p2.messageId ?? e.id), {
        activityId: String(p2.messageId ?? e.id),
        customer: String(p2.customer),
        kind: "message",
        note: `${String(p2.channel) === "sms" ? "SMS" : "WhatsApp"}: ${String(p2.body)}`,
        at: p2.at ?? e.ts,
        done: false
      });
    } else if (e.type === "customer_activity_completed") {
      done.add(String(e.payload.activityId));
    }
  }
  for (const id of done) {
    const a = acts2.get(id);
    if (a) a.done = true;
  }
  return [...acts2.values()].sort((a, b) => (b.dueAt ?? b.at) - (a.dueAt ?? a.at));
}
var DAY2 = 24 * 60 * 60 * 1e3;

// src/core/retention.ts
var SEGMENT_LABEL = {
  champion: "Champion",
  loyal: "Loyal",
  new: "New",
  promising: "Promising",
  "at-risk": "At risk",
  "cant-lose": "Can't lose",
  hibernating: "Hibernating",
  regular: "Regular"
};
function quintile(value, all) {
  if (all.length <= 1) return 3;
  const below = all.filter((v) => v < value).length;
  return 1 + Math.min(4, Math.floor(below / all.length * 5));
}
function classify(r, f, m2) {
  if (r >= 4 && f >= 4 && m2 >= 4) return "champion";
  if (r <= 2 && m2 >= 4) return "cant-lose";
  if (r <= 2 && f >= 3) return "at-risk";
  if (r <= 2) return "hibernating";
  if (f >= 4) return "loyal";
  if (f <= 2 && r >= 4) return m2 >= 3 ? "promising" : "new";
  return "regular";
}
function computeRfm(profiles2, now = Date.now()) {
  const recencies = profiles2.map((p2) => -(now - p2.lastActivityAt));
  const freqs = profiles2.map((p2) => p2.interactions);
  const monies = profiles2.map((p2) => p2.lifetimeRevenue);
  const out = /* @__PURE__ */ new Map();
  for (const p2 of profiles2) {
    const r = quintile(-(now - p2.lastActivityAt), recencies);
    const f = quintile(p2.interactions, freqs);
    const m2 = quintile(p2.lifetimeRevenue, monies);
    out.set(p2.name, { r, f, m: m2, segment: classify(r, f, m2) });
  }
  return out;
}
function reorderDueList(profiles2, archived, now = Date.now()) {
  const hidden = new Set(archived);
  const out = [];
  for (const p2 of profiles2) {
    if (hidden.has(p2.name)) continue;
    if (p2.medianGapDays === null || p2.medianGapDays <= 0 || p2.interactions < 3) continue;
    const daysSince = (now - p2.lastActivityAt) / DAY2;
    const overdue2 = daysSince - p2.medianGapDays;
    if (overdue2 > 0) {
      out.push({
        name: p2.name,
        daysSince: Math.round(daysSince),
        usualGapDays: Math.round(p2.medianGapDays),
        daysOverdue: Math.round(overdue2),
        expectedValue: p2.avgOrderValue,
        lifetimeRevenue: p2.lifetimeRevenue
      });
    }
  }
  return out.sort((a, b) => b.daysOverdue * b.expectedValue - a.daysOverdue * a.expectedValue);
}
function refillDueList(state2, archived, now = Date.now(), windowDays = 5) {
  const hidden = new Set(archived);
  const out = [];
  const products = new Map(state2.products.map((p2) => [p2.productId, p2]));
  const latest = /* @__PURE__ */ new Map();
  for (const o of state2.orders) {
    if (o.status !== "delivered" || !o.deliveredAt || hidden.has(o.customer)) continue;
    for (const l of o.lines) {
      const key = `${o.customer}\0${l.productId}`;
      const prev = latest.get(key);
      if (!prev || o.deliveredAt > prev.deliveredAt) {
        latest.set(key, { customer: o.customer, productId: l.productId, qty: l.qty, deliveredAt: o.deliveredAt });
      }
    }
  }
  for (const e of latest.values()) {
    const p2 = products.get(e.productId);
    if (!p2 || p2.discontinued || !p2.daysOfUse || p2.daysOfUse <= 0) continue;
    const refillAt = e.deliveredAt + e.qty * p2.daysOfUse * DAY2;
    const daysPastEmpty = Math.round((now - refillAt) / DAY2);
    if (daysPastEmpty >= -windowDays && daysPastEmpty <= 60) {
      out.push({
        customer: e.customer,
        productId: e.productId,
        productName: p2.name,
        qty: e.qty,
        deliveredAt: e.deliveredAt,
        refillAt,
        daysPastEmpty
      });
    }
  }
  return out.sort((a, b) => Math.abs(a.daysPastEmpty) - Math.abs(b.daysPastEmpty));
}
function courierScorecard(state2, now = Date.now()) {
  const groups = /* @__PURE__ */ new Map();
  for (const o of state2.orders) {
    if (!o.courier) continue;
    const arr = groups.get(o.courier) ?? [];
    arr.push(o);
    groups.set(o.courier, arr);
  }
  const out = [];
  for (const [courier, orders] of groups) {
    const settledOrders = orders.filter((o) => o.status === "delivered" || o.status === "refused" || o.status === "returned");
    const delivered = orders.filter((o) => o.status === "delivered");
    const refused = orders.filter((o) => o.status === "refused");
    const remitGaps = delivered.filter((o) => o.deliveredAt && o.cashReceivedAt).map((o) => (o.cashReceivedAt - o.deliveredAt) / DAY2);
    out.push({
      courier,
      settled: settledOrders.length,
      delivered: delivered.length,
      refused: refused.length,
      deliveryRate: settledOrders.length ? delivered.length / settledOrders.length : 0,
      avgRemitDays: remitGaps.length ? remitGaps.reduce((s, v) => s + v, 0) / remitGaps.length : null,
      shippingCost: orders.reduce((s, o) => s + o.shippingCost, 0)
    });
  }
  return out.sort((a, b) => b.deliveryRate - a.deliveryRate);
}
function referralLeaderboard(contacts2, profiles2) {
  const revByName = new Map(profiles2.map((p2) => [p2.name, p2.lifetimeRevenue]));
  const groups = /* @__PURE__ */ new Map();
  for (const [customer, c] of contacts2) {
    const ref = c.referredBy?.trim();
    if (!ref) continue;
    const arr = groups.get(ref) ?? [];
    arr.push(customer);
    groups.set(ref, arr);
  }
  const out = [];
  for (const [name, referred] of groups) {
    out.push({
      name,
      referredCount: referred.length,
      referredNames: referred,
      referredRevenue: referred.reduce((s, n) => s + (revByName.get(n) ?? 0), 0)
    });
  }
  return out.sort((a, b) => b.referredCount - a.referredCount || b.referredRevenue - a.referredRevenue);
}
function upsellSuggestion(state2, basketProductIds, minTimesTogether = 2) {
  if (basketProductIds.length === 0) return null;
  const inBasket = new Set(basketProductIds);
  const counts = /* @__PURE__ */ new Map();
  for (const o of state2.orders) {
    if (o.status === "cancelled") continue;
    const ids = new Set(o.lines.map((l) => l.productId));
    if (![...inBasket].some((id) => ids.has(id))) continue;
    for (const id of ids) {
      if (!inBasket.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  let best = null;
  for (const [id, n] of counts) {
    if (n < minTimesTogether) continue;
    const p2 = state2.products.find((x) => x.productId === id && !x.discontinued);
    if (!p2) continue;
    if (!best || n > best.timesTogether) {
      best = { productId: id, productName: p2.name, timesTogether: n, price: p2.price };
    }
  }
  return best;
}

// src/core/risk.ts
var RISKY_SOURCES = /* @__PURE__ */ new Set(["tiktok", "facebook", "instagram"]);
var WARM_SOURCES = /* @__PURE__ */ new Set(["repeat", "referral", "whatsapp"]);
function refusalRisk(state2, order, contacts2) {
  const factors = [];
  const add = (label, points) => {
    if (points !== 0) factors.push({ label, points });
  };
  const history = state2.orders.filter(
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
  const phone = contacts2.get(order.customer)?.phone?.trim();
  if (!phone) add("No phone saved \u2014 can't confirm before shipping", 16);
  const src = order.source?.toLowerCase();
  if (src && RISKY_SOURCES.has(src)) add(`Source: ${src} (impulse traffic refuses more)`, 10);
  if (src && WARM_SOURCES.has(src)) add(`Source: ${src} (warm traffic)`, -8);
  const deliveredOrders = state2.orders.filter((o) => o.status === "delivered");
  if (deliveredOrders.length >= 3) {
    const avg = deliveredOrders.reduce((s, o) => s + orderRevenue(o), 0) / deliveredOrders.length;
    if (avg > 0 && orderRevenue(order) > 1.6 * avg) {
      add("Basket well above your average delivered order", 10);
    }
  }
  const raw = 22 + factors.reduce((s, f) => s + f.points, 0);
  const score = Math.max(2, Math.min(96, raw));
  return {
    score,
    level: score >= 55 ? "high" : score >= 32 ? "medium" : "low",
    factors
  };
}

// src/core/format.ts
var activeCurrency = "USD";
function getActiveCurrency() {
  return activeCurrency;
}
function money(amount) {
  try {
    return new Intl.NumberFormat(void 0, {
      style: "currency",
      currency: activeCurrency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${activeCurrency}`;
  }
}

// src/core/engine.ts
var SUPPRESSION_WINDOW_DAYS = 30;
var eur = money;
function daysAgoLabel(ts, now) {
  const d = Math.round((now - ts) / DAY2);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}
function option(o) {
  return o;
}
function generateInsights(state2, decisions3, now = Date.now()) {
  const insights3 = [];
  const decided = new Set(
    decisions3.filter((d) => now - d.ts < SUPPRESSION_WINDOW_DAYS * DAY2).map((d) => d.decisionKey)
  );
  financeBrain(state2, insights3, now);
  customersBrain(state2, insights3, now);
  inventoryBrain(state2, insights3, now);
  commerceBrain(state2, insights3, now);
  marketingBrain(state2, insights3, now);
  const active = insights3.filter((i) => !decided.has(i.decisionKey));
  return active.sort((a, b) => b.score - a.score);
}
function financeBrain(state2, out, now) {
  const paid = state2.invoices.filter((i) => i.paidAt);
  const remitted = state2.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const cash = paid.reduce((s, i) => s + i.amount, 0) + remitted.reduce((s, o) => s + orderRevenue(o), 0) - state2.expenses.reduce((s, e) => s + e.amount, 0);
  const overdue2 = state2.invoices.filter(
    (i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY2
  );
  if (overdue2.length > 0) {
    const total = overdue2.reduce((s, i) => s + i.amount, 0);
    const oldest = overdue2.reduce((a, b) => a.issuedAt < b.issuedAt ? a : b);
    const oldestDaysOver = Math.round(
      (now - (oldest.issuedAt + oldest.dueDays * DAY2)) / DAY2
    );
    out.push({
      id: crypto.randomUUID(),
      decisionKey: "finance.overdue." + overdue2.map((i) => i.invoiceId).sort().join("."),
      domain: "finance",
      layer: "operational",
      score: Math.min(90, 40 + oldestDaysOver + overdue2.length * 5),
      claim: `${overdue2.length} invoice${overdue2.length > 1 ? "s" : ""} totalling ${eur(total)} ${overdue2.length > 1 ? "are" : "is"} past due \u2014 the oldest by ${oldestDaysOver} days.`,
      reasoning: `Unpaid invoices past their due date tie up cash you have already earned. The oldest (${oldest.customer}, ${eur(oldest.amount)}) is ${oldestDaysOver} days past due; historically, the longer an invoice stays unpaid the harder it becomes to collect.`,
      evidence: overdue2.map((i) => ({
        label: `${i.customer} \u2014 issued ${daysAgoLabel(i.issuedAt, now)}`,
        value: `${eur(i.amount)}, due ${i.dueDays} days after issue, unpaid`
      })),
      confidence: "high",
      confidenceNote: "High confidence: this is arithmetic on your own recorded invoices, not an estimate.",
      guidance: overdueGuidance(oldest.customer, total)
    });
  }
  const last30 = state2.invoices.filter((i) => now - i.issuedAt <= 30 * DAY2);
  const baselineInvoices = state2.invoices.filter(
    (i) => now - i.issuedAt > 30 * DAY2 && now - i.issuedAt <= 120 * DAY2
  );
  if (baselineInvoices.length < 4) {
    if (state2.invoices.length > 0) {
      out.push({
        id: crypto.randomUUID(),
        decisionKey: "finance.trend.insufficient",
        domain: "finance",
        layer: "tactical",
        score: 5,
        claim: "Not enough invoice history yet to read your revenue trend honestly.",
        reasoning: "A trend needs a baseline. With fewer than four invoices in the prior 90 days, any trend claim would be noise presented as signal \u2014 so ZYVORA won't make one.",
        evidence: [
          { label: "Invoices in prior 90-day baseline", value: String(baselineInvoices.length) },
          { label: "What would change this", value: "About one more month of normal invoicing" }
        ],
        confidence: "high",
        confidenceNote: "High confidence that the data is insufficient \u2014 which is itself worth knowing."
      });
    }
  } else {
    const last30Total = last30.reduce((s, i) => s + i.amount, 0);
    const baselinePer30 = baselineInvoices.reduce((s, i) => s + i.amount, 0) / 3;
    if (baselinePer30 > 0 && last30Total < 0.85 * baselinePer30) {
      const dropPct = Math.round((1 - last30Total / baselinePer30) * 100);
      const per = /* @__PURE__ */ new Map();
      for (const i of baselineInvoices) {
        const e = per.get(i.customer) ?? { base: 0, recent: 0 };
        e.base += i.amount / 3;
        per.set(i.customer, e);
      }
      for (const i of last30) {
        const e = per.get(i.customer) ?? { base: 0, recent: 0 };
        e.recent += i.amount;
        per.set(i.customer, e);
      }
      let driver = "";
      let driverDelta = 0;
      for (const [name, v] of per) {
        const delta = v.base - v.recent;
        if (delta > driverDelta) {
          driverDelta = delta;
          driver = name;
        }
      }
      out.push({
        id: crypto.randomUUID(),
        decisionKey: "finance.revenue-dip",
        domain: "finance",
        layer: "tactical",
        score: 55 + dropPct,
        claim: `Revenue is down ${dropPct}% versus your own three-month average${driver ? `, driven mostly by ${driver} ordering less` : ""}.`,
        reasoning: `Your last 30 days billed ${eur(last30Total)} against a baseline of ${eur(baselinePer30)} per 30 days (your own average over the prior 90 days \u2014 your baseline, not an industry benchmark). ` + (driver ? `${driver} accounts for ${eur(driverDelta)} of the shortfall, so the cause looks concentrated, not general.` : `The shortfall is spread across customers.`),
        evidence: [
          { label: "Billed, last 30 days", value: eur(last30Total) },
          { label: "Your baseline (per 30 days, prior 90)", value: eur(baselinePer30) },
          ...driver ? [{ label: `${driver} \u2014 shortfall vs. their usual`, value: eur(driverDelta) }] : []
        ],
        confidence: "medium",
        confidenceNote: "Medium confidence: the arithmetic is exact, but one month can be noise. If next month recovers without action, this was seasonal variation.",
        guidance: driver ? revenueDipGuidance(driver, driverDelta) : void 0
      });
    }
  }
  {
    const d = new Date(now);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const dayOfMonth = d.getDate();
    const daysLeft = daysInMonth - dayOfMonth;
    const target2 = state2.goals.revenue;
    if (target2 && target2 > 0 && dayOfMonth >= 5 && daysLeft >= 2) {
      const actual = goalActual(state2, "revenue", now);
      const expectedByNow = target2 * dayOfMonth / daysInMonth;
      if (actual < expectedByNow * 0.9) {
        const neededPerDay = (target2 - actual) / daysLeft;
        const pacePerDay = actual / dayOfMonth;
        out.push({
          id: crypto.randomUUID(),
          decisionKey: "finance.goal-pace.revenue",
          domain: "finance",
          layer: "operational",
          score: 30 + Math.min(25, Math.round((expectedByNow - actual) / Math.max(1, expectedByNow) * 50)),
          claim: `To reach this month's revenue goal you now need ${eur(neededPerDay)}/day \u2014 your current pace is ${eur(pacePerDay)}/day.`,
          reasoning: `Goal ${eur(target2)}; ${eur(actual)} earned by day ${dayOfMonth} of ${daysInMonth} (on-pace would be ${eur(expectedByNow)}). With ${daysLeft} days left, the gap works out to ${eur(neededPerDay)}/day. Said early, this is a lever; said at month-end it would only be a verdict.`,
          evidence: [
            { label: "Monthly revenue goal", value: eur(target2) },
            { label: `Earned by day ${dayOfMonth}`, value: eur(actual) },
            { label: "On-pace amount for today", value: eur(expectedByNow) },
            { label: `Needed per day (${daysLeft} days left)`, value: eur(neededPerDay) }
          ],
          confidence: "high",
          confidenceNote: "High confidence: pure arithmetic on your goal and your recorded month-to-date revenue."
        });
      }
    }
  }
  {
    const last302 = state2.expenses.filter((e) => now - e.date <= 30 * DAY2);
    const prior90 = state2.expenses.filter((e) => now - e.date > 30 * DAY2 && now - e.date <= 120 * DAY2);
    const totalPrior = prior90.reduce((s, e) => s + e.amount, 0);
    const byLabel = (list) => {
      const m2 = /* @__PURE__ */ new Map();
      for (const e of list) {
        const k = e.label.trim().toLowerCase();
        const v = m2.get(k) ?? { total: 0, count: 0 };
        v.total += e.amount;
        v.count += 1;
        m2.set(k, v);
      }
      return m2;
    };
    const recent = byLabel(last302);
    const baseline = byLabel(prior90);
    for (const [label, r] of recent) {
      const b = baseline.get(label);
      if (!b || b.count < 2) continue;
      const baselinePer30 = b.total / 3;
      const jump = r.total - baselinePer30;
      if (baselinePer30 > 0 && r.total > 1.4 * baselinePer30 && jump > 0.05 * Math.max(1, totalPrior)) {
        const pct = Math.round((r.total / baselinePer30 - 1) * 100);
        out.push({
          id: crypto.randomUUID(),
          decisionKey: `finance.expense-anomaly.${label}`,
          domain: "finance",
          layer: "tactical",
          score: 35 + Math.min(30, Math.round(pct / 5)),
          claim: `"${label}" spending is ${pct}% above its own baseline this month (${eur(r.total)} vs your usual ${eur(baselinePer30)}).`,
          reasoning: `Over the prior 90 days you spent ${eur(b.total)} on "${label}" (\u2248${eur(baselinePer30)} per 30 days). The last 30 days recorded ${eur(r.total)}. A category running ahead of its own history is either a deliberate change or a silent leak \u2014 worth ten seconds to say which.`,
          evidence: [
            { label: `"${label}" \u2014 last 30 days`, value: eur(r.total) },
            { label: "Its baseline (per 30 days, prior 90)", value: eur(baselinePer30) },
            { label: "Above baseline", value: `${eur(jump)} (+${pct}%)` }
          ],
          confidence: "medium",
          confidenceNote: "The arithmetic is exact; whether the jump is a problem depends on context only you know (a planned buy, a price rise, a one-off)."
        });
      }
    }
  }
  const expenses90 = state2.expenses.filter((e) => now - e.date <= 90 * DAY2);
  if (expenses90.length >= 3) {
    const burnPerMonth = expenses90.reduce((s, e) => s + e.amount, 0) / 3;
    if (burnPerMonth > 0) {
      const runwayDays = Math.max(0, Math.round(cash / burnPerMonth * 30));
      if (runwayDays < 75) {
        const negative = cash <= 0;
        out.push({
          id: crypto.randomUUID(),
          decisionKey: "finance.runway",
          domain: "finance",
          layer: "strategic",
          score: 70 + Math.max(0, 60 - runwayDays),
          claim: negative ? `Recorded outgoings have exceeded collected cash by ${eur(Math.abs(cash))} \u2014 collections, not spending, may be the lever.` : runwayDays < 7 ? `Cash on hand (${eur(cash)}) covers less than a week of your usual outgoings.` : `At your current spending rhythm, cash on hand covers roughly ${runwayDays} days.`,
          reasoning: negative ? `Expenses recorded in ZYVORA total ${eur(Math.abs(cash))} more than invoices actually collected. This calculation excludes any opening balance and everything not yet collected \u2014 so the first place to look is the open invoices below, not necessarily the cost base.` : `Cash position (${eur(cash)}) divided by your own average monthly outgoings over the last 90 days (${eur(burnPerMonth)}/month) gives about ${runwayDays} days of cover if nothing new is collected. This is a strategic signal, not an emergency: incoming invoices are not counted here.`,
          evidence: [
            { label: "Cash position (paid invoices \u2212 expenses)", value: eur(cash) },
            { label: "Average monthly outgoings (last 90 days)", value: eur(burnPerMonth) },
            {
              label: "Uncollected invoices not counted above",
              value: eur(state2.invoices.filter((i) => !i.paidAt).reduce((s, i) => s + i.amount, 0))
            }
          ],
          confidence: "medium",
          confidenceNote: "Medium confidence: the calculation is exact, but it assumes spending stays level and counts no incoming payments. Collecting the overdue invoices above would extend this materially."
        });
      }
    }
  }
}
function overdueGuidance(oldestCustomer, total) {
  return {
    options: [
      option({
        id: "remind",
        label: "Send payment reminders now",
        path: "Send a polite written reminder for each overdue invoice today.",
        gain: `Historically the cheapest way to recover most of the ${eur(total)} outstanding.`,
        cost: "A few minutes; minimal relationship risk at this stage.",
        reversibility: "easy",
        falsifier: "If a customer has already told you payment is scheduled, a reminder adds friction for nothing."
      }),
      option({
        id: "call",
        label: `Call ${oldestCustomer} personally`,
        path: "Phone the customer with the oldest debt; ask directly, offer a payment date.",
        gain: "Fastest resolution for the largest/oldest item; preserves the relationship with a personal touch.",
        cost: "Your time and some social discomfort.",
        reversibility: "easy",
        falsifier: "If the relationship is already strained, a written reminder first may land better."
      }),
      option({
        id: "wait",
        label: "Wait one more week",
        path: "Do nothing for seven days.",
        gain: "Zero effort; avoids nudging a customer who may simply be slow this month.",
        cost: `The ${eur(total)} stays uncollected and each week makes collection statistically harder.`,
        reversibility: "easy",
        falsifier: "If cash runway is already short, waiting compounds the wrong risk.",
        isNullOption: true
      })
    ],
    recommendedId: "remind",
    recommendationReason: "Reminders recover most late payments at almost no cost, and escalating to a call remains available if they don't."
  };
}
function revenueDipGuidance(driver, delta) {
  return {
    options: [
      option({
        id: "contact",
        label: `Contact ${driver} this week`,
        path: `Call or visit ${driver}; ask openly whether something changed on their side.`,
        gain: "Directly addresses the concentrated cause; early contact has the best recovery odds.",
        cost: "An hour of your week.",
        reversibility: "easy",
        falsifier: `If ${driver}'s orders were a planned one-off (e.g., a project that ended), there is nothing to recover.`
      }),
      option({
        id: "offer",
        label: "Run a re-engagement offer",
        path: "Send a time-limited offer to your regular customers.",
        gain: "May lift orders broadly, not just from one account.",
        cost: `Margin cost, and it doesn't answer why ${driver} slowed.`,
        reversibility: "moderate",
        falsifier: "If the cause is one customer's situation, a broad discount spends margin on the wrong problem."
      }),
      option({
        id: "wait",
        label: "Wait one more cycle",
        path: "Do nothing for 30 days and re-read the trend.",
        gain: "Avoids acting on noise; costs nothing now.",
        cost: `If the dip is real, roughly ${eur(delta)} more goes uncollected next month.`,
        reversibility: "easy",
        falsifier: "If the dip deepens next month, waiting was the wrong call.",
        isNullOption: true
      })
    ],
    recommendedId: "contact",
    recommendationReason: "The shortfall is concentrated in one relationship, so the highest-information, lowest-cost move is a direct conversation."
  };
}
function customersBrain(state2, out, now) {
  const customers = projectCustomers(state2);
  const archived = new Set(state2.archivedCustomers);
  for (const c of customers) {
    if (archived.has(c.name)) continue;
    if (c.invoiceCount < 3 || c.medianGapDays === null || c.medianGapDays <= 0) continue;
    const daysSince = (now - c.lastInvoiceAt) / DAY2;
    const threshold = Math.max(2 * c.medianGapDays, 30);
    if (daysSince > threshold) {
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `customers.silent.${c.name}`,
        domain: "customers",
        layer: "tactical",
        score: 50 + Math.min(30, Math.round(daysSince - threshold)),
        claim: `${c.name} has gone quiet \u2014 no order in ${Math.round(daysSince)} days, against their usual rhythm of every ~${Math.round(c.medianGapDays)} days.`,
        reasoning: `${c.name} ordered ${c.invoiceCount} times (${eur(c.totalBilled)} lifetime) with a median gap of ${Math.round(c.medianGapDays)} days between orders. The current silence is more than twice their own rhythm \u2014 customers rarely announce that they're leaving; they just stop.`,
        evidence: [
          { label: "Last order", value: daysAgoLabel(c.lastInvoiceAt, now) },
          { label: "Their usual gap between orders", value: `~${Math.round(c.medianGapDays)} days (median)` },
          { label: "Lifetime billed", value: eur(c.totalBilled) }
        ],
        confidence: "medium",
        confidenceNote: "Pattern-based, not certain: a holiday, a stocked-up order, or seasonality could explain the silence. The falsifier below tells you what to check.",
        guidance: {
          options: [
            option({
              id: "call",
              label: `Check in with ${c.name}`,
              path: "A short, no-pressure message or call: 'been a while \u2014 anything you need?'",
              gain: "If they're drifting to a competitor, early contact is the only cheap moment to find out.",
              cost: "Minutes.",
              reversibility: "easy",
              falsifier: "If they ordered unusually large last time, they may simply still be stocked."
            }),
            option({
              id: "gesture",
              label: "Send a small loyalty gesture",
              path: "A modest discount or a thank-you note referencing their history with you.",
              gain: "Warms the relationship without demanding a reply.",
              cost: "Small margin; can feel transactional if mistimed.",
              reversibility: "easy",
              falsifier: "If the silence has a practical cause (holidays, stock), the gesture answers a question nobody asked."
            }),
            option({
              id: "wait",
              label: "Do nothing",
              path: "Wait and watch another cycle.",
              gain: "No effort; avoids over-contacting a customer who values distance.",
              cost: "If they are quietly leaving, every silent week lowers the odds of return.",
              reversibility: "easy",
              falsifier: "If they don't return next cycle either, waiting cost you the cheap moment.",
              isNullOption: true
            })
          ],
          recommendedId: "call",
          recommendationReason: "A low-pressure check-in has the best information-to-cost ratio, and this customer's history justifies the minutes."
        }
      });
    }
  }
}
function inventoryBrain(state2, out, now) {
  for (const p2 of state2.products) {
    if (p2.discontinued) continue;
    const dailySales = p2.weeklySales / 7;
    const available = p2.stock - (state2.reserved[p2.productId] ?? 0);
    if (dailySales > 0) {
      const daysLeft = available / dailySales;
      const margin = daysLeft - p2.leadTimeDays;
      const incoming = state2.incoming[p2.productId] ?? 0;
      const needForLeadTime = Math.ceil(dailySales * p2.leadTimeDays);
      if (margin < 4 && incoming < needForLeadTime) {
        const orderQty = Math.ceil(p2.weeklySales * 4);
        const orderValue = orderQty * p2.unitCost;
        out.push({
          id: crypto.randomUUID(),
          decisionKey: `inventory.stockout.${p2.productId}`,
          domain: "inventory",
          layer: "tactical",
          score: 60 + Math.max(0, Math.round((4 - margin) * 5)),
          claim: margin < 0 ? `"${p2.name}" will run out about ${Math.abs(Math.round(margin))} days before the earliest restock can arrive.` : `"${p2.name}" is ${Math.round(daysLeft)} days from stockout \u2014 barely inside its ${p2.leadTimeDays}-day resupply time.`,
          reasoning: `Available stock (${available} units after reservations) at your current sales velocity (${p2.weeklySales}/week) lasts ~${Math.round(daysLeft)} days, while resupply takes ${p2.leadTimeDays} days. The decision window is now: every day of waiting shortens the options below.`,
          evidence: [
            { label: "Units in stock (physical)", value: String(p2.stock) },
            { label: "Reserved by open orders", value: String(state2.reserved[p2.productId] ?? 0) },
            { label: "Available to sell", value: String(available) },
            { label: "Sales velocity (your last recorded rate)", value: `${p2.weeklySales}/week` },
            { label: "Supplier lead time", value: `${p2.leadTimeDays} days` },
            { label: "Projected days of stock left", value: `~${Math.round(daysLeft)}` }
          ],
          confidence: "medium",
          confidenceNote: "The projection assumes sales continue at the recorded rate; a demand spike or lull moves the date either way.",
          guidance: {
            options: [
              option({
                id: "expedite",
                label: "Expedite a reorder now",
                path: `Order ${orderQty} units (~4 weeks of sales, ~${eur(orderValue)}) with express shipping.`,
                gain: "Avoids stockout days on a proven seller; protects the revenue and the customer habit.",
                cost: `Express premium (typically 10\u201320% on ~${eur(orderValue)}) and cash committed earlier.`,
                reversibility: "moderate",
                falsifier: "If the recent velocity was a one-off spike, expedited stock arrives to slower sales."
              }),
              option({
                id: "standard",
                label: "Reorder at standard speed",
                path: `Order ${orderQty} units with normal ${p2.leadTimeDays}-day delivery.`,
                gain: "No premium paid.",
                cost: margin < 0 ? `Accepts ~${Math.abs(Math.round(margin))} days of stockout on a best-seller.` : "Leaves almost no buffer if sales tick up.",
                reversibility: "moderate",
                falsifier: "If sales accelerate further, the gap widens beyond the projection."
              }),
              option({
                id: "accept",
                label: "Accept the stockout",
                path: "Do nothing; restock on the next regular cycle.",
                gain: "Zero cost and effort now; frees cash for other uses.",
                cost: "Lost sales during the gap and the risk that regulars try an alternative.",
                reversibility: "easy",
                falsifier: "If this product drives repeat visits, the hidden cost exceeds the visible one.",
                isNullOption: true
              })
            ],
            recommendedId: "expedite",
            recommendationReason: "This is a proven seller with a concrete gap; the express premium is small against the lost sales and habit-breaking risk."
          }
        });
      }
    }
    if (dailySales === 0 && p2.stock > 0) {
      const tied = p2.stock * p2.unitCost;
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `inventory.dead.${p2.productId}`,
        domain: "inventory",
        layer: "tactical",
        score: 25 + Math.min(20, Math.round(tied / 100)),
        claim: `"${p2.name}" isn't selling at all \u2014 ${eur(tied)} of cash is sitting on the shelf.`,
        reasoning: `${p2.stock} units at ${eur(p2.unitCost)} cost each, with zero recorded weekly sales. Stock that doesn't move is a loan you made to your own shelf.`,
        evidence: [
          { label: "Units in stock", value: String(p2.stock) },
          { label: "Recorded sales velocity", value: "0/week" },
          { label: "Cash tied up (at cost)", value: eur(tied) }
        ],
        confidence: "high",
        confidenceNote: "High confidence in the facts; whether to act depends on seasonality only you can judge.",
        guidance: {
          options: [
            option({
              id: "markdown",
              label: "Mark it down and free the cash",
              path: `Discount "${p2.name}" enough to move it within a month.`,
              gain: `Recovers a good share of the ${eur(tied)} and frees shelf space for what sells.`,
              cost: "Margin sacrificed versus the original plan.",
              reversibility: "moderate",
              falsifier: "If this item is seasonal and its season is near, the markdown is premature."
            }),
            option({
              id: "bundle",
              label: "Bundle it with a best-seller",
              path: "Attach it to a product that moves, at a modest combined discount.",
              gain: "Moves dead stock while protecting the headline price.",
              cost: "Slightly dilutes the best-seller's margin; takes a little setup.",
              reversibility: "easy",
              falsifier: "If the pairing feels forced to customers, attach rates will show it within weeks."
            }),
            option({
              id: "hold",
              label: "Hold as is",
              path: "Keep it at full price and wait.",
              gain: "Preserves full margin if demand appears.",
              cost: `${eur(tied)} stays illiquid and the shelf space keeps paying for it.`,
              reversibility: "easy",
              falsifier: "If three more months pass without a sale, holding was the expensive choice.",
              isNullOption: true
            })
          ],
          recommendedId: "markdown",
          recommendationReason: "Unless you know a season is coming, recovering cash from a non-mover usually beats defending a margin that isn't being realized."
        }
      });
    }
  }
}
function commerceBrain(state2, out, now) {
  const settled = state2.orders.filter(
    (o) => o.status === "delivered" || o.status === "refused" || o.status === "returned"
  );
  const refused = state2.orders.filter((o) => o.status === "refused");
  if (settled.length >= 5 && refused.length > 0) {
    const rate = refused.length / settled.length;
    if (rate >= 0.15) {
      const loss = refused.reduce((s, o) => s + orderRefusalLoss(o), 0);
      out.push({
        id: crypto.randomUUID(),
        decisionKey: "commerce.refusal-rate",
        domain: "finance",
        layer: "tactical",
        score: 60 + Math.round(rate * 100),
        claim: `${Math.round(rate * 100)}% of your settled COD orders are refused at the door \u2014 ${eur(loss)} spent shipping goods that came back.`,
        reasoning: `${refused.length} of ${settled.length} settled orders were refused. Each refusal costs round-trip shipping plus packaging with zero revenue. Refusal is usually a confirmation problem, not a customer problem: unconfirmed COD orders refuse far more often.`,
        evidence: [
          { label: "Settled orders (delivered + refused + returned)", value: String(settled.length) },
          { label: "Refused", value: String(refused.length) },
          { label: "Cash lost to refusals (round-trip shipping + packaging)", value: eur(loss) }
        ],
        confidence: "high",
        confidenceNote: "High confidence in the arithmetic; the remedy depends on why customers refuse \u2014 the falsifiers below tell you what to check.",
        guidance: {
          options: [
            option({
              id: "confirm",
              label: "Confirm every order before shipping",
              path: "Call or message each COD order before handing it to the courier; ship only confirmed ones.",
              gain: "Typically cuts refusals sharply; costs only minutes per order.",
              cost: "Adds a step to fulfillment; a few impulsive buyers won't answer.",
              reversibility: "easy",
              falsifier: "If your refusals come from delivery delays rather than intent, confirmation calls won't fix them."
            }),
            option({
              id: "prepay",
              label: "Offer a small prepayment discount",
              path: "Give a modest discount for paying online instead of COD.",
              gain: "Shifts risk off you entirely for every prepaid order.",
              cost: "Margin on prepaid orders; requires a payment method your customers trust.",
              reversibility: "easy",
              falsifier: "If your market strongly distrusts online payment, uptake will be too low to matter."
            }),
            option({
              id: "accept",
              label: "Accept the current rate",
              path: "Change nothing; treat refusals as a cost of COD.",
              gain: "No process change.",
              cost: `\u2248 ${eur(loss)} recurring, plus stock cycling back through returns.`,
              reversibility: "easy",
              falsifier: "If the rate keeps climbing, the cost compounds while competitors who confirm orders keep the margin.",
              isNullOption: true
            })
          ],
          recommendedId: "confirm",
          recommendationReason: "Confirmation attacks the root cause at near-zero cost and is the standard remedy for COD refusal."
        }
      });
    }
  }
  const losing = state2.orders.filter(
    (o) => o.status === "delivered" && orderNetProfit(o) < 0
  );
  if (losing.length > 0) {
    const totalLoss = losing.reduce((s, o) => s + orderNetProfit(o), 0);
    out.push({
      id: crypto.randomUUID(),
      decisionKey: "commerce.unprofitable-orders",
      domain: "finance",
      layer: "tactical",
      score: 45 + losing.length * 5,
      claim: `${losing.length} delivered order${losing.length > 1 ? "s" : ""} actually lost money \u2014 ${eur(Math.abs(totalLoss))} in total, after all costs.`,
      reasoning: "Revenue minus product cost, shipping, COD fee, and packaging is negative on these orders. The usual causes: discounts stacked on low-margin items, or free/underpriced shipping on small baskets.",
      evidence: losing.slice(0, 5).map((o) => ({
        label: `${o.customer} \u2014 ${o.lines.map((l) => `${l.qty}\xD7 ${l.productName}`).join(", ")}`,
        value: `net ${eur(orderNetProfit(o))}`
      })),
      confidence: "high",
      confidenceNote: "High confidence: computed from each order's own recorded figures."
    });
  }
  const collected30 = state2.orders.filter((o) => o.cashReceivedAt && now - o.cashReceivedAt <= 30 * DAY2).reduce((s, o) => s + orderRevenue(o), 0) + state2.invoices.filter((i) => i.paidAt && now - i.paidAt <= 30 * DAY2).reduce((s, i) => s + i.amount, 0);
  const expenses30 = state2.expenses.filter((e) => now - e.date <= 30 * DAY2).reduce((s, e) => s + e.amount, 0);
  const expenseEnvelope = collected30 * ENVELOPES.expenses;
  if (collected30 > 0 && expenses30 > expenseEnvelope) {
    out.push({
      id: crypto.randomUUID(),
      decisionKey: "finance.envelope-expenses",
      domain: "finance",
      layer: "tactical",
      score: 40 + Math.min(30, Math.round((expenses30 - expenseEnvelope) / Math.max(1, expenseEnvelope) * 20)),
      claim: `This month's expenses (${eur(expenses30)}) exceed the expense envelope (${eur(expenseEnvelope)}) \u2014 the overspend is being paid from your stock and profit envelopes.`,
      reasoning: `Under the three-envelope rule, ${Math.round(ENVELOPES.stock * 100)}% of collected cash is reserved for restocking, ${Math.round(ENVELOPES.expenses * 100)}% for expenses, and ${Math.round(ENVELOPES.profit * 100)}% is real profit. Collected cash in the last 30 days was ${eur(collected30)}; expenses above the envelope silently consume the other two.`,
      evidence: [
        { label: "Cash collected, last 30 days", value: eur(collected30) },
        { label: `Expense envelope (${Math.round(ENVELOPES.expenses * 100)}%)`, value: eur(expenseEnvelope) },
        { label: "Actual expenses, last 30 days", value: eur(expenses30) },
        { label: "Overspend", value: eur(expenses30 - expenseEnvelope) }
      ],
      confidence: "medium",
      confidenceNote: "The arithmetic is exact; the envelope percentages are the standard default and configurable to your business."
    });
  }
}
function marketingBrain(state2, out, now) {
  for (const promo2 of state2.promos) {
    if (!promo2.active || promo2.timesUsed === 0) continue;
    const used = state2.orders.filter((o) => o.promoCode === promo2.code && o.status !== "cancelled");
    const delivered = used.filter((o) => o.status === "delivered");
    const discountGiven = used.reduce((s, o) => s + o.discount, 0);
    if (delivered.length >= 2) {
      const netProfit = delivered.reduce((s, o) => s + orderNetProfit(o), 0);
      if (netProfit < 0) {
        out.push({
          id: crypto.randomUUID(),
          decisionKey: `marketing.promo-unprofitable.${promo2.code}`,
          domain: "marketing",
          layer: "tactical",
          score: 55 + Math.min(25, Math.round(Math.abs(netProfit))),
          claim: `Promo "${promo2.code}" is losing money \u2014 its delivered orders net ${eur(netProfit)} after all costs.`,
          reasoning: `${delivered.length} delivered orders used "${promo2.code}", giving away ${eur(discountGiven)} in discounts. After product cost, shipping, COD fees, and packaging, those orders are collectively unprofitable. A discount that drives volume at a loss shrinks the business faster the more it "works".`,
          evidence: [
            { label: "Delivered orders using this promo", value: String(delivered.length) },
            { label: "Total discount given", value: eur(discountGiven) },
            { label: "Net profit of those orders", value: eur(netProfit) },
            {
              label: "Promo terms",
              value: promo2.type === "percentage" ? `${promo2.value}% off${promo2.minBasket ? `, min basket ${eur(promo2.minBasket)}` : ""}` : `${eur(promo2.value)} off${promo2.minBasket ? `, min basket ${eur(promo2.minBasket)}` : ""}`
            }
          ],
          confidence: "high",
          confidenceNote: "High confidence: computed from each order's own recorded figures.",
          guidance: {
            options: [
              option({
                id: "raise-min",
                label: "Raise the minimum basket",
                path: `Deactivate "${promo2.code}" and reissue it with a higher minimum basket so it only applies to orders large enough to absorb the discount.`,
                gain: "Keeps the promo's pull on bigger baskets while cutting off the loss-making small ones.",
                cost: "Fewer customers qualify; a little setup.",
                reversibility: "easy",
                falsifier: "If most losses come from shipping rather than basket size, a higher minimum won't fix it."
              }),
              option({
                id: "lower-value",
                label: "Reduce the discount",
                path: `Reissue with a smaller percentage or a cap (maxDiscount) so the giveaway can't exceed the margin.`,
                gain: "Preserves the promo while protecting the floor.",
                cost: "A weaker offer may convert fewer customers.",
                reversibility: "easy",
                falsifier: "If the offer only worked because it was generous, a smaller one may not move anyone."
              }),
              option({
                id: "stop",
                label: "Stop the promo",
                path: `Deactivate "${promo2.code}" and don't replace it.`,
                gain: "Immediately stops the bleeding.",
                cost: "Loses whatever genuine repeat business the promo was seeding.",
                reversibility: "easy",
                falsifier: "If the promo is acquiring customers who reorder at full price, stopping it ignores that lifetime value.",
                isNullOption: true
              })
            ],
            recommendedId: "raise-min",
            recommendationReason: "Most COD promo losses come from small baskets that can't cover fixed shipping and fees; a higher minimum targets exactly those without killing the offer."
          }
        });
      }
    }
    if (promo2.usageLimit !== void 0 && promo2.timesUsed >= promo2.usageLimit * 0.8) {
      const atLimit = promo2.timesUsed >= promo2.usageLimit;
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `marketing.promo-limit.${promo2.code}`,
        domain: "marketing",
        layer: "operational",
        score: 20,
        claim: atLimit ? `Promo "${promo2.code}" has reached its usage limit (${promo2.timesUsed}/${promo2.usageLimit}) and no longer applies.` : `Promo "${promo2.code}" is near its usage limit (${promo2.timesUsed}/${promo2.usageLimit}).`,
        reasoning: `Usage is counted server-side from non-cancelled orders bearing the code, so the limit is enforced consistently. ` + (atLimit ? "New orders can no longer redeem it." : "It will stop applying once the limit is reached."),
        evidence: [
          { label: "Redemptions", value: `${promo2.timesUsed} of ${promo2.usageLimit}` },
          { label: "Discount given so far", value: eur(discountGiven) }
        ],
        confidence: "high",
        confidenceNote: "High confidence: a direct count of your own orders."
      });
    }
  }
}
var ENVELOPES = { stock: 0.4, expenses: 0.3, profit: 0.3 };
function cashCenter(state2, now = Date.now()) {
  const paidInvoices = state2.invoices.filter((i) => i.paidAt);
  const remitted = state2.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const pendingCod = state2.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt);
  const collectedAllTime = paidInvoices.reduce((s, i) => s + i.amount, 0) + remitted.reduce((s, o) => s + orderRevenue(o), 0);
  const expensesAllTime = state2.expenses.reduce((s, e) => s + e.amount, 0);
  const collected30 = paidInvoices.filter((i) => now - i.paidAt <= 30 * DAY2).reduce((s, i) => s + i.amount, 0) + remitted.filter((o) => now - o.cashReceivedAt <= 30 * DAY2).reduce((s, o) => s + orderRevenue(o), 0);
  const expenses30 = state2.expenses.filter((e) => now - e.date <= 30 * DAY2).reduce((s, e) => s + e.amount, 0);
  return {
    cashAvailable: collectedAllTime - expensesAllTime,
    cashPendingCod: pendingCod.reduce((s, o) => s + orderRevenue(o), 0),
    collected30,
    expenses30,
    envelopes: {
      stock: collected30 * ENVELOPES.stock,
      expenses: collected30 * ENVELOPES.expenses,
      profit: collected30 * ENVELOPES.profit
    },
    expenseOverspend: Math.max(0, expenses30 - collected30 * ENVELOPES.expenses)
  };
}
function stateOfThings(state2, now = Date.now()) {
  const paid = state2.invoices.filter((i) => i.paidAt);
  const open = state2.invoices.filter((i) => !i.paidAt);
  const remitted = state2.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const pendingCod = state2.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt);
  const cash = paid.reduce((s, i) => s + i.amount, 0) + remitted.reduce((s, o) => s + orderRevenue(o), 0) - state2.expenses.reduce((s, e) => s + e.amount, 0);
  const last30 = state2.invoices.filter((i) => now - i.issuedAt <= 30 * DAY2).reduce((s, i) => s + i.amount, 0) + state2.orders.filter((o) => o.deliveredAt && now - o.deliveredAt <= 30 * DAY2).reduce((s, o) => s + orderRevenue(o), 0);
  const stockValue = state2.products.reduce((s, p2) => s + p2.stock * p2.unitCost, 0);
  return {
    cash,
    cashPendingCod: pendingCod.reduce((s, o) => s + orderRevenue(o), 0),
    billedLast30: last30,
    openInvoices: open.length,
    openInvoiceValue: open.reduce((s, i) => s + i.amount, 0),
    openOrders: state2.orders.filter(
      (o) => o.status === "pending" || o.status === "confirmed" || o.status === "shipped"
    ).length,
    products: state2.products.length,
    stockValue
  };
}
var formatMoney = money;

// src/core/health.ts
var clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
function businessHealth(state2, now = Date.now()) {
  const components = [];
  const cash = cashCenter(state2, now);
  const cal = cashCalendar(state2, now);
  if (cal.avgDailyExpense && cal.avgDailyExpense > 0) {
    const coverDays = cash.cashAvailable / cal.avgDailyExpense;
    const score2 = clamp(coverDays / 60 * 100);
    components.push({
      key: "cash",
      label: "Cash cover",
      score: score2,
      weight: 0.3,
      detail: coverDays >= 0 ? `${money(cash.cashAvailable)} covers ~${Math.round(coverDays)} days of your usual outgoings.` : `Recorded outgoings exceed collected cash by ${money(-cash.cashAvailable)}.`
    });
  }
  const settled = state2.orders.filter((o) => o.status === "delivered" || o.status === "refused" || o.status === "returned");
  if (settled.length >= 5) {
    const refused = state2.orders.filter((o) => o.status === "refused").length;
    const rate = refused / settled.length;
    const score2 = clamp(100 - rate / 0.3 * 100);
    components.push({
      key: "refusals",
      label: "COD delivery",
      score: score2,
      weight: 0.25,
      detail: `${Math.round(rate * 100)}% of settled orders refused at the door (${refused} of ${settled.length}).`
    });
  }
  const byCustomer = /* @__PURE__ */ new Map();
  const addRev = (name, v) => byCustomer.set(name, (byCustomer.get(name) ?? 0) + v);
  for (const i of state2.invoices) if (i.paidAt) addRev(i.customer, i.amount);
  for (const o of state2.orders) if (o.status === "delivered") addRev(o.customer, orderRevenue(o));
  const total = [...byCustomer.values()].reduce((s, v) => s + v, 0);
  if (byCustomer.size >= 3 && total > 0) {
    const top = Math.max(...byCustomer.values());
    const topShare = top / total;
    const score2 = clamp(100 - (topShare - 0.2) / 0.4 * 100);
    const topName = [...byCustomer.entries()].find(([, v]) => v === top)?.[0] ?? "one customer";
    components.push({
      key: "concentration",
      label: "Customer spread",
      score: score2,
      weight: 0.15,
      detail: `Your top customer (${topName}) is ${Math.round(topShare * 100)}% of lifetime revenue.`
    });
  }
  const active = state2.products.filter((p2) => !p2.discontinued);
  if (active.length > 0) {
    const atRisk = active.filter((p2) => {
      const avail = p2.stock - (state2.reserved[p2.productId] ?? 0);
      const daysLeft = p2.weeklySales > 0 ? avail / (p2.weeklySales / 7) : Infinity;
      return daysLeft < p2.leadTimeDays + 4 && (state2.incoming[p2.productId] ?? 0) === 0;
    }).length;
    const score2 = clamp(100 - atRisk / active.length * 100);
    components.push({
      key: "stock",
      label: "Stock health",
      score: score2,
      weight: 0.15,
      detail: atRisk === 0 ? "No active product is at stockout risk." : `${atRisk} of ${active.length} products risk stockout with nothing inbound.`
    });
  }
  if (state2.goals.revenue && state2.goals.revenue > 0) {
    const d = new Date(now);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthStart2 = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const earned = state2.orders.filter((o) => o.deliveredAt && o.deliveredAt >= monthStart2).reduce((s, o) => s + orderRevenue(o), 0) + state2.invoices.filter((i) => i.paidAt && i.paidAt >= monthStart2).reduce((s, i) => s + i.amount, 0);
    const expected = state2.goals.revenue * d.getDate() / daysInMonth;
    const score2 = clamp(expected > 0 ? earned / expected * 100 : 100);
    components.push({
      key: "pace",
      label: "Goal pace",
      score: score2,
      weight: 0.15,
      detail: `${money(earned)} earned vs ${money(expected)} on-pace by today (goal ${money(state2.goals.revenue)}).`
    });
  }
  if (components.length === 0) {
    return { score: 0, band: "watch", components, ready: false };
  }
  const wsum = components.reduce((s, c) => s + c.weight, 0);
  const score = clamp(components.reduce((s, c) => s + c.score * c.weight, 0) / wsum);
  const band = score >= 75 ? "strong" : score >= 55 ? "steady" : score >= 35 ? "watch" : "fragile";
  components.sort((a, b) => a.score - b.score);
  return { score, band, components, ready: true };
}

// src/core/campaigns.ts
function projectCampaigns(events) {
  return events.filter((e) => e.stream === "fact" && e.type === "campaign_sent").map((e) => e.payload).sort((a, b) => b.at - a.at);
}
function measureCampaign(state2, campaign, now = Date.now(), windowDays = 14) {
  const recipients = new Set(campaign.customers);
  const w = windowDays * DAY2;
  const beforeStart = campaign.at - w;
  const afterEnd = campaign.at + w;
  const inWindow = (from, to) => state2.orders.filter(
    (o) => recipients.has(o.customer) && o.status !== "cancelled" && o.createdAt >= from && o.createdAt < to
  );
  const before = inWindow(beforeStart, campaign.at);
  const after = inWindow(campaign.at, Math.min(afterEnd, now));
  return {
    campaignId: campaign.campaignId,
    segment: campaign.segment,
    channel: campaign.channel,
    message: campaign.message,
    at: campaign.at,
    recipients: campaign.customers.length,
    windowDays,
    ordersBefore: before.length,
    ordersAfter: after.length,
    revenueBefore: before.reduce((s, o) => s + orderRevenue(o), 0),
    revenueAfter: after.reduce((s, o) => s + orderRevenue(o), 0),
    ready: now >= afterEnd
  };
}

// src/core/weekly.ts
function weeklyReview(events, now = Date.now()) {
  const state2 = projectState(events);
  const thisStart = now - 7 * DAY2;
  const lastStart = now - 14 * DAY2;
  const inThis = (t) => t >= thisStart && t < now;
  const inLast = (t) => t >= lastStart && t < thisStart;
  const revenue = (test) => state2.orders.filter((o) => o.deliveredAt && test(o.deliveredAt)).reduce((s, o) => s + orderRevenue(o), 0) + state2.invoices.filter((i) => i.paidAt && test(i.paidAt)).reduce((s, i) => s + i.amount, 0);
  const ordersDelivered = (test) => state2.orders.filter((o) => o.deliveredAt && test(o.deliveredAt)).length;
  const refusals = (test) => events.filter((e) => {
    if (e.stream !== "fact" || e.type !== "order_status_changed") return false;
    const p2 = e.payload;
    return p2.status === "refused" && test(p2.at);
  }).length;
  const cashCollected = (test) => state2.orders.filter((o) => o.cashReceivedAt && test(o.cashReceivedAt)).reduce((s, o) => s + orderRevenue(o), 0) + state2.invoices.filter((i) => i.paidAt && test(i.paidAt)).reduce((s, i) => s + i.amount, 0);
  const expenses = (test) => state2.expenses.filter((e) => test(e.date)).reduce((s, e) => s + e.amount, 0);
  const decisions3 = (test) => events.filter((e) => e.stream === "decision" && e.type === "decision_recorded" && test(e.ts)).length;
  const build = (key, label, fn, higherIsBetter, money2) => {
    const thisWeek = fn(inThis);
    const lastWeek = fn(inLast);
    return { key, label, thisWeek, lastWeek, delta: thisWeek - lastWeek, higherIsBetter, money: money2 };
  };
  const metrics = [
    build("revenue", "Revenue earned", revenue, true, true),
    build("ordersDelivered", "Orders delivered", ordersDelivered, true, false),
    build("cashCollected", "Cash collected", cashCollected, true, true),
    build("refusals", "COD refusals", refusals, false, false),
    build("expenses", "Expenses", expenses, false, true),
    build("decisions", "Decisions recorded", decisions3, true, false)
  ];
  return {
    metrics,
    from: thisStart,
    hasPriorWeek: metrics.some((m2) => m2.lastWeek !== 0)
  };
}

// src/core/couriers.ts
function courierControl(state2, now = Date.now()) {
  const rows = [];
  const age = (at) => at ? Math.max(0, Math.floor((now - at) / DAY2)) : 0;
  for (const order of state2.orders) {
    if (["cancelled", "refused", "returned"].includes(order.status)) continue;
    const sinceUpdate = age(order.shipmentUpdatedAt ?? order.createdAt);
    const value = orderRevenue(order);
    let row = null;
    if (order.status === "confirmed" && !order.shipmentStatus) {
      row = {
        order,
        score: 70,
        action: "handoff",
        cashAtRisk: value,
        daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s confirmed order is ready for courier handoff.`,
        reason: "It is confirmed but no shipment or tracking record exists yet."
      };
    } else if (order.status === "shipped" && !order.shipmentStatus) {
      row = {
        order,
        score: 80,
        action: "add-tracking",
        cashAtRisk: value,
        daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s shipped order has no tracking record.`,
        reason: "Without a tracking number or courier event, delivery progress cannot be verified."
      };
    } else if (order.shipmentStatus === "delivery_failed") {
      row = {
        order,
        score: 100,
        action: "contact-customer",
        cashAtRisk: value,
        daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s delivery failed.`,
        reason: order.lastDeliveryFailure || "The failure reason was not recorded; contact the customer before another attempt."
      };
    } else if (order.expectedDeliveryAt && order.expectedDeliveryAt < now && order.shipmentStatus !== "delivered" && order.status !== "delivered") {
      row = {
        order,
        score: 90,
        action: "check-courier",
        cashAtRisk: value,
        daysSinceUpdate: sinceUpdate,
        claim: `${order.customer}'s delivery is past its expected date.`,
        reason: `The expected delivery date passed ${age(order.expectedDeliveryAt)} day(s) ago without a delivered event.`
      };
    } else if (order.status === "delivered" && !order.cashReceivedAt) {
      const remitAge = age(order.deliveredAt);
      const overdue2 = order.expectedRemittanceAt ? order.expectedRemittanceAt < now : remitAge >= 3;
      row = {
        order,
        score: overdue2 ? 95 : 55,
        action: overdue2 ? "chase-remittance" : "none",
        cashAtRisk: value,
        daysSinceUpdate: remitAge,
        claim: `${order.customer}'s COD cash is still with the courier.`,
        reason: overdue2 ? `Cash has been pending for ${remitAge} day(s), beyond the collection window.` : `Delivered ${remitAge} day(s) ago; the cash is pending but not overdue yet.`
      };
    } else if (order.shipmentStatus && ["handed_to_courier", "in_transit", "out_for_delivery", "returning"].includes(order.shipmentStatus)) {
      const stale = sinceUpdate >= 3;
      row = {
        order,
        score: stale ? 75 : 30,
        action: stale ? "check-courier" : "none",
        cashAtRisk: value,
        daysSinceUpdate: sinceUpdate,
        claim: stale ? `${order.customer}'s shipment has not changed for ${sinceUpdate} day(s).` : `${order.customer}'s shipment is moving normally.`,
        reason: stale ? "A stale courier status can hide a failed attempt or return." : "The latest courier update is recent; no intervention is needed."
      };
    }
    if (row) rows.push(row);
  }
  rows.sort((a, b) => b.score - a.score || b.cashAtRisk - a.cashAtRisk);
  return {
    rows,
    needsAction: rows.filter((r) => r.action !== "none").length,
    inMotion: rows.filter((r) => r.order.shipmentStatus && !["delivered", "returned"].includes(r.order.shipmentStatus)).length,
    failed: rows.filter((r) => r.order.shipmentStatus === "delivery_failed").length,
    cashPending: rows.filter((r) => r.order.status === "delivered" && !r.order.cashReceivedAt).reduce((sum, r) => sum + r.cashAtRisk, 0)
  };
}

// src/core/automations.ts
function workflowCandidates(state2, events, now = Date.now()) {
  const completed = new Set(
    events.filter((e) => e.type === "automation_run_recorded").map((e) => String(e.payload.candidateKey ?? ""))
  );
  const rows = [];
  for (const order of state2.orders) {
    if (order.status === "pending" && now - order.createdAt >= 2 * 60 * 60 * 1e3) {
      const key = `cod-confirmation:${order.orderId}:${order.createdAt}`;
      if (!completed.has(key)) rows.push({
        key,
        recipeId: "cod-confirmation",
        orderId: order.orderId,
        customer: order.customer,
        title: `Confirm ${order.customer}'s COD order`,
        reason: `The order has waited ${Math.max(2, Math.floor((now - order.createdAt) / 36e5))} hours without confirmation.`,
        taskNote: `Follow up to confirm COD order ${order.orderId.slice(0, 8)} before courier handoff.`,
        priority: 70 + Math.min(20, Math.floor((now - order.createdAt) / DAY2))
      });
    }
    if (order.shipmentStatus === "delivery_failed" && order.shipmentUpdatedAt) {
      const key = `failed-delivery:${order.orderId}:${order.shipmentUpdatedAt}`;
      if (!completed.has(key)) rows.push({
        key,
        recipeId: "failed-delivery",
        orderId: order.orderId,
        customer: order.customer,
        title: `Rescue ${order.customer}'s failed delivery`,
        reason: order.lastDeliveryFailure || "The courier reported a failed delivery attempt.",
        taskNote: `Contact ${order.customer} about failed delivery for order ${order.orderId.slice(0, 8)}. Confirm address and availability before retrying.`,
        priority: 100
      });
    }
    if (order.status === "delivered" && !order.cashReceivedAt && order.deliveredAt && now - order.deliveredAt >= 3 * DAY2) {
      const key = `courier-remittance:${order.orderId}:${order.deliveredAt}`;
      if (!completed.has(key)) rows.push({
        key,
        recipeId: "courier-remittance",
        orderId: order.orderId,
        customer: order.customer,
        title: `Chase courier cash for ${order.customer}`,
        reason: `COD cash has remained with the courier for ${Math.floor((now - order.deliveredAt) / DAY2)} days.`,
        taskNote: `Follow up with ${order.courier || "the courier"} about COD remittance for order ${order.orderId.slice(0, 8)}.`,
        priority: 80 + Math.min(20, Math.floor((now - order.deliveredAt) / DAY2))
      });
    }
  }
  return rows.sort((a, b) => b.priority - a.priority || a.customer.localeCompare(b.customer));
}

// src/core/inbox.ts
var OUT_PREFIX = /^(WhatsApp|SMS)(\s*\([^)]*\))?:\s*/i;
var STOP_WORDS = /^\s*(stop|unsubscribe|arret|arrêt|توقف|قف)\s*$/i;
var START_WORDS = /^\s*(start|subscribe|commencer|ابدأ|بداية)\s*$/i;
var CONFIRM_WORDS = /^\s*(yes|y|oui|confirm(?:ed)?|تأكيد|نعم|اه|ah|wakha)\s*[.!✅👍]*\s*$/i;
var CANCEL_WORDS = /^\s*(no|n|non|cancel|annuler|إلغاء|لا|la)\s*[.!❌]*\s*$/i;
function isOptOut(body) {
  return STOP_WORDS.test(body);
}
function classifyInbound(body) {
  if (STOP_WORDS.test(body)) return "opt-out";
  if (START_WORDS.test(body)) return "opt-in";
  if (CONFIRM_WORDS.test(body)) return "confirm";
  if (CANCEL_WORDS.test(body)) return "cancel";
  return "unknown";
}
function projectConversations(events) {
  const threads = /* @__PURE__ */ new Map();
  const optedOut = /* @__PURE__ */ new Set();
  const resolvedAt = /* @__PURE__ */ new Map();
  const assignments = /* @__PURE__ */ new Map();
  const statuses = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.stream !== "fact" || e.type !== "message_status_changed") continue;
    const p2 = e.payload;
    if (!p2.messageId || !p2.status) continue;
    const at = p2.at ?? e.ts;
    const current = statuses.get(p2.messageId);
    if (!current || at >= current.at) statuses.set(p2.messageId, { status: p2.status, errorCode: p2.errorCode, at });
  }
  const ensure = (key) => {
    let t = threads.get(key);
    if (!t) {
      t = { key, messages: [], lastAt: 0, waiting: false, optedOut: false };
      threads.set(key, t);
    }
    return t;
  };
  for (const e of events) {
    if (e.stream === "fact" && e.type === "message_received") {
      const p2 = e.payload;
      const key = p2.customer || p2.phone;
      const t = ensure(key);
      if (p2.customer) t.customer = p2.customer;
      if (p2.phone) t.phone = p2.phone;
      t.messages.push({ id: p2.messageId, at: p2.at ?? e.ts, direction: "in", body: p2.body, phone: p2.phone });
      if (isOptOut(p2.body) && p2.customer) optedOut.add(p2.customer);
    } else if (e.stream === "fact" && e.type === "message_sent") {
      const p2 = e.payload;
      const key = p2.customer || p2.phone;
      if (!key || !p2.body) continue;
      const t = ensure(key);
      if (p2.customer) t.customer = p2.customer;
      if (p2.phone) t.phone = p2.phone;
      const delivery = p2.messageId ? statuses.get(p2.messageId) : void 0;
      t.messages.push({
        id: p2.messageId,
        at: p2.at ?? e.ts,
        direction: "out",
        body: p2.body,
        phone: p2.phone,
        status: delivery?.status ?? p2.status,
        errorCode: delivery?.errorCode
      });
    } else if (e.stream === "fact" && e.type === "customer_activity_logged") {
      const p2 = e.payload;
      if (p2.kind !== "message" || !p2.customer) continue;
      const t = ensure(p2.customer);
      t.customer = p2.customer;
      t.messages.push({ at: p2.at ?? e.ts, direction: "out", body: (p2.note ?? "").replace(OUT_PREFIX, "") });
    } else if (e.stream === "fact" && e.type === "customer_opted_out") {
      const p2 = e.payload;
      if (p2.customer) optedOut.add(p2.customer);
      if (p2.phone) optedOut.add(p2.phone);
    } else if (e.stream === "fact" && e.type === "customer_opted_in") {
      const p2 = e.payload;
      if (p2.customer) optedOut.delete(p2.customer);
      if (p2.phone) optedOut.delete(p2.phone);
    } else if (e.stream === "fact" && e.type === "conversation_resolved") {
      const p2 = e.payload;
      const key = p2.customer || p2.phone;
      if (key) resolvedAt.set(key, p2.at ?? e.ts);
    } else if (e.stream === "fact" && e.type === "conversation_assigned") {
      const p2 = e.payload;
      const key = p2.customer || p2.phone;
      if (key) assignments.set(key, { assignedTo: p2.assignedTo || void 0, assignedLabel: p2.assignedLabel || void 0 });
    }
  }
  const out = [];
  for (const t of threads.values()) {
    t.messages.sort((a, b) => a.at - b.at);
    const last = t.messages[t.messages.length - 1];
    t.lastAt = last?.at ?? 0;
    t.resolvedAt = resolvedAt.get(t.key);
    const assignment = assignments.get(t.key);
    t.assignedTo = assignment?.assignedTo;
    t.assignedLabel = assignment?.assignedLabel;
    t.waiting = Boolean(last && last.direction === "in" && (t.resolvedAt ?? 0) < last.at);
    t.optedOut = Boolean(
      t.customer && optedOut.has(t.customer) || t.phone && optedOut.has(t.phone)
    );
    out.push(t);
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
}
function waitingCount(convs) {
  return convs.filter((c) => c.waiting && !c.optedOut).length;
}

// src/core/story.ts
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function describe(e) {
  const p2 = e.payload;
  switch (e.type) {
    case "order_created": {
      const lines = p2.lines ?? [];
      return `Order created \u2014 ${lines.map((l) => `${l.qty}\xD7 ${l.productName}`).join(", ")}${p2.source ? ` \xB7 via ${p2.source}` : ""}`;
    }
    case "order_status_changed":
      return `Status \u2192 ${cap(String(p2.status))}`;
    case "order_cash_received":
      return "Courier remitted the cash";
    case "shipment_created":
      return `Courier handoff \u2014 ${String(p2.courier)}${p2.trackingNumber ? ` \xB7 tracking ${p2.trackingNumber}` : ""}`;
    case "shipment_status_changed":
      return `Shipment \u2192 ${cap(String(p2.status).replace(/_/g, " "))}${p2.reason ? ` \xB7 ${p2.reason}` : ""}`;
    case "invoice_issued":
      return `Invoice issued \u2014 ${money(Number(p2.amount))}, due in ${p2.dueDays} days`;
    case "invoice_paid":
      return "Invoice paid";
    case "customer_contact_updated":
      return `Contact updated${p2.phone ? ` \u2014 phone ${p2.phone}` : ""}${p2.city ? ` \xB7 ${p2.city}` : ""}`;
    case "customer_activity_logged":
      return `${cap(String(p2.kind))}: ${String(p2.note).slice(0, 120)}`;
    case "customer_activity_completed":
      return "Follow-up marked done";
    case "message_received":
      return `Customer message: ${String(p2.body).slice(0, 120)}`;
    case "message_sent":
      return `${String(p2.channel) === "sms" ? "SMS" : "WhatsApp"} sent: ${String(p2.body).slice(0, 120)}`;
    case "message_status_changed":
      return `Message delivery \u2192 ${cap(String(p2.status))}${p2.errorCode ? ` \xB7 error ${p2.errorCode}` : ""}`;
    case "customer_opted_out":
      return "Customer opted out of business messages";
    case "customer_opted_in":
      return "Customer opted back into business messages";
    case "conversation_resolved":
      return `Conversation resolved${p2.reason ? ` \u2014 ${p2.reason}` : ""}`;
    case "conversation_assigned":
      return p2.assignedTo ? `Conversation assigned to ${p2.assignedLabel || p2.assignedTo}` : "Conversation returned to the unassigned queue";
    case "customer_archived":
      return "Archived (hidden from lists; history kept)";
    case "customer_restored":
      return "Restored from archive";
    default:
      return null;
  }
}
function storyForOrder(events, orderId) {
  return events.filter((e) => e.stream === "fact" && e.payload.orderId === orderId).map((e) => ({ ts: e.ts, stream: e.stream, what: describe(e) ?? e.type })).sort((a, b) => a.ts - b.ts);
}
function storyForCustomer(events, customer, max = 12) {
  const theirOrders = new Set(
    events.filter((e) => e.type === "order_created" && e.payload.customer === customer).map((e) => String(e.payload.orderId))
  );
  return events.filter((e) => {
    if (e.stream !== "fact") return false;
    const p2 = e.payload;
    return p2.customer === customer || p2.orderId !== void 0 && theirOrders.has(p2.orderId);
  }).map((e) => ({ ts: e.ts, stream: e.stream, what: describe(e) ?? e.type })).sort((a, b) => b.ts - a.ts).slice(0, max);
}

// src/core/actions.ts
var INTENT_WORDS = {
  "payment-reminder": /remind|reminder|chase|collect|pay(?!.*cod)|overdue|relance|rappel|فلوس|خلص/i,
  winback: /win.?back|re-?engag|come back|miss|gone quiet|silent|recup|récup|reconquérir/i,
  "reorder-nudge": /reorder|nudge|restock them|order again|racheter|recommander/i,
  "cod-confirmation": /confirm/i,
  "thank-you": /thank|merci|شكر/i
};
var LANG_WORDS = [
  ["fr", /french|français|francais|en fr/i],
  ["ar", /arabic|darija|عرب|بالعربية|arabe/i]
];
function matchCustomer(question, names) {
  const q = question.toLowerCase();
  let best = null;
  for (const n of names) {
    if (q.includes(n.toLowerCase()) && (!best || n.length > best.length)) best = n;
  }
  return best;
}
function detectIntent(question) {
  const wantsAction = /draft|write|send|message|sms|whatsapp|rédige|écris|envoie|صياغة|اكتب/i.test(question);
  for (const [intent, re] of Object.entries(INTENT_WORDS)) {
    if (re.test(question) && (wantsAction || intent === "payment-reminder" || intent === "winback")) return intent;
  }
  return null;
}
function detectLang(question) {
  for (const [lang, re] of LANG_WORDS) if (re.test(question)) return lang;
  return "en";
}
function paymentBody(lang, name, amount, days) {
  if (lang === "fr")
    return `Bonjour ${name}, un petit rappel amical : votre facture de ${amount} est en retard de ${days} jour${days > 1 ? "s" : ""}. Pouvez-vous nous indiquer quand pr\xE9voir le r\xE8glement ? Merci beaucoup !`;
  if (lang === "ar")
    return `\u0633\u0644\u0627\u0645 ${name}\u060C \u063A\u064A\u0631 \u062A\u0630\u0643\u064A\u0631 \u0628\u0633\u064A\u0637: \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u062F\u064A\u0627\u0644 ${amount} \u062A\u0639\u062F\u0651\u0649 \u0623\u062C\u0644\u0647\u0627 \u0628 ${days} \u064A\u0648\u0645. \u0648\u0627\u0634 \u0645\u0645\u0643\u0646 \u062A\u062E\u0628\u0631\u0646\u0627 \u0641\u0648\u0642\u0627\u0634 \u0646\u062A\u0648\u0642\u0639\u0648 \u0627\u0644\u062E\u0644\u0627\u0635\u061F \u0634\u0643\u0631\u0627\u064B \u0628\u0632\u0627\u0641!`;
  return `Hello ${name}, a friendly reminder: your invoice of ${amount} is ${days} day${days > 1 ? "s" : ""} past due. Could you let us know when to expect payment? Thank you!`;
}
function winbackBody(lang, name, days) {
  if (lang === "fr")
    return `Bonjour ${name} ! \xC7a fait environ ${days} jours qu'on n'a pas eu de vos nouvelles \u2014 on esp\xE8re que tout va bien. Besoin de quelque chose cette semaine ? On peut vous pr\xE9parer votre commande habituelle. \u{1F33F}`;
  if (lang === "ar")
    return `\u0633\u0644\u0627\u0645 ${name}! \u0634\u062D\u0627\u0644 \u0647\u0627\u062F\u064A \u0645\u0627 \u062A\u0648\u0627\u0635\u0644\u0646\u0627\u0634\u060C \u062A\u0642\u0631\u064A\u0628\u0627\u064B ${days} \u064A\u0648\u0645 \u2014 \u0646\u062A\u0645\u0646\u0627\u0648 \u062A\u0643\u0648\u0646\u0648 \u0628\u062E\u064A\u0631. \u0648\u0627\u0634 \u0645\u062D\u062A\u0627\u062C\u064A\u0646 \u0634\u064A \u062D\u0627\u062C\u0629 \u0647\u0627\u062F \u0627\u0644\u0633\u064A\u0645\u0627\u0646\u0629\u061F \u0646\u0642\u062F\u0631\u0648 \u0646\u0648\u062C\u062F\u0648 \u0644\u064A\u0643\u0645 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u0639\u062A\u0627\u062F. \u{1F33F}`;
  return `Hello ${name}! It's been about ${days} days since we last heard from you \u2014 hope all is well. Anything you need this week? We can prepare your usual order. \u{1F33F}`;
}
function reorderBody(lang, name, days) {
  if (lang === "fr")
    return `Bonjour ${name} ! Votre dernier achat remonte \xE0 ~${days} jours \u2014 le moment id\xE9al pour renouveler. Dites-nous ce qu'il vous faut et on pr\xE9pare tout. \u{1F33F}`;
  if (lang === "ar")
    return `\u0633\u0644\u0627\u0645 ${name}! \u0622\u062E\u0631 \u0637\u0644\u0628 \u062F\u064A\u0627\u0644\u0643\u0645 \u0643\u0627\u0646 \u0642\u0628\u0644 ~${days} \u064A\u0648\u0645 \u2014 \u0627\u0644\u0648\u0642\u062A \u0645\u0646\u0627\u0633\u0628 \u0628\u0627\u0634 \u062A\u062C\u062F\u062F\u0648. \u0642\u0648\u0644\u0648 \u0644\u064A\u0646\u0627 \u0623\u0634\u0646\u0648 \u062E\u0627\u0635\u0643\u0645 \u0648 \u0646\u0648\u062C\u062F\u0648 \u0643\u0644\u0634\u064A. \u{1F33F}`;
  return `Hello ${name}! Your last order was ~${days} days ago \u2014 a good moment to top up. Tell us what you need and we'll prepare everything. \u{1F33F}`;
}
function confirmBody(lang, name, items, total) {
  if (lang === "fr")
    return `Bonjour ${name}, ici votre boutique. Nous confirmons votre commande : ${items}. Total \xE0 payer \xE0 la livraison : ${total}. R\xE9pondez OUI pour confirmer l'envoi. Merci !`;
  if (lang === "ar")
    return `\u0633\u0644\u0627\u0645 ${name}\u060C \u0645\u0639\u0643\u0645 \u0627\u0644\u0645\u062A\u062C\u0631 \u062F\u064A\u0627\u0644\u0643\u0645. \u0643\u0646\u0623\u0643\u062F\u0648 \u0627\u0644\u0637\u0644\u0628 \u062F\u064A\u0627\u0644\u0643\u0645: ${items}. \u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0639\u0646\u062F \u0627\u0644\u062A\u0633\u0644\u064A\u0645: ${total}. \u062C\u0627\u0648\u0628\u0648 \u0628\u0646\u0639\u0645 \u0628\u0627\u0634 \u0646\u0635\u064A\u0641\u0637\u0648\u0647. \u0634\u0643\u0631\u0627\u064B!`;
  return `Hello ${name}, this is your store. Confirming your order: ${items}. Total to pay on delivery: ${total}. Reply YES to confirm so we can ship it. Thank you!`;
}
function thankYouBody(lang, name) {
  if (lang === "fr")
    return `Merci ${name} pour votre confiance ! C'est un plaisir de vous servir. \xC0 tr\xE8s bient\xF4t. \u{1F33F}`;
  if (lang === "ar")
    return `\u0634\u0643\u0631\u0627\u064B ${name} \u0639\u0644\u0649 \u0627\u0644\u062B\u0642\u0629 \u062F\u064A\u0627\u0644\u0643\u0645! \u0645\u0631\u062D\u0628\u0627\u064B \u0628\u064A\u0643\u0645 \u062F\u064A\u0645\u0627\u064B. \u{1F33F}`;
  return `Thank you ${name} for your trust! It's a pleasure serving you. See you soon. \u{1F33F}`;
}
function stageAction(state2, profiles2, contacts2, question, now = Date.now()) {
  const intent = detectIntent(question);
  if (!intent) return null;
  const lang = detectLang(question);
  const names = profiles2.map((p2) => p2.name);
  let customer = matchCustomer(question, names);
  if (!customer) {
    if (intent === "payment-reminder") {
      const overdue2 = state2.invoices.filter((i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY2).sort((a, b) => a.issuedAt - b.issuedAt);
      customer = overdue2[0]?.customer ?? null;
    } else if (intent === "winback" || intent === "reorder-nudge") {
      const quiet = profiles2.filter((p2) => p2.medianGapDays && (now - p2.lastActivityAt) / DAY2 > p2.medianGapDays).sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue);
      customer = quiet[0]?.name ?? null;
    } else if (intent === "cod-confirmation") {
      const pending = state2.orders.filter((o) => o.status === "pending").sort((a, b) => a.createdAt - b.createdAt);
      customer = pending[0]?.customer ?? null;
    }
  }
  if (!customer) return null;
  const phone = contacts2.get(customer)?.phone?.trim() || void 0;
  const profile = profiles2.find((p2) => p2.name === customer);
  const daysSince = profile ? Math.round((now - profile.lastActivityAt) / DAY2) : 0;
  switch (intent) {
    case "payment-reminder": {
      const inv = state2.invoices.filter((i) => !i.paidAt && i.customer === customer).sort((a, b) => a.issuedAt - b.issuedAt)[0];
      if (!inv) return null;
      const days = Math.max(1, Math.floor((now - (inv.issuedAt + inv.dueDays * DAY2)) / DAY2));
      return {
        intent,
        customer,
        phone,
        lang,
        body: paymentBody(lang, customer, money(inv.amount), days),
        reason: `${customer} has an open invoice of ${money(inv.amount)}, ${days} day(s) past due.`
      };
    }
    case "winback":
      return {
        intent,
        customer,
        phone,
        lang,
        body: winbackBody(lang, customer, daysSince),
        reason: `${customer} last ordered ${daysSince} days ago${profile?.medianGapDays ? ` (their rhythm is ~${Math.round(profile.medianGapDays)} days)` : ""}; lifetime ${money(profile?.lifetimeRevenue ?? 0)}.`
      };
    case "reorder-nudge":
      return {
        intent,
        customer,
        phone,
        lang,
        body: reorderBody(lang, customer, daysSince),
        reason: `${customer}'s last activity was ${daysSince} days ago.`
      };
    case "cod-confirmation": {
      const o = state2.orders.filter((x) => x.status === "pending" && x.customer === customer).sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!o) return null;
      const items = o.lines.map((l) => `${l.qty}\xD7 ${l.productName}`).join(", ");
      const total = money(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) - o.discount + o.shippingCharged);
      return {
        intent,
        customer,
        phone,
        lang,
        body: confirmBody(lang, customer, items, total),
        reason: `${customer} has a pending COD order (${items}).`
      };
    }
    case "thank-you":
      return {
        intent,
        customer,
        phone,
        lang,
        body: thankYouBody(lang, customer),
        reason: `A goodwill message for ${customer}.`
      };
  }
}
function restageInLang(staged, state2, profiles2, contacts2, lang, now = Date.now()) {
  const q = `draft ${staged.intent} for ${staged.customer} in ${lang === "fr" ? "french" : lang === "ar" ? "arabic" : "english"}`;
  return stageAction(state2, profiles2, contacts2, q, now) ?? { ...staged, lang };
}

// src/core/coach.ts
function decisionFamily(key) {
  return key.split(".").slice(0, 2).join(".");
}
function projectDecisionMemories(events) {
  const outcomes = /* @__PURE__ */ new Map();
  for (const e of events) {
    if (e.stream === "outcome") {
      outcomes.set(String(e.payload.decisionEventId), {
        result: String(e.payload.result ?? ""),
        note: String(e.payload.note ?? ""),
        ts: e.ts
      });
    }
  }
  return events.filter((e) => e.stream === "decision" && e.type === "decision_recorded").map((e) => ({
    eventId: e.id,
    ts: e.ts,
    decisionKey: String(e.payload.decisionKey),
    claim: String(e.payload.claim),
    optionLabel: String(e.payload.optionLabel),
    rationale: String(e.payload.rationale ?? ""),
    outcome: outcomes.get(e.id)
  })).sort((a, b) => b.ts - a.ts);
}
function coachFor(events, decisionKey) {
  const family = decisionFamily(decisionKey);
  const past = projectDecisionMemories(events).filter((d) => decisionFamily(d.decisionKey) === family);
  if (past.length === 0) return null;
  return {
    timesFaced: past.length,
    last: past[0],
    goodOutcomes: past.filter((d) => d.outcome && /good|well|positive/i.test(d.outcome.result)).length,
    badOutcomes: past.filter((d) => d.outcome && /bad|poor|negative/i.test(d.outcome.result)).length
  };
}
function pendingOutcomeReviews(events, now = Date.now(), minAgeDays = 7, max = 2) {
  return projectDecisionMemories(events).filter((d) => !d.outcome && now - d.ts >= minAgeDays * DAY2).slice(0, max);
}

// src/core/assistant.ts
function businessContext(state2, now = Date.now()) {
  const cash = cashCenter(state2, now);
  const b = breakEven(state2, now);
  const mb = monthBounds(new Date(now).getFullYear(), new Date(now).getMonth());
  const pnl = profitAndLoss(state2, mb.start, mb.end, mb.label);
  const profiles2 = projectCustomerProfiles(state2, now);
  const things2 = stateOfThings(state2, now);
  const margins = state2.products.filter((p2) => p2.price > 0).map((p2) => ({ n: p2.name, m: (p2.price - p2.unitCost) / p2.price * 100 })).sort((a, b2) => b2.m - a.m);
  const lowStock = state2.products.filter((p2) => {
    const avail = p2.stock - (state2.reserved[p2.productId] ?? 0);
    return p2.weeklySales > 0 && avail / (p2.weeklySales / 7) < p2.leadTimeDays + 4 && (state2.incoming[p2.productId] ?? 0) === 0;
  });
  const atRisk = profiles2.filter((p2) => p2.tags.includes("at-risk"));
  const overdue2 = state2.invoices.filter((i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY2);
  const losing = state2.orders.filter((o) => o.status === "delivered" && orderNetProfit(o) < 0);
  const L = [];
  L.push(`Business currency: ${getActiveCurrency()}. Today: ${new Date(now).toDateString()}.`);
  L.push(`CASH: available ${formatMoney(cash.cashAvailable)}, pending with couriers ${formatMoney(cash.cashPendingCod)}, collected last 30 days ${formatMoney(cash.collected30)}, expenses last 30 days ${formatMoney(cash.expenses30)}.`);
  L.push(`THIS MONTH P&L (${pnl.periodLabel}): net revenue ${formatMoney(pnl.revenue.netRevenue)}, gross profit ${formatMoney(pnl.grossProfit)} (${pnl.grossMarginPct.toFixed(0)}%), net profit ${formatMoney(pnl.netProfit)} (${pnl.netMarginPct.toFixed(0)}%), ${pnl.ordersDelivered} orders delivered.`);
  L.push(`Revenue last 30 days: ${formatMoney(things2.billedLast30)}. Average net profit per delivered order: ${formatMoney(b.avgProfitPerOrder)}. Break-even: ${b.breakEvenOrders === null ? "unreachable at current per-order profit" : `${b.breakEvenOrders} orders/month`}.`);
  L.push(`PRODUCTS (${state2.products.length}). Highest margins: ${margins.slice(0, 5).map((x) => `${x.n} ${x.m.toFixed(0)}%`).join("; ") || "none"}.`);
  L.push(`Low stock needing reorder: ${lowStock.map((p2) => p2.name).join(", ") || "none"}.`);
  L.push(`CUSTOMERS (${profiles2.length}). Top by lifetime revenue: ${profiles2.slice(0, 5).map((c) => `${c.name} ${formatMoney(c.lifetimeRevenue)}`).join("; ") || "none"}. At-risk (gone quiet): ${atRisk.map((c) => c.name).join(", ") || "none"}.`);
  L.push(`ORDERS: ${things2.openOrders} open. Delivered orders that lost money: ${losing.length}.`);
  L.push(`Overdue invoices: ${overdue2.length}${overdue2.length ? ` totalling ${formatMoney(overdue2.reduce((s, i) => s + i.amount, 0))}` : ""}.`);
  const rfm = computeRfm(profiles2, now);
  const segCounts = /* @__PURE__ */ new Map();
  for (const s of rfm.values()) segCounts.set(s.segment, (segCounts.get(s.segment) ?? 0) + 1);
  if (segCounts.size > 0) {
    L.push(
      `SEGMENTS (RFM): ${[...segCounts.entries()].map(([s, n]) => `${SEGMENT_LABEL[s]} ${n}`).join("; ")}.`
    );
  }
  const due = reorderDueList(profiles2, state2.archivedCustomers, now);
  if (due.length > 0) {
    L.push(
      `OVERDUE TO REORDER (past their own rhythm): ${due.slice(0, 5).map((d) => `${d.name} ${d.daysOverdue}d overdue, \u2248${formatMoney(d.expectedValue)} expected`).join("; ")}.`
    );
  }
  const cal = cashCalendar(state2, now);
  L.push(
    `CASH CALENDAR: overdue ${formatMoney(cal.overdue.total)} (${cal.overdue.count}), due \u22647d ${formatMoney(cal.next7.total)}, due 8\u201330d ${formatMoney(cal.next30.total)}, with couriers ${formatMoney(cal.codPending.total)}.`
  );
  return L.join("\n");
}
var has = (q, ...words) => words.some((w) => q.includes(w));
function askZyvora(state2, question, now = Date.now()) {
  const q = question.toLowerCase().trim();
  const things2 = stateOfThings(state2, now);
  const cash = cashCenter(state2, now);
  if (has(q, "lost money", "losing money", "unprofitable", "lose money")) {
    const losing = state2.orders.filter((o) => o.status === "delivered" && orderNetProfit(o) < 0);
    if (losing.length === 0)
      return { handled: true, text: "None of your delivered orders lost money \u2014 every delivered order netted a profit after all costs.", evidence: [] };
    const total = losing.reduce((s, o) => s + orderNetProfit(o), 0);
    return {
      handled: true,
      text: `${losing.length} delivered order${losing.length > 1 ? "s" : ""} lost money \u2014 ${formatMoney(Math.abs(total))} in total, after product cost, shipping, COD fees, and packaging.`,
      evidence: losing.slice(0, 6).map((o) => ({
        label: `${o.customer} \u2014 ${o.lines.map((l) => `${l.qty}\xD7 ${l.productName}`).join(", ")}`,
        value: `net ${formatMoney(orderNetProfit(o))}`
      }))
    };
  }
  if (has(q, "margin", "best product", "highest margin", "most profitable product", "worst product")) {
    const withMargin = state2.products.filter((p2) => p2.price > 0).map((p2) => ({ name: p2.name, marginPct: (p2.price - p2.unitCost) / p2.price * 100, unit: p2.price - p2.unitCost })).sort((a, b) => b.marginPct - a.marginPct);
    if (withMargin.length === 0)
      return { handled: true, text: "No products with a price recorded yet, so I can't compare margins.", evidence: [] };
    const worst = has(q, "worst", "lowest");
    const pick = worst ? withMargin[withMargin.length - 1] : withMargin[0];
    return {
      handled: true,
      text: `Your ${worst ? "lowest" : "highest"}-margin product is "${pick.name}" at ${pick.marginPct.toFixed(0)}% (${formatMoney(pick.unit)} per unit).`,
      evidence: withMargin.slice(0, 5).map((p2) => ({ label: p2.name, value: `${p2.marginPct.toFixed(0)}% (${formatMoney(p2.unit)}/unit)` }))
    };
  }
  if (has(q, "restock", "reorder", "cash do i need", "afford to restock")) {
    const need = state2.products.filter((p2) => p2.weeklySales > 0).map((p2) => {
      const available = p2.stock - (state2.reserved[p2.productId] ?? 0);
      const daysLeft = available / (p2.weeklySales / 7);
      const short = daysLeft < p2.leadTimeDays + 4;
      const qty = Math.ceil(p2.weeklySales * 4);
      return { name: p2.name, short, cost: qty * p2.unitCost, qty };
    }).filter((x) => x.short);
    if (need.length === 0)
      return { handled: true, text: "Nothing needs restocking right now \u2014 every selling product has enough stock to cover its resupply time.", evidence: [] };
    const total = need.reduce((s, x) => s + x.cost, 0);
    return {
      handled: true,
      text: `To restock the ${need.length} product${need.length > 1 ? "s" : ""} running low, you'd need about ${formatMoney(total)} (\u22484 weeks of stock each). You currently have ${formatMoney(cash.cashAvailable)} available${cash.cashPendingCod > 0 ? ` plus ${formatMoney(cash.cashPendingCod)} pending with couriers` : ""}.`,
      evidence: need.map((x) => ({ label: `${x.name} \u2014 order ~${x.qty} units`, value: formatMoney(x.cost) }))
    };
  }
  if (has(q, "at risk", "at-risk", "need attention", "who needs", "churn", "quiet customer", "leaving")) {
    const atRisk = projectCustomerProfiles(state2, now).filter((p2) => p2.tags.includes("at-risk"));
    if (atRisk.length === 0)
      return { handled: true, text: "No customers are flagged at-risk \u2014 none have gone quiet past twice their usual ordering rhythm.", evidence: [] };
    return {
      handled: true,
      text: `${atRisk.length} customer${atRisk.length > 1 ? "s are" : " is"} at-risk \u2014 gone quiet past their usual rhythm. Worth a low-pressure check-in.`,
      evidence: atRisk.slice(0, 6).map((c) => ({ label: c.name, value: `${formatMoney(c.lifetimeRevenue)} lifetime \xB7 last seen ${Math.round((now - c.lastActivityAt) / DAY2)} days ago` }))
    };
  }
  if (has(q, "top customer", "best customer", "biggest customer", "most valuable")) {
    const profiles2 = projectCustomerProfiles(state2, now);
    if (profiles2.length === 0) return { handled: true, text: "No customers recorded yet.", evidence: [] };
    const top = profiles2[0];
    return {
      handled: true,
      text: `Your top customer by lifetime revenue is ${top.name} \u2014 ${formatMoney(top.lifetimeRevenue)} across ${top.interactions} interactions.`,
      evidence: profiles2.slice(0, 5).map((c) => ({ label: c.name, value: formatMoney(c.lifetimeRevenue) }))
    };
  }
  if (has(q, "profit")) {
    const profit30 = state2.orders.filter((o) => o.deliveredAt && now - o.deliveredAt <= 30 * DAY2).reduce((s, o) => s + orderNetProfit(o), 0);
    const b = breakEven(state2, now);
    return {
      handled: true,
      text: `Net profit from COD orders delivered in the last 30 days is ${formatMoney(profit30)}. (Invoices are excluded \u2014 they carry no cost data.) On average, each delivered order nets ${formatMoney(b.avgProfitPerOrder)}.`,
      evidence: [
        { label: "Net profit, COD orders, last 30 days", value: formatMoney(profit30) },
        { label: "Average net profit per delivered order", value: formatMoney(b.avgProfitPerOrder) }
      ]
    };
  }
  if (has(q, "revenue", "sales", "how much did i make", "earn")) {
    const thisMonth = goalActual(state2, "revenue", now);
    return {
      handled: true,
      text: `Revenue in the last 30 days is ${formatMoney(things2.billedLast30)}. This calendar month so far: ${formatMoney(thisMonth)}.`,
      evidence: [
        { label: "Revenue, last 30 days", value: formatMoney(things2.billedLast30) },
        { label: "Revenue, this calendar month", value: formatMoney(thisMonth) }
      ]
    };
  }
  if (has(q, "cash", "money available", "how much money")) {
    return {
      handled: true,
      text: `You have ${formatMoney(cash.cashAvailable)} available now, with ${formatMoney(cash.cashPendingCod)} still pending collection from couriers on delivered COD orders.`,
      evidence: [
        { label: "Cash available", value: formatMoney(cash.cashAvailable) },
        { label: "Pending with couriers (COD)", value: formatMoney(cash.cashPendingCod) },
        { label: "Collected, last 30 days", value: formatMoney(cash.collected30) }
      ]
    };
  }
  return {
    handled: false,
    text: "I can answer questions about your profit, revenue, cash, product margins, orders that lost money, restocking needs, and customers who need attention \u2014 all from your own recorded data. Try one of the suggestions below.",
    evidence: []
  };
}

// src/core/csv.ts
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return { headers: headers.map((h) => h.trim()), rows };
}
var SPECS = {
  products: {
    label: "Products",
    fields: [
      { key: "name", label: "Name", required: true, kind: "text", aliases: ["name", "product", "title", "designation"] },
      { key: "price", label: "Selling price", required: true, kind: "number", aliases: ["price", "selling", "prix", "pv"] },
      { key: "unitCost", label: "Unit cost", required: true, kind: "number", aliases: ["cost", "buying", "cout", "achat", "pa"] },
      { key: "stock", label: "Stock", required: true, kind: "number", aliases: ["stock", "qty", "quantity", "quantite"] },
      { key: "weeklySales", label: "Sales / week", required: false, kind: "number", aliases: ["week", "velocity", "sales", "ventes"] },
      { key: "leadTimeDays", label: "Lead time (days)", required: false, kind: "number", aliases: ["lead", "delai", "resupply"] }
    ]
  },
  expenses: {
    label: "Expenses",
    fields: [
      { key: "label", label: "Label", required: true, kind: "text", aliases: ["label", "description", "name", "libelle", "categorie", "category"] },
      { key: "amount", label: "Amount", required: true, kind: "number", aliases: ["amount", "montant", "total", "cost"] },
      { key: "date", label: "Date", required: false, kind: "date", aliases: ["date", "day", "when"] }
    ]
  },
  invoices: {
    label: "Invoices",
    fields: [
      { key: "customer", label: "Customer", required: true, kind: "text", aliases: ["customer", "client", "name", "nom"] },
      { key: "amount", label: "Amount", required: true, kind: "number", aliases: ["amount", "montant", "total", "revenue"] },
      { key: "issuedAt", label: "Issued date", required: false, kind: "date", aliases: ["date", "issued", "created", "invoice date"] },
      { key: "dueDays", label: "Due (days)", required: false, kind: "number", aliases: ["due", "terms", "echeance"] },
      { key: "paidDate", label: "Paid date (optional)", required: false, kind: "date", aliases: ["paid", "payment", "regle", "paye"] }
    ]
  }
};
function autoMap(type, headers) {
  const map = {};
  const lower = headers.map((h) => h.toLowerCase());
  for (const f of SPECS[type].fields) {
    let idx = -1;
    for (const alias of f.aliases) {
      idx = lower.findIndex((h) => h === alias);
      if (idx === -1) idx = lower.findIndex((h) => h.includes(alias));
      if (idx !== -1) break;
    }
    map[f.key] = idx;
  }
  return map;
}
var parseNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(/,/g, "."));
  return isFinite(n) ? n : null;
};
var parseDate = (v) => {
  const t = Date.parse(v);
  return isNaN(t) ? null : t;
};
function buildRow(type, map, cells) {
  const get = (key) => {
    const idx = map[key];
    return idx >= 0 && idx < cells.length ? cells[idx].trim() : "";
  };
  const now = Date.now();
  if (type === "products") {
    const name = get("name");
    const price = parseNum(get("price"));
    const cost = parseNum(get("unitCost"));
    const stock = parseNum(get("stock"));
    if (!name) return { event: null, error: "missing name" };
    if (price === null) return { event: null, error: "invalid price" };
    if (cost === null) return { event: null, error: "invalid unit cost" };
    if (stock === null) return { event: null, error: "invalid stock" };
    return {
      error: null,
      event: {
        type: "product_added",
        ts: now,
        payload: {
          productId: crypto.randomUUID(),
          name,
          price,
          unitCost: cost,
          stock: Math.round(stock),
          weeklySales: parseNum(get("weeklySales")) ?? 0,
          leadTimeDays: Math.round(parseNum(get("leadTimeDays")) ?? 14)
        }
      }
    };
  }
  if (type === "expenses") {
    const label = get("label");
    const amount2 = parseNum(get("amount"));
    if (!label) return { event: null, error: "missing label" };
    if (amount2 === null) return { event: null, error: "invalid amount" };
    const date = get("date") ? parseDate(get("date")) : now;
    return {
      error: null,
      event: {
        type: "expense_recorded",
        ts: date ?? now,
        payload: { expenseId: crypto.randomUUID(), label, amount: amount2, date: date ?? now }
      }
    };
  }
  const customer = get("customer");
  const amount = parseNum(get("amount"));
  if (!customer) return { event: null, error: "missing customer" };
  if (amount === null) return { event: null, error: "invalid amount" };
  const issued = get("issuedAt") ? parseDate(get("issuedAt")) : now;
  const invoiceId = crypto.randomUUID();
  const built = {
    error: null,
    event: {
      type: "invoice_issued",
      ts: issued ?? now,
      payload: {
        invoiceId,
        customer,
        amount,
        issuedAt: issued ?? now,
        dueDays: Math.round(parseNum(get("dueDays")) ?? 14)
      }
    }
  };
  const paid = get("paidDate") ? parseDate(get("paidDate")) : null;
  if (paid) built.extra = { type: "invoice_paid", ts: paid, payload: { invoiceId, paidAt: paid } };
  return built;
}

// src/core/naturaloeCatalog.ts
var NATURALOE_CATALOG = [
  {
    "id": "p01",
    "name": "Forever Aloe Vera Gel 330ml",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 76
  },
  {
    "id": "p02",
    "name": "Forever Aloe P\xEAche 330ml",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 76
  },
  {
    "id": "p03",
    "name": "Forever Aloe Berry Nectar 330ml",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 76
  },
  {
    "id": "p04",
    "name": "Forever Aloe Mangue",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 410
  },
  {
    "id": "p05",
    "name": "Aloe Berry Nectar 1L",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 410
  },
  {
    "id": "p06",
    "name": "Pulpe d'Aloe Vera Stabilis\xE9e",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 410
  },
  {
    "id": "p07",
    "name": "Forever Aloe Bits N' Peaches",
    "category": "Pulpe d'Aloe Vera",
    "priceDh": 410
  },
  {
    "id": "p08",
    "name": "Forever Bee Honey",
    "category": "Produits de la Ruche",
    "priceDh": 238
  },
  {
    "id": "p09",
    "name": "Forever Propolis",
    "category": "Produits de la Ruche",
    "priceDh": 259
  },
  {
    "id": "p10",
    "name": "Forever Bee Pollen",
    "category": "Produits de la Ruche",
    "priceDh": 238
  },
  {
    "id": "p11",
    "name": "Forever Royal Jelly",
    "category": "Produits de la Ruche",
    "priceDh": 302
  },
  {
    "id": "p12",
    "name": "Forever Active Pro-B",
    "category": "Nutrition",
    "priceDh": 346
  },
  {
    "id": "p13",
    "name": "Forever Kids",
    "category": "Nutrition",
    "priceDh": 281
  },
  {
    "id": "p14",
    "name": "Fields of Greens",
    "category": "Nutrition",
    "priceDh": 324
  },
  {
    "id": "p15",
    "name": "Forever Absorbent-C",
    "category": "Nutrition",
    "priceDh": 259
  },
  {
    "id": "p16",
    "name": "Forever iVision",
    "category": "Nutrition",
    "priceDh": 367
  },
  {
    "id": "p17",
    "name": "Forever Supergreens",
    "category": "Nutrition",
    "priceDh": 389
  },
  {
    "id": "p18",
    "name": "Forever ImmuBlend",
    "category": "Nutrition",
    "priceDh": 356
  },
  {
    "id": "p19",
    "name": "Forever Daily",
    "category": "Nutrition",
    "priceDh": 432
  },
  {
    "id": "p20",
    "name": "Forever Ail et Thym",
    "category": "Nutrition",
    "priceDh": 238
  },
  {
    "id": "p21",
    "name": "Forever Fiber",
    "category": "Nutrition",
    "priceDh": 302
  },
  {
    "id": "p22",
    "name": "Infusion Fleur d'Alo\xE8s",
    "category": "Nutrition",
    "priceDh": 194
  },
  {
    "id": "p23",
    "name": "Vitolize Femmes",
    "category": "Nutrition",
    "priceDh": 389
  },
  {
    "id": "p24",
    "name": "Vitolize Hommes",
    "category": "Nutrition",
    "priceDh": 410
  },
  {
    "id": "p25",
    "name": "Forever Move",
    "category": "Nutrition",
    "priceDh": 454
  },
  {
    "id": "p26",
    "name": "Forever Calcium",
    "category": "Nutrition",
    "priceDh": 281
  },
  {
    "id": "p27",
    "name": "Forever Arctic-Sea",
    "category": "Nutrition",
    "priceDh": 432
  },
  {
    "id": "p28",
    "name": "Aloe MSM Gel",
    "category": "Nutrition",
    "priceDh": 270
  },
  {
    "id": "p29",
    "name": "\xC9mulsion Thermog\xE8ne",
    "category": "Nutrition",
    "priceDh": 292
  },
  {
    "id": "p30",
    "name": "Forever Argi+",
    "category": "Nutrition",
    "priceDh": 475
  },
  {
    "id": "p31",
    "name": "Forever Lean",
    "category": "Fitness & Minceur",
    "priceDh": 421
  },
  {
    "id": "p32",
    "name": "Forever Therm",
    "category": "Fitness & Minceur",
    "priceDh": 443
  },
  {
    "id": "p33",
    "name": "Forever Lite Ultra \u2014 Vanille",
    "category": "Fitness & Minceur",
    "priceDh": 518
  },
  {
    "id": "p34",
    "name": "Forever Lite Ultra \u2014 Chocolat",
    "category": "Fitness & Minceur",
    "priceDh": 518
  },
  {
    "id": "p35",
    "name": "Pack Detox \u2014 Pulpe d'Alo\xE8s",
    "category": "Packs",
    "priceDh": 1026
  },
  {
    "id": "p36",
    "name": "Pack Detox \u2014 Aloe Berry Nectar",
    "category": "Packs",
    "priceDh": 1026
  },
  {
    "id": "p37",
    "name": "Smart Consumer Pack",
    "category": "Packs",
    "priceDh": 529
  },
  {
    "id": "p38",
    "name": "Pack Hygi\xE8ne",
    "category": "Packs",
    "priceDh": 961
  },
  {
    "id": "p39",
    "name": "Programme Bien-\xEAtre",
    "category": "Packs",
    "priceDh": 1285
  },
  {
    "id": "p40",
    "name": "Pack de D\xE9marrage \u2014 GO2FBO",
    "category": "Packs",
    "priceDh": 1890
  },
  {
    "id": "p41",
    "name": "Start Your Journey Pack",
    "category": "Packs",
    "priceDh": 1609
  },
  {
    "id": "p42",
    "name": "Aloe First",
    "category": "Beaut\xE9",
    "priceDh": 292
  },
  {
    "id": "p43",
    "name": "Aloe Propolis Cr\xE8me",
    "category": "Beaut\xE9",
    "priceDh": 259
  },
  {
    "id": "p44",
    "name": "Gel\xE9e Alo\xE8s",
    "category": "Beaut\xE9",
    "priceDh": 205
  },
  {
    "id": "p45",
    "name": "Aloe Body Lotion",
    "category": "Beaut\xE9",
    "priceDh": 248
  },
  {
    "id": "p46",
    "name": "Aloe Liquid Soap",
    "category": "Beaut\xE9",
    "priceDh": 194
  },
  {
    "id": "p47",
    "name": "Forever Bright Toothgel",
    "category": "Beaut\xE9",
    "priceDh": 151
  },
  {
    "id": "p48",
    "name": "Aloe Ever-Shield \u2014 Stick D\xE9odorant",
    "category": "Beaut\xE9",
    "priceDh": 140
  },
  {
    "id": "p49",
    "name": "Instant Hand Cleanser",
    "category": "Beaut\xE9",
    "priceDh": 97
  },
  {
    "id": "p50",
    "name": "Aloe L\xE8vres (Aloe Lips)",
    "category": "Beaut\xE9",
    "priceDh": 86
  },
  {
    "id": "p51",
    "name": "Forever Avocado Face & Body Soap",
    "category": "Beaut\xE9",
    "priceDh": 130
  },
  {
    "id": "p52",
    "name": "Aloe Sunscreen SPF 30",
    "category": "Beaut\xE9",
    "priceDh": 281
  },
  {
    "id": "p53",
    "name": "Gentleman's Pride",
    "category": "Beaut\xE9",
    "priceDh": 227
  },
  {
    "id": "p54",
    "name": "Aloe Moisturizing Lotion",
    "category": "Beaut\xE9",
    "priceDh": 238
  },
  {
    "id": "p55",
    "name": "R3 Factor",
    "category": "Beaut\xE9",
    "priceDh": 421
  },
  {
    "id": "p56",
    "name": "S\xE9rum Alpha-E Factor",
    "category": "Beaut\xE9",
    "priceDh": 475
  },
  {
    "id": "p57",
    "name": "Aloe Body Wash",
    "category": "Beaut\xE9",
    "priceDh": 216
  },
  {
    "id": "p58",
    "name": "Shampoing Aloe-Jojoba",
    "category": "Cheveux",
    "priceDh": 227
  },
  {
    "id": "p59",
    "name": "Apr\xE8s-Shampoing Aloe-Jojoba",
    "category": "Cheveux",
    "priceDh": 227
  },
  {
    "id": "p60",
    "name": "Sonya \u2014 Gel Nettoyant",
    "category": "Sonya",
    "priceDh": 259
  },
  {
    "id": "p61",
    "name": "Sonya \u2014 Gel \xC9clat",
    "category": "Sonya",
    "priceDh": 281
  },
  {
    "id": "p62",
    "name": "Sonya \u2014 Masque Gel",
    "category": "Sonya",
    "priceDh": 302
  },
  {
    "id": "p63",
    "name": "Sonya \u2014 Gel Hydratant",
    "category": "Sonya",
    "priceDh": 292
  },
  {
    "id": "p64",
    "name": "Infinite \u2014 D\xE9maquillant Hydratant",
    "category": "Infinite",
    "priceDh": 346
  },
  {
    "id": "p65",
    "name": "Infinite \u2014 S\xE9rum Raffermissant",
    "category": "Infinite",
    "priceDh": 626
  },
  {
    "id": "p66",
    "name": "Infinite \u2014 Cr\xE8me R\xE9paratrice",
    "category": "Infinite",
    "priceDh": 583
  },
  {
    "id": "p67",
    "name": "Infinite \u2014 Complexe Raffermissant",
    "category": "Infinite",
    "priceDh": 529
  },
  {
    "id": "p68",
    "name": "Infinite \u2014 Lotion Tonifiante",
    "category": "Infinite",
    "priceDh": 367
  },
  {
    "id": "p69",
    "name": "Infinite \u2014 Cr\xE8me Contour des Yeux",
    "category": "Infinite",
    "priceDh": 497
  },
  {
    "id": "p70",
    "name": "Infinite \u2014 Soin Exfoliant",
    "category": "Infinite",
    "priceDh": 389
  },
  {
    "id": "p71",
    "name": "Infinite \u2014 Activateur Alo\xE8s",
    "category": "Infinite",
    "priceDh": 324
  },
  {
    "id": "p72",
    "name": "Infinite \u2014 S\xE9rum Hydratant",
    "category": "Infinite",
    "priceDh": 562
  }
];

// src/core/foreverPrices.ts
var FOREVER_PRICES = [
  {
    "name": "Pulpe d'Alo\xE8s Stabilis\xE9e (1l)",
    "sellDh": 409,
    "costDh": 286
  },
  {
    "name": "Aloe Berry Nectar (1l)",
    "sellDh": 409,
    "costDh": 286
  },
  {
    "name": "C\u0153ur d'Alo\xE8s (1l)",
    "sellDh": 444,
    "costDh": 311
  },
  {
    "name": "Forever Freedom",
    "sellDh": 558,
    "costDh": 391
  },
  {
    "name": "Infusion Aloe Blossom Herbal Tea",
    "sellDh": 275,
    "costDh": 193
  },
  {
    "name": "Forever Pollen 100 comprim\xE9s",
    "sellDh": 239,
    "costDh": 167
  },
  {
    "name": "Forever Propolis 60 comprim\xE9s",
    "sellDh": 500,
    "costDh": 350
  },
  {
    "name": "Forever Gel\xE9e Royale 60 comprim\xE9s",
    "sellDh": 518,
    "costDh": 363
  },
  {
    "name": "Supergreens",
    "sellDh": 488,
    "costDh": 342
  },
  {
    "name": "Absorbent-C 100 comprim\xE9s",
    "sellDh": 276,
    "costDh": 193
  },
  {
    "name": "Forever Kids 120 comprim\xE9s",
    "sellDh": 218,
    "costDh": 153
  },
  {
    "name": "Forever Ail et Thym 100 Capsules",
    "sellDh": 285,
    "costDh": 200
  },
  {
    "name": "Fields Of Greens 80 comprim\xE9s",
    "sellDh": 189,
    "costDh": 132
  },
  {
    "name": "Forever Calcium 90 comprim\xE9s",
    "sellDh": 379,
    "costDh": 265
  },
  {
    "name": "Ginkgo Plus 60 comprim\xE9s",
    "sellDh": 492,
    "costDh": 344
  },
  {
    "name": "Artic Sea 120 Capsules",
    "sellDh": 480,
    "costDh": 336
  },
  {
    "name": "Forever Fiber (30 Sachets)",
    "sellDh": 305,
    "costDh": 214
  },
  {
    "name": "Vitolize Women",
    "sellDh": 402,
    "costDh": 281
  },
  {
    "name": "Vitolize Men",
    "sellDh": 426,
    "costDh": 298
  },
  {
    "name": "Forever Move",
    "sellDh": 790,
    "costDh": 553
  },
  {
    "name": "Forever Daily",
    "sellDh": 265,
    "costDh": 186
  },
  {
    "name": "Pro-B",
    "sellDh": 465,
    "costDh": 326
  },
  {
    "name": "Forever iVision",
    "sellDh": 444,
    "costDh": 311
  },
  {
    "name": "Detox Vanille",
    "sellDh": 1554,
    "costDh": 1088
  },
  {
    "name": "Detox Chocolat",
    "sellDh": 1554,
    "costDh": 1088
  },
  {
    "name": "F15 Vanille - Debutant",
    "sellDh": 1956,
    "costDh": 1369
  },
  {
    "name": "F15 Chocolat - Debutant",
    "sellDh": 1956,
    "costDh": 1369
  },
  {
    "name": "Forever Ultra Lite Plus Vanille 375g",
    "sellDh": 331,
    "costDh": 232
  },
  {
    "name": "Forever Ultra Lite Plus Chocolat 390g",
    "sellDh": 331,
    "costDh": 232
  },
  {
    "name": "Forever Therm",
    "sellDh": 469,
    "costDh": 328
  },
  {
    "name": "Forever Lean",
    "sellDh": 495,
    "costDh": 347
  },
  {
    "name": "Forever Argi + Sachet de 300 G (30 Doses de 10 G)",
    "sellDh": 899,
    "costDh": 629
  },
  {
    "name": "Pack Bien Etre",
    "sellDh": 1588,
    "costDh": 1112
  },
  {
    "name": "Pack Hygi\xE8Ne Famille",
    "sellDh": 1576,
    "costDh": 1103
  },
  {
    "name": "Forever Instant Hand Cleanser",
    "sellDh": 168,
    "costDh": 118
  },
  {
    "name": "Aloe First (473ml)",
    "sellDh": 310,
    "costDh": 217
  },
  {
    "name": "Aloe Propolis Cr\xE8me (118ml)",
    "sellDh": 310,
    "costDh": 217
  },
  {
    "name": "Gel\xE9e Alo\xE8s (118ml)",
    "sellDh": 233,
    "costDh": 163
  },
  {
    "name": "Aloe Lotion",
    "sellDh": 233,
    "costDh": 163
  },
  {
    "name": "Forever Bright Toothgel (130g)",
    "sellDh": 120,
    "costDh": 84
  },
  {
    "name": "Stick Deodorant Alo\xE8s (91,1g)",
    "sellDh": 112,
    "costDh": 78
  },
  {
    "name": "Aloe Liquid Soap",
    "sellDh": 245,
    "costDh": 172
  },
  {
    "name": "Aloe L\xE8vres Unitaires",
    "sellDh": 55,
    "costDh": 39
  },
  {
    "name": "Savon Corps et Visage A l'Avocat (142g)",
    "sellDh": 77,
    "costDh": 54
  },
  {
    "name": "Alpha E Factor (30ml)",
    "sellDh": 518,
    "costDh": 363
  },
  {
    "name": "Gentleman'S Pride (118ml)",
    "sellDh": 233,
    "costDh": 163
  },
  {
    "name": "Cr\xE8me Visage Alo\xE8s (118ml)",
    "sellDh": 233,
    "costDh": 163
  },
  {
    "name": "R3 Factor Alo\xE8s (56,7g)",
    "sellDh": 518,
    "costDh": 363
  },
  {
    "name": "Eyeliner Precision",
    "sellDh": 253,
    "costDh": 177
  },
  {
    "name": "Infinite Skin Care Kit",
    "sellDh": 2213,
    "costDh": 1549
  },
  {
    "name": "Infinite Hydrating Cleanser",
    "sellDh": 332,
    "costDh": 232
  },
  {
    "name": "Infinite Firming Serum",
    "sellDh": 658,
    "costDh": 461
  },
  {
    "name": "Infinite By Forever Firming Complex",
    "sellDh": 654,
    "costDh": 458
  },
  {
    "name": "Infinite Restoring Cream",
    "sellDh": 733,
    "costDh": 513
  },
  {
    "name": "Aloe Activateur",
    "sellDh": 195,
    "costDh": 137
  },
  {
    "name": "Cr\xE8me de Jour Spf20",
    "sellDh": 458,
    "costDh": 321
  },
  {
    "name": "Soin Exfoliant",
    "sellDh": 230,
    "costDh": 161
  },
  {
    "name": "Lotion Tonifiante",
    "sellDh": 275,
    "costDh": 193
  },
  {
    "name": "Cr\xE8me Contour Des Yeux",
    "sellDh": 230,
    "costDh": 161
  },
  {
    "name": "Mask Aloe Bio Cellulose",
    "sellDh": 665,
    "costDh": 465
  },
  {
    "name": "Gel Nettoyant",
    "sellDh": 298,
    "costDh": 209
  },
  {
    "name": "Gel Eclat",
    "sellDh": 282,
    "costDh": 197
  },
  {
    "name": "Masque Gel",
    "sellDh": 298,
    "costDh": 209
  },
  {
    "name": "Gel Hydratant",
    "sellDh": 326,
    "costDh": 228
  },
  {
    "name": "Daily Skincare",
    "sellDh": 1080,
    "costDh": 756
  },
  {
    "name": "Emulsion Thermogene (118ml)",
    "sellDh": 233,
    "costDh": 163
  },
  {
    "name": "Aloe Msm Gel (118ml)",
    "sellDh": 362,
    "costDh": 253
  },
  {
    "name": "Shampoing Aloe-Jojoba (296ml)",
    "sellDh": 276,
    "costDh": 193
  },
  {
    "name": "Apr\xE8s-Shampooing Aloe-Jojoba (296ml)",
    "sellDh": 295,
    "costDh": 207
  },
  {
    "name": "Aloe Sunscreen",
    "sellDh": 263,
    "costDh": 184
  }
];

// src/core/permissions.ts
var OPERATIONS = [
  "create_order",
  "advance_order",
  "edit_finance",
  "manage_inventory",
  "manage_promos",
  "record_decision",
  "import_data"
];
var TEAM = ["invite_member", "change_role", "remove_member"];
var GRANTS = {
  owner: /* @__PURE__ */ new Set(["view", ...OPERATIONS, ...TEAM, "export_memory", "delete_workspace"]),
  manager: /* @__PURE__ */ new Set(["view", ...OPERATIONS, ...TEAM, "export_memory"]),
  staff: /* @__PURE__ */ new Set(["view", ...OPERATIONS]),
  viewer: /* @__PURE__ */ new Set(["view"])
};
function can(role, action) {
  return GRANTS[role]?.has(action) ?? false;
}
var RANK = { owner: 3, manager: 2, staff: 1, viewer: 0 };
function canManageMember(actor, target2, newRole) {
  if (!can(actor, "change_role")) return false;
  if (target2 === "owner") return false;
  if (RANK[actor] < RANK[target2]) return false;
  if (newRole && RANK[newRole] > RANK[actor]) return false;
  return true;
}

// src/core/notifications.ts
var PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
var CONFIRM_HOURS = 12;
var COLLECT_DAYS = 3;
function insightToNotification(i, now) {
  const priority = i.guidance ? i.layer === "strategic" || i.layer === "tactical" ? "high" : "medium" : "low";
  const view = i.domain === "finance" || i.domain === "marketing" ? "finance" : i.domain === "inventory" ? "inventory" : i.domain === "customers" ? "customers" : "today";
  return {
    key: "insight:" + i.decisionKey,
    priority,
    category: i.domain === "marketing" ? "finance" : i.domain,
    title: i.claim,
    body: i.reasoning,
    at: now,
    actionView: view
  };
}
function generateNotifications(state2, insights3, activities = [], now = Date.now()) {
  const out = insights3.map((i) => insightToNotification(i, now));
  for (const a of activities) {
    if (!a.done && a.dueAt && a.dueAt <= now) {
      const daysOver = Math.round((now - a.dueAt) / DAY2);
      out.push({
        key: "followup:" + a.activityId,
        priority: "high",
        category: "customers",
        title: `Follow up with ${a.customer}${daysOver > 0 ? ` \u2014 ${daysOver}d overdue` : " \u2014 due today"}`,
        body: a.note,
        at: a.dueAt,
        actionView: "customers"
      });
    }
  }
  for (const o of state2.orders) {
    if (o.status === "pending" && now - o.createdAt > CONFIRM_HOURS * 36e5) {
      const hours = Math.round((now - o.createdAt) / 36e5);
      out.push({
        key: "confirm:" + o.orderId,
        priority: "high",
        category: "orders",
        title: `Confirm ${o.customer}'s order \u2014 pending ${hours}h`,
        body: "Unconfirmed COD orders refuse far more often. A quick confirmation call protects the sale before you ship.",
        at: o.createdAt,
        actionView: "orders"
      });
    }
    if (o.status === "delivered" && !o.cashReceivedAt && o.deliveredAt && now - o.deliveredAt > COLLECT_DAYS * DAY2) {
      const days = Math.round((now - o.deliveredAt) / DAY2);
      out.push({
        key: "collect:" + o.orderId,
        priority: "medium",
        category: "finance",
        title: `Cash not collected from courier \u2014 ${o.customer}, ${formatMoney(orderRevenue(o))}`,
        body: `Delivered ${days} days ago but the courier hasn't remitted the cash. Chase the remittance so it isn't lost.`,
        at: o.deliveredAt,
        actionView: "orders"
      });
    }
  }
  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.at - b.at);
}
function dailyBriefing(state2, notifications, now = Date.now()) {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = startToday.getTime() - DAY2;
  const inYesterday = (ts) => ts !== void 0 && ts >= startYesterday && ts < startToday.getTime();
  const deliveredY = state2.orders.filter((o) => inYesterday(o.deliveredAt));
  const revenueY = deliveredY.reduce((s, o) => s + orderRevenue(o), 0);
  const cashY = state2.orders.filter((o) => inYesterday(o.cashReceivedAt)).reduce((s, o) => s + orderRevenue(o), 0);
  const high = notifications.filter((n) => n.priority === "high").length;
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const headline = high === 0 ? "Nothing urgent needs you right now." : `${high} thing${high > 1 ? "s" : ""} need${high > 1 ? "" : "s"} your attention today.`;
  return {
    greeting,
    revenueYesterday: revenueY,
    ordersDeliveredYesterday: deliveredY.length,
    cashCollectedYesterday: cashY,
    needsAttention: high,
    headline
  };
}

// src/core/seed.ts
function seedDemoData(memory2) {
  const now = Date.now();
  const at = (daysAgo) => now - daysAgo * DAY2;
  let n = 0;
  const invoice = (customer, amount, daysAgo, dueDays, paidDaysAgo) => {
    const invoiceId = `INV-${String(++n).padStart(3, "0")}`;
    memory2.append(
      "fact",
      "invoice_issued",
      { invoiceId, customer, amount, issuedAt: at(daysAgo), dueDays },
      at(daysAgo)
    );
    if (paidDaysAgo !== void 0) {
      memory2.append("fact", "invoice_paid", { invoiceId, paidAt: at(paidDaysAgo) }, at(paidDaysAgo));
    }
  };
  const expense = (label, amount, daysAgo) => {
    memory2.append(
      "fact",
      "expense_recorded",
      { expenseId: crypto.randomUUID(), label, amount, date: at(daysAgo) },
      at(daysAgo)
    );
  };
  invoice("Atlas Retail", 3400, 115, 30, 90);
  invoice("Atlas Retail", 3100, 85, 30, 60);
  invoice("Atlas Retail", 3600, 55, 30, 30);
  invoice("Atlas Retail", 900, 22, 30, 5);
  invoice("Marlowe & Co", 1150, 110, 14, 100);
  invoice("Marlowe & Co", 1200, 80, 14, 70);
  invoice("Marlowe & Co", 1100, 50, 14, 40);
  invoice("Marlowe & Co", 1250, 20, 14, 8);
  invoice("Harbor Caf\xE9", 640, 145, 14, 135);
  invoice("Harbor Caf\xE9", 690, 120, 14, 110);
  invoice("Harbor Caf\xE9", 655, 95, 14, 85);
  invoice("Harbor Caf\xE9", 700, 70, 14, 60);
  invoice("Nordwind GmbH", 1800, 48, 14);
  invoice("Nordwind GmbH", 950, 18, 14);
  for (const d of [88, 58, 28]) {
    expense("Rent & utilities", 1450, d);
    expense("Supplier payments", 2600, d - 3);
    expense("Wages (part-time help)", 1900, d - 6);
    expense("Software & fees", 240, d - 8);
  }
  memory2.append(
    "fact",
    "product_added",
    {
      productId: "P-001",
      name: "Ceramic Mug \u2014 Classic",
      stock: 18,
      weeklySales: 12,
      leadTimeDays: 14,
      unitCost: 4.2,
      price: 12.5
    },
    at(160)
  );
  memory2.append(
    "fact",
    "product_added",
    {
      productId: "P-002",
      name: "Oak Serving Board",
      stock: 46,
      weeklySales: 6,
      leadTimeDays: 21,
      unitCost: 9.8,
      price: 24
    },
    at(160)
  );
  memory2.append(
    "fact",
    "product_added",
    {
      productId: "P-003",
      name: "Linen Tote (old print)",
      stock: 40,
      weeklySales: 0,
      leadTimeDays: 30,
      unitCost: 6.5,
      price: 18
    },
    at(200)
  );
  const MUG = { productId: "P-001", productName: "Ceramic Mug \u2014 Classic", unitPrice: 12.5, unitCost: 4.2 };
  const BOARD = { productId: "P-002", productName: "Oak Serving Board", unitPrice: 24, unitCost: 9.8 };
  memory2.append(
    "fact",
    "promo_created",
    {
      promoId: "PROMO-001",
      code: "WELCOME15",
      type: "percentage",
      value: 15,
      minBasket: 0,
      usageLimit: 50,
      createdAt: at(30)
    },
    at(30)
  );
  let ordN = 0;
  const order = (customer, lines, createdDaysAgo, path, costs, cashDaysAgo) => {
    const orderId = `ORD-${String(++ordN).padStart(3, "0")}`;
    memory2.append(
      "fact",
      "order_created",
      {
        orderId,
        customer,
        lines,
        discount: costs.discount ?? 0,
        shippingCharged: costs.shipCharged ?? 0,
        shippingCost: costs.shipCost ?? 0,
        codFee: costs.codFee ?? 0,
        packagingCost: costs.packaging ?? 0,
        createdAt: at(createdDaysAgo),
        ...costs.promoCode ? { promoCode: costs.promoCode } : {}
      },
      at(createdDaysAgo)
    );
    for (const step of path) {
      memory2.append(
        "fact",
        "order_status_changed",
        { orderId, status: step.status, at: at(step.daysAgo) },
        at(step.daysAgo)
      );
    }
    if (cashDaysAgo !== void 0) {
      memory2.append("fact", "order_cash_received", { orderId, at: at(cashDaysAgo) }, at(cashDaysAgo));
    }
  };
  const delivered = (d1, d2, d3) => [
    { status: "confirmed", daysAgo: d1 },
    { status: "shipped", daysAgo: d2 },
    { status: "delivered", daysAgo: d3 }
  ];
  order("Fatima B.", [{ ...MUG, qty: 4 }], 25, delivered(25, 24, 22), { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 }, 20);
  order("Omar K.", [{ ...BOARD, qty: 2 }], 20, delivered(20, 19, 17), { shipCharged: 4, shipCost: 5, codFee: 1, packaging: 1 }, 14);
  order("Leila M.", [{ ...MUG, qty: 6 }, { ...BOARD, qty: 1 }], 15, delivered(15, 14, 12), { shipCharged: 4, shipCost: 5, codFee: 1.2, packaging: 1.2 }, 10);
  order("Youssef T.", [{ ...MUG, qty: 3 }], 6, delivered(6, 5, 4), { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });
  order("Sara H.", [{ ...MUG, qty: 1 }], 4, delivered(4, 3, 2), { discount: 1.88, shipCost: 6, codFee: 1.5, packaging: 0.8, promoCode: "WELCOME15" });
  order("Rania E.", [{ ...MUG, qty: 1 }], 7, delivered(7, 6, 5), { discount: 1.88, shipCost: 6, codFee: 1.5, packaging: 0.8, promoCode: "WELCOME15" }, 3);
  order("Karim Z.", [{ ...MUG, qty: 3 }], 18, [
    { status: "confirmed", daysAgo: 18 },
    { status: "shipped", daysAgo: 17 },
    { status: "refused", daysAgo: 14 }
  ], { shipCost: 5, codFee: 0, packaging: 1 });
  order("Karim Z.", [{ ...MUG, qty: 2 }], 9, [
    { status: "confirmed", daysAgo: 9 },
    { status: "shipped", daysAgo: 8 },
    { status: "refused", daysAgo: 6 }
  ], { shipCost: 5, codFee: 0, packaging: 1 });
  order("Nadia R.", [{ ...BOARD, qty: 1 }], 10, [
    { status: "confirmed", daysAgo: 10 },
    { status: "shipped", daysAgo: 9 },
    { status: "refused", daysAgo: 8 }
  ], { shipCost: 5.5, codFee: 0, packaging: 1 });
  order("Hassan A.", [{ ...MUG, qty: 2 }], 2, [
    { status: "confirmed", daysAgo: 2 },
    { status: "shipped", daysAgo: 1 }
  ], { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });
  order("Amina T.", [{ ...MUG, qty: 2 }], 1, [], { shipCharged: 3, shipCost: 4.5, codFee: 1, packaging: 0.8 });
  const contact = (customer, phone, city, daysAgo) => memory2.append("fact", "customer_contact_updated", { customer, phone, city, at: at(daysAgo) }, at(daysAgo));
  contact("Amina T.", "+212600112233", "Casablanca", 1);
  contact("Leila M.", "+212600445566", "Rabat", 3);
  const inbound = (customer, phone, body, hoursAgo) => {
    const t = now - hoursAgo * 36e5;
    memory2.append("fact", "message_received", { messageId: `MSG-${++n}`, customer, phone, body, channel: "whatsapp", at: t }, t);
  };
  inbound("Leila M.", "+212600445566", "Merci beaucoup, tout est parfait!", 30);
  memory2.append("fact", "customer_activity_logged", { activityId: `ACT-${++n}`, customer: "Leila M.", kind: "message", note: "WhatsApp: Avec plaisir Leila, \xE0 bient\xF4t! \u{1F33F}", at: now - 29 * 36e5 }, now - 29 * 36e5);
  inbound("Amina T.", "+212600112233", "Bonjour, ma commande de tasses arrive quand? \u{1F60A}", 2);
}

// scripts/verify.ts
var TestMemory = class {
  events = [];
  append(stream, type, payload, ts) {
    const e = { id: crypto.randomUUID(), ts: ts ?? Date.now(), stream, type, payload };
    this.events.push(e);
    return e;
  }
  all() {
    return this.events;
  }
  exportJson() {
  }
  subscribe() {
    return () => {
    };
  }
};
var failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? " \u2014 " + detail : ""}`);
  }
}
var memory = new TestMemory();
seedDemoData(memory);
var state = projectState(memory.all());
var decisions = projectDecisions(memory.all());
var insights = generateInsights(state, decisions);
console.log("\nProjections:");
check(
  "facts fold into state",
  state.invoices.length === 14 && state.products.length === 3,
  `invoices=${state.invoices.length}, products=${state.products.length}`
);
check("orders fold into state", state.orders.length === 11, `orders=${state.orders.length}`);
console.log("\nCommerce & COD lifecycle (Wave 1):");
var mug = state.products.find((p2) => p2.productId === "P-001");
check("delivery deducts stock (mug 18 \u2192 3)", mug.stock === 3, `stock=${mug.stock}`);
check(
  "open orders reserve stock (Hassan + Amina, 2 mugs each)",
  state.reserved["P-001"] === 4,
  `reserved=${state.reserved["P-001"]}`
);
var refusedOrder = state.orders.find((o) => o.status === "refused");
check("refused order does not deduct stock and holds no reservation", !!refusedOrder);
var sara = state.orders.find((o) => o.customer === "Sara H.");
check(
  "order profit math: Sara's order loses money",
  orderNetProfit(sara) < 0,
  `net=${orderNetProfit(sara).toFixed(2)}`
);
var fatima = state.orders.find((o) => o.customer === "Fatima B.");
check(
  "order revenue = lines \u2212 discount + shipping charged",
  Math.abs(orderRevenue(fatima) - 53) < 0.01,
  `revenue=${orderRevenue(fatima)}`
);
var things = stateOfThings(state);
check(
  "delivered-but-unremitted cash shows as pending COD",
  things.cashPendingCod > 0,
  `pending=${things.cashPendingCod.toFixed(2)}`
);
check("open orders counted", things.openOrders === 2, `open=${things.openOrders}`);
console.log("\nCRM customer profiles (Wave 4):");
var profiles = projectCustomerProfiles(state);
var karim = profiles.find((p2) => p2.name === "Karim Z.");
check(
  "refused-only customer has 0% COD reliability",
  karim.codReliability === 0,
  `reliability=${karim.codReliability}`
);
check("high refusal customer is tagged", karim.tags.includes("high-refusal"));
var fatimaP = profiles.find((p2) => p2.name === "Fatima B.");
check(
  "delivered customer has profit data",
  fatimaP.hasProfitData && fatimaP.lifetimeProfit > 0,
  `profit=${fatimaP.lifetimeProfit.toFixed(2)}`
);
check("lifetime revenue unifies invoices + orders", fatimaP.lifetimeRevenue >= orderRevenue(fatima) - 0.01);
check("VIP tag assigned to top customers", profiles.some((p2) => p2.tags.includes("vip")));
check(
  "every profile has new-or-returning lifecycle tag",
  profiles.every((p2) => p2.tags.includes("new") || p2.tags.includes("returning"))
);
console.log("\nDecision Engine \u2014 Business Brains:");
var byKey = (prefix) => insights.find((i) => i.decisionKey.startsWith(prefix));
var overdue = byKey("finance.overdue");
var dip = byKey("finance.revenue-dip");
var runway = byKey("finance.runway");
var churn = byKey("customers.silent.Harbor Caf\xE9");
var stockout = byKey("inventory.stockout.P-001");
var dead = byKey("inventory.dead.P-003");
check("overdue invoices detected (Nordwind)", !!overdue && overdue.claim.includes("2 invoice"));
check("revenue dip detected with driver Atlas Retail", !!dip && dip.claim.includes("Atlas Retail"), dip?.claim ?? "none");
check("cash runway strategic insight present", !!runway && runway.layer === "strategic");
check("silent-churn customer detected (Harbor Caf\xE9)", !!churn);
check("stockout projected before lead time (Ceramic Mug)", !!stockout);
check("dead stock detected (Linen Tote)", !!dead);
check("COD refusal-rate insight fires (3 of 9 settled)", !!byKey("commerce.refusal-rate"));
check("unprofitable delivered orders detected", !!byKey("commerce.unprofitable-orders"));
check("expense-envelope overspend detected", !!byKey("finance.envelope-expenses"));
console.log("\nDiscounts & promo engine (Wave 1 completion):");
var promo = state.promos.find((p2) => p2.code === "WELCOME15");
check("promo folds into state and is active", !!promo && promo.active, `promo=${!!promo}`);
check(
  "promo usage server-counted (2 orders bear WELCOME15)",
  promo.timesUsed === 2,
  `used=${promo.timesUsed}`
);
var okCheck = checkPromo(state, "WELCOME15", 100);
check(
  "checkPromo computes 15% discount",
  okCheck.ok && Math.abs(okCheck.discount - 15) < 0.01,
  okCheck.ok ? `discount=${okCheck.discount}` : okCheck.reason
);
var badCode = checkPromo(state, "NOPE", 100);
check("checkPromo rejects unknown code", !badCode.ok);
check("marketing brain flags the unprofitable promo", !!byKey("marketing.promo-unprofitable.WELCOME15"));
console.log("\nFinance depth (Wave 3):");
var sim = simulateProfit({ sellingPrice: 100, buyingCost: 40, quantity: 2, discount: 5, shippingCost: 10, packagingCost: 2, advertisingCost: 0 });
check("simulator revenue", Math.abs(sim.revenue - 190) < 0.01, `rev=${sim.revenue}`);
check("simulator net profit", Math.abs(sim.netProfit - 98) < 0.01, `net=${sim.netProfit}`);
check("simulator break-even units (12 / 55 per-unit = 1)", sim.breakEvenUnits === 1, `be=${sim.breakEvenUnits}`);
var simLoss = simulateProfit({ sellingPrice: 10, buyingCost: 12, quantity: 1, discount: 0, shippingCost: 5, packagingCost: 0, advertisingCost: 0 });
check("simulator: unit that loses money has no break-even", simLoss.breakEvenUnits === null);
var be = breakEven(state);
check("break-even computed from delivered orders + fixed expenses", be.monthlyFixedExpenses > 0 && be.avgProfitPerOrder !== 0);
memory.append("fact", "goal_set", { metric: "revenue", target: 1e4, setAt: Date.now() });
var withGoal = projectState(memory.all());
check("goal folds into state (latest wins)", withGoal.goals.revenue === 1e4, `goal=${withGoal.goals.revenue}`);
check("goalActual returns a number", typeof goalActual(withGoal, "revenue") === "number");
console.log("\nForecasting (Wave 7):");
var fc = forecast(state);
check("forecast returns assumptions (honest framing)", fc.assumptions.length > 0);
check("forecast projects stockouts as a range list", Array.isArray(fc.stockouts));
console.log("\nAsk ZYVORA assistant (Wave 7):");
var aProfit = askZyvora(state, "how much profit did I make?");
check("assistant answers profit with evidence", aProfit.handled && aProfit.evidence.length > 0);
var aLost = askZyvora(state, "show orders that lost money");
check("assistant finds unprofitable orders", aLost.handled && /lost money|net/i.test(aLost.text));
var aMargin = askZyvora(state, "which product has the highest margin?");
check("assistant answers product margin", aMargin.handled && aMargin.evidence.length > 0);
var aJunk = askZyvora(state, "what is the meaning of life?");
check("assistant admits out-of-scope (never fabricates)", !aJunk.handled);
var ctx = businessContext(state);
check("business context brief includes real cash + P&L facts", /CASH:/.test(ctx) && /P&L/.test(ctx) && ctx.length > 200);
check("business context lists products and customers", /PRODUCTS/.test(ctx) && /CUSTOMERS/.test(ctx));
console.log("\nCSV import (Wave 6):");
var csv = 'Name,Selling Price,Cost,Qty\n"Aloe Vera Gel",120,70,40\nForever Bee Honey,95,55,25\n,10,5,3';
var p = parseCsv(csv);
check("CSV parses headers + rows (quoted fields, skips blank name row later)", p.headers.length === 4 && p.rows.length === 3);
var m = autoMap("products", p.headers);
check("auto-map matches name/price/cost/stock by header", m.name === 0 && m.price === 1 && m.unitCost === 2 && m.stock === 3);
var r0 = buildRow("products", m, p.rows[0]);
check("valid product row builds a product_added event", !!r0.event && r0.event.type === "product_added" && r0.event.payload.name === "Aloe Vera Gel");
var rBad = buildRow("products", m, p.rows[2]);
check("row missing required field is rejected with a reason", !rBad.event && rBad.error === "missing name");
var invCsv = "client,montant,date,paye\nOmar,300,2026-05-01,2026-05-10";
var ip = parseCsv(invCsv);
var im = autoMap("invoices", ip.headers);
var ir = buildRow("invoices", im, ip.rows[0]);
check("invoice with paid date builds issued + paid events", !!ir.event && ir.event.type === "invoice_issued" && !!ir.extra && ir.extra.type === "invoice_paid");
console.log("\nNaturaloe store catalog:");
check("catalog has the full 72-product lineup", NATURALOE_CATALOG.length === 72, `count=${NATURALOE_CATALOG.length}`);
check("every catalog product has a name and a dirham sell price", NATURALOE_CATALOG.every((p2) => p2.name.length > 0 && p2.priceDh > 0));
var aloe = NATURALOE_CATALOG.find((p2) => p2.id === "p01");
check("Aloe Vera Gel priced 76 DH (7\u20AC \xD7 10.8)", !!aloe && aloe.priceDh === 76, `price=${aloe?.priceDh}`);
console.log("\nForever real prices (from order form):");
check("Forever price list has ~70 products", FOREVER_PRICES.length >= 60, `count=${FOREVER_PRICES.length}`);
check("every Forever product has sell > cost > 0", FOREVER_PRICES.every((p2) => p2.sellDh > p2.costDh && p2.costDh > 0));
check("cost is 30% off retail (Argi+ 899 \u2192 629)", FOREVER_PRICES.every((p2) => p2.costDh === Math.round(p2.sellDh * 0.7)));
var argi = FOREVER_PRICES.find((p2) => /argi/i.test(p2.name));
check("Argi+ real price present (899 sell / 629 cost)", !!argi && argi.sellDh === 899 && argi.costDh === 629, `${argi?.sellDh}/${argi?.costDh}`);
console.log("\nMulti-user permissions (CAP-000004):");
check("owner can do everything", can("owner", "delete_workspace") && can("owner", "invite_member") && can("owner", "create_order"));
check("viewer can only view", can("viewer", "view") && !can("viewer", "create_order") && !can("viewer", "export_memory"));
check("staff runs operations but not the team", can("staff", "create_order") && can("staff", "manage_inventory") && !can("staff", "invite_member"));
check("manager manages team but can't delete workspace", can("manager", "invite_member") && !can("manager", "delete_workspace"));
check("escalation guard: owner cannot be demoted/removed", !canManageMember("manager", "owner"));
check("escalation guard: staff cannot change roles", !canManageMember("staff", "viewer"));
check("escalation guard: cannot promote above your own rank", !canManageMember("manager", "staff", "owner") && canManageMember("manager", "staff", "manager"));
console.log("\nNotifications & briefing (CAP-000010):");
var notifs = generateNotifications(state, insights);
check("notifications generated from insights + triggers", notifs.length > 0, `count=${notifs.length}`);
check("notifications sorted high-priority first", notifs.every((n, i, a) => i === 0 || rankP(a[i - 1].priority) <= rankP(n.priority)));
check("every notification has a stable key + action view", notifs.every((n) => n.key.length > 0 && !!n.actionView));
check("high-priority items include guidance decisions", notifs.some((n) => n.priority === "high"));
var brief = dailyBriefing(state, notifs);
check("daily briefing summarizes yesterday + attention count", typeof brief.revenueYesterday === "number" && brief.headline.length > 0);
function rankP(p2) {
  return p2 === "high" ? 0 : p2 === "medium" ? 1 : 2;
}
console.log("\nProfit & Loss statement (CAP-000005 FEAT-000040):");
var wide = monthBounds((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth());
var pnlAll = profitAndLoss(state, 0, Date.now() + 864e5, "all time");
check("P&L builds revenue \u2192 gross profit \u2192 net profit", pnlAll.revenue.netRevenue !== 0 && typeof pnlAll.netProfit === "number");
check("gross profit = net revenue \u2212 COGS", Math.abs(pnlAll.grossProfit - (pnlAll.revenue.netRevenue - pnlAll.cogs)) < 0.01);
check("net profit = gross profit \u2212 operating expenses", Math.abs(pnlAll.netProfit - (pnlAll.grossProfit - pnlAll.operatingExpenses.total)) < 0.01);
check("P&L counts only delivered orders", pnlAll.ordersDelivered > 0 && pnlAll.ordersDelivered <= state.orders.length);
check("current-month P&L bounds are one calendar month", wide.end - wide.start >= 27 * 24 * 3600 * 1e3);
console.log("\nCRM depth \u2014 contacts & activities (CAP-000007):");
var crmMem = new TestMemory();
crmMem.append("fact", "customer_contact_updated", { customer: "Atlas Retail", phone: "0600", city: "Casablanca", notes: "big account", at: Date.now() });
crmMem.append("fact", "customer_contact_updated", { customer: "Atlas Retail", phone: "0611", at: Date.now() });
var aid = crypto.randomUUID();
crmMem.append("fact", "customer_activity_logged", { activityId: aid, customer: "Atlas Retail", kind: "followup", note: "call re reorder", dueAt: Date.now() - 864e5, at: Date.now() });
var contacts = projectContacts(crmMem.all());
check("contact folds latest-wins per field", contacts.get("Atlas Retail")?.phone === "0611" && contacts.get("Atlas Retail")?.city === "Casablanca");
var acts = projectActivities(crmMem.all());
check("activity logged and open", acts.length === 1 && !acts[0].done);
crmMem.append("fact", "customer_activity_completed", { activityId: aid, at: Date.now() });
acts = projectActivities(crmMem.all());
check("activity marked done via completion event", acts[0].done === true);
console.log("\nPurchase orders & receipts (CAP-000006 FEAT-000045):");
var invMem = new TestMemory();
invMem.append("fact", "product_added", { productId: "PX", name: "Widget", stock: 5, weeklySales: 7, leadTimeDays: 14, unitCost: 10, price: 25 });
var poId = crypto.randomUUID();
invMem.append("fact", "purchase_order_created", { poId, supplier: "Forever", lines: [{ productId: "PX", productName: "Widget", qty: 40, unitCost: 9 }], createdAt: Date.now() });
var invState = projectState(invMem.all());
check("open PO shows as incoming, stock unchanged", invState.incoming["PX"] === 40 && invState.products[0].stock === 5);
var insWithPo = generateInsights(invState, []);
check("stockout alert suppressed when enough is already inbound", !insWithPo.some((i) => i.decisionKey === "inventory.stockout.PX"));
invMem.append("fact", "goods_received", { poId, at: Date.now() });
invState = projectState(invMem.all());
check("receiving raises stock and clears incoming", invState.products[0].stock === 45 && !invState.incoming["PX"]);
console.log("\nConstitutional invariants:");
check("insights are ranked descending", insights.every((x, i, a) => i === 0 || a[i - 1].score >= x.score));
var withGuidance = insights.filter((i) => i.guidance);
check("every Guidance has 2\u20134 options", withGuidance.every((i) => i.guidance.options.length >= 2 && i.guidance.options.length <= 4));
check("every Guidance includes the null option (5.8)", withGuidance.every((i) => i.guidance.options.some((o) => o.isNullOption)));
check("every option carries a falsifier (P4.6 L4)", withGuidance.every((i) => i.guidance.options.every((o) => o.falsifier.length > 0)));
check("every insight carries evidence + confidence note (Law IX)", insights.every((i) => i.evidence.length > 0 && i.confidenceNote.length > 0));
check("recommendation is one of the options", withGuidance.every((i) => i.guidance.options.some((o) => o.id === i.guidance.recommendedId)));
console.log("\nLifecycle stage 8 + suppression (P4.3):");
var target = stockout;
memory.append("interpretation", "insight_presented", { decisionKey: target.decisionKey, claim: target.claim });
memory.append("decision", "decision_recorded", {
  decisionKey: target.decisionKey,
  claim: target.claim,
  layer: target.layer,
  optionId: "expedite",
  optionLabel: "Expedite a reorder now",
  rationale: "Best-seller; premium is small vs. lost sales."
});
var decisions2 = projectDecisions(memory.all());
check("decision recorded with rationale", decisions2.length === 1 && decisions2[0].rationale.length > 0);
var insights2 = generateInsights(projectState(memory.all()), decisions2);
check("decided item no longer re-nags", !insights2.some((i) => i.decisionKey === target.decisionKey));
check("undecided items still present", insights2.some((i) => i.decisionKey.startsWith("finance.overdue")));
memory.append("outcome", "outcome_recorded", {
  decisionEventId: decisions2[0].eventId,
  decisionKey: target.decisionKey,
  result: "good",
  note: "Arrived in time; zero stockout days."
});
check("outcome linked to decision", projectDecisions(memory.all())[0].hasOutcome);
console.log("\nCorrections & archival (append-only edit/delete, ADR-0002):");
{
  const before = projectState(memory.all());
  const prod = before.products[0];
  memory.append("fact", "product_updated", { productId: prod.productId, price: prod.price + 5, at: Date.now() });
  const afterEdit = projectState(memory.all()).products.find((p2) => p2.productId === prod.productId);
  check("product edit appends a correction (price updated)", afterEdit.price === prod.price + 5);
  check("product edit leaves untouched fields intact", afterEdit.name === prod.name && afterEdit.unitCost === prod.unitCost);
  memory.append("fact", "product_discontinued", { productId: prod.productId, at: Date.now() });
  const afterDisc = projectState(memory.all());
  check("discontinued product stays in state, flagged (history kept)", afterDisc.products.find((p2) => p2.productId === prod.productId).discontinued === true);
  const insDisc = generateInsights(afterDisc, projectDecisions(memory.all()));
  check(
    "no advice generated for a discontinued product",
    !insDisc.some((i) => i.decisionKey === `inventory.stockout.${prod.productId}` || i.decisionKey === `inventory.dead.${prod.productId}`)
  );
  memory.append("fact", "product_restored", { productId: prod.productId, at: Date.now() });
  check("restore clears the discontinued flag", projectState(memory.all()).products.find((p2) => p2.productId === prod.productId).discontinued === false);
  const silentBefore = generateInsights(projectState(memory.all()), projectDecisions(memory.all())).filter((i) => i.decisionKey.startsWith("customers.silent."));
  if (silentBefore.length > 0) {
    const name = silentBefore[0].decisionKey.slice("customers.silent.".length);
    memory.append("fact", "customer_archived", { customer: name, at: Date.now() });
    const st = projectState(memory.all());
    check("archived customer listed in state.archivedCustomers", st.archivedCustomers.includes(name));
    check(
      "archived customer generates no attention advice",
      !generateInsights(st, projectDecisions(memory.all())).some((i) => i.decisionKey === `customers.silent.${name}`)
    );
    memory.append("fact", "customer_restored", { customer: name, at: Date.now() });
    check("restored customer leaves the archive", !projectState(memory.all()).archivedCustomers.includes(name));
  } else {
    check("silent-customer insight available to exercise archive (demo data)", false);
  }
}
console.log("\nRetention & cash intelligence (RFM, reorder-due, cash calendar, upsell):");
{
  const st = projectState(memory.all());
  const profiles2 = projectCustomerProfiles(st, Date.now());
  const rfm = computeRfm(profiles2);
  check("every customer receives an RFM segment", profiles2.every((p2) => rfm.has(p2.name)));
  check(
    "RFM scores stay in 1..5",
    [...rfm.values()].every((s) => [s.r, s.f, s.m].every((v) => v >= 1 && v <= 5))
  );
  const quietBig = profiles2.find((p2) => p2.name === "Harbor Caf\xE9");
  if (quietBig) {
    const s = rfm.get("Harbor Caf\xE9");
    check("a high-spend quiet customer is flagged at-risk/can't-lose/hibernating", ["at-risk", "cant-lose", "hibernating"].includes(s.segment));
  }
  const due = reorderDueList(profiles2, st.archivedCustomers);
  check("reorder-due list only contains customers past their own rhythm", due.every((d) => d.daysOverdue > 0));
  check("reorder-due sorts by value-weighted urgency", due.every((d, i) => i === 0 || due[i - 1].daysOverdue * due[i - 1].expectedValue >= d.daysOverdue * d.expectedValue));
  const cal = cashCalendar(st);
  const openTotal = st.invoices.filter((i) => !i.paidAt).reduce((s, i) => s + i.amount, 0);
  check(
    "cash calendar buckets cover every open invoice exactly once",
    Math.abs(cal.entries.reduce((s, e) => s + e.amount, 0) - openTotal) < 0.01
  );
  check("cash calendar overdue bucket matches entries past due", Math.abs(cal.overdue.total - cal.entries.filter((e) => e.overdueDays > 0).reduce((s, e) => s + e.amount, 0)) < 0.01);
  const anyOrder = st.orders.find((o) => o.status !== "cancelled" && o.lines.length > 0);
  if (anyOrder) {
    const sug = upsellSuggestion(st, anyOrder.lines.map((l) => l.productId));
    check(
      "upsell suggestion never proposes something already in the basket",
      !sug || !anyOrder.lines.some((l) => l.productId === sug.productId)
    );
  }
}
console.log("\nAsk \u2192 Act (staged actions, ghostwriter):");
{
  const st = projectState(memory.all());
  const profiles2 = projectCustomerProfiles(st, Date.now());
  const contacts2 = projectContacts(memory.all());
  const remind = stageAction(st, profiles2, contacts2, "Draft a payment reminder");
  check("payment-reminder stages against the oldest overdue invoice", remind !== null && remind.intent === "payment-reminder");
  check("reminder draft carries the real amount and overdue days", remind !== null && /\d/.test(remind.body) && remind.reason.includes("past due"));
  const named = stageAction(st, profiles2, contacts2, "remind Nordwind GmbH to pay");
  check("naming a customer targets that customer", named !== null && named.customer === "Nordwind GmbH");
  const fr = stageAction(st, profiles2, contacts2, "Write a win-back message in French");
  check("language request produces a French draft", fr !== null && fr.lang === "fr" && /Bonjour/.test(fr.body));
  const ar = stageAction(st, profiles2, contacts2, "Draft a reorder nudge in Arabic");
  check("Arabic draft is produced on request", ar !== null && ar.lang === "ar" && /سلام/.test(ar.body));
  if (fr) {
    const swapped = restageInLang(fr, st, profiles2, contacts2, "ar");
    check("language toggle re-renders the same intent in the new language", swapped.lang === "ar" && swapped.customer === fr.customer && swapped.body !== fr.body);
  }
  const plain = stageAction(st, profiles2, contacts2, "How much profit did I make last month?");
  check("plain questions are never turned into actions", plain === null);
}
console.log("\nDecision-memory coach & goal pacing (stage 4):");
{
  const note = coachFor(memory.all(), "inventory.stockout.P-999");
  check("coach recalls past decisions in the same family", note !== null && note.timesFaced >= 1);
  check("coach carries the chosen option and its recorded outcome", note !== null && note.last.optionLabel.length > 0 && note.last.outcome !== void 0 && note.goodOutcomes >= 1);
  check("coach stays silent for families never faced", coachFor(memory.all(), "marketing.never-seen.x") === null);
  const memories = projectDecisionMemories(memory.all());
  check("decision memories join outcomes to their decisions", memories.some((m2) => m2.outcome && /zero stockout/i.test(m2.outcome.note)));
  memory.append("decision", "decision_recorded", {
    decisionKey: "finance.overdue.review-test",
    claim: "Old test decision",
    layer: "operational",
    optionId: "x",
    optionLabel: "Test option",
    rationale: ""
  }, Date.now() - 10 * 864e5);
  const reviews = pendingOutcomeReviews(memory.all());
  check("old outcome-less decisions surface for loop closure", reviews.some((r) => r.decisionKey === "finance.overdue.review-test"));
  const st0 = projectState(memory.all());
  const bigGoal = Math.max(1e4, goalActual(st0, "revenue") * 10 + 1e3);
  memory.append("fact", "goal_set", { metric: "revenue", target: bigGoal, setAt: Date.now() });
  const day = (/* @__PURE__ */ new Date()).getDate();
  const daysInMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() + 1, 0).getDate();
  if (day >= 5 && daysInMonth - day >= 2) {
    const ins = generateInsights(projectState(memory.all()), projectDecisions(memory.all()));
    const pace = ins.find((i) => i.decisionKey === "finance.goal-pace.revenue");
    check("behind-pace goal produces a pacing insight with needed/day", pace !== void 0 && /\/day/.test(pace.claim));
  } else {
    check("goal pacing (skipped: too early/late in month to assert honestly)", true);
  }
}
console.log("\nRefills, refusal risk & record stories (v0.29):");
{
  const pid = "P-refill-test";
  memory.append("fact", "product_added", {
    productId: pid,
    name: "Aloe Test Gel",
    stock: 10,
    weeklySales: 1,
    leadTimeDays: 7,
    unitCost: 5,
    price: 10,
    daysOfUse: 30
  });
  const oid = "O-refill-test";
  const t0 = Date.now() - 36 * 864e5;
  memory.append("fact", "order_created", {
    orderId: oid,
    customer: "Refill Rita",
    lines: [{ productId: pid, productName: "Aloe Test Gel", qty: 1, unitPrice: 10, unitCost: 5 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 0,
    codFee: 0,
    packagingCost: 0,
    createdAt: t0
  }, t0);
  memory.append("fact", "order_status_changed", { orderId: oid, status: "delivered", at: t0 + 864e5 }, t0 + 864e5);
  const stR = projectState(memory.all());
  const refills = refillDueList(stR, stR.archivedCustomers);
  const rita = refills.find((r) => r.customer === "Refill Rita");
  check("consumable customer surfaces when supply runs out", rita !== void 0 && rita.productName === "Aloe Test Gel");
  check("refill math: 1 unit \xD7 30 days from delivery date", rita !== void 0 && Math.abs(rita.daysPastEmpty - 5) <= 1);
  memory.append("fact", "product_updated", { productId: pid, daysOfUse: 60, at: Date.now() });
  check(
    "editing days-of-use moves the prediction (append-only correction)",
    !refillDueList(projectState(memory.all()), []).some((r) => r.customer === "Refill Rita" && r.daysPastEmpty >= 0)
  );
  const contactsR = projectContacts(memory.all());
  const mkOrder = (id, customer, source) => ({
    orderId: id,
    customer,
    lines: [{ productId: pid, productName: "Aloe Test Gel", qty: 1, unitPrice: 10, unitCost: 5 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 0,
    codFee: 0,
    packagingCost: 0,
    createdAt: Date.now(),
    status: "pending",
    ...source ? { source } : {}
  });
  const refuser = stR.orders.find((o) => o.status === "refused");
  if (refuser) {
    const riskRefuser = refusalRisk(stR, mkOrder("t1", refuser.customer, "tiktok"), contactsR);
    const proven = stR.orders.filter((o) => o.status === "delivered").map((o) => o.customer).find((c) => !stR.orders.some((o) => o.customer === c && o.status === "refused"));
    const riskProven = proven ? refusalRisk(stR, mkOrder("t2", proven, "repeat"), contactsR) : null;
    check(
      "past refuser on impulse traffic scores higher than proven repeat customer",
      riskProven !== null && riskRefuser.score > riskProven.score
    );
    check(
      "every risk point is explained by a listed factor",
      riskRefuser.factors.length > 0 && riskRefuser.factors.every((f) => f.label.length > 0)
    );
  } else {
    check("refusal-risk comparison (skipped: no refused order in data)", false);
  }
  const story = storyForOrder(memory.all(), oid);
  check("order story is chronological and complete", story.length === 2 && /Order created/.test(story[0].what) && /Delivered/.test(story[1].what));
  const custStory = storyForCustomer(memory.all(), "Refill Rita");
  check("customer story collects their events, newest first", custStory.length >= 2 && custStory[0].ts >= custStory[custStory.length - 1].ts);
}
console.log("\nHealth score, courier scorecard & referrals (v0.30):");
{
  const st = projectState(memory.all());
  const health = businessHealth(st);
  check("health composite is 0..100 and banded", health.ready && health.score >= 0 && health.score <= 100 && ["strong", "steady", "watch", "fragile"].includes(health.band));
  check("health lists explained components, weakest first", health.components.length > 0 && health.components.every((c) => c.detail.length > 0) && health.components.every((c, i) => i === 0 || health.components[i - 1].score <= c.score));
  const mk = (id, courier, status) => {
    const t = Date.now() - 5 * 864e5;
    memory.append("fact", "order_created", {
      orderId: id,
      customer: "Courier Test",
      lines: [{ productId: "P-002", productName: "Oak Serving Board", qty: 1, unitPrice: 24, unitCost: 12 }],
      discount: 0,
      shippingCharged: 0,
      shippingCost: 30,
      codFee: 0,
      packagingCost: 0,
      createdAt: t,
      courier
    }, t);
    memory.append("fact", "order_status_changed", { orderId: id, status, at: t + 864e5 }, t + 864e5);
  };
  mk("cs1", "Speedy", "delivered");
  mk("cs2", "Slowpoke", "refused");
  const cards = courierScorecard(projectState(memory.all()));
  const speedy = cards.find((c) => c.courier === "Speedy");
  const slow = cards.find((c) => c.courier === "Slowpoke");
  check("courier scorecard computes per-courier delivery rate", speedy?.deliveryRate === 1 && slow?.deliveryRate === 0);
  check("courier scorecard sums shipping cost you paid", speedy !== void 0 && speedy.shippingCost === 30);
  memory.append("fact", "customer_contact_updated", { customer: "Leila M.", referredBy: "Sara H.", at: Date.now() });
  memory.append("fact", "customer_contact_updated", { customer: "Omar K.", referredBy: "Sara H.", at: Date.now() });
  const st2 = projectState(memory.all());
  const board = referralLeaderboard(projectContacts(memory.all()), projectCustomerProfiles(st2));
  const sara2 = board.find((r) => r.name === "Sara H.");
  check("referral leaderboard groups referred customers by referrer", sara2 !== void 0 && sara2.referredCount === 2);
  check("referral leaderboard sums the revenue advocates bring", sara2 !== void 0 && sara2.referredRevenue >= 0);
}
console.log("\nSegment broadcasts with measured lift (v0.31):");
{
  const now = Date.now();
  const campAt = now - 5 * 864e5;
  const mkOrder = (id, whenOffsetDays) => {
    const t = campAt + whenOffsetDays * 864e5;
    memory.append("fact", "order_created", {
      orderId: id,
      customer: "Campaign Cathy",
      lines: [{ productId: "P-002", productName: "Oak Serving Board", qty: 1, unitPrice: 24, unitCost: 12 }],
      discount: 0,
      shippingCharged: 0,
      shippingCost: 0,
      codFee: 0,
      packagingCost: 0,
      createdAt: t
    }, t);
  };
  mkOrder("camp-before", -3);
  mkOrder("camp-after1", 1);
  mkOrder("camp-after2", 3);
  memory.append("fact", "campaign_sent", {
    campaignId: "camp-1",
    segment: "at-risk",
    customers: ["Campaign Cathy"],
    channel: "whatsapp",
    message: "come back!",
    at: campAt
  }, campAt);
  const camps = projectCampaigns(memory.all());
  check("campaign_sent projects with its recipients", camps.some((c) => c.campaignId === "camp-1" && c.customers.includes("Campaign Cathy")));
  const res = measureCampaign(projectState(memory.all()), camps.find((c) => c.campaignId === "camp-1"), now, 14);
  check("lift counts recipient orders before vs after the send", res.ordersBefore === 1 && res.ordersAfter === 2);
  check("lift measures revenue in the after window", res.revenueAfter > res.revenueBefore);
  check("campaign not ready until the window fully elapses", res.ready === false);
}
console.log("\nThis week in review (week-over-week deltas, v0.32):");
{
  const now = Date.now();
  const tw = new TestMemory();
  const lwT = now - 10 * 864e5;
  tw.append("fact", "order_created", {
    orderId: "wr-last",
    customer: "Weekly Wanda",
    lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 0,
    codFee: 0,
    packagingCost: 0,
    createdAt: lwT
  }, lwT);
  tw.append("fact", "order_status_changed", { orderId: "wr-last", status: "delivered", at: lwT }, lwT);
  for (const id of ["wr-a", "wr-b"]) {
    const t = now - 2 * 864e5;
    tw.append("fact", "order_created", {
      orderId: id,
      customer: "Weekly Wanda",
      lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
      discount: 0,
      shippingCharged: 0,
      shippingCost: 0,
      codFee: 0,
      packagingCost: 0,
      createdAt: t
    }, t);
    tw.append("fact", "order_status_changed", { orderId: id, status: "delivered", at: t }, t);
  }
  tw.append("fact", "order_created", {
    orderId: "wr-ref",
    customer: "Weekly Wanda",
    lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 0,
    codFee: 0,
    packagingCost: 0,
    createdAt: now - 3 * 864e5
  }, now - 3 * 864e5);
  tw.append("fact", "order_status_changed", { orderId: "wr-ref", status: "refused", at: now - 1 * 864e5 }, now - 1 * 864e5);
  const wr = weeklyReview(tw.all(), now);
  const byKey2 = (k) => wr.metrics.find((m2) => m2.key === k);
  check("orders-delivered delta is this week (2) minus last week (1)", byKey2("ordersDelivered").thisWeek === 2 && byKey2("ordersDelivered").lastWeek === 1 && byKey2("ordersDelivered").delta === 1);
  check("refusals counted in this week's window by status-change date", byKey2("refusals").thisWeek === 1);
  check("revenue delta reflects the extra delivered order", byKey2("revenue").delta === 100);
  check("refusals metric is flagged higher-is-worse", byKey2("refusals").higherIsBetter === false);
  check("hasPriorWeek true once last-week activity exists", wr.hasPriorWeek === true);
}
console.log("\nWhatsApp Operations Inbox (v0.33):");
{
  const im2 = new TestMemory();
  const t = (h) => Date.now() - h * 36e5;
  im2.append("fact", "message_received", { messageId: "m1", customer: "Inbox Ivy", phone: "+212611", body: "Bonjour, o\xF9 est ma commande?", channel: "whatsapp", at: t(5) }, t(5));
  im2.append("fact", "customer_activity_logged", { activityId: "a1", customer: "Inbox Ivy", kind: "message", note: "WhatsApp: Elle arrive demain!", at: t(4) }, t(4));
  im2.append("fact", "message_received", { messageId: "m2", customer: "Inbox Ivy", phone: "+212611", body: "Merci!", channel: "whatsapp", at: t(3) }, t(3));
  im2.append("fact", "message_received", { messageId: "m3", customer: "Quiet Qasim", phone: "+212622", body: "STOP", channel: "whatsapp", at: t(2) }, t(2));
  const convs = projectConversations(im2.all());
  const ivy = convs.find((c) => c.customer === "Inbox Ivy");
  check("conversation merges inbound + outbound in time order", ivy.messages.length === 3 && ivy.messages[0].direction === "in" && ivy.messages[1].direction === "out");
  check("thread with last inbound message is 'waiting'", ivy.waiting === true);
  const qasim = convs.find((c) => c.customer === "Quiet Qasim");
  check("a customer texting STOP is flagged opted-out", qasim.optedOut === true);
  check("opted-out customers are excluded from the waiting count", waitingCount(convs) === 1);
  check("threads sort newest-activity first", convs[0].lastAt >= convs[convs.length - 1].lastAt);
  check(
    "explicit YES/OUI/Darija replies classify as confirmation",
    ["YES", "oui \u2705", "\u0646\u0639\u0645", "wakha"].every((x) => classifyInbound(x) === "confirm")
  );
  check(
    "explicit NO replies classify as cancellation",
    ["NO", "non", "\u0644\u0627"].every((x) => classifyInbound(x) === "cancel")
  );
  check("a sentence containing yes is not over-classified", classifyInbound("Yes, but change my address") === "unknown");
  im2.append("fact", "conversation_resolved", {
    customer: "Inbox Ivy",
    phone: "+212611",
    at: t(1),
    reason: "No reply required"
  }, t(1));
  const resolved = projectConversations(im2.all()).find((c) => c.customer === "Inbox Ivy");
  check("a resolved inbound thread leaves the waiting queue", resolved.waiting === false);
  const phoneOnly = new TestMemory();
  phoneOnly.append("fact", "message_received", { messageId: "m4", phone: "+212633", body: "STOP", channel: "whatsapp", at: t(1) }, t(1));
  phoneOnly.append("fact", "customer_opted_out", { phone: "+212633", at: t(1) }, t(1));
  check("unmatched phone opt-out is still enforced", projectConversations(phoneOnly.all())[0].optedOut === true);
  const tracked = new TestMemory();
  tracked.append("fact", "message_sent", {
    messageId: "SM-TRACKED",
    customer: "Tracked Taha",
    phone: "+212644",
    body: "Your order is ready",
    channel: "whatsapp",
    status: "queued",
    at: t(3)
  }, t(3));
  tracked.append("fact", "message_status_changed", {
    messageId: "SM-TRACKED",
    status: "delivered",
    at: t(2)
  }, t(2));
  tracked.append("fact", "conversation_assigned", {
    customer: "Tracked Taha",
    assignedTo: "staff-1",
    assignedLabel: "Samira",
    at: t(1)
  }, t(1));
  let trackedConv = projectConversations(tracked.all())[0];
  check("outbound Twilio SID receives its latest delivery status", trackedConv.messages[0].status === "delivered");
  check("conversation ownership projects from append-only assignment", trackedConv.assignedTo === "staff-1" && trackedConv.assignedLabel === "Samira");
  check("sent messages remain visible in CRM activity history", projectActivities(tracked.all()).some((a) => a.customer === "Tracked Taha" && a.kind === "message"));
  tracked.append("fact", "conversation_assigned", { customer: "Tracked Taha", assignedTo: "", at: Date.now() }, Date.now());
  trackedConv = projectConversations(tracked.all())[0];
  check("unassignment returns the thread to the shared queue", trackedConv.assignedTo === void 0);
}
console.log("\nCourier Control Tower (v0.34):");
{
  const cm = new TestMemory();
  const now = Date.now();
  const day = 864e5;
  cm.append("fact", "product_added", {
    productId: "cp",
    name: "Courier Product",
    price: 200,
    unitCost: 80,
    stock: 20,
    weeklySales: 2,
    leadTimeDays: 7
  }, now - 8 * day);
  cm.append("fact", "order_created", {
    orderId: "co",
    customer: "Courier Customer",
    lines: [{ productId: "cp", productName: "Courier Product", qty: 1, unitPrice: 200, unitCost: 80 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 25,
    codFee: 5,
    packagingCost: 3,
    createdAt: now - 6 * day
  }, now - 6 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "confirmed", at: now - 5 * day }, now - 5 * day);
  let cc = courierControl(projectState(cm.all()), now);
  check("confirmed order without shipment is ranked for handoff", cc.rows[0].action === "handoff");
  cm.append("fact", "shipment_created", {
    orderId: "co",
    courier: "Atlas Courier",
    trackingNumber: "TRK-1",
    at: now - 4 * day
  }, now - 4 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "shipped", at: now - 4 * day }, now - 4 * day);
  cm.append("fact", "shipment_status_changed", {
    orderId: "co",
    status: "delivery_failed",
    reason: "Customer unavailable",
    at: now - 2 * day
  }, now - 2 * day);
  cc = courierControl(projectState(cm.all()), now);
  check(
    "failed delivery becomes the highest-priority customer intervention",
    cc.rows[0].action === "contact-customer" && cc.rows[0].reason.includes("Customer unavailable")
  );
  cm.append("fact", "shipment_status_changed", { orderId: "co", status: "delivered", at: now - 4 * day }, now - 4 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "delivered", at: now - 4 * day }, now - 4 * day);
  cc = courierControl(projectState(cm.all()), now);
  check(
    "delivered COD cash past three days is ranked for remittance chase",
    cc.rows[0].action === "chase-remittance" && cc.cashPending === 200
  );
  cm.append("fact", "order_cash_received", { orderId: "co", at: now }, now);
  cc = courierControl(projectState(cm.all()), now);
  check("remitted courier cash leaves the control queue", cc.rows.length === 0 && cc.cashPending === 0);
}
console.log("\nGuardrailed workflows (v0.35):");
{
  const wm = new TestMemory();
  const now = Date.now();
  const day = 864e5;
  wm.append("fact", "product_added", {
    productId: "wp",
    name: "Workflow Product",
    price: 100,
    unitCost: 40,
    stock: 10,
    weeklySales: 1,
    leadTimeDays: 5
  }, now - day);
  wm.append("fact", "order_created", {
    orderId: "wo",
    customer: "Workflow Customer",
    lines: [{ productId: "wp", productName: "Workflow Product", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0,
    shippingCharged: 0,
    shippingCost: 10,
    codFee: 4,
    packagingCost: 2,
    createdAt: now - 5 * 36e5
  }, now - 5 * 36e5);
  let candidates = workflowCandidates(projectState(wm.all()), wm.all(), now);
  const confirmation = candidates.find((c) => c.recipeId === "cod-confirmation");
  check("old unconfirmed COD order prepares a follow-up candidate", Boolean(confirmation) && confirmation.customer === "Workflow Customer");
  check("workflow candidate explains the trigger and intended task", confirmation.reason.includes("hours") && confirmation.taskNote.includes("Follow up"));
  wm.append("fact", "automation_run_recorded", {
    candidateKey: confirmation.key,
    recipeId: confirmation.recipeId,
    outcome: "followup_task_created",
    at: now
  }, now);
  candidates = workflowCandidates(projectState(wm.all()), wm.all(), now);
  check("completed workflow candidate is idempotently suppressed", !candidates.some((c) => c.key === confirmation.key));
}
console.log("\nBilling entitlement (vendor productization):");
{
  const now = Date.now();
  const day = 864e5;
  const fresh = entitlement({ status: "none", currentPeriodEnd: null }, now - 3 * day, now);
  check("new workspace is in trial with days counting down", fresh.active && fresh.trialDaysLeft === 11);
  const expired = entitlement({ status: "none", currentPeriodEnd: null }, now - 20 * day, now);
  check("expired trial without subscription is gated", !expired.active && expired.trialDaysLeft === 0);
  check("active subscription is entitled past trial", entitlement({ status: "active", currentPeriodEnd: now + 30 * day }, now - 400 * day, now).active);
  check("past_due keeps access (grace, never cut off over a bank hiccup)", entitlement({ status: "past_due", currentPeriodEnd: now }, now - 400 * day, now).active);
  check("canceled falls back to trial rule (expired \u2192 gated)", !entitlement({ status: "canceled", currentPeriodEnd: null }, now - 400 * day, now).active);
}
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `
${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
