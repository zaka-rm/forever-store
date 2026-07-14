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
| Governance integration — Canonical Product Model in `governance/`; app annotated with canonical IDs (**39 trace IDs**, was 0); `reports/implementation-coverage.md` + `implementation-synchronization.md` regenerable | **Done** — objective spec↔code traceability |
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
