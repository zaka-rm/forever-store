# ZYVORA — Implementation Coverage (App vs. Canonical Product Model)

Assessed 2026-07-12. App under review: `zyvora/` MVP. Model: Canonical Product Model v3.0 (96 features, 12 capabilities).

**How to read this:** each capability has 8 specified features. "Implemented" = works and is verified; "Partial" = core exists, not to full spec depth; "Not started" = absent. Weighted coverage counts partial as 0.5.

## Portfolio summary

| Capability | Coverage | Implemented / Partial / Not started |
|---|---|---|
| Decision Center | **69%** (5.5/8) | 5 / 1 / 2 |
| Business Memory | **56%** (4.5/8) | 3 / 3 / 2 |
| AI Engine | **50%** (4/8) | 3 / 2 / 3 |
| Identity, Workspace, Permissions & Audit | **69%** (5.5/8) | 4 / 3 / 1 |
| Finance | **38%** (3/8) | 1 / 4 / 3 |
| Inventory | **56%** (4.5/8) | 4 / 1 / 3 |
| CRM | **31%** (2.5/8) | 1 / 3 / 4 |
| Analytics | **31%** (2.5/8) | 1 / 3 / 4 |
| Documents | **6%** (0.5/8) | 0 / 1 / 7 |
| Notifications | **6%** (0.5/8) | 0 / 1 / 7 |
| Human Resources | **0%** (0/8) | 0 / 0 / 8 |
| Manufacturing | **0%** (0/8) | 0 / 0 / 8 |
| **PLATFORM TOTAL** | **34%** (33/96) | — |

## Decision Center — 69%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000001 Decision inbox and saved views | 🟡 partial | `zyvora/src/ui/Today.tsx` — Ranked decision queue; no saved views |
| FEAT-000002 Priority and urgency explanation | ✅ implemented | `zyvora/src/core/engine.ts` — Insights ranked by weight, layer badges, urgency in claims |
| FEAT-000003 Decision detail and evidence bundle | ✅ implemented | `zyvora/src/ui/InsightCard.tsx` — Evidence + confidence + reasoning per decision |
| FEAT-000004 Alternative and trade-off comparison | ✅ implemented | `zyvora/src/core/engine.ts` — Options Table: 2-4 options, gains/costs/reversibility/falsifier + null option |
| FEAT-000005 Assignment and due-date control | ⬜ not started | Assignment/due-dates require multi-user |
| FEAT-000006 Approval and escalation | ⬜ not started | Approval/escalation require roles |
| FEAT-000007 Action and rationale recording | ✅ implemented | `zyvora/src/ui/InsightCard.tsx` — Record decision with written rationale |
| FEAT-000008 Outcome follow-up and learning | ✅ implemented | `zyvora/src/ui/Memory.tsx` — Outcome recording against decisions |

## Business Memory — 56%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000009 Decision timeline | ✅ implemented | `zyvora/src/ui/Memory.tsx` — Four-stream timeline |
| FEAT-000010 Immutable context snapshots | ✅ implemented | `zyvora/src/core/memory.ts` — Append-only; interpretation snapshots captured at decision time |
| FEAT-000011 Outcome and lesson capture | ✅ implemented | `zyvora/src/core/projections.ts` — Outcome + rationale streams |
| FEAT-000012 Structured and semantic search | ⬜ not started | No structured/semantic search over memory |
| FEAT-000013 Source and freshness lineage | 🟡 partial | `zyvora/src/core/engine.ts` — Insights carry source + freshness in evidence |
| FEAT-000014 Memory collections and tags | ⬜ not started | No collections/tags on memory |
| FEAT-000015 Retention and privacy control | 🟡 partial | `zyvora/src/core/memory.ts` — Permanence + export; no retention/privacy controls |
| FEAT-000016 Citation-ready retrieval | 🟡 partial | `zyvora/src/core/assistant.ts` — Assistant cites evidence figures |

