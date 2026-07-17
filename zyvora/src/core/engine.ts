/**
 * Decision Engine v1 — Business Brains produce candidate Insights; the Engine
 * ranks and contextualizes them (CODEX 00 D.3, D.5, D.11 stages 3–7).
 * Rules-based by design at maturity M3 (CODEX 10 §6.3); models are swappable
 * dependencies behind this interface (CODEX 00 F.8).
 *
 * Constitutional behavior implemented here:
 *  - Every output carries claim/reasoning/evidence/confidence + falsifier (P4.6, Law IX).
 *  - Insights are few and ranked, never exhaustive (Law X).
 *  - Own baseline before external benchmarks (CODEX 10 §5.6).
 *  - "Not enough data to say" is a first-class output (CODEX 00 C.13).
 *  - A recorded decision suppresses re-nagging for its window (P4.3).
 *
 * Canonical Product Model traceability (governance/): implements
 * CAP-000001 (Decision Center), CAP-000003 (AI Engine) —
 * FEAT-000002 priority/urgency explanation, FEAT-000004 trade-off comparison,
 * FEAT-000020 recommendation service, FEAT-000048 reorder planning,
 * FEAT-000054 customer value/health, FEAT-000039 cash-flow forecasting.
 */
import { money } from "./format";
import {
  DAY,
  orderNetProfit,
  orderRefusalLoss,
  orderRevenue,
  projectCustomers,
} from "./projections";
import type {
  DecisionLayer,
  Guidance,
  GuidanceOption,
  Insight,
  RecordedDecision,
  WorkspaceState,
} from "./types";

const SUPPRESSION_WINDOW_DAYS = 30;

// Workspace-currency formatting — global-first, no hardcoded symbol (ZPL-040 amendment).
const eur = money;

