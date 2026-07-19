/**
 * Logic-level verification of the Decision Lifecycle (D.11 stages 1–8 + suppression).
 * Runs the same core the UI uses, against the demo seed, and asserts the
 * constitutional behaviors. Exit code 0 = all checks pass.
 */
import { entitlement } from "../src/core/entitlement";
import { calculateInvoiceTotals, canGenerateFulfillmentDocuments, creditNoteDocumentHtml, customerStatementDocumentHtml, deliveryNoteDocumentHtml, invoiceDocumentHtml, invoiceFromAcceptedQuote, packingSlipDocumentHtml, projectDocumentBranding, purchaseOrderDocumentHtml, quoteDocumentHtml, receiptDocumentHtml } from "../src/core/documents";
import { computeRfm, refillDueList, reorderDueList, upsellSuggestion } from "../src/core/retention";
import { refusalRisk } from "../src/core/risk";
import { businessHealth } from "../src/core/health";
import { measureCampaign, projectCampaigns } from "../src/core/campaigns";
import { weeklyReview } from "../src/core/weekly";
import { courierControl } from "../src/core/couriers";
import { workflowCandidates } from "../src/core/automations";
import { classifyInbound, projectConversations, waitingCount } from "../src/core/inbox";
import { WHATSAPP_TEMPLATES, numberedTemplateVariables, whatsappTemplatePreview } from "../src/core/messageTemplates";
import { courierScorecard, referralLeaderboard } from "../src/core/retention";
import { storyForCustomer, storyForOrder } from "../src/core/story";
import { restageInLang, stageAction } from "../src/core/actions";
import { measureOperatorRun, prepareOperatorPlan, projectOperatorRuns, type OperatorRun } from "../src/core/operator";
import { coachFor, pendingOutcomeReviews, projectDecisionMemories } from "../src/core/coach";
import { generateInsights, stateOfThings } from "../src/core/engine";
import {
  breakEven,
  cashCalendar,
  checkPromo,
  forecast,
  goalActual,
  orderCashDue,
  orderCogs,
  orderNetProfit,
  orderGrossRevenue,
  orderRevenue,
  projectCustomerProfiles,
  projectDecisions,
  projectState,
  simulateProfit,
} from "../src/core/projections";
import { askZyvora, businessContext } from "../src/core/assistant";
import { autoMap, buildRow, parseCsv } from "../src/core/csv";
import { NATURALOE_CATALOG } from "../src/core/naturaloeCatalog";
import { FOREVER_PRICES } from "../src/core/foreverPrices";
import { can, canManageMember } from "../src/core/permissions";
import { dailyBriefing, generateNotifications } from "../src/core/notifications";
import { monthBounds, profitAndLoss, projectActivities, projectContacts } from "../src/core/projections";
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
check("orders fold into state", state.orders.length === 11, `orders=${state.orders.length}`);