## AI Engine — 50%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000017 Model Gateway | ⬜ not started | Rules-based Engine; no model gateway |
| FEAT-000018 Prompt Registry | ⬜ not started | No prompt registry |
| FEAT-000019 Retrieval service | 🟡 partial | `zyvora/src/core/assistant.ts` — Deterministic retrieval over projections |
| FEAT-000020 Recommendation service | ✅ implemented | `zyvora/src/core/engine.ts` — Recommendation = Guidance with reasons |
| FEAT-000021 Forecasting service | ✅ implemented | `zyvora/src/core/projections.ts` — forecast(): revenue/cash/stockout with ranges + assumptions |
| FEAT-000022 Explainability service | ✅ implemented | `zyvora/src/ui/InsightCard.tsx` — Four transparency layers + falsifier |
| FEAT-000023 Evaluation and release gates | 🟡 partial | `zyvora/scripts/verify.ts` — 65-check suite; not model eval gates |
| FEAT-000024 Cost, latency, safety, and drift monitoring | ⬜ not started | No cost/latency/safety/drift monitoring |

## Identity, Workspace, Permissions & Audit — 69%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000025 Authentication adapter | ✅ implemented | `zyvora/src/core/cloud.ts` — Supabase auth adapter |
| FEAT-000026 Workspace lifecycle | 🟡 partial | `zyvora/src/App.tsx` — Create + start-fresh + member access; suspend/transfer pending |
| FEAT-000027 Invitation and membership | ✅ implemented | `zyvora/src/ui/Team.tsx` — Invite by email, membership, pending invites; server table + RLS in supabase/41_zyvora_teams.sql |
| FEAT-000028 Roles and permission grants | ✅ implemented | `zyvora/src/core/permissions.ts` — Roles owner/manager/staff/viewer with permission grants |
| FEAT-000029 Policy evaluation | ✅ implemented | `zyvora/src/core/permissions.ts` — can() policy engine + escalation guard; enforced at data layer via RLS |
| FEAT-000030 MFA and session management | 🟡 partial | `zyvora/src/core/cloud.ts` — Supabase session; no MFA |
| FEAT-000031 API keys and service identities | ⬜ not started | No API keys/service identities |
| FEAT-000032 Audit explorer and evidence export | 🟡 partial | `zyvora/src/core/memory.ts` — Append-only event trail + export; no audit explorer |

## Finance — 38%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000033 Chart of accounts | ⬜ not started | No chart of accounts |
| FEAT-000034 Double-entry journals | ⬜ not started | No double-entry journals |
| FEAT-000035 Accounts receivable and invoicing | 🟡 partial | `zyvora/src/ui/Domains.tsx` — Invoices + mark-paid; not full AR |
| FEAT-000036 Accounts payable and bills | 🟡 partial | `zyvora/src/ui/Domains.tsx` — Expenses; not formal AP/bills |
| FEAT-000037 Payments and reconciliation | 🟡 partial | `zyvora/src/core/projections.ts` — COD cash collection; no bank reconciliation |
| FEAT-000038 Budgets and variance | 🟡 partial | `zyvora/src/ui/FinanceTools.tsx` — Goals + 3 envelopes; not formal budgets/variance |
| FEAT-000039 Cash-flow forecasting | ✅ implemented | `zyvora/src/core/projections.ts` — Cash forecast with assumptions |
| FEAT-000040 Financial statements and close | ⬜ not started | No financial statements/period close |

## Inventory — 56%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000041 Product and SKU catalog | ✅ implemented | `zyvora/src/core/storeConnect.ts` — Product catalog + real Forever catalog import |
| FEAT-000042 Warehouse and location model | ⬜ not started | Single location; no warehouse model |
| FEAT-000043 Stock ledger and availability | ✅ implemented | `zyvora/src/core/projections.ts` — Stock + available = stock - reserved |
| FEAT-000044 Reservations and allocations | ✅ implemented | `zyvora/src/core/projections.ts` — Order reservations |
| FEAT-000045 Purchase orders and receipts | ⬜ not started | No purchase orders/receipts |
| FEAT-000046 Transfers and adjustments | 🟡 partial | `zyvora/src/ui/Domains.tsx` — Manual stock adjustments; no transfers |
| FEAT-000047 Lot/serial/batch traceability | ⬜ not started | No lot/serial/batch |
| FEAT-000048 Reorder and demand planning | ✅ implemented | `zyvora/src/core/engine.ts` — Stockout brain + reorder recommendation |

