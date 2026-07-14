# ZPL-041 — MASTER AI BUILD PROMPT

*Business Intelligence & Financial Admin Dashboard — hand this to any capable AI builder (Claude, GPT, Gemini, Cursor, Lovable, Bolt) as a single, self-contained commission.*

Registered in the ZYVORA Architecture Library. Supersedes the draft prompt of 2026-07-11; aligned with CODEX 00/10, ZPL-030, ZPL-040, and the global-first amendment.

---

# THE PROMPT

## Your Role

You are a senior full-stack engineering team implementing a production-quality system. You do not invent requirements: everything you build is specified below. Where this document is silent, ask — or choose the simplest option that satisfies the Binding Principles and say explicitly what you chose and why.

## Mission

Design and implement a professional **Admin Dashboard** for an e-commerce business (reference case: a Forever Living products reseller operating primarily with Cash on Delivery). This is not a simple admin page. It must function as the **brain of the business**: automatically calculating, analyzing, predicting, and explaining everything related to products, inventory, orders, profits, customers, discounts, expenses, and business performance — so the owner understands the whole business in under 30 seconds and always knows the next decision to take.

## Scope Boundary — read first

- If an admin panel already exists (Products, Orders, Customers, Inventory, Discounts, Shipping, Analytics modules): **do not recreate or modify those modules.** Build the new capabilities as a connected layer that reads their data through defined interfaces.
- If building from scratch, implement the modules below as one coherent system.
- Either way: state at the start of your work which mode you are in and list the integration points you will use.

## Binding Principles (non-negotiable)

1. **One source of truth, one calculation owner.** Every business fact lives in exactly one place; every metric (profit, margin, CLV, inventory value…) is computed by exactly one service/function and reused everywhere. No duplicated formulas, ever.
2. **Event-driven synchronization.** Every change (order status, price, stock, expense, refund) emits a typed event; all dependent values update by consuming events or recomputing projections. Name the events. "Everything updates automatically" must be a mechanism, not a promise.
3. **Decision-first.** Every screen, card, and alert must name the owner-decision it serves. A number without a "so what" does not ship.
4. **Explainable intelligence.** Every recommendation, forecast, and alert must expose: the claim, the reasoning, the evidence (source figures + freshness), a confidence level, and *what would make it wrong*. Never present an estimate as a certainty. "Not enough data yet" is a valid, required output.
5. **AI assists; the human decides.** The advisor recommends and drafts; it never executes a consequential action (price change, order cancellation, money movement) without explicit user confirmation.
6. **Global-first.** No currency, country, tax rule, or language is hardcoded. The Workspace chooses currency (e.g., MAD, EUR, USD…), locale, and timezone at setup; all formatting flows through one internationalization layer. (Examples below use DH only as illustration.)
7. **Auditability.** Every financial and inventory mutation records who, what, when, before/after values, and reason. Append-only.
8. **COD-aware accounting.** Revenue is recognized on **delivery** (configurable for prepaid businesses). Cash collected by couriers is tracked as *pending* until remitted and reconciled.

---

## 1. Product Cost & Profit System

Each product stores: name, category, SKU, distributor/buying cost, official catalogue price, selling price, optional promotional price, weight, stock quantity, low-stock threshold, supplier, images.

Auto-calculated per product: gross profit (amount), gross margin %, net profit (after allocated discounts, delivery, packaging, payment/COD fees), profit after taxes (tax engine configurable, future-ready), ROI, break-even units, profit per unit, profit per order.

## 2. Smart Inventory Management

Tracked states: current, reserved (pending orders), available, incoming, returned, damaged, lost, expired.
Auto-calculated: inventory value (at cost and at selling price), expected profit, average sales/day, days until stockout, inventory turnover, reorder recommendation (reorder point from velocity × lead time + safety stock, **checked against available cash**).
Alerts: low stock, out of stock, expiring soon, best sellers, slow movers, dead stock. Every alert states the decision it demands and its evidence.

## 3. Order Financial Analysis

Per order: subtotal, discount, shipping fee (charged vs. paid), COD fee, packaging cost, product cost (COGS at current costing method — weighted average default), total cost, gross profit, net profit, margin %, order ROI, payment status, delivery status, expected vs. real profit, profit lost (cancellations/refusals/returns), customer lifetime revenue link.
COD specifics: confirmation-call state, refusal risk flag, courier handoff, collected cash, remittance batch, reconciliation state, failed delivery / reschedule / return-to-sender costs.

## 4. Discount Engine

Types: percentage, fixed, coupon codes, automatic bundles, buy-X-get-Y, loyalty, VIP, first-order, birthday.
Controls: stacking prevention, minimum basket, maximum discount, usage limits (global and per customer, server-enforced), expiration.
Analytics: total discount given, average discount, profit lost to discounts, revenue attributable to discounts, discount ROI.
**Rule:** a discount may never push an order below the configurable minimum margin without an explicit warning and authorized override (logged).

