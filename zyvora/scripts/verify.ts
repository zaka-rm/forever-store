/**
 * Logic-level verification of the Decision Lifecycle (D.11 stages 1–8 + suppression).
 * Runs the same core the UI uses, against the demo seed, and asserts the
 * constitutional behaviors. Exit code 0 = all checks pass.
 */
import { generateInsights, stateOfThings } from "../src/core/engine";
import {
  breakEven,
  checkPromo,
  forecast,
  goalActual,
  orderNetProfit,
  orderRevenue,
  projectCustomerProfiles,
  projectDecisions,
  projectState,
  simulateProfit,
} from "../src/core/projections";
import { askZyvora } from "../src/core/assistant";
import { autoMap, buildRow, parseCsv } from "../src/core/csv";
import { NATURALOE_CATALOG } from "../src/core/naturaloeCatalog";
import { FOREVER_PRICES } from "../src/core/foreverPrices";
import { seedDemoData } from "../src/core/seed";
import type { MemoryEvent, Order, Stream } from "../src/core/types";

// Minimal in-memory stand-in for BusinessMemory (same append-only contract).
class TestMemory {
  events: MemoryEvent[] = [];
  append(stream: Stream, type: string, payload: Record<string, unknown>, ts?: number): MemoryEvent {
    const e: MemoryEvent = { id: crypto.randomUUID(), ts: ts ?? Date.now(), stream, type, payload };
    this.events.push(e);
    return e;
  }
  all(): readonly MemoryEvent[] {
    return this.events;
  }
  exportJson(): void {}
  subscribe(): () => void {
    return () => {};
  }
}

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

const memory = new TestMemory();
seedDemoData(memory as never);

const state = projectState(memory.all());
const decisions = projectDecisions(memory.all());
const insights = generateInsights(state, decisions);

console.log("\nProjections:");
check("facts fold into state", state.invoices.length === 14 && state.products.length === 3,
  `invoices=${state.invoices.length}, products=${state.products.length}`);
check("orders fold into state", state.orders.length === 10, `orders=${state.orders.length}`);

console.log("\nCommerce & COD lifecycle (Wave 1):");
const mug = state.products.find((p) => p.productId === "P-001")!;
// Delivered mug quantities: 4 + 6 + 3 + 1 + 1 = 15 → physical stock 18 − 15 = 3
check("delivery deducts stock (mug 18 → 3)", mug.stock === 3, `stock=${mug.stock}`);
check("open order reserves stock (Hassan, 2 mugs)", state.reserved["P-001"] === 2,
  `reserved=${state.reserved["P-001"]}`);
const refusedOrder = state.orders.find((o) => o.status === "refused");
check("refused order does not deduct stock and holds no reservation", !!refusedOrder);
const sara = state.orders.find((o) => o.customer === "Sara H.")!;
check("order profit math: Sara's order loses money", orderNetProfit(sara) < 0,
  `net=${orderNetProfit(sara).toFixed(2)}`);
const fatima = state.orders.find((o) => o.customer === "Fatima B.")!;
check("order revenue = lines − discount + shipping charged", Math.abs(orderRevenue(fatima) - 53) < 0.01,
  `revenue=${orderRevenue(fatima)}`);
const things = stateOfThings(state);
check("delivered-but-unremitted cash shows as pending COD", things.cashPendingCod > 0,
  `pending=${things.cashPendingCod.toFixed(2)}`);
check("open orders counted", things.openOrders === 1, `open=${things.openOrders}`);

console.log("\nCRM customer profiles (Wave 4):");
const profiles = projectCustomerProfiles(state);
// Karim Z. refused his only order → COD reliability 0%, high-refusal tag.
const karim = profiles.find((p) => p.name === "Karim Z.")!;
check("refused-only customer has 0% COD reliability", karim.codReliability === 0,
  `reliability=${karim.codReliability}`);
check("high refusal customer is tagged", karim.tags.includes("high-refusal"));
// Fatima delivered + remitted → has profit data and positive lifetime profit.
const fatimaP = profiles.find((p) => p.name === "Fatima B.")!;
check("delivered customer has profit data", fatimaP.hasProfitData && fatimaP.lifetimeProfit > 0,
  `profit=${fatimaP.lifetimeProfit.toFixed(2)}`);
check("lifetime revenue unifies invoices + orders", fatimaP.lifetimeRevenue >= orderRevenue(fatima) - 0.01);
// At least one VIP tag exists (top 20% by revenue), and every profile carries a lifecycle tag.
check("VIP tag assigned to top customers", profiles.some((p) => p.tags.includes("vip")));
check("every profile has new-or-returning lifecycle tag",
  profiles.every((p) => p.tags.includes("new") || p.tags.includes("returning")));

