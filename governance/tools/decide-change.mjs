import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib.mjs';

const id = process.argv[2];
const decision = process.argv[3];
const value = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const approver = value('approver');
const reason = value('reason');
const apply = process.argv.includes('--apply');
if (!id || !['approve', 'reject'].includes(decision) || !approver || !reason) {
  console.error('Usage: node knowledge/tools/decide-change.mjs <CR-ID> approve|reject --approver=TEAM-000001 --reason="..." [--apply]');
  process.exit(2);
}
const file = path.join(root, 'registries', 'change_requests.json');
const registry = readJson(file);
const record = registry.records.find((item) => item.id === id);
if (!record) throw new Error(`Unknown change request ${id}`);
if (record.status !== 'Planned') throw new Error(`${id} is ${record.status}; only Planned requests may be decided`);
console.log(`${apply ? 'APPLY' : 'DRY-RUN'} ${id}: ${decision} by ${approver}`);
if (!apply) process.exit(0);
record.attributes.decision_history ??= [];
record.attributes.decision_history.push({ decision, approver, reason, at: new Date().toISOString() });
if (decision === 'approve') { record.status = 'In Design'; record.attributes.approved_by.push(approver); }
else record.status = 'Archived';
record.governance.last_reviewed = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, JSON.stringify(registry, null, 2) + '\n');
console.log(`${id} is now ${record.status}`);