## 5. Shipping Cost Intelligence

Track shipping paid by customer vs. by business, per-carrier cost, cost by city/region, average cost, profit after shipping, free-shipping threshold analysis, shipping profitability/loss.
Recommendations with evidence: raise/remove free-shipping threshold, best carrier per region (cost × delivery success rate × speed).

## 6. Financial Dashboard (Executive Overview)

KPI cards: revenue and profit for today/week/month/year, gross profit, net profit, expenses, cash flow, cash available vs. pending (COD), inventory value & investment, margin %, average basket, average profit/order, conversion rate, repeat-customer rate, return/cancellation/refund rates, orders (today/week/month), units sold, top & worst products/categories, projected revenue & profit.
Every card: current value, previous-period comparison, % change, calm trend indicator. Comparisons default to the business's **own** history (yesterday / last week / last month / last year), not external benchmarks.
Include a **profit waterfall** (revenue → discounts → COGS → shipping → packaging → fees → advertising → net profit) and **interactive drill-down**: any figure → months → days → orders → single-order profit breakdown. Every number is clickable to its source records.

## 7. Expense Management

Manual expenses with date, category (delivery, packaging, advertising, phone, internet, hosting, domain, subscriptions, equipment, fuel, office, misc — extensible), description, amount, attachment/receipt, notes.
Optional approval workflow (pending/approved/rejected, approver, date, threshold-based).
Reports: daily/monthly/yearly totals, by category, trend, % of revenue, % of profit, net business profit.

## 8. Envelope System (3-Envelope Rule)

