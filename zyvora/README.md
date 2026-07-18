# ZYVORA — Decision Operating System

**Current vertical slice v0.36** — an implementation increment of the ZYVORA Architecture Library
(`docs/zyvora/`), built under ZPL-030 (Implementation Constitution).

ZYVORA is not an ERP, CRM, or analytics tool. It is a Decision Operating System: it turns a
business's fragmented facts into ranked, explained, decision-ready counsel — and remembers every
fact, interpretation, decision, and outcome in the Builder's own Business Memory.

## Run

```bash
npm install
npm run dev        # http://localhost:5199
npm run build      # typecheck + production build
```

First run: name your Workspace, then either enter your own invoices/expenses/products or click
**Load demo business** for six months of realistic data that exercises every Business Brain.

## What this slice implements (traceability — ZPL-030 Article 6)

| Code | Implements | Source of authority |
|---|---|---|
| `src/core/memory.ts` | Append-only, exportable Business Memory (no update, no delete) | CODEX 00 B.6/D.8, Article V, ADR-0002 |
| `src/core/projections.ts` | Read-only derived state; customers derived from invoices | CODEX 00 D.9, ADR-0003 (One Source of Truth) |
| `src/core/engine.ts` | Decision Engine v1: Finance/Customers/Inventory Business Brains; ranked Insights; Guidance with claim → reasoning → evidence → confidence + falsifier; honest "not enough data" outputs; own-baseline-before-benchmarks; decision suppression ("no" is an answer) | CODEX 00 D.3/D.5/D.11/C.13; CODEX 10 P4.3/P4.6/§5.5/§5.6; ADR-1004 |
| `src/core/seed.ts` | Demo Workspace | — |
| `src/ui/Today.tsx` | Decision surface: the D.7 hierarchy (judgment → changes → state → records); max 3 surfaced Guidance items | CODEX 00 D.7, Law X |
| `src/ui/InsightCard.tsx` | Options Table (2–4 options, null option, recommendation with reasons); human decision recording with rationale | CODEX 10 §5.8, ADR-1004; CODEX 00 D.11 stage 8, Law XII |
| `src/ui/Memory.tsx` | Four-stream timeline; outcome recording separated from decision quality | CODEX 00 D.8; CODEX 10 §5.1 |
| `src/ui/Domains.tsx` | Information Layer record views (available, never ambient) | CODEX 00 D.2, D.7 level 4, E.4 |
| `src/styles.css` | Calm software: silence default, no urgency theater, red reserved for harm | CODEX 00 E.1; Non-Negotiable 2 |

## Cloud mode (Wave 0)

With `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in `.env`, ZYVORA runs in **account
mode**: Supabase Auth sign-in, Workspaces and Business Memory stored server-side in
`zyvora_workspaces` / `zyvora_events` (apply `../supabase/40_zyvora.sql` once). The event
table has **no update/delete policies** — append-only is enforced by the database (ADR-0002).
Appends go through a persisted offline outbox with idempotent upserts, so a dropped
connection never loses Memory. Without env vars (or via "Continue in local device mode"),
the app runs fully local as before.

## Current operations layer

- WhatsApp Operations Inbox: signed inbound webhook, STOP/START consent, delivery/read/failure receipts, team assignment, and Mine/Unassigned/All queues.
- Courier Control Tower: shipment progress, failed-delivery intervention, and COD remittance control.
- Guardrailed Workflows: human-approved follow-up preparation; no silent sends or financial/order changes.
- Production build and 166-check deterministic suite are green as of v0.36.

## Deliberate boundaries (sequencing per ZPL-020 waves)

- **Multi-user teams and roles are implemented**; accepted Meta WhatsApp templates and Flows remain external-approval work.
- **The Engine is rules-based (maturity M3)** — explainable by construction; model-backed brains
  arrive with CODEX 41 and remain swappable dependencies (CODEX 00 F.8).
- **Automation ladder** supports human-approved prepared follow-ups (rung 2). Background standing rules remain deferred until server-side scheduling, retry monitoring, and dead-letter recovery exist. There is no rung 4, ever (Article IV, ADR-0005).
- Loop closure (ADR-1002) is wired: outcomes are recorded against decisions in Memory. The
  Engine's *use* of outcome history for per-business calibration (M4) is the next increment.

## Constitutional invariants enforced in code

1. Business Memory is append-only and exportable at any time (Article V).
2. No layer skips its neighbor: facts → projections → Engine → Guidance → human (D.1).
3. Every intelligent output carries evidence, confidence, and a falsifier (Law IX).
4. Stage 8 of the Decision Lifecycle is always the human (Law XII).
5. A recorded decision is respected — no re-nagging within its window (P4.3).
