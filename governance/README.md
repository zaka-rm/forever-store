# ZYVORA Canonical Product Model

This directory is the machine-readable source of truth for the governed ZYVORA product model. The physical name `knowledge/` remains temporarily for v1.1 compatibility; its authoritative product name is **Canonical Product Model**. Word documents and other human-readable artifacts are controlled views.

## Authority model

The canonical model is Git-governed JSON. Every change is reviewed, versioned, validated, and traceable. PostgreSQL or a graph database may ingest this model as a query projection, but the projection does not silently become a second authority.

## Structure

- `ontology/ontology.json` - allowed node types, edge types, lifecycle states, and transition gates.
- `schema/` - JSON Schemas for nodes, edges, registries, and complete graph snapshots.
- `registries/` - permanent nodes grouped by knowledge type.
- `relationships/edges.json` - typed relationships between permanent IDs.
- `views/` - generated Markdown views; never edit these as canonical facts.
- `tools/` - dependency-free Node.js validators, impact analysis, trace, release-readiness, and view generation.
- `../governance-center/` - read-only operational interface generated from the graph snapshot.

## Core commands

Use the bundled Node.js runtime or Node.js 20+:

```text
node knowledge/tools/validate.mjs
node knowledge/tools/impact.mjs BR-000001 --depth=6
node knowledge/tools/impact-report.mjs BR-000001 --depth=4
node knowledge/tools/trace.mjs FEAT-000001
node knowledge/tools/traceability-report.mjs --all
node knowledge/tools/generate-draft-packs.mjs --all
node knowledge/tools/sync-implementation.mjs
node knowledge/tools/create-work-order.mjs CAP-000004 --agent=codex --owner=TEAM-000002 --allowed-paths=apps/web
node knowledge/tools/release-readiness.mjs CAP-000001
node knowledge/tools/generate-views.mjs
node knowledge/tools/propose-change.mjs BR-000001 --title="Change title" --reason="Business reason" --requested-by=TEAM-000001
node knowledge/tools/decide-change.mjs CR-000002 approve --approver=TEAM-000001 --reason="Approval rationale"
```

## Editing rules

1. Never reuse or change a permanent ID.
2. Rename by changing `name`; preserve the ID and prior alias.
3. Add relationships explicitly; do not infer ownership or dependency from filenames.
4. A lifecycle transition must satisfy the gate in `ontology.json`.
5. Breaking changes require version, impact analysis, migration, deprecation, rollback, and approval.
6. Generated views and Word documents are regenerated from canonical records after approval.

## Team use

The team uses the graph to plan releases, discover dependencies, generate implementation packs, verify traceability, and calculate change impact. Implementation still proceeds through an approved Build Pack paired with a QA Pack.
