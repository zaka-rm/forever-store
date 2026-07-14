/**
 * Implementation coverage report — joins governance/coverage/implementation-coverage.json
 * (the assessed status of each canonical feature in the zyvora/ app) with the
 * Canonical Product Model's feature + capability registries, and renders a
 * per-capability rollup. Features absent from the assessment default to not_started.
 *
 * Run:  node tools/coverage-report.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, root } from "./lib.mjs";

const feats = readJson(path.join(root, "registries", "features.json")).records;
const caps = readJson(path.join(root, "registries", "capabilities.json")).records;
const cov = readJson(path.join(root, "coverage", "implementation-coverage.json"));

const MOD_TO_CAP = {
  DC: "Decision Center", BM: "Business Memory", AI: "AI Engine",
  IAM: "Identity, Workspace, Permissions & Audit", FIN: "Finance", INV: "Inventory",
  CRM: "CRM", ANA: "Analytics", DOC: "Documents", NOT: "Notifications",
  HR: "Human Resources", MFG: "Manufacturing",
};
const WEIGHT = { implemented: 1, partial: 0.5, not_started: 0 };

const groups = {};
for (const f of feats) {
  const mod = ((f.aliases && f.aliases[0]) || "??").split("-")[0];
  const a = cov.features[f.id] || { status: "not_started" };
  (groups[mod] = groups[mod] || []).push({ id: f.id, name: f.name, ...a });
}

let md = `# ZYVORA — Implementation Coverage (App vs. Canonical Product Model)\n\n`;
md += `Assessed ${cov.assessed_at}. App under review: \`zyvora/\` MVP. Model: Canonical Product Model v3.0 (96 features, 12 capabilities).\n\n`;
md += `**How to read this:** each capability has 8 specified features. "Implemented" = works and is verified; "Partial" = core exists, not to full spec depth; "Not started" = absent. Weighted coverage counts partial as 0.5.\n\n`;

let totalW = 0, totalN = 0;
const rows = [];
for (const mod of Object.keys(MOD_TO_CAP)) {
  const list = groups[mod] || [];
  const w = list.reduce((s, x) => s + (WEIGHT[x.status] ?? 0), 0);
  totalW += w; totalN += list.length;
  rows.push({ mod, cap: MOD_TO_CAP[mod], w, n: list.length, pct: Math.round((w / list.length) * 100) });
}

md += `## Portfolio summary\n\n| Capability | Coverage | Implemented / Partial / Not started |\n|---|---|---|\n`;
for (const r of rows) {
  const list = groups[r.mod];
  const imp = list.filter((x) => x.status === "implemented").length;
  const par = list.filter((x) => x.status === "partial").length;
  const no = list.filter((x) => x.status === "not_started").length;
  md += `| ${r.cap} | **${r.pct}%** (${r.w}/${r.n}) | ${imp} / ${par} / ${no} |\n`;
}
md += `| **PLATFORM TOTAL** | **${Math.round((totalW / totalN) * 100)}%** (${totalW}/${totalN}) | — |\n\n`;

for (const mod of Object.keys(MOD_TO_CAP)) {
  const list = groups[mod] || [];
  const r = rows.find((x) => x.mod === mod);
  md += `## ${MOD_TO_CAP[mod]} — ${r.pct}%\n\n| Feature | Status | Evidence / note |\n|---|---|---|\n`;
  for (const x of list) {
    const badge = x.status === "implemented" ? "✅ implemented" : x.status === "partial" ? "🟡 partial" : "⬜ not started";
    md += `| ${x.id} ${x.name} | ${badge} | ${x.evidence ? "`" + x.evidence + "` — " : ""}${x.note || ""} |\n`;
  }
  md += `\n`;
}

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "implementation-coverage.md"), md);
console.log(`Platform coverage: ${Math.round((totalW / totalN) * 100)}% (${totalW}/${totalN} weighted features)`);
for (const r of rows) console.log(`  ${String(r.pct).padStart(3)}%  ${r.cap}`);