## CRM — 31%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000049 Contacts and organizations | 🟡 partial | `zyvora/src/core/projections.ts` — Customers derived from orders/invoices; no contact records |
| FEAT-000050 Lead capture and qualification | ⬜ not started | No lead capture |
| FEAT-000051 Opportunity pipelines | ⬜ not started | No opportunity pipelines |
| FEAT-000052 Activities and tasks | ⬜ not started | No activities/tasks |
| FEAT-000053 Segmentation | 🟡 partial | `zyvora/src/core/projections.ts` — Auto-tags (VIP/at-risk/new) |
| FEAT-000054 Customer value and health | ✅ implemented | `zyvora/src/core/projections.ts` — Lifetime value, CLV, COD reliability, health |
| FEAT-000055 Campaign attribution | 🟡 partial | `zyvora/src/core/engine.ts` — Promo profitability; not full campaign attribution |
| FEAT-000056 Consent and communication history | ⬜ not started | No consent/communication history |

## Analytics — 31%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000057 Metric registry | ⬜ not started | Metrics computed inline; no governed registry |
| FEAT-000058 Semantic definitions | 🟡 partial | `zyvora/src/core/engine.ts` — Single calculation owners; not a semantic layer |
| FEAT-000059 Dashboard composition | 🟡 partial | `zyvora/src/ui/Analytics.tsx` — Fixed dashboards; no composition |
| FEAT-000060 Filters and saved views | ⬜ not started | No filters/saved views |
| FEAT-000061 Drill-down and lineage | ⬜ not started | No drill-down/lineage |
| FEAT-000062 Scheduled reports | ⬜ not started | No scheduled reports |
| FEAT-000063 Exports | ✅ implemented | `zyvora/src/ui/Analytics.tsx` — CSV exports |
| FEAT-000064 Annotations and forecast overlays | 🟡 partial | `zyvora/src/ui/Analytics.tsx` — Forecast section; no annotations |

## Documents — 6%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000065 Document metadata and storage | ⬜ not started |  |
| FEAT-000066 Templates | ⬜ not started |  |
| FEAT-000067 Generation | 🟡 partial | `zyvora/src/ui/Orders.tsx` — Printable receipts (generation only) |
| FEAT-000068 Versioning | ⬜ not started |  |
| FEAT-000069 Review and approval | ⬜ not started |  |
| FEAT-000070 Electronic signature adapters | ⬜ not started |  |
| FEAT-000071 OCR/import | ⬜ not started |  |
| FEAT-000072 Retention and legal hold | ⬜ not started |  |

## Notifications — 6%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000073 Unified notification events | 🟡 partial | `zyvora/src/core/engine.ts` — Insights are decision events; no delivery channels |
| FEAT-000074 Templates and versions | ⬜ not started |  |
| FEAT-000075 Category and priority | ⬜ not started |  |
| FEAT-000076 User preferences and quiet hours | ⬜ not started |  |
| FEAT-000077 Channel routing | ⬜ not started |  |
| FEAT-000078 Delivery retries | ⬜ not started |  |
| FEAT-000079 Digest and grouping | ⬜ not started |  |
| FEAT-000080 Escalation and audit | ⬜ not started |  |

## Human Resources — 0%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000081 Employee records | ⬜ not started |  |
| FEAT-000082 Organization and positions | ⬜ not started |  |
| FEAT-000083 Recruitment | ⬜ not started |  |
| FEAT-000084 Onboarding/offboarding | ⬜ not started |  |
| FEAT-000085 Leave and attendance | ⬜ not started |  |
| FEAT-000086 Performance and goals | ⬜ not started |  |
| FEAT-000087 Compensation records | ⬜ not started |  |
| FEAT-000088 Workforce planning and compliance | ⬜ not started |  |

## Manufacturing — 0%

| Feature | Status | Evidence / note |
|---|---|---|
| FEAT-000089 Bills of materials | ⬜ not started |  |
| FEAT-000090 Routings and work centers | ⬜ not started |  |
| FEAT-000091 Production orders | ⬜ not started |  |
| FEAT-000092 Material requirements | ⬜ not started |  |
| FEAT-000093 Scheduling and capacity | ⬜ not started |  |
| FEAT-000094 Issue/consume/produce | ⬜ not started |  |
| FEAT-000095 Quality control | ⬜ not started |  |
| FEAT-000096 Yield, scrap, downtime, and cost | ⬜ not started |  |

