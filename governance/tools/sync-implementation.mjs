import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadGraph, readJson, root } from './lib.mjs';

const workspace = path.resolve(root, '..');
const manifest = readJson(path.join(root, 'evidence', 'sources.json'));
const graph = loadGraph();
const canonicalIds = new Set(graph.nodes.map((n) => n.id));
const idPattern = /\b(?:CAP|FEAT|BR|WF|ENT|API|EVT|PERM|AUTO|NOT|MET|DASH|RPT|AICAP|PROMPT|SCR|CMP|UJ|UF|BUILD|QA|TEST|REL|CR|IMPACT|TRACE)-\d{6}\b/g;

function filesUnder(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target); if (stat.isFile()) return [target];
  const found = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', '.git', '.npm-cache'].includes(entry.name)) continue;
    if (['product-model.json', 'pack-generation-summary.json', 'implementation-synchronization.json'].includes(entry.name)) continue;
    found.push(...filesUnder(path.join(target, entry.name)));
  }
  return found.sort();
}
function observe(source) {
  if (!source.path) return { ...source, status: 'NOT_CONNECTED', files: 0, bytes: 0, sha256: null, trace_ids: [], unknown_trace_ids: [], finding: 'No evidence source configured; no implementation claim is permitted.' };
  const absolute = path.resolve(workspace, source.path); const files = filesUnder(absolute);
  if (!files.length) return { ...source, status: source.required ? 'MISSING_REQUIRED_SOURCE' : 'NOT_CONNECTED', files: 0, bytes: 0, sha256: null, trace_ids: [], unknown_trace_ids: [], finding: 'Configured source is missing or empty.' };
  const hash = crypto.createHash('sha256'); let bytes = 0; const traceIds = new Set();
  for (const file of files) { const data = fs.readFileSync(file); bytes += data.length; hash.update(path.relative(workspace, file).replaceAll('\\', '/')); hash.update(data); if (/\.(?:ts|tsx|js|mjs|json|md|prisma|ya?ml)$/i.test(file)) for (const id of data.toString('utf8').match(idPattern) ?? []) traceIds.add(id); }
  const unknown = [...traceIds].filter((id) => !canonicalIds.has(id));
  return { ...source, status: unknown.length ? 'TRACE_ID_MISMATCH' : 'OBSERVED', files: files.length, bytes, sha256: hash.digest('hex'), trace_ids: [...traceIds].sort(), unknown_trace_ids: unknown, finding: unknown.length ? 'Source contains trace IDs absent from the Canonical Product Model.' : 'Evidence observed; authority remains as declared and does not overwrite canonical meaning.' };
}
const observations = manifest.sources.map(observe);
const connected = observations.filter((x) => x.status === 'OBSERVED').length;
const blocked = observations.filter((x) => ['MISSING_REQUIRED_SOURCE', 'TRACE_ID_MISMATCH'].includes(x.status)).length;
const notConnected = observations.filter((x) => x.status === 'NOT_CONNECTED').length;
const report = { version: '2.4.0', generated_at: new Date().toISOString(), policy: 'Implementation evidence is observational until validated and approved. It never silently changes canonical product meaning.', summary: { sources: observations.length, connected, blocked, not_connected: notConnected, production_evidence_verified: false }, release_gate: blocked || notConnected ? 'BLOCKED_INCOMPLETE_IMPLEMENTATION_EVIDENCE' : 'AWAITING_EVIDENCE_APPROVAL', observations };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'implementation-synchronization.json'), JSON.stringify(report, null, 2) + '\n');
let md = `# Implementation Synchronization\n\nGate: **${report.release_gate}**  \nConnected: ${connected}/${observations.length}  \nNot connected: ${notConnected}  \nProduction evidence verified: No\n\n`;
for (const item of observations) md += `## ${item.id} — ${item.kind}\n\n- Status: ${item.status}\n- Authority: ${item.authority}\n- Files: ${item.files}\n- Trace IDs: ${item.trace_ids.length}\n- Finding: ${item.finding}\n\n`;
fs.writeFileSync(path.join(root, 'reports', 'implementation-synchronization.md'), md);
console.log(`Implementation synchronization: ${connected}/${observations.length} connected, ${blocked} blocked, ${notConnected} not connected; ${report.release_gate}`);