Every recognized payment auto-splits by configurable percentages into: **Stock envelope** (restock reserve), **Expense envelope** (operations), **Profit envelope** (owner's real profit).
Show balances, recommended allocation, and warnings when spending exceeds an envelope — with the specific corrective options.

## 9. Customer Intelligence

Per customer: lifetime revenue & profit, order count, average basket & profit, favourite products, last order, predicted next purchase, repeat probability, CLV, loyalty level, VIP status, abandoned-cart history, refund/refusal history (COD reliability score).
Auto-tags: new, returning, VIP, inactive, high value, high risk, frequent buyer. Duplicate detection and safe merge with audit trail.

## 10. Sales Analytics & Charts

Sales/profit/revenue/orders by day-week-month-year; top cities; profit by city; top products & categories; customer growth; repeat customers; inventory value trend; profit distribution; shipping & discount cost trends; refund trend; revenue heatmap calendar; seasonal analytics (best/worst month, record days, average monthly growth).
Smart filters everywhere (period presets + custom range, product, category, customer, city, payment method, carrier, status) and global search (orders, customers, products, expenses, invoices, refunds, transactions).

## 11. Forecasting & Predictions

Projected revenue/profit for the current month, expected orders and customers, products running out (with dates), restock quantities and budget, cash needed, expected cash flow next week/month, seasonal demand, next month's likely best sellers.
Every forecast shows its assumption ("if the current pace holds…"), a range (not a false point value), and its input freshness.

## 12. AI Business Advisor (+ AI Chat)

Proactively generates ranked recommendations, e.g.: "Stock of X runs out in ~6 days — reorder ~48 units (~cost) now or accept ~3 stockout days"; "Discounts reduced profit by N this month — the coupon Y drives volume but negative margin"; "Free-shipping threshold below Z makes 18% of orders unprofitable"; "Customer A is 90% likely to reorder — a check-in now beats a discount"; "Advertising ROI is negative on channel B."
Every recommendation follows the four-layer form: **claim → reasoning → evidence → confidence + falsifier**, and offers 2–4 options with gains, costs, reversibility — including the "do nothing" option — plus one marked recommendation. The user's choice (and optional reason) is recorded; a declined recommendation is not re-nagged.
Floating **AI chat**: "How much profit last month?", "Which product has the highest margin?", "Why did profit drop this week?", "Show orders that lost money", "How much cash do I need to restock?" — answers show definition used, filters, sources, freshness. The chat respects the requesting user's permissions and never fabricates figures.

## 13. Reports, Invoices & Exports

Reports: daily/weekly/monthly/quarterly/yearly, inventory, financial, profit, customer, product, shipping, expense, sales. Exportable to PDF/Excel/CSV/print; schedulable by email.
Invoice & receipt center: invoices, receipts, credit notes, refund receipts, expense receipts — numbered sequences, PDF export, template branding.

## 14. Automation

Auto: stock updates on every order event, profit and KPI recomputation, inventory value, customer statistics, envelope allocation, low-stock and reorder alerts, monthly report generation, daily financial snapshots.
Automation ladder: (1) the system **prepares/drafts**, (2) executes a specific action **with consent**, (3) executes **user-defined standing rules** with a transparent activity log. There is no fully-autonomous fourth level. Idempotent runs, retries, dead-letter handling, manual replay.

## 15. Dashboard UI

Modern, calm, professional: overview/financial/profit KPI cards, interactive charts, progress bars, data tables with pagination & sorting, quick + advanced search, date-range picker, export buttons, loading skeletons, smooth (non-attention-seeking) animations, notifications center, activity timeline, recent orders/customers/expenses, low-stock alerts, Business Health Score, dark mode, fully responsive, customizable widget layout (drag, hide, resize, save) — **except** the decision queue and health summary, which cannot be hidden.
Currency formatting throughout via the Workspace's configured currency and locale (RTL-ready; English/French/Arabic as first language set).

## 16. Business Health Score

0–100 composite with transparent, clickable components: revenue growth, profit margin, cash flow, inventory health, customer retention, expense control, refund rate, return rate, data quality. Status bands (excellent / good / needs attention) with the top contributing factor named — never a bare number.

## 17. Business Rules (hard constraints)

- Never sell more units than available (available = current − reserved).
- Only delivered orders count as revenue (configurable recognition); cancelled orders excluded from profit; returns/refunds automatically reverse revenue, COGS, cash, and customer metrics — tracked separately, never silently netted.
- Auto-reserve inventory for pending orders; release on cancellation.
- Warn when free shipping or a discount makes an order unprofitable; block below minimum margin without authorized override.
- Highlight negative-margin products persistently.
- Full immutable audit log of every financial and inventory change.
- No metric may disagree between two screens: same fact → same projection → same number, with staleness shown when data is old.

## 18. Financial Risk Analysis

Automatic, explained warnings: too much cash locked in inventory; margin below threshold on product X; rising COD refusal rate; cash insufficient for next restock; expenses growing faster than revenue; over-dependence on one best-seller or one customer.

## 19. Data Model (implement these entities; do not invent parallel ones)

Product, Variant/SKU, PriceList, Discount/Coupon, Order, OrderLine, Payment, CODCollection/Remittance, Shipment, Return, Refund, Invoice, CreditNote, Customer, CustomerTag, Expense, ExpenseCategory, ApprovalRequest, Supplier, PurchaseOrder, GoodsReceipt, InventoryBalance, StockMovement, Reservation, Envelope, EnvelopeAllocation, Budget, Goal, MetricSnapshot (daily financial snapshots), FinancialEvent, AuditEvent, Recommendation, Forecast, DecisionRecord (user's choice + rationale + later outcome), ReportSchedule, ExchangeRate, WorkspaceSettings.

## 20. Non-Functional Requirements

- **Performance:** interactive responses < 200 ms target; anything > 1 s shows honest progress; > 10 s becomes async with notification.
- **Accessibility:** WCAG 2.2 AA floor; full keyboard operability; color never the only signal; screen-reader-coherent explanations.
- **Security:** role-based permissions (owner, manager, accountant, agent, viewer — extensible), per-Workspace isolation, encrypted at rest/in transit, no secrets in code, session control + audit on sensitive actions.
- **Reliability:** daily/weekly/monthly automatic backups, one-click restore, restore actually tested; daily financial snapshots for today-vs-yesterday / month-vs-month / year-vs-year comparisons and locked period closes with restatement reasons.
- **Extensibility:** clean internal API + webhooks, ready for payment providers, bank feeds, accounting tools, and a mobile app. Multi-currency display with exchange-rate snapshots and gain/loss handling.

## 21. Acceptance Criteria & Verification (you must demonstrate these)

1. Create an order → stock reserves; deliver it → revenue, COGS, profit, cash-pending→collected, envelopes, customer stats, and every KPI card update from the same event, and the audit log shows the chain.
2. Change a product's cost → every affected metric (margins, inventory value, forecasts) changes consistently everywhere; nothing disagrees.
3. Refund a delivered order → revenue/profit/cash reverse, return costs recorded, customer risk updated; report totals reconcile.
4. Apply a discount that would break minimum margin → blocked with warning; override works and is logged.
5. The advisor produces at least: a stockout warning with reorder options, a negative-margin alert, and a cash-runway statement — each with evidence, confidence, and falsifier; declining one suppresses it.
6. Ship seed/demo data that exercises all of the above, and automated tests for: profit math, revenue recognition, reservation logic, discount rules, envelope allocation, and permission checks.
7. Switch the Workspace currency and locale → every money value and format follows; nothing shows a hardcoded symbol.

## 22. Deliverables & Build Order

Work in vertical slices, each usable before the next: (1) products + costs + profit engine; (2) orders + COD lifecycle + revenue recognition; (3) inventory + reservations + reorder intelligence; (4) expenses + envelopes + cash center; (5) executive dashboard + drill-down + charts; (6) customers + discounts analytics; (7) forecasting + advisor + chat; (8) reports/exports + goals + health score.
For each slice deliver: working code, tests, seed data, and a short README naming the decisions the slice improves and the events it emits/consumes. State your stack choices and why (prefer boring, proven technology).

---

*End of prompt.*