function daysAgoLabel(ts: number, now: number): string {
  const d = Math.round((now - ts) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

function option(o: Omit<GuidanceOption, "id"> & { id: string }): GuidanceOption {
  return o;
}

export function generateInsights(
  state: WorkspaceState,
  decisions: RecordedDecision[],
  now: number = Date.now()
): Insight[] {
  const insights: Insight[] = [];
  const decided = new Set(
    decisions
      .filter((d) => now - d.ts < SUPPRESSION_WINDOW_DAYS * DAY)
      .map((d) => d.decisionKey)
  );

  financeBrain(state, insights, now);
  customersBrain(state, insights, now);
  inventoryBrain(state, insights, now);
  commerceBrain(state, insights, now);
  marketingBrain(state, insights, now);

  // Respect recorded decisions: "no" is an answer (P4.3).
  const active = insights.filter((i) => !decided.has(i.decisionKey));

  // Few and ranked (Law X). Ranking is deterministic and explainable.
  return active.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------- Finance ---

function financeBrain(state: WorkspaceState, out: Insight[], now: number): void {
  const paid = state.invoices.filter((i) => i.paidAt);
  const remitted = state.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const cash =
    paid.reduce((s, i) => s + i.amount, 0) +
    remitted.reduce((s, o) => s + orderRevenue(o), 0) -
    state.expenses.reduce((s, e) => s + e.amount, 0);

  // 1. Overdue invoices → operational guidance.
  const overdue = state.invoices.filter(
    (i) => !i.paidAt && now > i.issuedAt + i.dueDays * DAY
  );
  if (overdue.length > 0) {
    const total = overdue.reduce((s, i) => s + i.amount, 0);
    const oldest = overdue.reduce((a, b) => (a.issuedAt < b.issuedAt ? a : b));
    const oldestDaysOver = Math.round(
      (now - (oldest.issuedAt + oldest.dueDays * DAY)) / DAY
    );
    out.push({
      id: crypto.randomUUID(),
      decisionKey: "finance.overdue." + overdue.map((i) => i.invoiceId).sort().join("."),
      domain: "finance",
      layer: "operational",
      score: Math.min(90, 40 + oldestDaysOver + overdue.length * 5),
      claim: `${overdue.length} invoice${overdue.length > 1 ? "s" : ""} totalling ${eur(total)} ${overdue.length > 1 ? "are" : "is"} past due — the oldest by ${oldestDaysOver} days.`,
      reasoning:
        `Unpaid invoices past their due date tie up cash you have already earned. ` +
        `The oldest (${oldest.customer}, ${eur(oldest.amount)}) is ${oldestDaysOver} days past due; ` +
        `historically, the longer an invoice stays unpaid the harder it becomes to collect.`,
      evidence: overdue.map((i) => ({
        label: `${i.customer} — issued ${daysAgoLabel(i.issuedAt, now)}`,
        value: `${eur(i.amount)}, due ${i.dueDays} days after issue, unpaid`,
      })),
      confidence: "high",
      confidenceNote:
        "High confidence: this is arithmetic on your own recorded invoices, not an estimate.",
      guidance: overdueGuidance(oldest.customer, total),
    });
  }

  // 2. Revenue trend vs. own baseline (CODEX 00 D.5's canonical example).
  const last30 = state.invoices.filter((i) => now - i.issuedAt <= 30 * DAY);
  const baselineInvoices = state.invoices.filter(
    (i) => now - i.issuedAt > 30 * DAY && now - i.issuedAt <= 120 * DAY
  );
  if (baselineInvoices.length < 4) {
    // Honest uncertainty is a first-class output (C.13).
    if (state.invoices.length > 0) {
      out.push({
        id: crypto.randomUUID(),
        decisionKey: "finance.trend.insufficient",
        domain: "finance",
        layer: "tactical",
        score: 5,
        claim: "Not enough invoice history yet to read your revenue trend honestly.",
        reasoning:
          "A trend needs a baseline. With fewer than four invoices in the prior 90 days, " +
          "any trend claim would be noise presented as signal — so ZYVORA won't make one.",
        evidence: [
          { label: "Invoices in prior 90-day baseline", value: String(baselineInvoices.length) },
          { label: "What would change this", value: "About one more month of normal invoicing" },
        ],
        confidence: "high",
        confidenceNote: "High confidence that the data is insufficient — which is itself worth knowing.",
      });
    }
  } else {
    const last30Total = last30.reduce((s, i) => s + i.amount, 0);
    const baselinePer30 =
      baselineInvoices.reduce((s, i) => s + i.amount, 0) / 3;
    if (baselinePer30 > 0 && last30Total < 0.85 * baselinePer30) {
      const dropPct = Math.round((1 - last30Total / baselinePer30) * 100);
      // Driver analysis: which customer explains the dip.
      const per = new Map<string, { base: number; recent: number }>();
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
        reasoning:
          `Your last 30 days billed ${eur(last30Total)} against a baseline of ${eur(baselinePer30)} per 30 days ` +
          `(your own average over the prior 90 days — your baseline, not an industry benchmark). ` +
          (driver
            ? `${driver} accounts for ${eur(driverDelta)} of the shortfall, so the cause looks concentrated, not general.`
            : `The shortfall is spread across customers.`),
        evidence: [
          { label: "Billed, last 30 days", value: eur(last30Total) },
          { label: "Your baseline (per 30 days, prior 90)", value: eur(baselinePer30) },
          ...(driver
            ? [{ label: `${driver} — shortfall vs. their usual`, value: eur(driverDelta) }]
            : []),
        ],
        confidence: "medium",
        confidenceNote:
          "Medium confidence: the arithmetic is exact, but one month can be noise. " +
          "If next month recovers without action, this was seasonal variation.",
        guidance: driver ? revenueDipGuidance(driver, driverDelta) : undefined,
      });
    }
  }

  // 3. Cash runway → strategic awareness (never rushed — D.4).
  const expenses90 = state.expenses.filter((e) => now - e.date <= 90 * DAY);
  if (expenses90.length >= 3) {
    const burnPerMonth = expenses90.reduce((s, e) => s + e.amount, 0) / 3;
    if (burnPerMonth > 0) {
      const runwayDays = Math.max(0, Math.round((cash / burnPerMonth) * 30));
      if (runwayDays < 75) {
        const negative = cash <= 0;
        out.push({
          id: crypto.randomUUID(),
          decisionKey: "finance.runway",
          domain: "finance",
          layer: "strategic",
          score: 70 + Math.max(0, 60 - runwayDays),
          claim: negative
            ? `Recorded outgoings have exceeded collected cash by ${eur(Math.abs(cash))} — collections, not spending, may be the lever.`
            : runwayDays < 7
              ? `Cash on hand (${eur(cash)}) covers less than a week of your usual outgoings.`
              : `At your current spending rhythm, cash on hand covers roughly ${runwayDays} days.`,
          reasoning: negative
            ? `Expenses recorded in ZYVORA total ${eur(Math.abs(cash))} more than invoices actually collected. ` +
              `This calculation excludes any opening balance and everything not yet collected — ` +
              `so the first place to look is the open invoices below, not necessarily the cost base.`
            : `Cash position (${eur(cash)}) divided by your own average monthly outgoings over the last 90 days ` +
              `(${eur(burnPerMonth)}/month) gives about ${runwayDays} days of cover if nothing new is collected. ` +
              `This is a strategic signal, not an emergency: incoming invoices are not counted here.`,
          evidence: [
            { label: "Cash position (paid invoices − expenses)", value: eur(cash) },
            { label: "Average monthly outgoings (last 90 days)", value: eur(burnPerMonth) },
            {
              label: "Uncollected invoices not counted above",
              value: eur(state.invoices.filter((i) => !i.paidAt).reduce((s, i) => s + i.amount, 0)),
            },
          ],
          confidence: "medium",
          confidenceNote:
            "Medium confidence: the calculation is exact, but it assumes spending stays level and counts no incoming payments. Collecting the overdue invoices above would extend this materially.",
        });
      }
    }
  }
}

function overdueGuidance(oldestCustomer: string, total: number): Guidance {
  return {
    options: [
      option({
        id: "remind",
        label: "Send payment reminders now",
        path: "Send a polite written reminder for each overdue invoice today.",
        gain: `Historically the cheapest way to recover most of the ${eur(total)} outstanding.`,
        cost: "A few minutes; minimal relationship risk at this stage.",
        reversibility: "easy",
        falsifier: "If a customer has already told you payment is scheduled, a reminder adds friction for nothing.",
      }),
      option({
        id: "call",
        label: `Call ${oldestCustomer} personally`,
        path: "Phone the customer with the oldest debt; ask directly, offer a payment date.",
        gain: "Fastest resolution for the largest/oldest item; preserves the relationship with a personal touch.",
        cost: "Your time and some social discomfort.",
        reversibility: "easy",
        falsifier: "If the relationship is already strained, a written reminder first may land better.",
      }),
      option({
        id: "wait",
        label: "Wait one more week",
        path: "Do nothing for seven days.",
        gain: "Zero effort; avoids nudging a customer who may simply be slow this month.",
        cost: `The ${eur(total)} stays uncollected and each week makes collection statistically harder.`,
        reversibility: "easy",
        falsifier: "If cash runway is already short, waiting compounds the wrong risk.",
        isNullOption: true,
      }),
    ],
    recommendedId: "remind",
    recommendationReason:
      "Reminders recover most late payments at almost no cost, and escalating to a call remains available if they don't.",
  };
}

function revenueDipGuidance(driver: string, delta: number): Guidance {
  return {
    options: [
      option({
        id: "contact",
        label: `Contact ${driver} this week`,
        path: `Call or visit ${driver}; ask openly whether something changed on their side.`,
        gain: "Directly addresses the concentrated cause; early contact has the best recovery odds.",
        cost: "An hour of your week.",
        reversibility: "easy",
        falsifier: `If ${driver}'s orders were a planned one-off (e.g., a project that ended), there is nothing to recover.`,
      }),
      option({
        id: "offer",
        label: "Run a re-engagement offer",
        path: "Send a time-limited offer to your regular customers.",
        gain: "May lift orders broadly, not just from one account.",
        cost: `Margin cost, and it doesn't answer why ${driver} slowed.`,
        reversibility: "moderate",
        falsifier: "If the cause is one customer's situation, a broad discount spends margin on the wrong problem.",
      }),
      option({
        id: "wait",
        label: "Wait one more cycle",
        path: "Do nothing for 30 days and re-read the trend.",
        gain: "Avoids acting on noise; costs nothing now.",
        cost: `If the dip is real, roughly ${eur(delta)} more goes uncollected next month.`,
        reversibility: "easy",
        falsifier: "If the dip deepens next month, waiting was the wrong call.",
        isNullOption: true,
      }),
    ],
    recommendedId: "contact",
    recommendationReason:
      "The shortfall is concentrated in one relationship, so the highest-information, lowest-cost move is a direct conversation.",
  };
}

// -------------------------------------------------------------- Customers ---

function customersBrain(state: WorkspaceState, out: Insight[], now: number): void {
  const customers = projectCustomers(state);
  const archived = new Set(state.archivedCustomers);
  for (const c of customers) {
    if (archived.has(c.name)) continue; // no advice about customers you've archived
    if (c.invoiceCount < 3 || c.medianGapDays === null || c.medianGapDays <= 0) continue;
    const daysSince = (now - c.lastInvoiceAt) / DAY;
    const threshold = Math.max(2 * c.medianGapDays, 30);
    if (daysSince > threshold) {
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `customers.silent.${c.name}`,
        domain: "customers",
        layer: "tactical",
        score: 50 + Math.min(30, Math.round(daysSince - threshold)),
        claim: `${c.name} has gone quiet — no order in ${Math.round(daysSince)} days, against their usual rhythm of every ~${Math.round(c.medianGapDays)} days.`,
        reasoning:
          `${c.name} ordered ${c.invoiceCount} times (${eur(c.totalBilled)} lifetime) with a median gap of ` +
          `${Math.round(c.medianGapDays)} days between orders. The current silence is more than twice their own rhythm — ` +
          `customers rarely announce that they're leaving; they just stop.`,
        evidence: [
          { label: "Last order", value: daysAgoLabel(c.lastInvoiceAt, now) },
          { label: "Their usual gap between orders", value: `~${Math.round(c.medianGapDays)} days (median)` },
          { label: "Lifetime billed", value: eur(c.totalBilled) },
        ],
        confidence: "medium",
        confidenceNote:
          "Pattern-based, not certain: a holiday, a stocked-up order, or seasonality could explain the silence. The falsifier below tells you what to check.",
        guidance: {
          options: [
            option({
              id: "call",
              label: `Check in with ${c.name}`,
              path: "A short, no-pressure message or call: 'been a while — anything you need?'",
              gain: "If they're drifting to a competitor, early contact is the only cheap moment to find out.",
              cost: "Minutes.",
              reversibility: "easy",
              falsifier: "If they ordered unusually large last time, they may simply still be stocked.",
            }),
            option({
              id: "gesture",
              label: "Send a small loyalty gesture",
              path: "A modest discount or a thank-you note referencing their history with you.",
              gain: "Warms the relationship without demanding a reply.",
              cost: "Small margin; can feel transactional if mistimed.",
              reversibility: "easy",
              falsifier: "If the silence has a practical cause (holidays, stock), the gesture answers a question nobody asked.",
            }),
            option({
              id: "wait",
              label: "Do nothing",
              path: "Wait and watch another cycle.",
              gain: "No effort; avoids over-contacting a customer who values distance.",
              cost: "If they are quietly leaving, every silent week lowers the odds of return.",
              reversibility: "easy",
              falsifier: "If they don't return next cycle either, waiting cost you the cheap moment.",
              isNullOption: true,
            }),
          ],
          recommendedId: "call",
          recommendationReason:
            "A low-pressure check-in has the best information-to-cost ratio, and this customer's history justifies the minutes.",
        },
      });
    }
  }
}

