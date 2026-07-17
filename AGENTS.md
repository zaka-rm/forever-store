# Repository guide for AI coding agents

This repo contains **ZYVORA**, a Decision Operating System, being built wave by wave from a written architecture library.

## Before writing any ZYVORA code — mandatory

1. Read **`docs/zyvora/HANDOFF-GUIDE.md`** in full. It tells you what exists, the non-negotiable patterns, and how to build the next slice.
2. Treat **`docs/zyvora/CODEX-00-FOUNDATION.md`** and **`docs/zyvora/ZPL-030-IMPLEMENTATION-CONSTITUTION.md`** as binding. If your task conflicts with them, stop and surface the conflict — do not invent architecture, terminology, or business rules (ZPL-030 Article 8).
3. Check **`docs/zyvora/LIBRARY-INDEX.md`** for current status, and update it every session.

## The app

- Lives in `zyvora/`. Stack: Vite + React + TypeScript, Supabase for accounts/persistence (optional — falls back to local mode).
- Build: `cd zyvora; npm run build` (must pass clean).
- Test: `cd zyvora; .\node_modules\.bin\esbuild.cmd scripts/verify.ts --bundle --platform=node --format=cjs --outfile=scripts/verify.cjs; node scripts/verify.cjs` — must print `ALL CHECKS PASSED`. Extend it as you add logic.
- Dev server: use the preview tooling on port 5199; verify live before calling anything done.

## Core rules you will break if you're not careful

- **Business Memory is append-only** — never add an update or delete path (ADR-0002; enforced in `supabase/40_zyvora.sql` by having no such RLS policies).
- **State is always derived** from the event log via `projectState` — never store or mutate state directly.
- **One calculation owner per metric** — reuse `projections.ts` / `engine.ts` functions; never duplicate a formula.
- **Every Insight needs** claim + reasoning + evidence + confidence + (for Guidance) 2–4 options incl. a null option, each with a falsifier.
- **Money is currency-neutral** — every amount goes through `formatMoney`/`money`; never hardcode a symbol.

The parent website (also in `src/`) is a separate e-commerce admin; don't confuse it with `zyvora/`.