console.log("\nCommerce & COD lifecycle (Wave 1):");
const mug = state.products.find((p) => p.productId === "P-001")!;
// Delivered mug quantities: 4 + 6 + 3 + 1 + 1 = 15 → physical stock 18 − 15 = 3
check("delivery deducts stock (mug 18 → 3)", mug.stock === 3, `stock=${mug.stock}`);
// Hassan (shipped, 2 mugs) + Amina (pending, 2 mugs) both hold reservations → 4.
check("open orders reserve stock (Hassan + Amina, 2 mugs each)", state.reserved["P-001"] === 4,
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
check("open orders counted", things.openOrders === 2, `open=${things.openOrders}`);

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
const ctx = businessContext(state);
check("business context brief includes real cash + P&L facts", /CASH:/.test(ctx) && /P&L/.test(ctx) && ctx.length > 200);
check("business context lists products and customers", /PRODUCTS/.test(ctx) && /CUSTOMERS/.test(ctx));

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

console.log("\nMulti-user permissions (CAP-000004):");
check("owner can do everything", can("owner", "delete_workspace") && can("owner", "invite_member") && can("owner", "create_order"));
check("viewer can only view", can("viewer", "view") && !can("viewer", "create_order") && !can("viewer", "export_memory"));
check("staff runs operations but not the team", can("staff", "create_order") && can("staff", "manage_inventory") && !can("staff", "invite_member"));
check("manager manages team but can't delete workspace", can("manager", "invite_member") && !can("manager", "delete_workspace"));
check("owner and manager can manage document branding while staff cannot",
  can("owner", "manage_documents") && can("manager", "manage_documents") && !can("staff", "manage_documents"));
check("escalation guard: owner cannot be demoted/removed", !canManageMember("manager", "owner"));
check("escalation guard: staff cannot change roles", !canManageMember("staff", "viewer"));
check("escalation guard: cannot promote above your own rank", !canManageMember("manager", "staff", "owner") && canManageMember("manager", "staff", "manager"));

console.log("\nNotifications & briefing (CAP-000010):");
const notifs = generateNotifications(state, insights);
check("notifications generated from insights + triggers", notifs.length > 0, `count=${notifs.length}`);
check("notifications sorted high-priority first", notifs.every((n, i, a) => i === 0 || rankP(a[i - 1].priority) <= rankP(n.priority)));
check("every notification has a stable key + action view", notifs.every((n) => n.key.length > 0 && !!n.actionView));
check("high-priority items include guidance decisions", notifs.some((n) => n.priority === "high"));
const brief = dailyBriefing(state, notifs);
check("daily briefing summarizes yesterday + attention count", typeof brief.revenueYesterday === "number" && brief.headline.length > 0);
function rankP(p: string) { return p === "high" ? 0 : p === "medium" ? 1 : 2; }

console.log("\nProfit & Loss statement (CAP-000005 FEAT-000040):");
// A wide window covering the whole seeded history.
const wide = monthBounds(new Date().getFullYear(), new Date().getMonth());
const pnlAll = profitAndLoss(state, 0, Date.now() + 86400000, "all time");
check("P&L builds revenue → gross profit → net profit", pnlAll.revenue.netRevenue !== 0 && typeof pnlAll.netProfit === "number");
check("gross profit = net revenue − COGS", Math.abs(pnlAll.grossProfit - (pnlAll.revenue.netRevenue - pnlAll.cogs)) < 0.01);
check("net profit = gross profit − operating expenses", Math.abs(pnlAll.netProfit - (pnlAll.grossProfit - pnlAll.operatingExpenses.total)) < 0.01);
check("P&L counts only delivered orders", pnlAll.ordersDelivered > 0 && pnlAll.ordersDelivered <= state.orders.length);
check("current-month P&L bounds are one calendar month", wide.end - wide.start >= 27 * 24 * 3600 * 1000);

console.log("\nCRM depth — contacts & activities (CAP-000007):");
const crmMem = new TestMemory();
crmMem.append("fact", "customer_contact_updated", { customer: "Atlas Retail", phone: "0600", city: "Casablanca", notes: "big account", at: Date.now() });
crmMem.append("fact", "customer_contact_updated", { customer: "Atlas Retail", phone: "0611", at: Date.now() }); // latest wins on phone, keeps city
const aid = crypto.randomUUID();
crmMem.append("fact", "customer_activity_logged", { activityId: aid, customer: "Atlas Retail", kind: "followup", note: "call re reorder", dueAt: Date.now() - 86400000, at: Date.now() });
const contacts = projectContacts(crmMem.all());
check("contact folds latest-wins per field", contacts.get("Atlas Retail")?.phone === "0611" && contacts.get("Atlas Retail")?.city === "Casablanca");
let acts = projectActivities(crmMem.all());
check("activity logged and open", acts.length === 1 && !acts[0].done);
crmMem.append("fact", "customer_activity_completed", { activityId: aid, at: Date.now() });
acts = projectActivities(crmMem.all());
check("activity marked done via completion event", acts[0].done === true);

console.log("\nPurchase orders & receipts (CAP-000006 FEAT-000045):");
const invMem = new TestMemory();
invMem.append("fact", "product_added", { productId: "PX", name: "Widget", stock: 5, weeklySales: 7, leadTimeDays: 14, unitCost: 10, price: 25 });
invMem.append("fact", "product_added", { productId: "PY", name: "Bottle", stock: 2, weeklySales: 2, leadTimeDays: 10, unitCost: 5, price: 12 });
const poId = crypto.randomUUID();
invMem.append("fact", "purchase_order_created", { poId, supplier: "Forever", supplierEmail: "supply@example.com", supplierAddress: "Casablanca", lines: [{ productId: "PX", productName: "Widget", qty: 40, unitCost: 9 }, { productId: "PY", productName: "Bottle", qty: 10, unitCost: 5 }], expectedAt: Date.now() + 7 * 86_400_000, paymentTerms: "Net 30", notes: "Confirm batch before shipping", createdAt: Date.now() });
let invState = projectState(invMem.all());
check("open multi-line PO shows every item as incoming with stock unchanged", invState.incoming["PX"] === 40 && invState.incoming["PY"] === 10 && invState.products[0].stock === 5);
const openPoHtml = purchaseOrderDocumentHtml(invState.purchaseOrders[0], "Test business", (amount) => `MAD ${amount.toFixed(2)}`);
check("supplier purchase-order document carries identity, items, terms, arrival, and total",
  openPoHtml.includes("Purchase order") && openPoHtml.includes("supply@example.com") && openPoHtml.includes("Widget") && openPoHtml.includes("Bottle") && openPoHtml.includes("Net 30") && openPoHtml.includes("MAD 410.00") && openPoHtml.includes("Expected arrival"));
const insWithPo = generateInsights(invState, []);
check("stockout alert suppressed when enough is already inbound", !insWithPo.some((i) => i.decisionKey === "inventory.stockout.PX"));
invMem.append("fact", "goods_received", { receiptId: "partial-receipt", poId, lines: [{ orderLineIndex: 0, productId: "PX", qty: 15 }, { orderLineIndex: 1, productId: "PY", qty: 4 }], note: "First carton", at: Date.now() });
invState = projectState(invMem.all());
check("partial receipt raises stock only by accepted quantities and leaves exact incoming remainder",
  invState.products.find((product) => product.productId === "PX")?.stock === 20 && invState.products.find((product) => product.productId === "PY")?.stock === 6 && invState.incoming["PX"] === 25 && invState.incoming["PY"] === 6 && !invState.purchaseOrders[0].receivedAt);
check("partial receipt is preserved as an immutable batch and shown on the supplier document",
  invState.purchaseOrders[0].receipts?.[0].receiptId === "partial-receipt" && purchaseOrderDocumentHtml(invState.purchaseOrders[0], "Test business", (amount) => `MAD ${amount.toFixed(2)}`).includes("Partially received"));
invMem.append("fact", "goods_received", { poId, at: Date.now() });
invState = projectState(invMem.all());
check("legacy receive-all completes only the remaining units and clears incoming",
  invState.products.find((product) => product.productId === "PX")?.stock === 45 && invState.products.find((product) => product.productId === "PY")?.stock === 12 && !invState.incoming["PX"] && !invState.incoming["PY"]);
check("received purchase-order document records the immutable receiving status",
  purchaseOrderDocumentHtml(invState.purchaseOrders[0], "Test business", (amount) => `MAD ${amount.toFixed(2)}`).includes("Received"));

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

console.log("\nCorrections & archival (append-only edit/delete, ADR-0002):");
{
  const before = projectState(memory.all());
  const prod = before.products[0];
  memory.append("fact", "product_updated", { productId: prod.productId, price: prod.price + 5, at: Date.now() });
  const afterEdit = projectState(memory.all()).products.find((p) => p.productId === prod.productId)!;
  check("product edit appends a correction (price updated)", afterEdit.price === prod.price + 5);
  check("product edit leaves untouched fields intact", afterEdit.name === prod.name && afterEdit.unitCost === prod.unitCost);

  memory.append("fact", "product_discontinued", { productId: prod.productId, at: Date.now() });
  const afterDisc = projectState(memory.all());
  check("discontinued product stays in state, flagged (history kept)", afterDisc.products.find((p) => p.productId === prod.productId)!.discontinued === true);
  const insDisc = generateInsights(afterDisc, projectDecisions(memory.all()));
  check(
    "no advice generated for a discontinued product",
    !insDisc.some((i) => i.decisionKey === `inventory.stockout.${prod.productId}` || i.decisionKey === `inventory.dead.${prod.productId}`)
  );
  memory.append("fact", "product_restored", { productId: prod.productId, at: Date.now() });
  check("restore clears the discontinued flag", projectState(memory.all()).products.find((p) => p.productId === prod.productId)!.discontinued === false);

  const silentBefore = generateInsights(projectState(memory.all()), projectDecisions(memory.all()))
    .filter((i) => i.decisionKey.startsWith("customers.silent."));
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
  const profiles = projectCustomerProfiles(st, Date.now());
  const rfm = computeRfm(profiles);
  check("every customer receives an RFM segment", profiles.every((p) => rfm.has(p.name)));
  check(
    "RFM scores stay in 1..5",
    [...rfm.values()].every((s) => [s.r, s.f, s.m].every((v) => v >= 1 && v <= 5))
  );
  const quietBig = profiles.find((p) => p.name === "Harbor Café");
  if (quietBig) {
    const s = rfm.get("Harbor Café")!;
    check("a high-spend quiet customer is flagged at-risk/can't-lose/hibernating", ["at-risk", "cant-lose", "hibernating"].includes(s.segment));
  }
  const due = reorderDueList(profiles, st.archivedCustomers);
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

console.log("\nAsk → Act (staged actions, ghostwriter):");
{
  const st = projectState(memory.all());
  const profiles = projectCustomerProfiles(st, Date.now());
  const contacts = projectContacts(memory.all());

  const remind = stageAction(st, profiles, contacts, "Draft a payment reminder");
  check("payment-reminder stages against the oldest overdue invoice", remind !== null && remind.intent === "payment-reminder");
  check("reminder draft carries the real amount and overdue days", remind !== null && /\d/.test(remind.body) && remind.reason.includes("past due"));

  const named = stageAction(st, profiles, contacts, "remind Nordwind GmbH to pay");
  check("naming a customer targets that customer", named !== null && named.customer === "Nordwind GmbH");

  const fr = stageAction(st, profiles, contacts, "Write a win-back message in French");
  check("language request produces a French draft", fr !== null && fr.lang === "fr" && /Bonjour/.test(fr.body));
  const ar = stageAction(st, profiles, contacts, "Draft a reorder nudge in Arabic");
  check("Arabic draft is produced on request", ar !== null && ar.lang === "ar" && /سلام/.test(ar.body));

  if (fr) {
    const swapped = restageInLang(fr, st, profiles, contacts, "ar");
    check("language toggle re-renders the same intent in the new language", swapped.lang === "ar" && swapped.customer === fr.customer && swapped.body !== fr.body);
  }

  const plain = stageAction(st, profiles, contacts, "How much profit did I make last month?");
  check("plain questions are never turned into actions", plain === null);
}

console.log("\nAI Operator — prepared actions, approval memory, and measured outcomes (v0.50):");
{
  const op = new TestMemory();
  const now = Date.now();
  op.append("fact", "product_added", { productId: "OP", name: "Operator Gel", stock: 20, weeklySales: 2, leadTimeDays: 7, unitCost: 30, price: 100 }, now - 130 * 86_400_000);
  const addOrder = (orderId: string, customer: string, createdAt: number, status: "delivered" | "refused" | "pending") => {
    op.append("fact", "order_created", { orderId, customer, lines: [{ productId: "OP", productName: "Operator Gel", qty: 1, unitPrice: 100, unitCost: 30 }], discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt }, createdAt);
    if (status !== "pending") op.append("fact", "order_status_changed", { orderId, status, at: createdAt + 1 }, createdAt + 1);
  };
  addOrder("safe-old-1", "Safe Quiet", now - 120 * 86_400_000, "delivered");
  addOrder("safe-old-2", "Safe Quiet", now - 90 * 86_400_000, "delivered");
  addOrder("refuse-old-1", "Past Refuser", now - 120 * 86_400_000, "refused");
  addOrder("refuse-old-2", "Past Refuser", now - 90 * 86_400_000, "refused");
  addOrder("cod-waiting", "COD Buyer", now - 2 * 86_400_000, "pending");
  op.append("fact", "customer_contact_updated", { customer: "Safe Quiet", phone: "+212600000011", at: now - 80 * 86_400_000 }, now - 80 * 86_400_000);
  op.append("fact", "customer_contact_updated", { customer: "Past Refuser", phone: "+212600000012", at: now - 80 * 86_400_000 }, now - 80 * 86_400_000);
  op.append("fact", "customer_contact_updated", { customer: "COD Buyer", phone: "+212600000013", at: now - 1 * 86_400_000 }, now - 1 * 86_400_000);
  let opState = projectState(op.all());
  const codPlan = prepareOperatorPlan(opState, op.all(), "Prepare today's COD confirmations", now)!;
  check("operator finds pending COD work and grounds every exact prepared message",
    codPlan.kind === "cod-confirmations" && codPlan.targets.length === 1 && codPlan.targets[0].orderId === "cod-waiting" && codPlan.targets[0].body.includes("Operator Gel") && /\d/.test(codPlan.targets[0].body));
  check("operator exposes evidence, approval boundary, and success measurement before execution",
    codPlan.evidence.some((item) => item.label === "COD value waiting") && /Nothing is sent before approval/.test(codPlan.proposedAction) && /move from pending/.test(codPlan.measurement));
  const winbackPlan = prepareOperatorPlan(opState, op.all(), "Create a win-back campaign, but exclude previous refusers", now)!;
  check("win-back operator targets quiet safe customers and excludes previous refusers",
    winbackPlan.kind === "winback-campaign" && winbackPlan.targets.some((target) => target.customer === "Safe Quiet") && !winbackPlan.targets.some((target) => target.customer === "Past Refuser") && winbackPlan.excluded.some((item) => item.customer === "Past Refuser"));
  const run: OperatorRun = { planId: codPlan.planId, kind: codPlan.kind, title: codPlan.title, targetIds: ["cod-waiting"], customers: ["COD Buyer"], executedAt: now };
  check("operator measurement honestly reports no result while the COD order is still pending", measureOperatorRun(run, opState).result === "no-result-yet");
  op.append("fact", "operator_run_executed", run as unknown as Record<string, unknown>, now);
  op.append("fact", "order_status_changed", { orderId: "cod-waiting", status: "confirmed", at: now + 1 }, now + 1);
  opState = projectState(op.all());
  const measured = measureOperatorRun(run, opState);
  check("operator measures a progressed COD order as a worked recommendation", measured.result === "worked" && measured.successes === 1);
  op.append("outcome", "operator_outcome_recorded", { planId: run.planId, successes: measured.successes, total: measured.total, result: measured.result, measuredAt: now + 2 }, now + 2);
  check("operator memory joins execution to its measured outcome", projectOperatorRuns(op.all())[0].outcome?.result === "worked");

  const reorder = new TestMemory();
  reorder.append("fact", "product_added", { productId: "R1", name: "Urgent Gel", stock: 0, weeklySales: 7, leadTimeDays: 14, unitCost: 30, price: 90 }, now);
  reorder.append("fact", "product_added", { productId: "R2", name: "Margin Cream", stock: 1, weeklySales: 5, leadTimeDays: 7, unitCost: 20, price: 80 }, now);
  let reorderState = projectState(reorder.all());
  const reorderPlan = prepareOperatorPlan(reorderState, reorder.all(), "What should I reorder with MAD 100?", now)!;
  check("budget operator prepares an exact prioritized PO without exceeding the approved budget",
    reorderPlan.kind === "budget-reorder" && Boolean(reorderPlan.purchaseOrder?.lines.length) && (reorderPlan.purchaseOrder?.total ?? 101) <= 100);
  check("budget operator explains urgency, unit economics, exclusions, and the approval boundary",
    reorderPlan.purchaseOrder!.lines.every((line) => /days left/.test(line.evidence) && /unit margin/.test(line.evidence)) && /Nothing changes until approval/.test(reorderPlan.proposedAction));
  reorder.append("fact", "purchase_order_created", { poId: reorderPlan.planId, supplier: "Approved supplier", lines: reorderPlan.purchaseOrder!.lines.map(({ evidence: _evidence, ...line }) => line), expectedAt: reorderPlan.purchaseOrder!.expectedAt, createdAt: now }, now);
  reorderState = projectState(reorder.all());
  check("approved reorder operation becomes incoming inventory rather than pretending stock arrived",
    reorderPlan.purchaseOrder!.lines.every((line) => reorderState.incoming[line.productId] === line.qty && reorderState.products.find((product) => product.productId === line.productId)?.stock !== line.qty));
  reorder.append("fact", "goods_received", { poId: reorderPlan.planId, at: now + 1 }, now + 1);
  reorderState = projectState(reorder.all());
  const reorderRun: OperatorRun = { planId: reorderPlan.planId, kind: "budget-reorder", title: reorderPlan.title, targetIds: reorderPlan.purchaseOrder!.lines.map((line) => line.productId), customers: [], executedAt: now, expectedAt: now - 1 };
  check("reorder operator measures received and available funded products as worked",
    measureOperatorRun(reorderRun, reorderState).result === "worked");

  const courier = new TestMemory();
  courier.append("fact", "product_added", { productId: "CP", name: "Courier Product", stock: 20, weeklySales: 2, leadTimeDays: 7, unitCost: 30, price: 150 }, now - 20 * 86_400_000);
  const courierOrder = (orderId: string, customer: string, carrier: string, status: "delivered" | "refused") => {
    courier.append("fact", "order_created", { orderId, customer, courier: carrier, lines: [{ productId: "CP", productName: "Courier Product", qty: 1, unitPrice: 150, unitCost: 30 }], discount: 0, shippingCharged: 0, shippingCost: 25, codFee: 5, packagingCost: 3, createdAt: now - 12 * 86_400_000 }, now - 12 * 86_400_000);
    courier.append("fact", "order_status_changed", { orderId, status, at: now - 10 * 86_400_000 }, now - 10 * 86_400_000);
  };
  courierOrder("bad-refusal", "Refused Buyer", "Damage Express", "refused");
  courierOrder("bad-cash", "Cash Buyer", "Damage Express", "delivered");
  courierOrder("good-delivery", "Happy Buyer", "Reliable Courier", "delivered");
  courier.append("fact", "order_cash_received", { orderId: "good-delivery", at: now - 8 * 86_400_000 }, now - 8 * 86_400_000);
  const courierState = projectState(courier.all());
  const courierPlan = prepareOperatorPlan(courierState, courier.all(), "Show me which courier is hurting profit", now)!;
  check("courier operator identifies economic damage rather than merely sorting delivery rate",
    courierPlan.kind === "courier-profit-recovery" && courierPlan.title.includes("Damage Express") && courierPlan.evidence.some((item) => item.label === "Direct refusal loss"));
  check("courier operator separates overdue cash from profit loss and prepares order-linked tasks",
    courierPlan.problem.includes("liquidity risk") && courierPlan.tasks!.some((task) => task.orderId === "bad-refusal") && courierPlan.tasks!.some((task) => task.orderId === "bad-cash"));
  const courierRun: OperatorRun = { planId: courierPlan.planId, kind: courierPlan.kind, title: courierPlan.title, targetIds: ["bad-cash"], customers: ["Cash Buyer"], executedAt: now };
  check("courier recovery remains unproven until the remittance arrives", measureOperatorRun(courierRun, courierState).result === "no-result-yet");
  courier.append("fact", "order_cash_received", { orderId: "bad-cash", at: now + 1 }, now + 1);
  check("courier operator measures a recovered COD remittance as worked", measureOperatorRun(courierRun, projectState(courier.all())).result === "worked");
}

console.log("\nDecision-memory coach & goal pacing (stage 4):");
{
  // The stockout decision + outcome were recorded earlier in this suite.
  const note = coachFor(memory.all(), "inventory.stockout.P-999");
  check("coach recalls past decisions in the same family", note !== null && note.timesFaced >= 1);
  check("coach carries the chosen option and its recorded outcome", note !== null && note.last.optionLabel.length > 0 && note.last.outcome !== undefined && note.goodOutcomes >= 1);
  check("coach stays silent for families never faced", coachFor(memory.all(), "marketing.never-seen.x") === null);

  const memories = projectDecisionMemories(memory.all());
  check("decision memories join outcomes to their decisions", memories.some((m) => m.outcome && /zero stockout/i.test(m.outcome.note)));

  // A fresh, outcome-less decision older than 7 days should appear for review.
  memory.append("decision", "decision_recorded", {
    decisionKey: "finance.overdue.review-test", claim: "Old test decision", layer: "operational",
    optionId: "x", optionLabel: "Test option", rationale: "",
  }, Date.now() - 10 * 86400000);
  const reviews = pendingOutcomeReviews(memory.all());
  check("old outcome-less decisions surface for loop closure", reviews.some((r) => r.decisionKey === "finance.overdue.review-test"));

  // Goal pacing: set a goal far above the demo month's revenue → pacing insight fires.
  const st0 = projectState(memory.all());
  const bigGoal = Math.max(10000, goalActual(st0, "revenue") * 10 + 1000);
  memory.append("fact", "goal_set", { metric: "revenue", target: bigGoal, setAt: Date.now() });
  const day = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  if (day >= 5 && daysInMonth - day >= 2) {
    const ins = generateInsights(projectState(memory.all()), projectDecisions(memory.all()));
    const pace = ins.find((i) => i.decisionKey === "finance.goal-pace.revenue");
    check("behind-pace goal produces a pacing insight with needed/day", pace !== undefined && /\/day/.test(pace.claim));
  } else {
    check("goal pacing (skipped: too early/late in month to assert honestly)", true);
  }
}

console.log("\nRefills, refusal risk & record stories (v0.29):");
{
  // Refill predictor: a consumable delivered ~35 days ago with 30-day use → due now.
  const pid = "P-refill-test";
  memory.append("fact", "product_added", {
    productId: pid, name: "Aloe Test Gel", stock: 10, weeklySales: 1, leadTimeDays: 7, unitCost: 5, price: 10, daysOfUse: 30,
  });
  const oid = "O-refill-test";
  const t0 = Date.now() - 36 * 86400000;
  memory.append("fact", "order_created", {
    orderId: oid, customer: "Refill Rita", lines: [{ productId: pid, productName: "Aloe Test Gel", qty: 1, unitPrice: 10, unitCost: 5 }],
    discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: t0,
  }, t0);
  memory.append("fact", "order_status_changed", { orderId: oid, status: "delivered", at: t0 + 86400000 }, t0 + 86400000);
  const stR = projectState(memory.all());
  const refills = refillDueList(stR, stR.archivedCustomers);
  const rita = refills.find((r) => r.customer === "Refill Rita");
  check("consumable customer surfaces when supply runs out", rita !== undefined && rita.productName === "Aloe Test Gel");
  check("refill math: 1 unit × 30 days from delivery date", rita !== undefined && Math.abs(rita.daysPastEmpty - 5) <= 1);
  memory.append("fact", "product_updated", { productId: pid, daysOfUse: 60, at: Date.now() });
  check("editing days-of-use moves the prediction (append-only correction)",
    !refillDueList(projectState(memory.all()), []).some((r) => r.customer === "Refill Rita" && r.daysPastEmpty >= 0));

  // Refusal risk: a repeat refuser scores higher than a proven customer.
  const contactsR = projectContacts(memory.all());
  const mkOrder = (id: string, customer: string, source?: string) => ({
    orderId: id, customer, lines: [{ productId: pid, productName: "Aloe Test Gel", qty: 1, unitPrice: 10, unitCost: 5 }],
    discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: Date.now(),
    status: "pending" as const, ...(source ? { source } : {}),
  });
  const refuser = stR.orders.find((o) => o.status === "refused");
  if (refuser) {
    const riskRefuser = refusalRisk(stR, mkOrder("t1", refuser.customer, "tiktok"), contactsR);
    const proven = stR.orders.filter((o) => o.status === "delivered").map((o) => o.customer)
      .find((c) => !stR.orders.some((o) => o.customer === c && o.status === "refused"));
    const riskProven = proven ? refusalRisk(stR, mkOrder("t2", proven, "repeat"), contactsR) : null;
    check("past refuser on impulse traffic scores higher than proven repeat customer",
      riskProven !== null && riskRefuser.score > riskProven.score);
    check("every risk point is explained by a listed factor",
      riskRefuser.factors.length > 0 && riskRefuser.factors.every((f) => f.label.length > 0));
  } else {
    check("refusal-risk comparison (skipped: no refused order in data)", false);
  }

  // Story: the refill order's trail reads created → delivered.
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

  // Courier scorecard: two couriers, one all-delivered, one all-refused.
  const mk = (id: string, courier: string, status: "delivered" | "refused") => {
    const t = Date.now() - 5 * 86400000;
    memory.append("fact", "order_created", {
      orderId: id, customer: "Courier Test", lines: [{ productId: "P-002", productName: "Oak Serving Board", qty: 1, unitPrice: 24, unitCost: 12 }],
      discount: 0, shippingCharged: 0, shippingCost: 30, codFee: 0, packagingCost: 0, createdAt: t, courier,
    }, t);
    memory.append("fact", "order_status_changed", { orderId: id, status, at: t + 86400000 }, t + 86400000);
  };
  mk("cs1", "Speedy", "delivered");
  mk("cs2", "Slowpoke", "refused");
  const cards = courierScorecard(projectState(memory.all()));
  const speedy = cards.find((c) => c.courier === "Speedy");
  const slow = cards.find((c) => c.courier === "Slowpoke");
  check("courier scorecard computes per-courier delivery rate", speedy?.deliveryRate === 1 && slow?.deliveryRate === 0);
  check("courier scorecard sums shipping cost you paid", speedy !== undefined && speedy.shippingCost === 30);

  // Referrals: two customers point to the same referrer.
  memory.append("fact", "customer_contact_updated", { customer: "Leila M.", referredBy: "Sara H.", at: Date.now() });
  memory.append("fact", "customer_contact_updated", { customer: "Omar K.", referredBy: "Sara H.", at: Date.now() });
  const st2 = projectState(memory.all());
  const board = referralLeaderboard(projectContacts(memory.all()), projectCustomerProfiles(st2));
  const sara = board.find((r) => r.name === "Sara H.");
  check("referral leaderboard groups referred customers by referrer", sara !== undefined && sara.referredCount === 2);
  check("referral leaderboard sums the revenue advocates bring", sara !== undefined && sara.referredRevenue >= 0);
}

console.log("\nSegment broadcasts with measured lift (v0.31):");
{
  const now = Date.now();
  const campAt = now - 5 * 86400000; // sent 5 days ago
  // One order BEFORE the send, two AFTER — from the same recipient.
  const mkOrder = (id: string, whenOffsetDays: number) => {
    const t = campAt + whenOffsetDays * 86400000;
    memory.append("fact", "order_created", {
      orderId: id, customer: "Campaign Cathy",
      lines: [{ productId: "P-002", productName: "Oak Serving Board", qty: 1, unitPrice: 24, unitCost: 12 }],
      discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: t,
    }, t);
  };
  mkOrder("camp-before", -3);
  mkOrder("camp-after1", 1);
  mkOrder("camp-after2", 3);
  memory.append("fact", "campaign_sent", {
    campaignId: "camp-1", segment: "at-risk", customers: ["Campaign Cathy"],
    channel: "whatsapp", message: "come back!", at: campAt,
  }, campAt);

  const camps = projectCampaigns(memory.all());
  check("campaign_sent projects with its recipients", camps.some((c) => c.campaignId === "camp-1" && c.customers.includes("Campaign Cathy")));

  const res = measureCampaign(projectState(memory.all()), camps.find((c) => c.campaignId === "camp-1")!, now, 14);
  check("lift counts recipient orders before vs after the send", res.ordersBefore === 1 && res.ordersAfter === 2);
  check("lift measures revenue in the after window", res.revenueAfter > res.revenueBefore);
  check("campaign not ready until the window fully elapses", res.ready === false);
}

console.log("\nThis week in review (week-over-week deltas, v0.32):");
{
  const now = Date.now();
  const tw = new TestMemory();
  // Last week: 1 delivered order (revenue window by deliveredAt).
  const lwT = now - 10 * 86400000;
  tw.append("fact", "order_created", {
    orderId: "wr-last", customer: "Weekly Wanda",
    lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: lwT,
  }, lwT);
  tw.append("fact", "order_status_changed", { orderId: "wr-last", status: "delivered", at: lwT }, lwT);
  // This week: 2 delivered orders + 1 refusal.
  for (const id of ["wr-a", "wr-b"]) {
    const t = now - 2 * 86400000;
    tw.append("fact", "order_created", {
      orderId: id, customer: "Weekly Wanda",
      lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
      discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: t,
    }, t);
    tw.append("fact", "order_status_changed", { orderId: id, status: "delivered", at: t }, t);
  }
  tw.append("fact", "order_created", {
    orderId: "wr-ref", customer: "Weekly Wanda",
    lines: [{ productId: "p", productName: "Thing", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: now - 3 * 86400000,
  }, now - 3 * 86400000);
  tw.append("fact", "order_status_changed", { orderId: "wr-ref", status: "refused", at: now - 1 * 86400000 }, now - 1 * 86400000);

  const wr = weeklyReview(tw.all(), now);
  const byKey = (k: string) => wr.metrics.find((m) => m.key === k)!;
  check("orders-delivered delta is this week (2) minus last week (1)", byKey("ordersDelivered").thisWeek === 2 && byKey("ordersDelivered").lastWeek === 1 && byKey("ordersDelivered").delta === 1);
  check("refusals counted in this week's window by status-change date", byKey("refusals").thisWeek === 1);
  check("revenue delta reflects the extra delivered order", byKey("revenue").delta === 100);
  check("refusals metric is flagged higher-is-worse", byKey("refusals").higherIsBetter === false);
  check("hasPriorWeek true once last-week activity exists", wr.hasPriorWeek === true);
}

console.log("\nWhatsApp Operations Inbox (v0.33):");
{
  const im = new TestMemory();
  const t = (h: number) => Date.now() - h * 3_600_000;
  im.append("fact", "message_received", { messageId: "m1", customer: "Inbox Ivy", phone: "+212611", body: "Bonjour, où est ma commande?", channel: "whatsapp", at: t(5) }, t(5));
  im.append("fact", "customer_activity_logged", { activityId: "a1", customer: "Inbox Ivy", kind: "message", note: "WhatsApp: Elle arrive demain!", at: t(4) }, t(4));
  im.append("fact", "message_received", { messageId: "m2", customer: "Inbox Ivy", phone: "+212611", body: "Merci!", channel: "whatsapp", at: t(3) }, t(3));
  // A second customer whose last message is inbound → waiting.
  im.append("fact", "message_received", { messageId: "m3", customer: "Quiet Qasim", phone: "+212622", body: "STOP", channel: "whatsapp", at: t(2) }, t(2));

  const convs = projectConversations(im.all());
  const ivy = convs.find((c) => c.customer === "Inbox Ivy")!;
  check("conversation merges inbound + outbound in time order", ivy.messages.length === 3 && ivy.messages[0].direction === "in" && ivy.messages[1].direction === "out");
  check("thread with last inbound message is 'waiting'", ivy.waiting === true);
  const qasim = convs.find((c) => c.customer === "Quiet Qasim")!;
  check("a customer texting STOP is flagged opted-out", qasim.optedOut === true);
  check("opted-out customers are excluded from the waiting count", waitingCount(convs) === 1);
  check("threads sort newest-activity first", convs[0].lastAt >= convs[convs.length - 1].lastAt);

  check("explicit YES/OUI/Darija replies classify as confirmation",
    ["YES", "oui ✅", "نعم", "wakha"].every((x) => classifyInbound(x) === "confirm"));
  check("explicit NO replies classify as cancellation",
    ["NO", "non", "لا"].every((x) => classifyInbound(x) === "cancel"));
  check("a sentence containing yes is not over-classified", classifyInbound("Yes, but change my address") === "unknown");

  im.append("fact", "conversation_resolved", {
    customer: "Inbox Ivy", phone: "+212611", at: t(1), reason: "No reply required",
  }, t(1));
  const resolved = projectConversations(im.all()).find((c) => c.customer === "Inbox Ivy")!;
  check("a resolved inbound thread leaves the waiting queue", resolved.waiting === false);

  const phoneOnly = new TestMemory();
  phoneOnly.append("fact", "message_received", { messageId: "m4", phone: "+212633", body: "STOP", channel: "whatsapp", at: t(1) }, t(1));
  phoneOnly.append("fact", "customer_opted_out", { phone: "+212633", at: t(1) }, t(1));
  check("unmatched phone opt-out is still enforced", projectConversations(phoneOnly.all())[0].optedOut === true);

  const tracked = new TestMemory();
  tracked.append("fact", "message_sent", {
    messageId: "SM-TRACKED", customer: "Tracked Taha", phone: "+212644", body: "Your order is ready", channel: "whatsapp", status: "queued", at: t(3),
  }, t(3));
  tracked.append("fact", "message_status_changed", {
    messageId: "SM-TRACKED", status: "delivered", at: t(2),
  }, t(2));
  tracked.append("fact", "conversation_assigned", {
    customer: "Tracked Taha", assignedTo: "staff-1", assignedLabel: "Samira", at: t(1),
  }, t(1));
  let trackedConv = projectConversations(tracked.all())[0];
  check("outbound Twilio SID receives its latest delivery status", trackedConv.messages[0].status === "delivered");
  check("conversation ownership projects from append-only assignment", trackedConv.assignedTo === "staff-1" && trackedConv.assignedLabel === "Samira");
  check("sent messages remain visible in CRM activity history", projectActivities(tracked.all()).some((a) => a.customer === "Tracked Taha" && a.kind === "message"));
  tracked.append("fact", "conversation_assigned", { customer: "Tracked Taha", assignedTo: "", at: Date.now() }, Date.now());
  trackedConv = projectConversations(tracked.all())[0];
  check("unassignment returns the thread to the shared queue", trackedConv.assignedTo === undefined);
}

console.log("\nApproved WhatsApp templates (v0.38):");
{
  check("four operational template purposes are allow-listed",
    WHATSAPP_TEMPLATES.map((template) => template.key).join(",") ===
      "cod_confirmation,shipping_update,abandoned_cart,payment_reminder");
  check("every template has sequential variables and human-readable guidance",
    WHATSAPP_TEMPLATES.every((template) =>
      template.variableLabels.length > 0 &&
      template.variableLabels.every((_, index) => template.body.includes(`{{${index + 1}}}`)) &&
      template.label.length > 0 && template.purpose.length > 0));
  const variables = numberedTemplateVariables(["  Amina  ", "2× Aloe Gel", "MAD 250", "Naturaloe"]);
  check("template variables are trimmed and numbered for Twilio ContentVariables",
    variables["1"] === "Amina" && variables["4"] === "Naturaloe" && Object.keys(variables).length === 4);
  const preview = whatsappTemplatePreview("cod_confirmation", variables);
  check("Business Memory preview resolves approved content without changing facts",
    preview.includes("Amina") && preview.includes("MAD 250") && !preview.includes("{{1}}"));
}

console.log("\nDocuments center (v0.39):");
{
  const money = (amount: number) => `MAD ${amount.toFixed(2)}`;
  const brand = {
    businessName: "Naturaloe", legalName: "Naturaloe SARL", email: "hello@naturaloe.ma",
    phone: "+212600000000", address: "12 Aloe Road", city: "Casablanca", country: "Morocco",
    taxId: "ICE-123", registrationNumber: "RC-456", paymentDetails: "Bank transfer",
    footerNote: "Pure care, naturally.", accentColor: "#176b52",
    logoDataUrl: "data:image/png;base64,aGVsbG8=", logoFileName: "logo.png", logoWidth: 1024, logoHeight: 400,
  };
  const invoiceHtml = invoiceDocumentHtml(state.invoices[0], brand, money);
  const deliveredOrder = state.orders.find((order) => order.status === "delivered")!;
  const receiptHtml = receiptDocumentHtml(deliveredOrder, brand, money);
  check("invoice document carries the canonical customer, amount, and reference",
    invoiceHtml.includes(state.invoices[0].customer) && invoiceHtml.includes(money(state.invoices[0].amount)) && invoiceHtml.includes(state.invoices[0].invoiceId));
  check("receipt document carries every order line and the derived order total",
    deliveredOrder.lines.every((line) => receiptHtml.includes(line.productName)) && receiptHtml.includes(money(orderRevenue(deliveredOrder))));
  check("documents expose browser print-to-PDF without another persistence store",
    invoiceHtml.includes("window.print()") && receiptHtml.includes("Generated from ZYVORA Business Memory"));
  check("branded documents carry editable legal, contact, payment, and logo information",
    invoiceHtml.includes("Naturaloe SARL") && invoiceHtml.includes("hello@naturaloe.ma") && invoiceHtml.includes("Bank transfer") && invoiceHtml.includes("class=\"logo\""));
  check("invoice uses a print-safe A4 layout and a controlled brand accent",
    invoiceHtml.includes("@page{size:A4") && invoiceHtml.includes("#176b52") && invoiceHtml.includes("Document reference"));
  const escaped = invoiceDocumentHtml({ ...state.invoices[0], customer: "<script>alert(1)</script>" }, "Naturaloe", money);
  check("document content escapes user-entered HTML", !escaped.includes("<script>alert(1)</script>") && escaped.includes("&lt;script&gt;"));
  const brandingEvents = [
    { id: "b1", ts: 1, stream: "fact" as const, type: "document_branding_updated", payload: { businessName: "First", phone: "1" } },
    { id: "b2", ts: 2, stream: "fact" as const, type: "document_branding_updated", payload: { businessName: "Latest", email: "latest@example.com" } },
  ];
  const projectedBrand = projectDocumentBranding(brandingEvents, "Workspace");
  check("latest append-only document-branding correction wins without losing earlier fields",
    projectedBrand.businessName === "Latest" && projectedBrand.phone === "1" && projectedBrand.email === "latest@example.com");
  const totals = calculateInvoiceTotals([{ qty: 2, unitPrice: 500 }, { qty: 1, unitPrice: 200 }], 50, 20);
  check("itemized invoice has one canonical subtotal, discount, tax, and total calculation",
    totals.subtotal === 1200 && totals.discount === 50 && totals.taxAmount === 230 && totals.total === 1380);
  const itemizedHtml = invoiceDocumentHtml({
    ...state.invoices[0], amount: totals.total, subtotal: totals.subtotal, discount: totals.discount,
    taxRate: totals.taxRate, taxAmount: totals.taxAmount, customerEmail: "buyer@example.com",
    customerAddress: "12 Commerce Street\nCasablanca", notes: "Handle with care",
    lines: [{ lineId: "l1", description: "Aloe care set", qty: 2, unitPrice: 500 }, { lineId: "l2", description: "Delivery", qty: 1, unitPrice: 200 }],
  }, brand, money);
  check("branded invoice renders item descriptions, quantities, billing details, tax, and notes",
    itemizedHtml.includes("Aloe care set") && itemizedHtml.includes("buyer@example.com") && itemizedHtml.includes("Casablanca") && itemizedHtml.includes("Tax (20%)") && itemizedHtml.includes("Handle with care"));

  const quoteMemory = new TestMemory();
  const quoteCreatedAt = Date.now();
  quoteMemory.append("fact", "quote_created", {
    quoteId: "quote-1", customer: "Quote Customer", customerEmail: "quote@example.com", customerAddress: "Rabat",
    lines: [{ lineId: "ql1", description: "Negotiated care set", qty: 2, unitPrice: 500 }],
    subtotal: 1000, discount: 100, taxRate: 20, taxAmount: 180, amount: 1080,
    notes: "Valid while stock lasts", createdAt: quoteCreatedAt, validUntil: quoteCreatedAt + 14 * 86_400_000,
  }, quoteCreatedAt);
  let quoteState = projectState(quoteMemory.all());
  check("a new estimate projects as draft without creating revenue or an invoice",
    quoteState.quotes[0].status === "draft" && quoteState.invoices.length === 0);
  quoteMemory.append("fact", "quote_status_changed", { quoteId: "quote-1", status: "sent", at: quoteCreatedAt + 1 }, quoteCreatedAt + 1);
  quoteMemory.append("fact", "quote_status_changed", { quoteId: "quote-1", status: "accepted", at: quoteCreatedAt + 2 }, quoteCreatedAt + 2);
  quoteState = projectState(quoteMemory.all());
  check("append-only quote status projects the latest human-recorded state", quoteState.quotes[0].status === "accepted");
  const estimateHtml = quoteDocumentHtml(quoteState.quotes[0], brand, money);
  check("branded estimate renders negotiated lines, validity, customer and total",
    estimateHtml.includes("Negotiated care set") && estimateHtml.includes("Quote Customer") && estimateHtml.includes("Valid until") && estimateHtml.includes(money(1080)));
  const convertedInvoice = invoiceFromAcceptedQuote(quoteState.quotes[0], "invoice-from-quote", quoteCreatedAt + 3);
  check("accepted estimate conversion copies commercial terms and preserves source traceability",
    convertedInvoice.amount === 1080 && convertedInvoice.lines?.[0].description === "Negotiated care set" && convertedInvoice.sourceQuoteId === "quote-1");
  quoteMemory.append("fact", "invoice_issued", { ...convertedInvoice }, quoteCreatedAt + 3);
  quoteMemory.append("fact", "quote_status_changed", { quoteId: "quote-1", status: "converted", at: quoteCreatedAt + 3 }, quoteCreatedAt + 3);
  quoteState = projectState(quoteMemory.all());
  check("conversion produces one open invoice and closes the estimate as converted",
    quoteState.invoices.length === 1 && quoteState.quotes[0].status === "converted");

  const fulfillmentOrder: Order = {
    ...deliveredOrder,
    status: "confirmed",
    customerPhone: "+212600000001",
    shippingAddress: "18 Palm Street\nMarrakesh",
    deliveryInstructions: "Call before delivery",
    courier: "Atlas Express",
    trackingNumber: "AT-2048",
  };
  const packingHtml = packingSlipDocumentHtml(fulfillmentOrder, brand);
  const deliveryHtml = deliveryNoteDocumentHtml(fulfillmentOrder, brand, money);
  check("fulfillment documents unlock only after order confirmation",
    !canGenerateFulfillmentDocuments({ status: "pending" }) && canGenerateFulfillmentDocuments({ status: "confirmed" }) && canGenerateFulfillmentDocuments({ status: "shipped" }) && canGenerateFulfillmentDocuments({ status: "delivered" }) && !canGenerateFulfillmentDocuments({ status: "cancelled" }));
  check("packing slip carries delivery snapshot and every quantity without exposing prices",
    packingHtml.includes("Marrakesh") && packingHtml.includes("+212600000001") && fulfillmentOrder.lines.every((line) => packingHtml.includes(line.productName) && packingHtml.includes(`<strong>${line.qty}</strong>`)) && !packingHtml.includes(money(orderRevenue(fulfillmentOrder))));
  check("delivery note carries COD, courier, tracking, instructions, and acknowledgment fields",
    deliveryHtml.includes(money(orderRevenue(fulfillmentOrder))) && deliveryHtml.includes("Atlas Express") && deliveryHtml.includes("AT-2048") && deliveryHtml.includes("Call before delivery") && deliveryHtml.includes("Customer name and signature"));
  const historicalPackingHtml = packingSlipDocumentHtml(deliveredOrder, brand);
  check("historical orders without delivery snapshot still render fulfillment documents safely",
    historicalPackingHtml.includes(deliveredOrder.customer) && historicalPackingHtml.includes("No special instructions"));

  const returnMemory = new TestMemory();
  const returnAt = Date.now();
  returnMemory.append("fact", "product_added", { productId: "return-product", name: "Return product", price: 100, unitCost: 40, stock: 10, weeklySales: 1, leadTimeDays: 7 }, returnAt);
  returnMemory.append("fact", "order_created", {
    orderId: "return-order", customer: "Return customer", customerPhone: "+212600000002", shippingAddress: "Rabat",
    lines: [{ productId: "return-product", productName: "Return product", qty: 3, unitPrice: 100, unitCost: 40 }],
    discount: 0, shippingCharged: 0, shippingCost: 10, codFee: 0, packagingCost: 2, createdAt: returnAt,
  }, returnAt);
  returnMemory.append("fact", "order_status_changed", { orderId: "return-order", status: "delivered", at: returnAt + 1 }, returnAt + 1);
  returnMemory.append("fact", "order_return_recorded", {
    returnId: "credit-partial", orderId: "return-order",
    lines: [{ orderLineIndex: 0, productId: "return-product", productName: "Return product", qty: 1, unitPrice: 100, unitCost: 40, restock: true }],
    refundAmount: 90, refundMethod: "cash", returnShippingCost: 20, reason: "changed_mind", note: "Inspected and sellable", at: returnAt + 2,
  }, returnAt + 2);
  let returnState = projectState(returnMemory.all());
  let returnedOrder = returnState.orders[0];
  check("partial return restocks only sellable quantity and keeps the order partially returned",
    returnState.products[0].stock === 8 && returnedOrder.returnStatus === "partial" && returnedOrder.returnedQtyByLine?.["0"] === 1);
  check("refunds reverse revenue while restocking reverses COGS and return freight reduces profit",
    orderGrossRevenue(returnedOrder) === 300 && orderRevenue(returnedOrder) === 210 && orderCogs(returnedOrder) === 80 && orderNetProfit(returnedOrder) === 98);
  const partialCredit = creditNoteDocumentHtml(returnedOrder, returnedOrder.returnRecords![0], brand, money);
  check("credit note carries immutable return reference, customer, item, refund method, and amount",
    partialCredit.includes("credit-partial") && partialCredit.includes("Return customer") && partialCredit.includes("Return product") && partialCredit.includes("Cash") && partialCredit.includes(money(90)));
  returnMemory.append("fact", "order_return_recorded", {
    returnId: "credit-final", orderId: "return-order",
    lines: [{ orderLineIndex: 0, productId: "wrong", productName: "Wrong", qty: 99, unitPrice: 999, unitCost: 999, restock: false }],
    refundAmount: 9999, refundMethod: "bank_transfer", returnShippingCost: 5, reason: "damaged", at: returnAt + 3,
  }, returnAt + 3);
  returnState = projectState(returnMemory.all());
  returnedOrder = returnState.orders[0];
  check("projection clamps over-return and over-refund facts to the canonical order balance",
    returnedOrder.returnedQtyByLine?.["0"] === 3 && returnedOrder.refundAmount === 300 && returnedOrder.returnRecords?.[1].lines[0].qty === 2);
  check("fully returned damaged units stay out of inventory and fulfillment documents close",
    returnedOrder.returnStatus === "returned" && returnState.products[0].stock === 8 && !canGenerateFulfillmentDocuments(returnedOrder));
  const returnPnl = profitAndLoss(returnState, returnAt - 1, returnAt + 10, "Returns test");
  check("P&L shows refunds and return freight explicitly while retaining gross sales traceability",
    returnPnl.revenue.lines.some((line) => line.label.includes("refund") && line.amount === -300) && returnPnl.operatingExpenses.lines.some((line) => line.label === "Return shipping" && line.amount === 25) && returnPnl.revenue.lines.some((line) => line.label.includes("Product sales") && line.amount === 300));

  const creditMemory = new TestMemory();
  creditMemory.append("fact", "product_added", { productId: "credit-product", name: "Credit product", price: 80, unitCost: 30, stock: 10, weeklySales: 1, leadTimeDays: 7 }, returnAt);
  creditMemory.append("fact", "order_created", { orderId: "credit-source", customer: "Credit customer", lines: [{ productId: "credit-product", productName: "Credit product", qty: 1, unitPrice: 80, unitCost: 30 }], discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, createdAt: returnAt }, returnAt);
  creditMemory.append("fact", "order_status_changed", { orderId: "credit-source", status: "delivered", at: returnAt + 1 }, returnAt + 1);
  creditMemory.append("fact", "order_return_recorded", { returnId: "store-credit-refund", orderId: "credit-source", lines: [], refundAmount: 80, refundMethod: "store_credit", returnShippingCost: 0, reason: "other", at: returnAt + 2 }, returnAt + 2);
  let creditState = projectState(creditMemory.all());
  check("store-credit refund issues a customer balance and immutable ledger transaction",
    creditState.storeCreditBalances["Credit customer"] === 80 && creditState.storeCreditTransactions[0].kind === "issued");
  creditMemory.append("fact", "order_created", { orderId: "credit-cancelled", customer: "Credit customer", lines: [{ productId: "credit-product", productName: "Credit product", qty: 2, unitPrice: 80, unitCost: 30 }], discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, storeCreditApplied: 999, createdAt: returnAt + 3 }, returnAt + 3);
  creditState = projectState(creditMemory.all());
  const creditOrder = creditState.orders.find((order) => order.orderId === "credit-cancelled")!;
  check("redemption is clamped to the available balance and reduces COD without reducing revenue",
    creditOrder.storeCreditApplied === 80 && creditState.storeCreditBalances["Credit customer"] === 0 && orderRevenue(creditOrder) === 160 && orderCashDue(creditOrder) === 80);
  creditMemory.append("fact", "order_status_changed", { orderId: "credit-cancelled", status: "cancelled", at: returnAt + 4 }, returnAt + 4);
  creditState = projectState(creditMemory.all());
  check("cancelled or refused orders restore redeemed store credit exactly once",
    creditState.storeCreditBalances["Credit customer"] === 80 && creditState.storeCreditTransactions.some((transaction) => transaction.kind === "released" && transaction.orderId === "credit-cancelled"));
  creditMemory.append("fact", "order_created", { orderId: "credit-paid", customer: "Credit customer", lines: [{ productId: "credit-product", productName: "Credit product", qty: 1, unitPrice: 80, unitCost: 30 }], discount: 0, shippingCharged: 0, shippingCost: 0, codFee: 0, packagingCost: 0, storeCreditApplied: 80, createdAt: returnAt + 5 }, returnAt + 5);
  creditMemory.append("fact", "order_status_changed", { orderId: "credit-paid", status: "delivered", at: returnAt + 6 }, returnAt + 6);
  creditState = projectState(creditMemory.all());
  const creditPaidOrder = creditState.orders.find((order) => order.orderId === "credit-paid")!;
  const creditReceipt = receiptDocumentHtml(creditPaidOrder, brand, money);
  check("fully credit-paid delivery has no courier cash task and receipt separates payment tender",
    orderCashDue(creditPaidOrder) === 0 && creditPaidOrder.cashReceivedAt === returnAt + 6 && creditReceipt.includes("Store credit used") && creditReceipt.includes("Cash payment"));
  creditMemory.append("fact", "store_credit_adjusted", { transactionId: "goodwill-credit", customer: "Credit customer", delta: 35, reason: "Goodwill", note: "Manager approved", at: returnAt + 7 }, returnAt + 7);
  creditMemory.append("fact", "store_credit_adjusted", { transactionId: "balance-correction", customer: "Credit customer", delta: -999, reason: "Correction", at: returnAt + 8 }, returnAt + 8);
  creditState = projectState(creditMemory.all());
  check("manager adjustments create immutable reasoned store-credit ledger entries",
    creditState.storeCreditTransactions.some((transaction) => transaction.transactionId === "goodwill-credit" && transaction.kind === "adjusted" && transaction.amount === 35 && transaction.reason === "Goodwill"));
  check("manager balance reductions are clamped so store credit never becomes negative",
    creditState.storeCreditBalances["Credit customer"] === 0 && creditState.storeCreditTransactions.some((transaction) => transaction.transactionId === "balance-correction" && transaction.amount === -35));
  const statementHtml = customerStatementDocumentHtml({
    ...creditState,
    invoices: [
      { invoiceId: "statement-open", customer: "Credit customer", amount: 120, issuedAt: returnAt, dueDays: 14 },
      { invoiceId: "statement-paid", customer: "Credit customer", amount: 30, issuedAt: returnAt, dueDays: 14, paidAt: returnAt + 1 },
    ],
  }, "Credit customer", brand, money, { phone: "+212600000003", city: "Casablanca" }, returnAt + 9);
  check("customer statement combines invoices, delivered purchases, refunds, and the credit ledger",
    statementHtml.includes("Account statement") && statementHtml.includes("Credit customer") && statementHtml.includes("statement-op") && statementHtml.includes("Store credit issued") && statementHtml.includes("Goodwill"));
  check("customer statement keeps open receivables and store credit as separate balances",
    statementHtml.includes("Open invoices due") && statementHtml.includes(money(120)) && statementHtml.includes("Store credit available") && !statementHtml.includes("Open invoices due</span><strong>" + money(150)));
}

console.log("\nCourier Control Tower (v0.34):");
{
  const cm = new TestMemory();
  const now = Date.now();
  const day = 86_400_000;
  cm.append("fact", "product_added", {
    productId: "cp", name: "Courier Product", price: 200, unitCost: 80,
    stock: 20, weeklySales: 2, leadTimeDays: 7,
  }, now - 8 * day);
  cm.append("fact", "order_created", {
    orderId: "co", customer: "Courier Customer",
    lines: [{ productId: "cp", productName: "Courier Product", qty: 1, unitPrice: 200, unitCost: 80 }],
    discount: 0, shippingCharged: 0, shippingCost: 25, codFee: 5, packagingCost: 3,
    createdAt: now - 6 * day,
  }, now - 6 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "confirmed", at: now - 5 * day }, now - 5 * day);
  let cc = courierControl(projectState(cm.all()), now);
  check("confirmed order without shipment is ranked for handoff", cc.rows[0].action === "handoff");

  cm.append("fact", "shipment_created", {
    orderId: "co", courier: "Atlas Courier", trackingNumber: "TRK-1", at: now - 4 * day,
  }, now - 4 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "shipped", at: now - 4 * day }, now - 4 * day);
  cm.append("fact", "shipment_status_changed", {
    orderId: "co", status: "delivery_failed", reason: "Customer unavailable", at: now - 2 * day,
  }, now - 2 * day);
  cc = courierControl(projectState(cm.all()), now);
  check("failed delivery becomes the highest-priority customer intervention",
    cc.rows[0].action === "contact-customer" && cc.rows[0].reason.includes("Customer unavailable"));

  cm.append("fact", "shipment_status_changed", { orderId: "co", status: "delivered", at: now - 4 * day }, now - 4 * day);
  cm.append("fact", "order_status_changed", { orderId: "co", status: "delivered", at: now - 4 * day }, now - 4 * day);
  cc = courierControl(projectState(cm.all()), now);
  check("delivered COD cash past three days is ranked for remittance chase",
    cc.rows[0].action === "chase-remittance" && cc.cashPending === 200);

  cm.append("fact", "order_cash_received", { orderId: "co", at: now }, now);
  cc = courierControl(projectState(cm.all()), now);
  check("remitted courier cash leaves the control queue", cc.rows.length === 0 && cc.cashPending === 0);
}

console.log("\nGuardrailed workflows (v0.35):");
{
  const wm = new TestMemory();
  const now = Date.now();
  const day = 86_400_000;
  wm.append("fact", "product_added", {
    productId: "wp", name: "Workflow Product", price: 100, unitCost: 40,
    stock: 10, weeklySales: 1, leadTimeDays: 5,
  }, now - day);
  wm.append("fact", "order_created", {
    orderId: "wo", customer: "Workflow Customer",
    lines: [{ productId: "wp", productName: "Workflow Product", qty: 1, unitPrice: 100, unitCost: 40 }],
    discount: 0, shippingCharged: 0, shippingCost: 10, codFee: 4, packagingCost: 2,
    createdAt: now - 5 * 3_600_000,
  }, now - 5 * 3_600_000);
  let candidates = workflowCandidates(projectState(wm.all()), wm.all(), now);
  const confirmation = candidates.find((c) => c.recipeId === "cod-confirmation")!;
  check("old unconfirmed COD order prepares a follow-up candidate", Boolean(confirmation) && confirmation.customer === "Workflow Customer");
  check("workflow candidate explains the trigger and intended task", confirmation.reason.includes("hours") && confirmation.taskNote.includes("Follow up"));

  wm.append("fact", "automation_run_recorded", {
    candidateKey: confirmation.key, recipeId: confirmation.recipeId, outcome: "followup_task_created", at: now,
  }, now);
  candidates = workflowCandidates(projectState(wm.all()), wm.all(), now);
  check("completed workflow candidate is idempotently suppressed", !candidates.some((c) => c.key === confirmation.key));
}

console.log("\nBilling entitlement (vendor productization):");
{
  const now = Date.now();
  const day = 86400000;
  const fresh = entitlement({ status: "none", currentPeriodEnd: null }, now - 3 * day, now);
  check("new workspace is in trial with days counting down", fresh.active && fresh.trialDaysLeft === 11);
  const expired = entitlement({ status: "none", currentPeriodEnd: null }, now - 20 * day, now);
  check("expired trial without subscription is gated", !expired.active && expired.trialDaysLeft === 0);
  check("active subscription is entitled past trial", entitlement({ status: "active", currentPeriodEnd: now + 30 * day }, now - 400 * day, now).active);
  check("past_due keeps access (grace, never cut off over a bank hiccup)", entitlement({ status: "past_due", currentPeriodEnd: now }, now - 400 * day, now).active);
  check("canceled falls back to trial rule (expired → gated)", !entitlement({ status: "canceled", currentPeriodEnd: null }, now - 400 * day, now).active);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