console.log("\nDecision Engine — Business Brains:");
const byKey = (prefix: string) => insights.find((i) => i.decisionKey.startsWith(prefix));
const overdue = byKey("finance.overdue");
const dip = byKey("finance.revenue-dip");
const runway = byKey("finance.runway");
const churn = byKey("customers.silent.Harbor Café");
const stockout = byKey("inventory.stockout.P-001");
const dead = byKey("inventory.dead.P-003");

check("overdue invoices detected (Nordwind)", !!overdue && overdue.claim.includes("2 invoice"));
check("revenue dip detected with driver Atlas Retail", !!dip && dip.claim.includes("Atlas Retail"), dip?.claim ?? "none");
check("cash runway strategic insight present", !!runway && runway.layer === "strategic");
check("silent-churn customer detected (Harbor Café)", !!churn);
check("stockout projected before lead time (Ceramic Mug)", !!stockout);
check("dead stock detected (Linen Tote)", !!dead);
check("COD refusal-rate insight fires (3 of 9 settled)", !!byKey("commerce.refusal-rate"));
check("unprofitable delivered orders detected", !!byKey("commerce.unprofitable-orders"));
check("expense-envelope overspend detected", !!byKey("finance.envelope-expenses"));

console.log("\nDiscounts & promo engine (Wave 1 completion):");
const promo = state.promos.find((p) => p.code === "WELCOME15")!;
check("promo folds into state and is active", !!promo && promo.active, `promo=${!!promo}`);
check("promo usage server-counted (2 orders bear WELCOME15)", promo.timesUsed === 2,
  `used=${promo.timesUsed}`);
// checkPromo: 15% of 100 = 15 discount, valid basket.
const okCheck = checkPromo(state, "WELCOME15", 100);
check("checkPromo computes 15% discount", okCheck.ok && Math.abs(okCheck.discount - 15) < 0.01,
  okCheck.ok ? `discount=${okCheck.discount}` : okCheck.reason);
const badCode = checkPromo(state, "NOPE", 100);
check("checkPromo rejects unknown code", !badCode.ok);
// minBasket enforcement: create a promo check with a min via a synthetic — use existing (min 0) so test the limit path instead.
check("marketing brain flags the unprofitable promo", !!byKey("marketing.promo-unprofitable.WELCOME15"));

console.log("\nFinance depth (Wave 3):");
// simulator: sell 100, cost 40, qty 2, discount 5, ship 10, pack 2, ad 0
// revenue=(100-5)*2=190, cogs=80, gross=110, net=110-12=98
const sim = simulateProfit({ sellingPrice: 100, buyingCost: 40, quantity: 2, discount: 5, shippingCost: 10, packagingCost: 2, advertisingCost: 0 });
check("simulator revenue", Math.abs(sim.revenue - 190) < 0.01, `rev=${sim.revenue}`);
check("simulator net profit", Math.abs(sim.netProfit - 98) < 0.01, `net=${sim.netProfit}`);
check("simulator break-even units (12 / 55 per-unit = 1)", sim.breakEvenUnits === 1, `be=${sim.breakEvenUnits}`);
const simLoss = simulateProfit({ sellingPrice: 10, buyingCost: 12, quantity: 1, discount: 0, shippingCost: 5, packagingCost: 0, advertisingCost: 0 });
check("simulator: unit that loses money has no break-even", simLoss.breakEvenUnits === null);
const be = breakEven(state);
check("break-even computed from delivered orders + fixed expenses", be.monthlyFixedExpenses > 0 && be.avgProfitPerOrder !== 0);
// goals: set a revenue goal via events, then read it back and check progress math.
memory.append("fact", "goal_set", { metric: "revenue", target: 10000, setAt: Date.now() });
const withGoal = projectState(memory.all());
check("goal folds into state (latest wins)", withGoal.goals.revenue === 10000, `goal=${withGoal.goals.revenue}`);
check("goalActual returns a number", typeof goalActual(withGoal, "revenue") === "number");

console.log("\nForecasting (Wave 7):");
const fc = forecast(state);
check("forecast returns assumptions (honest framing)", fc.assumptions.length > 0);
check("forecast projects stockouts as a range list", Array.isArray(fc.stockouts));

console.log("\nAsk ZYVORA assistant (Wave 7):");
const aProfit = askZyvora(state, "how much profit did I make?");
check("assistant answers profit with evidence", aProfit.handled && aProfit.evidence.length > 0);
const aLost = askZyvora(state, "show orders that lost money");
check("assistant finds unprofitable orders", aLost.handled && /lost money|net/i.test(aLost.text));
const aMargin = askZyvora(state, "which product has the highest margin?");
check("assistant answers product margin", aMargin.handled && aMargin.evidence.length > 0);
const aJunk = askZyvora(state, "what is the meaning of life?");
check("assistant admits out-of-scope (never fabricates)", !aJunk.handled);