// -------------------------------------------------------------- Inventory ---

function inventoryBrain(state: WorkspaceState, out: Insight[], now: number): void {
  for (const p of state.products) {
    if (p.discontinued) continue; // no advice about products you've retired
    const dailySales = p.weeklySales / 7;
    // Available = physical − reserved by open orders (ZPL-041 §17: never oversell).
    const available = p.stock - (state.reserved[p.productId] ?? 0);

    // Stockout projection (the CODEX 00 D.11 traced scenario).
    if (dailySales > 0) {
      const daysLeft = available / dailySales;
      const margin = daysLeft - p.leadTimeDays;
      // Suppress the reorder alert if enough stock is already inbound on an open PO
      // to cover the lead-time gap — don't nag about something you've already ordered.
      const incoming = state.incoming[p.productId] ?? 0;
      const needForLeadTime = Math.ceil(dailySales * p.leadTimeDays);
      if (margin < 4 && incoming < needForLeadTime) {
        const orderQty = Math.ceil(p.weeklySales * 4);
        const orderValue = orderQty * p.unitCost;
        out.push({
          id: crypto.randomUUID(),
          decisionKey: `inventory.stockout.${p.productId}`,
          domain: "inventory",
          layer: "tactical",
          score: 60 + Math.max(0, Math.round((4 - margin) * 5)),
          claim:
            margin < 0
              ? `"${p.name}" will run out about ${Math.abs(Math.round(margin))} days before the earliest restock can arrive.`
              : `"${p.name}" is ${Math.round(daysLeft)} days from stockout — barely inside its ${p.leadTimeDays}-day resupply time.`,
          reasoning:
            `Available stock (${available} units after reservations) at your current sales velocity (${p.weeklySales}/week) lasts ~${Math.round(daysLeft)} days, ` +
            `while resupply takes ${p.leadTimeDays} days. The decision window is now: every day of waiting shortens the options below.`,
          evidence: [
            { label: "Units in stock (physical)", value: String(p.stock) },
            { label: "Reserved by open orders", value: String(state.reserved[p.productId] ?? 0) },
            { label: "Available to sell", value: String(available) },
            { label: "Sales velocity (your last recorded rate)", value: `${p.weeklySales}/week` },
            { label: "Supplier lead time", value: `${p.leadTimeDays} days` },
            { label: "Projected days of stock left", value: `~${Math.round(daysLeft)}` },
          ],
          confidence: "medium",
          confidenceNote:
            "The projection assumes sales continue at the recorded rate; a demand spike or lull moves the date either way.",
          guidance: {
            options: [
              option({
                id: "expedite",
                label: "Expedite a reorder now",
                path: `Order ${orderQty} units (~4 weeks of sales, ~${eur(orderValue)}) with express shipping.`,
                gain: "Avoids stockout days on a proven seller; protects the revenue and the customer habit.",
                cost: `Express premium (typically 10–20% on ~${eur(orderValue)}) and cash committed earlier.`,
                reversibility: "moderate",
                falsifier: "If the recent velocity was a one-off spike, expedited stock arrives to slower sales.",
              }),
              option({
                id: "standard",
                label: "Reorder at standard speed",
                path: `Order ${orderQty} units with normal ${p.leadTimeDays}-day delivery.`,
                gain: "No premium paid.",
                cost:
                  margin < 0
                    ? `Accepts ~${Math.abs(Math.round(margin))} days of stockout on a best-seller.`
                    : "Leaves almost no buffer if sales tick up.",
                reversibility: "moderate",
                falsifier: "If sales accelerate further, the gap widens beyond the projection.",
              }),
              option({
                id: "accept",
                label: "Accept the stockout",
                path: "Do nothing; restock on the next regular cycle.",
                gain: "Zero cost and effort now; frees cash for other uses.",
                cost: "Lost sales during the gap and the risk that regulars try an alternative.",
                reversibility: "easy",
                falsifier: "If this product drives repeat visits, the hidden cost exceeds the visible one.",
                isNullOption: true,
              }),
            ],
            recommendedId: "expedite",
            recommendationReason:
              "This is a proven seller with a concrete gap; the express premium is small against the lost sales and habit-breaking risk.",
          },
        });
      }
    }

    // Dead stock — cash sitting on a shelf.
    if (dailySales === 0 && p.stock > 0) {
      const tied = p.stock * p.unitCost;
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `inventory.dead.${p.productId}`,
        domain: "inventory",
        layer: "tactical",
        score: 25 + Math.min(20, Math.round(tied / 100)),
        claim: `"${p.name}" isn't selling at all — ${eur(tied)} of cash is sitting on the shelf.`,
        reasoning:
          `${p.stock} units at ${eur(p.unitCost)} cost each, with zero recorded weekly sales. ` +
          `Stock that doesn't move is a loan you made to your own shelf.`,
        evidence: [
          { label: "Units in stock", value: String(p.stock) },
          { label: "Recorded sales velocity", value: "0/week" },
          { label: "Cash tied up (at cost)", value: eur(tied) },
        ],
        confidence: "high",
        confidenceNote:
          "High confidence in the facts; whether to act depends on seasonality only you can judge.",
        guidance: {
          options: [
            option({
              id: "markdown",
              label: "Mark it down and free the cash",
              path: `Discount "${p.name}" enough to move it within a month.`,
              gain: `Recovers a good share of the ${eur(tied)} and frees shelf space for what sells.`,
              cost: "Margin sacrificed versus the original plan.",
              reversibility: "moderate",
              falsifier: "If this item is seasonal and its season is near, the markdown is premature.",
            }),
            option({
              id: "bundle",
              label: "Bundle it with a best-seller",
              path: "Attach it to a product that moves, at a modest combined discount.",
              gain: "Moves dead stock while protecting the headline price.",
              cost: "Slightly dilutes the best-seller's margin; takes a little setup.",
              reversibility: "easy",
              falsifier: "If the pairing feels forced to customers, attach rates will show it within weeks.",
            }),
            option({
              id: "hold",
              label: "Hold as is",
              path: "Keep it at full price and wait.",
              gain: "Preserves full margin if demand appears.",
              cost: `${eur(tied)} stays illiquid and the shelf space keeps paying for it.`,
              reversibility: "easy",
              falsifier: "If three more months pass without a sale, holding was the expensive choice.",
              isNullOption: true,
            }),
          ],
          recommendedId: "markdown",
          recommendationReason:
            "Unless you know a season is coming, recovering cash from a non-mover usually beats defending a margin that isn't being realized.",
        },
      });
    }
  }
}

