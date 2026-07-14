import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, readJson, root } from './lib.mjs';

const id = process.argv[2];
const target = process.argv[3];
const apply = process.argv.includes('--apply');
const reasonArg = process.argv.find((x) => x.startsWith('--reason='));
const approverArg = process.argv.find((x) => x.startsWith('--approver='));
if (!id || !target) {
  console.error('Usage: node knowledge/tools/transition.mjs <ID> <TARGET-STATE> --reason="..." --approver=TEAM-000001 [--apply]');
  process.exit(2);
}
const graph = loadGraph();
const node = graph.nodes.find((item) => item.id === id);
if (!node) throw new Error(`Unknown ID ${id}`);
const allowed = graph.ontology.allowed_transitions[node.status] ?? [];
if (!allowed.includes(target)) throw new Error(`Transition ${node.status} -> ${target} is not allowed`);
const reason = reasonArg?.slice('--reason='.length);
const approver = approverArg?.slice('--approver='.length);
if (!reason || !approver) throw new Error('Reason and approver are required');
console.log(`${apply ? 'APPLY' : 'DRY-RUN'} ${id}: ${node.status} -> ${target}`);
if (!apply) process.exit(0);

const registryFiles = fs.readdirSync(path.join(root, 'registries')).filter((name) => name.endsWith('.json'));
let changed = false;
for (const name of registryFiles) {
  const file = path.join(root, 'registries', name);
  const registry = readJson(file);
  const record = registry.records.find((item) => item.id === id);
  if (!record) continue;
  const from = record.status;
  record.status = target;
  record.governance.last_reviewed = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(file, JSON.stringify(registry, null, 2) + '\n');
  const logFile = path.join(root, 'governance', 'change-log.json');
  const log = readJson(logFile);
  log.changes.push({ id: `CHANGE-${String(log.changes.length + 1).padStart(6, '0')}`, object: id, kind: 'lifecycle_transition', from, to: target, reason, approver, at: new Date().toISOString() });
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2) + '\n');
  changed = true;
  break;
}
if (!changed) throw new Error(`Registry record not found for ${id}`);