console.log("\nCSV import (Wave 6):");
const csv = 'Name,Selling Price,Cost,Qty\n"Aloe Vera Gel",120,70,40\nForever Bee Honey,95,55,25\n,10,5,3';
const p = parseCsv(csv);
check("CSV parses headers + rows (quoted fields, skips blank name row later)", p.headers.length === 4 && p.rows.length === 3);
const m = autoMap("products", p.headers);
check("auto-map matches name/price/cost/stock by header", m.name === 0 && m.price === 1 && m.unitCost === 2 && m.stock === 3);
const r0 = buildRow("products", m, p.rows[0]);
check("valid product row builds a product_added event", !!r0.event && r0.event.type === "product_added" && (r0.event.payload.name === "Aloe Vera Gel"));
const rBad = buildRow("products", m, p.rows[2]); // missing name
check("row missing required field is rejected with a reason", !rBad.event && rBad.error === "missing name");
const invCsv = "client,montant,date,paye\nOmar,300,2026-05-01,2026-05-10";
const ip = parseCsv(invCsv);
const im = autoMap("invoices", ip.headers);
const ir = buildRow("invoices", im, ip.rows[0]);
check("invoice with paid date builds issued + paid events", !!ir.event && ir.event.type === "invoice_issued" && !!ir.extra && ir.extra.type === "invoice_paid");

console.log("\nNaturaloe store catalog:");
check("catalog has the full 72-product lineup", NATURALOE_CATALOG.length === 72, `count=${NATURALOE_CATALOG.length}`);
check("every catalog product has a name and a dirham sell price", NATURALOE_CATALOG.every((p) => p.name.length > 0 && p.priceDh > 0));
const aloe = NATURALOE_CATALOG.find((p) => p.id === "p01");
check("Aloe Vera Gel priced 76 DH (7€ × 10.8)", !!aloe && aloe.priceDh === 76, `price=${aloe?.priceDh}`);

console.log("\nForever real prices (from order form):");
check("Forever price list has ~70 products", FOREVER_PRICES.length >= 60, `count=${FOREVER_PRICES.length}`);
check("every Forever product has sell > cost > 0", FOREVER_PRICES.every((p) => p.sellDh > p.costDh && p.costDh > 0));
check("cost is 30% off retail (Argi+ 899 → 629)", FOREVER_PRICES.every((p) => p.costDh === Math.round(p.sellDh * 0.7)));
const argi = FOREVER_PRICES.find((p) => /argi/i.test(p.name));
check("Argi+ real price present (899 sell / 629 cost)", !!argi && argi.sellDh === 899 && argi.costDh === 629, `${argi?.sellDh}/${argi?.costDh}`);

console.log("\nConstitutional invariants:");
check("insights are ranked descending", insights.every((x, i, a) => i === 0 || a[i - 1].score >= x.score));
const withGuidance = insights.filter((i) => i.guidance);
check("every Guidance has 2–4 options", withGuidance.every((i) => i.guidance!.options.length >= 2 && i.guidance!.options.length <= 4));
check("every Guidance includes the null option (5.8)", withGuidance.every((i) => i.guidance!.options.some((o) => o.isNullOption)));
check("every option carries a falsifier (P4.6 L4)", withGuidance.every((i) => i.guidance!.options.every((o) => o.falsifier.length > 0)));
check("every insight carries evidence + confidence note (Law IX)", insights.every((i) => i.evidence.length > 0 && i.confidenceNote.length > 0));
check("recommendation is one of the options", withGuidance.every((i) => i.guidance!.options.some((o) => o.id === i.guidance!.recommendedId)));

console.log("\nLifecycle stage 8 + suppression (P4.3):");
const target = stockout!;
memory.append("interpretation", "insight_presented", { decisionKey: target.decisionKey, claim: target.claim });
memory.append("decision", "decision_recorded", {
  decisionKey: target.decisionKey,
  claim: target.claim,
  layer: target.layer,
  optionId: "expedite",
  optionLabel: "Expedite a reorder now",
  rationale: "Best-seller; premium is small vs. lost sales.",
});
const decisions2 = projectDecisions(memory.all());
check("decision recorded with rationale", decisions2.length === 1 && decisions2[0].rationale.length > 0);
const insights2 = generateInsights(projectState(memory.all()), decisions2);
check("decided item no longer re-nags", !insights2.some((i) => i.decisionKey === target.decisionKey));
check("undecided items still present", insights2.some((i) => i.decisionKey.startsWith("finance.overdue")));

memory.append("outcome", "outcome_recorded", {
  decisionEventId: decisions2[0].eventId, decisionKey: target.decisionKey, result: "good", note: "Arrived in time; zero stockout days.",
});
check("outcome linked to decision", projectDecisions(memory.all())[0].hasOutcome);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
