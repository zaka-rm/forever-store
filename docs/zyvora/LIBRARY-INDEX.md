# ZYVORA ARCHITECTURE LIBRARY — GLOBAL INDEX & TRACEABILITY REGISTRY

*Maintained per the ZPL-020 Master Commissioning Directive: global concept registry, terminology registry, cross-reference map, ADR index, and traceability matrix across all outputs.*

| Field | Value |
|---|---|
| Governing roadmap | ZPL-020 — *Master Roadmap & Book Commission v1.0* (source: `ZYVORA_Architecture_Library_Master_Roadmap_and_Commission_v1.0.docx`) |
| Last updated | 2026-07-10 |

## Implementation Status (software in `zyvora/`)

| Wave (ZPL-040 build order) | Status |
|---|---|
| Wave 2 core — Decision Workspace: Engine, Insights/Guidance, Business Memory, decision recording | **Built & verified** (v0.1) |
| Global-first currency & onboarding | **Built & verified** |
| Wave 1 — Commerce core: orders, COD lifecycle, stock reservation, delivery-based revenue recognition, order profitability, refusals; Cash Center + 3-envelope allocation; Commerce brain (refusal rate, unprofitable orders, envelope overspend) | **Built & verified** (v0.2, 28-check suite passing + live browser walkthrough) |
| Wave 0 — Platform foundation: accounts (Supabase Auth), server-side append-only event store with RLS Workspace isolation, offline outbox sync, local-mode fallback | **Built** (v0.3); pending two Founder actions: apply `supabase/40_zyvora.sql` to the Supabase project, then create the account in-app. Multi-user/teams: later slice |
| Wave 5 (partial) — Analytics: revenue/profit/expense charts (validated dataviz palette), product gross-profit, CSV exports for orders/invoices/expenses | **Built & verified** (v0.4) |
| Wave 4 (partial) — CRM: unified customer profiles (invoices + orders), lifetime revenue & profit, AOV, COD-reliability score, auto-tags (new/returning/VIP/at-risk/high-refusal), expandable profile detail | **Built & verified** (v0.5) |
| Wave 1 completion — Discounts/promo engine: percentage & fixed codes, min-basket, max-discount cap, server-counted usage limits, expiry, stacking prevention, deactivation (append-only); promo application in order form with margin guard; marketing brain (promo-profitability + usage-limit insights) | **Built & verified** (v0.6, 39-check suite passing + live end-to-end promo walkthrough) |
| Wave 3 (partial) — Finance depth: editable monthly goals (revenue/profit/orders) with progress bars, break-even analysis (fixed expenses ÷ per-order profit, honest about unreachability), interactive profit simulator (revenue/margin/ROI/break-even units) | **Built & verified** (v0.7, 46-check suite passing + live goal-persistence walkthrough) |
| Wave 7 (partial) — Ask ZYVORA (deterministic AI chat over projections: profit/revenue/cash/margins/losing orders/restock/at-risk customers, always sourced, admits out-of-scope, never fabricates); Forecasting (run-rate revenue with ±15% range, 30-day cash projection, stockout dates — all with stated assumptions); framer-motion calm transitions (view changes + chat, reduced-motion aware) | **Built & verified** (v0.8, 52-check suite passing + live chat/forecast walkthrough) |
| Wave 6 (partial) — CSV import center: products/expenses/invoices, auto column-mapping, dry-run preview with row-level errors, imports as fact events (no second source of truth); error boundary (calm recovery screen, Memory safe) | **Built & verified** (v0.9, 58-check suite passing + live import walkthrough) |
| Supabase setup helper — `APPLY_ALL.sql` (all 33 migrations in one paste-once file) + `build-apply-all.ps1` + `SETUP.md` | **Done** — for recreating a lost/fresh Supabase project |
| Naturaloe store connector — `storeConnect.ts` reads live `products` + `product_costs` from the store's Supabase; bundled fallback now uses `foreverPrices.ts` — **70 real Forever products parsed from the owner's official Morocco order form (bon de commande)**, real retail sell prices in DH + Forever costs at the standard **30% Wholesale-FBO discount** (cost = retail × 0.70, confirmed via Forever company policy). Cost factor is regenerable if the owner's discount differs | **Built & verified** (v0.11, 65-check suite; real catalog imported live, real 30% margins, MAD). Parser/generator scripts in scratchpad |
| Polish — printable order receipts (`printReceipt` in Orders.tsx, opens a clean print window; ZPL-041 §21) + "Start fresh workspace" reset (nav footer, local mode) | **Built** (v0.12); build/verify pending tool-classifier recovery, code reviewed |
| Wave 0 completion — **Multi-user (CAP-000004 IAM)**: policy engine (`permissions.ts`: owner/manager/staff/viewer + `can()` + escalation guard), memberships/invitations/RLS (`supabase/41_zyvora_teams.sql`), Team view (invite/role/remove), role threading + UI gating + viewer banner | **Built & verified** (v0.13, 72-check suite; IAM 31%→69%, platform 31%→34%). Cloud team ops need `41_zyvora_teams.sql` applied + 2nd account to exercise end-to-end |
| **Notifications & alerts (CAP-000010)**: notification engine (`notifications.ts` — from insights + COD triggers: confirm pending order, collect courier cash), category+priority, notification center UI with unread badge + dismiss, daily briefing digest (revenue/orders/cash yesterday + attention count) | **Built & verified** (v0.14, 77-check suite; live badge = 8, briefing populated; Notifications 6%→~38%). Channel delivery (email/SMS/WhatsApp) is a documented adapter seam |
| **Finance depth (CAP-000005 FEAT-000040)**: Profit & Loss statement (revenue → COGS → gross profit → operating expenses → net profit, with margins) per month; permanent **period close** (`period_closed` event locks figures — the book close) | **Built & verified** (v0.15, 82-check suite; live P&L for July, June closed & locked; Finance 38%→44%, platform 34%→39%) |
| **CRM depth (CAP-000007)**: editable contact records (phone/city/notes) on each customer profile, activity log (calls/notes) + scheduled follow-ups with mark-done; overdue follow-ups alert via Notifications | **Built & verified** (v0.16, 85-check suite; live contact save + follow-up + mark-done; CRM 31%→44%, platform 39%→40%) |
| **Analytics depth (CAP-000008)**: 3/6/12-month range filter on every chart; click-to-drill-down (a bar opens the exact orders/invoices behind it, guaranteed to sum to the bar — no chart and drill-down ever disagree) | **Built & verified** (v0.17, 85-check suite unaffected + live drill-down: Feb→640 DH invoice, May→4 records summing to 7,200 DH; fixed a real accuracy bug found during testing where drill-down excluded invoices the chart counted). Analytics 31%→42%, platform 40%→42% |
| **Inventory depth (CAP-000006 FEAT-000045)**: purchase orders (reorder from supplier), incoming-stock tracking, goods receipt raises stock at real cost; stockout alert auto-suppressed once enough is inbound (no nagging about what you've already ordered) | **Built & verified** (v0.18, 88-check suite; live: PO for 50 mugs → +50 incoming → receive → stock 3→53, alert cleared from Today). Inventory 56%→69%, platform 42%→43% |
| **AI Engine — real LLM (CAP-000003 FEAT-000017/019)**: Groq model gateway (`llm.ts`, OpenAI-compatible, swappable via `VITE_GROQ_MODEL`), `businessContext()` grounding brief; Ask ZYVORA answers precise questions instantly from data and open questions conversationally via the LLM grounded on real numbers; honest fallback + error handling when no key | **Built & verified** (v0.19, 90-check suite; fallback confirmed live, LLM path key-gated). **Needs Founder: paste Groq key into `zyvora/.env` `VITE_GROQ_API_KEY=` + restart.** Security: client-side key is visible in bundle — proxy via server for production. AI Engine 50%→69%, platform 43%→45% |
| Governance integration — Canonical Product Model in `governance/`; app annotated with canonical IDs (39+ trace IDs, was 0); coverage/sync reports regenerable | **Done** — objective spec↔code traceability |
| **Messaging channels (CAP-000010 FEAT-000077)**: Twilio WhatsApp/SMS via auth-gated Supabase Edge Function `send-message` (secrets server-side; browser never sees them); compose + send from customer profile, sends logged as CRM activities; `codConfirmationText` COD template | **Built & verified** (v0.20, 90-check suite). **Needs Founder: `supabase functions deploy send-message` + `supabase secrets set TWILIO_*`; WhatsApp sandbox recipients must `join <code>` first** |
| **Productization Stone 1 — AI key server-side**: `ask-ai` Edge Function holds `GROQ_API_KEY` as a server secret (auth-gated, input-capped); `llm.ts` routes signed-in users through it; `.env.production` blanks `VITE_GROQ_API_KEY` so no production bundle can embed the key (verified by `gsk_` scan of `dist/`) | **Built & verified** (v0.21). **Needs Founder: `supabase functions deploy ask-ai` + `supabase secrets set GROQ_API_KEY=...`** |
| **Productization Stone 2 — error telemetry (FEAT-000032)**: insert-only `zyvora_client_errors` table (`supabase/42_zyvora_telemetry.sql`), `telemetry.ts` global handlers + error-boundary reporting, rate-limited, local mode sends nothing | **Built & verified** (v0.21). Needs Founder: re-paste `APPLY_ALL.sql` (now 35 files) |
| **Productization Stone 4 — billing (Stripe)**: `zyvora_subscriptions` mirror table (webhook-only writes; `43_zyvora_billing.sql`), `zyvora-billing` Edge Function (Checkout + Billing Portal, 14-day trial), `zyvora-stripe-webhook` (signature-verified; NOTE: unprefixed `stripe-webhook` belongs to the Naturaloe store), pure `entitlement.ts` (5 verify checks: trial countdown/gate, active, past_due grace, canceled), Billing view + trial banner (cloud mode only; local free forever; expiry never blocks export) | **Built & verified** (v0.22, 95-check suite). **Needs Founder: Stripe product/price + webhook endpoint + secrets (see DEPLOYMENT.md)** |
| **Productization Stone 5 (part) — landing page**: `zyvora/public/landing.html` at `/landing.html` + `/welcome` — hero, feature grid, constitutional promises, single-plan pricing, CTA to app | **Built & verified** (v0.22, rendered live) |
| **Productization Stone 6 — legal pages**: `terms.html` + `privacy.html` (static, linked from landing footer) — data-ownership/export guarantees, honest AI/messaging disclosures, deletion rights; flagged as lawyer-review-pending templates | **Built & verified** (v0.23, both rendered live; ship in `dist/`) |
| **Productization Stone 7 — operations runbook**: `docs/zyvora/OPERATIONS.md` — backups/PITR + restore drill, weekly 10-minute monitoring table, incident playbooks (app/auth/AI/messaging/billing), secrets hygiene & rotation, release discipline, support flow | **Done** (v0.23) |
| **Productization Stone 3 — deployment readiness**: `vercel.json` (SPA rewrites, immutable asset cache, security headers), code-split bundle (4 chunks, all <215 kB, warning gone), `docs/zyvora/DEPLOYMENT.md` runbook | **Built & verified** (v0.21, build clean + key-scan CLEAN). **Needs Founder: `npx vercel --prod` from `zyvora/` (see DEPLOYMENT.md)** |
| **Shopify-caliber UX pass (v0.24)**: command palette (Ctrl+K — views, actions, live search over customers/products/orders from projections), toast system with Undo (archive/discontinue reversible without dialogs), resource-index pattern on Orders ("Needs action" tab = pending + uncollected cash, + In progress/Delivered/Refused tabs with live counts, search over customer+product lines) and Customers (tag tabs + search), responsive `.table-scroll` wrappers, spacing/motion/z-index tokens, skip link + aria-current + labeled badges | **Built & verified** (103-check suite; live: palette found product by name → navigated, tag filter → exact match, archive → counts updated live + toast with Undo rendered + notification badge auto-dropped; mobile 375px clean) |
| Waves 3–7 remainder — bank reconciliation, live connectors (store/payment/shipping APIs), mobile/POS/offline, Documents/Notifications/HR/Manufacturing modules | Not started — see governance build packs |

## Volume Status

| Document | Version | Status | File |
|---|---|---|---|
| CODEX 00 — Foundation | 2.1 | Ratified (v2.0 approved with revisions applied; ADR-1001 editorial pass to Section G / Appendices I–II pending) | `CODEX-00-FOUNDATION.md` |
| CODEX 10 — Product Philosophy | 1.1 | Ratified, pending Founder review of ADR-1001 | `CODEX-10-PRODUCT-PHILOSOPHY.md` |
| ZPL-030 — Implementation Constitution | 1.0 | Issued; Founder ratification pending | `ZPL-030-IMPLEMENTATION-CONSTITUTION.md` |
| ZPL-040 — Master Feature Spec (18 Domains, cross-Domain flows) | 1.0 | Registered with Founder amendment: **global-first** — no hardcoded currency/country; per-Workspace currency, locale, fiscal settings chosen at onboarding | `ZPL-040-MASTER-FEATURE-SPEC.md` |
| ZPL-041 — Master AI Build Prompt (Admin/Finance dashboard commission for external AI builders) | 1.0 | Issued; self-contained, global-first, with acceptance criteria and verification duties | `ZPL-041-MASTER-AI-BUILD-PROMPT.md` |
| CODEX 01–09, 11–99 | — | Commissioned by ZPL-020, not yet written | — |
| Series ZS / ZP / PRD / TS / SB | — | Defined in ZPL-020; extraction begins per delivery slice | — |

## Mandatory Outputs Delivered

| Codex | Roadmap-mandated output | Delivered in |
|---|---|---|
| 00 | Ratified constitutional volume | CODEX 00 (whole) |
| 00 | Architecture decision baseline | Appendix IV (ADR-0000–0005) |
| 00 | Official glossary seed | Appendices I–II |
| 00 | Constitutional compliance checklist | Appendix VIII |
| 10 | Product laws | Appendix A (P1–P7) |
| 10 | Capability proposal template | Appendix G |
| 10 | Product review checklist | Appendix H |
| 10 | Product maturity model | Part VI, 6.3 (M0–M4) |

## ADR Index

| ADR | Title | Status | Source |
|---|---|---|---|
| ADR-0000 | Adopt CODEX 00 as supreme authority | Reserved | CODEX 00 App. IV |
| ADR-0001 | Adopt the DOS category | Accepted · Constitutional | CODEX 00 |
| ADR-0002 | Business Memory is permanent | Accepted · Constitutional | CODEX 00 |
| ADR-0003 | One Source of Truth | Accepted · Constitutional | CODEX 00 |
| ADR-0004 | Decision-first architecture | Accepted · Constitutional | CODEX 00 |
| ADR-0005 | AI assists, never replaces judgment | Accepted · Constitutional | CODEX 00 |
| ADR-1001 | "Builder" = the entrepreneur; constructors = "Contributors" | Accepted · Amendment (Founder ratification pending) | CODEX 10 App. D |
| ADR-1002 | Loop closure is part of definition-of-done | Accepted | CODEX 10 |
| ADR-1003 | Validation measured in decisions, not engagement | Accepted | CODEX 10 |
| ADR-1004 | Options Table is the canonical trade-off form | Accepted | CODEX 10 |
| ADR-1005 | Honesty is exempt from experimentation | Accepted · Constitutional | CODEX 10 |

ADR namespaces: 0000–0999 Constitution · 1000–1999 Product Philosophy · further ranges assigned per codex series at commissioning.

## Terminology Registry (authoritative until CODEX 03)

Builder (entrepreneur user, per ADR-1001) · Contributor (constructor of ZYVORA) · Workspace · Domain · Capability · Decision Engine · Business Brain · Insight · Guidance · Business Memory · Decision Lifecycle · Decision Layers · One Source of Truth · Twelve Laws (I–XII) · Product Laws (P1–P7) · Confidence Ledger · Options Table · Maturity levels M0–M4. Forbidden synonyms: see CODEX 00 Appendix II.

## Next Commissions (per ZPL-020 dependency order)

1. **CODEX 01 — Governance** (ADR handbook, decision-rights matrix — unblocks ratification workflow for everything else)
2. **CODEX 03 — Terminology** (master glossary; absorbs ADR-1001)
3. **CODEX 04 — Documentation Standards** (templates and quality gate for all later volumes)
4. Then per Founder priority: CODEX 11/12/13 (Product core) or Wave-0 platform codices (60–62) for the software build route.
