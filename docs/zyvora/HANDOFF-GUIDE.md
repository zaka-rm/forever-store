# ZYVORA — Contributor Handoff Guide

*For the next agent (Opus) or engineer continuing this build. Read this once, fully, before writing code. It exists so you continue in the same discipline that produced v0.1–v0.4, not a different one.*

Last updated: 2026-07-11 · Author: previous build agent (Fable) · Current app version: v0.4

---

## 0. The one-paragraph orientation

ZYVORA is a **Decision Operating System** — software whose unit of value is the *confident business decision*, not the record or the dashboard. There is a written constitution (the Architecture Library in this folder) and a working app (`../../zyvora/`). Your job is to keep extending the app **wave by wave**, where every wave is a usable vertical slice, and every line traces back to the library. You are an *implementation engine for an architecture that already exists* — **never** invent architecture, terminology, or business rules on your own (ZPL-030 Article 8).

## 1. Read these first, in this order

1. `CODEX-00-FOUNDATION.md` — the constitution. Non-negotiable. Pay special attention to the **Twelve Laws** (§C.0), the **Decision Lifecycle** (§D.11), **Business Memory** (§B.6/D.8), and the **ADRs** (Appendix IV).
2. `CODEX-10-PRODUCT-PHILOSOPHY.md` — how to decide *what* to build. The **Seven Product Laws** (App. A), the **Options Table** (§5.8), the **four transparency layers** claim→reasoning→evidence→confidence+falsifier (§P4.6).
3. `ZPL-030-IMPLEMENTATION-CONSTITUTION.md` — the 15 rules for *how* to build. Fixed development order, vertical slices, seven PR reviews, definition of done.
4. `ZPL-040-MASTER-FEATURE-SPEC.md` — the full 18-domain product map (the "what exists eventually").
5. `ZPL-041-MASTER-AI-BUILD-PROMPT.md` — the finance/admin dashboard spec with acceptance criteria; the nearest thing to per-feature requirements.
6. `LIBRARY-INDEX.md` — the live status ledger. **Update it every session.**

If any instruction you receive conflicts with CODEX 00, CODEX 00 wins until an ADR amends it (ZPL-030 Article 1). Surface the conflict; do not silently resolve it.

## 2. What is already built (don't rebuild it)

The app lives in `../../zyvora/`. Architecture:

```
Business Memory (append-only event store)   ← the single source of truth
        │  facts / interpretations / decisions / outcomes  (4 streams)
        ▼
projectState() / projectDecisions()         ← pure, read-only projections (One Source of Truth)
        ▼
Decision Engine (generateInsights)          ← Business Brains → ranked Insights + Guidance
        ▼
UI views (Today / Orders / Finance / …)     ← every money value via formatMoney (global-first)
```

| File | Responsibility | Do not |
|---|---|---|
| `src/core/types.ts` | All domain types (events, projections, Insight, Guidance) | — |
| `src/core/memory.ts` | `MemoryStore` interface + `BusinessMemory` (local). **Append-only: no update/delete methods exist.** | add a delete/update method |
| `src/core/cloud.ts` | `CloudMemory` (Supabase) + auth/workspace helpers + offline outbox | bypass the outbox |
| `src/core/projections.ts` | Fold events → state; order financial math (`orderRevenue`, `orderNetProfit`, `orderRefusalLoss`) | compute money anywhere else |
| `src/core/engine.ts` | The Decision Engine: `financeBrain`, `customersBrain`, `inventoryBrain`, `commerceBrain`; `cashCenter`, `stateOfThings`, `ENVELOPES` | emit an Insight without evidence+falsifier |
| `src/core/format.ts` | `money()` / `setActiveCurrency()` — **the only place a currency symbol appears** | hardcode a currency symbol |
| `src/core/seed.ts` | Demo business (6 months, COD order book) | — |
| `src/ui/*.tsx` | Views; each Domain view names the business question it answers | build an "ambient" screen with no decision |
| `scripts/verify.ts` | 28-check headless suite (projections, COD lifecycle, brains, invariants, lifecycle) | let it go red |
| `../supabase/40_zyvora.sql` | Cloud schema: RLS isolation + append-only (no update/delete policies) | add an update/delete policy on events |