// -------------------------------------------------------------- Commerce ---

function commerceBrain(state: WorkspaceState, out: Insight[], now: number): void {
  const settled = state.orders.filter(
    (o) => o.status === "delivered" || o.status === "refused" || o.status === "returned"
  );

  // 1. COD refusal rate — the silent margin killer of COD businesses.
  const refused = state.orders.filter((o) => o.status === "refused");
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
        claim: `${Math.round(rate * 100)}% of your settled COD orders are refused at the door — ${eur(loss)} spent shipping goods that came back.`,
        reasoning:
          `${refused.length} of ${settled.length} settled orders were refused. Each refusal costs round-trip shipping plus packaging ` +
          `with zero revenue. Refusal is usually a confirmation problem, not a customer problem: unconfirmed COD orders refuse far more often.`,
        evidence: [
          { label: "Settled orders (delivered + refused + returned)", value: String(settled.length) },
          { label: "Refused", value: String(refused.length) },
          { label: "Cash lost to refusals (round-trip shipping + packaging)", value: eur(loss) },
        ],
        confidence: "high",
        confidenceNote: "High confidence in the arithmetic; the remedy depends on why customers refuse — the falsifiers below tell you what to check.",
        guidance: {
          options: [
            option({
              id: "confirm",
              label: "Confirm every order before shipping",
              path: "Call or message each COD order before handing it to the courier; ship only confirmed ones.",
              gain: "Typically cuts refusals sharply; costs only minutes per order.",
              cost: "Adds a step to fulfillment; a few impulsive buyers won't answer.",
              reversibility: "easy",
              falsifier: "If your refusals come from delivery delays rather than intent, confirmation calls won't fix them.",
            }),
            option({
              id: "prepay",
              label: "Offer a small prepayment discount",
              path: "Give a modest discount for paying online instead of COD.",
              gain: "Shifts risk off you entirely for every prepaid order.",
              cost: "Margin on prepaid orders; requires a payment method your customers trust.",
              reversibility: "easy",
              falsifier: "If your market strongly distrusts online payment, uptake will be too low to matter.",
            }),
            option({
              id: "accept",
              label: "Accept the current rate",
              path: "Change nothing; treat refusals as a cost of COD.",
              gain: "No process change.",
              cost: `≈ ${eur(loss)} recurring, plus stock cycling back through returns.`,
              reversibility: "easy",
              falsifier: "If the rate keeps climbing, the cost compounds while competitors who confirm orders keep the margin.",
              isNullOption: true,
            }),
          ],
          recommendedId: "confirm",
          recommendationReason:
            "Confirmation attacks the root cause at near-zero cost and is the standard remedy for COD refusal.",
        },
      });
    }
  }

  // 2. Unprofitable delivered orders — money lost while "selling well".
  const losing = state.orders.filter(
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
      claim: `${losing.length} delivered order${losing.length > 1 ? "s" : ""} actually lost money — ${eur(Math.abs(totalLoss))} in total, after all costs.`,
      reasoning:
        "Revenue minus product cost, shipping, COD fee, and packaging is negative on these orders. " +
        "The usual causes: discounts stacked on low-margin items, or free/underpriced shipping on small baskets.",
      evidence: losing.slice(0, 5).map((o) => ({
        label: `${o.customer} — ${o.lines.map((l) => `${l.qty}× ${l.productName}`).join(", ")}`,
        value: `net ${eur(orderNetProfit(o))}`,
      })),
      confidence: "high",
      confidenceNote: "High confidence: computed from each order's own recorded figures.",
    });
  }

  // 3. Envelope discipline (3-envelope rule, ZPL-041 §8) — v1: expense envelope check.
  const collected30 = state.orders
    .filter((o) => o.cashReceivedAt && now - o.cashReceivedAt <= 30 * DAY)
    .reduce((s, o) => s + orderRevenue(o), 0)
    + state.invoices
      .filter((i) => i.paidAt && now - i.paidAt <= 30 * DAY)
      .reduce((s, i) => s + i.amount, 0);
  const expenses30 = state.expenses
    .filter((e) => now - e.date <= 30 * DAY)
    .reduce((s, e) => s + e.amount, 0);
  const expenseEnvelope = collected30 * ENVELOPES.expenses;
  if (collected30 > 0 && expenses30 > expenseEnvelope) {
    out.push({
      id: crypto.randomUUID(),
      decisionKey: "finance.envelope-expenses",
      domain: "finance",
      layer: "tactical",
      score: 40 + Math.min(30, Math.round(((expenses30 - expenseEnvelope) / Math.max(1, expenseEnvelope)) * 20)),
      claim: `This month's expenses (${eur(expenses30)}) exceed the expense envelope (${eur(expenseEnvelope)}) — the overspend is being paid from your stock and profit envelopes.`,
      reasoning:
        `Under the three-envelope rule, ${Math.round(ENVELOPES.stock * 100)}% of collected cash is reserved for restocking, ` +
        `${Math.round(ENVELOPES.expenses * 100)}% for expenses, and ${Math.round(ENVELOPES.profit * 100)}% is real profit. ` +
        `Collected cash in the last 30 days was ${eur(collected30)}; expenses above the envelope silently consume the other two.`,
      evidence: [
        { label: "Cash collected, last 30 days", value: eur(collected30) },
        { label: `Expense envelope (${Math.round(ENVELOPES.expenses * 100)}%)`, value: eur(expenseEnvelope) },
        { label: "Actual expenses, last 30 days", value: eur(expenses30) },
        { label: "Overspend", value: eur(expenses30 - expenseEnvelope) },
      ],
      confidence: "medium",
      confidenceNote:
        "The arithmetic is exact; the envelope percentages are the standard default and configurable to your business.",
    });
  }
}

