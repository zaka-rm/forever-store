import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib.mjs';

const capability = process.argv[2];
const value = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const agent = value('agent') ?? 'codex'; const owner = value('owner'); const allowedPaths = (value('allowed-paths') ?? '').split(',').filter(Boolean); const apply = process.argv.includes('--apply');
if (!capability) { console.error('Usage: node knowledge/tools/create-work-order.mjs <CAP-ID> --agent=codex --owner=TEAM-000002 --allowed-paths=apps/web,... [--apply]'); process.exit(2); }
const dir = path.join(root, 'generated-packs', capability); const buildFile = path.join(dir, 'BUILD-DRAFT.json'); const qaFile = path.join(dir, 'QA-DRAFT.json');
if (!fs.existsSync(buildFile) || !fs.existsSync(qaFile)) throw new Error(`No paired generated packs for ${capability}`);
const build = readJson(buildFile); const qa = readJson(qaFile); const traceFile = path.join(root, 'reports', `traceability-${capability}.json`); const trace = fs.existsSync(traceFile) ? readJson(traceFile) : null; const sync = readJson(path.join(root, 'reports', 'implementation-synchronization.json')); const exceptions = readJson(path.join(root, 'registries', 'exceptions.json')).records;
const gates = [
  { gate: 'implementation_authorized_build_pack', pass: build.authority === 'IMPLEMENTATION_AUTHORIZED', evidence: build.authority },
  { gate: 'paired_qa_pack', pass: qa.source_fingerprint === build.source_fingerprint, evidence: qa.source_fingerprint },
  { gate: 'zero_source_blockers', pass: build.blockers.length === 0, evidence: `${build.blockers.length} blockers` },
  { gate: 'approved_impact_assessment', pass: false, evidence: 'No approved capability-specific impact assessment attached to generated draft' },
  { gate: 'current_traceability', pass: trace?.gate === 'PASS_CURRENT_MATURITY' && trace?.freshness === 'CURRENT', evidence: trace ? `${trace.gate}/${trace.freshness}` : 'missing' },
  { gate: 'repository_scope', pass: allowedPaths.length > 0 && sync.summary.connected > 0, evidence: allowedPaths.length ? allowedPaths.join(', ') : 'No allowed paths supplied' },
  { gate: 'engineering_owner', pass: Boolean(owner), evidence: owner ?? 'missing' },
  { gate: 'rollback_plan', pass: false, evidence: 'No approved rollback plan attached' },
  { gate: 'no_open_critical_or_high_exception', pass: !exceptions.some((x) => ['Critical','High'].includes(x.attributes?.severity) && x.status !== 'Archived'), evidence: `${exceptions.length} registered exceptions` },
];
const missing = gates.filter((g) => !g.pass); const assessment = { version: '3.0.0', generated_at: new Date().toISOString(), capability, agent, source_fingerprint: build.source_fingerprint, state: missing.length ? 'Blocked' : 'Ready for Agent', authorized_to_start: missing.length === 0, gates, missing_gates: missing.map((x) => x.gate), policy: 'Creating a work order does not start an agent. Starting requires a separately approved, immutable work order.' };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true }); fs.writeFileSync(path.join(root, 'reports', `orchestration-${capability}.json`), JSON.stringify(assessment, null, 2) + '\n');
console.log(`${capability}: ${assessment.state}; ${missing.length} missing gates; agent start ${assessment.authorized_to_start ? 'permitted' : 'prohibited'}`);
if (!apply || missing.length) { if (apply && missing.length) process.exitCode = 1; process.exit(); }
const file = path.join(root, 'orchestration', 'work-orders.json'); const store = readJson(file); const id = `WORK-${String(store.work_orders.length + 1).padStart(6, '0')}`;
store.work_orders.push({ id, created_at: new Date().toISOString(), state: 'Ready for Agent', capability, agent, owner, allowed_paths: allowedPaths, source_fingerprint: build.source_fingerprint, build_pack: buildFile.replace(root, 'knowledge'), qa_pack: qaFile.replace(root, 'knowledge'), gates, approvals: [], evidence: [] });
fs.writeFileSync(file, JSON.stringify(store, null, 2) + '\n'); console.log(`Created ${id}; agent has not been started.`);