**Built waves:** Wave 2 core (Engine + Memory + decision recording), global-first currency, Wave 1 Commerce/COD (orders, reservations, delivery-based revenue, refusals, per-order profit, Cash Center + 3 envelopes), Wave 0 platform (accounts + server persistence + offline sync), Wave 5 partial (Analytics charts + CSV).

## 3. The non-negotiable patterns — copy these exactly

**Every new fact is an event.** Never mutate state directly. To add a capability's data, define an event type in `types.ts`, append it via `memory.append(stream, type, payload)`, and fold it in `projectState`. State is *always* derived, never stored.

**Every metric has one calculation owner.** If two screens show "profit," they call the *same* function in `projections.ts` or `engine.ts`. Duplicating a formula is a defect (ZPL-041 Binding Principle 1). Before writing a calculation, grep for an existing one.

**Every Insight carries all four layers.** When you add a Business Brain rule, it MUST produce: `claim`, `reasoning`, `evidence[]` (with sources), `confidence`, `confidenceNote` (stating uncertainty honestly), and — if it offers Guidance — 2–4 options where one is the null ("do nothing") option and **every option has a `falsifier`**. The verify suite enforces this; keep it green.

**"Not enough data" is a valid output.** If a brain can't honestly support a claim, it says so (see the `finance.trend.insufficient` insight for the pattern). Never fabricate confidence.

**A recorded decision is suppressed.** Insights carry a stable `decisionKey`; once the user decides, it's not re-shown for 30 days (`generateInsights` filters on recorded decisions). Preserve this — no nagging.

**Money is currency-neutral.** Every displayed amount goes through `formatMoney` / `money`. Never write `€`, `$`, `DH`, or `.toLocaleString` with a hardcoded currency. The Workspace's currency is set once in `App.tsx`.

**Charts follow the dataviz method.** One validated hue (`#0f8a5f` passed the validator), thin rounded marks, recessive axes, selective direct labels, a table view under every chart, native tooltips, never a dual-axis chart. Run the dataviz palette validator before adding any new color.

## 4. How to build the next slice (the loop)

For each wave, in this order (ZPL-030 Article 7):

1. **Name the decision(s)** the slice improves and the Builder question each view answers. Write it in the view's subtitle. If you can't name the decision, it doesn't ship (Law IV / Gate 2).
2. **Types → projections → engine → UI.** Business rules and data first, screen last.
3. **Extend `scripts/verify.ts`** with checks for the new logic *as you write it* — profit math, state transitions, invariants. Loop closure (outcome measurement into Memory) is part of "done" (ADR-1002).
4. **Build clean:** `npm run build` (tsc + vite) must pass with zero errors.
5. **Run the suite:** the esbuild+node one-liner in `zyvora/README`; must print `ALL CHECKS PASSED`.
6. **Verify live in the browser** via the preview tools — read the page text, check console for zero errors, confirm the new UI actually renders and the numbers reconcile. Screenshot if the tool cooperates.
7. **Update `LIBRARY-INDEX.md`** status table and the app `README.md`. Documentation and code never diverge (ZPL-030 Article 10).
8. **Report honestly** what's done, what's verified, and what's deferred with reasons.

## 5. Recommended next waves (priority order)

The build order from ZPL-040 §"Recommended Implementation Waves", adjusted for what's done:

1. ~~**CRM depth (Wave 4 start).**~~ **DONE (v0.5).** `projectCustomerProfiles` in `projections.ts` unifies invoices + orders → lifetime revenue/profit, AOV, COD-reliability, auto-tags; the Customers view has expandable profiles. Next CRM step if resumed: a per-customer *next-best-action* Insight in a `customersBrain` extension, and a customer note/timeline.
2. ~~**Discounts & promo engine (Wave 1 completion).**~~ **DONE (v0.6).** `checkPromo` in `projections.ts` validates/computes; `marketingBrain` in `engine.ts` flags unprofitable/limit-reached promos; `Promos.tsx` manages codes; the order form applies them with the margin guard. Promos are events (`promo_created`/`promo_deactivated`), usage server-counted from orders.
3. ~~**Finance depth (Wave 3).**~~ **DONE (v0.7).** `goalActual`, `breakEven`, `simulateProfit` in `projections.ts`; `FinanceTools.tsx` (goals/break-even/simulator) rendered inside FinanceView. Goals are `goal_set` events (latest target per metric wins); break-even and simulator are pure functions.
4. ~~**AI chat (Wave 7).**~~ **DONE (v0.8).** `assistant.ts` (`askZyvora`) — deterministic intent-matcher over projections, sourced, admits out-of-scope. `Ask.tsx` is the chat UI. An LLM could later sit behind an env flag; the constitutional bar (sourced, honest) is already met without one.
5. ~~**Forecasting (Wave 7).**~~ **DONE (v0.8).** `forecast()` in `projections.ts` — run-rate revenue (±15%), 30-day cash, stockout dates, all with stated assumptions; rendered as a section in `Analytics.tsx`.
6. **Multi-user / permissions (Wave 0 completion) — NEXT.** Team members, roles, the approval workflows in ZPL-040 §2. Requires a `zyvora_memberships` table + new RLS policies (workspace access by membership, not just owner) and a role check before sensitive events. This is the biggest remaining foundational piece.
7. ~~**CSV import (Wave 6).**~~ **DONE (v0.9).** `csv.ts` (parse/autoMap/buildRow), `Import.tsx` (preview + confirm). Imports products/expenses/invoices as fact events. Live connectors (store/payment APIs) are the larger remaining Wave 6 piece.
8. **PDF invoices/receipts, mobile/POS.** Presentation-layer slices once the above land.

**Error boundary:** `ErrorBoundary.tsx` wraps the view content in `App.tsx` (keyed by view). Any component throw shows a calm recovery screen instead of a blank page (E.7). Keep it — don't remove.

**Supabase note:** `supabase/APPLY_ALL.sql` is the one-paste setup for a fresh project (regenerate with `build-apply-all.ps1` after editing any migration). See `supabase/SETUP.md`.

**Motion note:** framer-motion is installed and used in `App.tsx` (view transitions) and `Ask.tsx` (message entrance), always gated by `useReducedMotion()`. Keep motion calm — for comprehension, never attention (CODEX 00 E.1). Don't animate the decision queue in a way that draws the eye repeatedly.

Pick the one the Founder asks for; default to the order above. Each is one focused slice — do not start two at once.

## 6. Traps specific to this codebase

- **Windows PowerShell 5.1**: no `&&`; use `; if ($?) { … }`. When rewriting files with `Set-Content`, always `-Encoding utf8` or you corrupt the em-dashes and accented names. Prefer the Edit tool over PowerShell text replacement for source files.
- **The browser screenshot tool times out** on this machine intermittently — use `get_page_text`, `read_page`, and `javascript_tool` (querying the DOM) as your primary verification; they're reliable.
- **The tool-permission classifier occasionally goes down** ("temporarily unavailable"). Wait ~10s and retry; it's infrastructure, not your error. Don't change your command in response.
- **Two persistence modes**: the app runs cloud (if `.env` has Supabase keys) or local. Test in local mode (click "Continue in local device mode") to avoid needing an account during development. Data for both persists across reloads.
- **`verify.ts` uses a `TestMemory` stub**, not the real store, so it runs headless in node. Add checks there; don't try to run the React app in node.

## 7. The standard you're holding

Before you call anything done, it passes the Definition of Done (ZPL-030 Article 14): philosophy respected, business rules implemented, tests pass, build clean, docs updated, verified live. And the deeper test (CODEX 10 §5.9): **can the Builder re-give the explanation in their own words?** If an Insight, a number, or a screen can't be explained back by a tired shop owner at 9 p.m., it isn't finished.

Build with discipline. Build with clarity. Build for the next decade. Then hand off as cleanly as this.