// -------------------------------------------------------------- Marketing ---

function marketingBrain(state: WorkspaceState, out: Insight[], now: number): void {
  for (const promo of state.promos) {
    if (!promo.active || promo.timesUsed === 0) continue;
    const used = state.orders.filter((o) => o.promoCode === promo.code && o.status !== "cancelled");
    const delivered = used.filter((o) => o.status === "delivered");
    const discountGiven = used.reduce((s, o) => s + o.discount, 0);

    // Promo-profitability: are the delivered orders using this code actually making money?
    if (delivered.length >= 2) {
      const netProfit = delivered.reduce((s, o) => s + orderNetProfit(o), 0);
      if (netProfit < 0) {
        out.push({
          id: crypto.randomUUID(),
          decisionKey: `marketing.promo-unprofitable.${promo.code}`,
          domain: "marketing",
          layer: "tactical",
          score: 55 + Math.min(25, Math.round(Math.abs(netProfit))),
          claim: `Promo "${promo.code}" is losing money — its delivered orders net ${eur(netProfit)} after all costs.`,
          reasoning:
            `${delivered.length} delivered orders used "${promo.code}", giving away ${eur(discountGiven)} in discounts. ` +
            `After product cost, shipping, COD fees, and packaging, those orders are collectively unprofitable. ` +
            `A discount that drives volume at a loss shrinks the business faster the more it "works".`,
          evidence: [
            { label: "Delivered orders using this promo", value: String(delivered.length) },
            { label: "Total discount given", value: eur(discountGiven) },
            { label: "Net profit of those orders", value: eur(netProfit) },
            {
              label: "Promo terms",
              value:
                promo.type === "percentage"
                  ? `${promo.value}% off${promo.minBasket ? `, min basket ${eur(promo.minBasket)}` : ""}`
                  : `${eur(promo.value)} off${promo.minBasket ? `, min basket ${eur(promo.minBasket)}` : ""}`,
            },
          ],
          confidence: "high",
          confidenceNote: "High confidence: computed from each order's own recorded figures.",
          guidance: {
            options: [
              option({
                id: "raise-min",
                label: "Raise the minimum basket",
                path: `Deactivate "${promo.code}" and reissue it with a higher minimum basket so it only applies to orders large enough to absorb the discount.`,
                gain: "Keeps the promo's pull on bigger baskets while cutting off the loss-making small ones.",
                cost: "Fewer customers qualify; a little setup.",
                reversibility: "easy",
                falsifier: "If most losses come from shipping rather than basket size, a higher minimum won't fix it.",
              }),
              option({
                id: "lower-value",
                label: "Reduce the discount",
                path: `Reissue with a smaller percentage or a cap (maxDiscount) so the giveaway can't exceed the margin.`,
                gain: "Preserves the promo while protecting the floor.",
                cost: "A weaker offer may convert fewer customers.",
                reversibility: "easy",
                falsifier: "If the offer only worked because it was generous, a smaller one may not move anyone.",
              }),
              option({
                id: "stop",
                label: "Stop the promo",
                path: `Deactivate "${promo.code}" and don't replace it.`,
                gain: "Immediately stops the bleeding.",
                cost: "Loses whatever genuine repeat business the promo was seeding.",
                reversibility: "easy",
                falsifier: "If the promo is acquiring customers who reorder at full price, stopping it ignores that lifetime value.",
                isNullOption: true,
              }),
            ],
            recommendedId: "raise-min",
            recommendationReason:
              "Most COD promo losses come from small baskets that can't cover fixed shipping and fees; a higher minimum targets exactly those without killing the offer.",
          },
        });
      }
    }

    // Near/at usage limit — worth understanding (no judgment demanded).
    if (promo.usageLimit !== undefined && promo.timesUsed >= promo.usageLimit * 0.8) {
      const atLimit = promo.timesUsed >= promo.usageLimit;
      out.push({
        id: crypto.randomUUID(),
        decisionKey: `marketing.promo-limit.${promo.code}`,
        domain: "marketing",
        layer: "operational",
        score: 20,
        claim: atLimit
          ? `Promo "${promo.code}" has reached its usage limit (${promo.timesUsed}/${promo.usageLimit}) and no longer applies.`
          : `Promo "${promo.code}" is near its usage limit (${promo.timesUsed}/${promo.usageLimit}).`,
        reasoning:
          `Usage is counted server-side from non-cancelled orders bearing the code, so the limit is enforced consistently. ` +
          (atLimit ? "New orders can no longer redeem it." : "It will stop applying once the limit is reached."),
        evidence: [
          { label: "Redemptions", value: `${promo.timesUsed} of ${promo.usageLimit}` },
          { label: "Discount given so far", value: eur(discountGiven) },
        ],
        confidence: "high",
        confidenceNote: "High confidence: a direct count of your own orders.",
      });
    }
  }
}

/** Default envelope allocation (3-envelope rule) — configurable in a later slice. */
export const ENVELOPES = { stock: 0.4, expenses: 0.3, profit: 0.3 };

/**
 * Cash Center (ZPL-041 §3, §8): collected vs. pending COD cash, and the
 * recommended 3-envelope allocation of the last 30 days' collections.
 * One calculation owner — every surface showing cash reads this.
 */
export function cashCenter(state: WorkspaceState, now: number = Date.now()) {
  const paidInvoices = state.invoices.filter((i) => i.paidAt);
  const remitted = state.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const pendingCod = state.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt);

  const collectedAllTime =
    paidInvoices.reduce((s, i) => s + i.amount, 0) +
    remitted.reduce((s, o) => s + orderRevenue(o), 0);
  const expensesAllTime = state.expenses.reduce((s, e) => s + e.amount, 0);

  const collected30 =
    paidInvoices.filter((i) => now - (i.paidAt as number) <= 30 * DAY).reduce((s, i) => s + i.amount, 0) +
    remitted
      .filter((o) => now - (o.cashReceivedAt as number) <= 30 * DAY)
      .reduce((s, o) => s + orderRevenue(o), 0);
  const expenses30 = state.expenses
    .filter((e) => now - e.date <= 30 * DAY)
    .reduce((s, e) => s + e.amount, 0);

  return {
    cashAvailable: collectedAllTime - expensesAllTime,
    cashPendingCod: pendingCod.reduce((s, o) => s + orderRevenue(o), 0),
    collected30,
    expenses30,
    envelopes: {
      stock: collected30 * ENVELOPES.stock,
      expenses: collected30 * ENVELOPES.expenses,
      profit: collected30 * ENVELOPES.profit,
    },
    expenseOverspend: Math.max(0, expenses30 - collected30 * ENVELOPES.expenses),
  };
}

/** Level-3 context: the calm "state of things" (CODEX 00 D.7, level 3 — on demand). */
export function stateOfThings(state: WorkspaceState, now: number = Date.now()) {
  const paid = state.invoices.filter((i) => i.paidAt);
  const open = state.invoices.filter((i) => !i.paidAt);
  const remitted = state.orders.filter((o) => o.status === "delivered" && o.cashReceivedAt);
  const pendingCod = state.orders.filter((o) => o.status === "delivered" && !o.cashReceivedAt);
  const cash =
    paid.reduce((s, i) => s + i.amount, 0) +
    remitted.reduce((s, o) => s + orderRevenue(o), 0) -
    state.expenses.reduce((s, e) => s + e.amount, 0);
  const last30 =
    state.invoices
      .filter((i) => now - i.issuedAt <= 30 * DAY)
      .reduce((s, i) => s + i.amount, 0) +
    state.orders
      .filter((o) => o.deliveredAt && now - o.deliveredAt <= 30 * DAY)
      .reduce((s, o) => s + orderRevenue(o), 0);
  const stockValue = state.products.reduce((s, p) => s + p.stock * p.unitCost, 0);
  return {
    cash,
    cashPendingCod: pendingCod.reduce((s, o) => s + orderRevenue(o), 0),
    billedLast30: last30,
    openInvoices: open.length,
    openInvoiceValue: open.reduce((s, i) => s + i.amount, 0),
    openOrders: state.orders.filter(
      (o) => o.status === "pending" || o.status === "confirmed" || o.status === "shipped"
    ).length,
    products: state.products.length,
    stockValue,
  };
}

export const formatMoney = money;
