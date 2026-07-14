import fs from 'node:fs';
import path from 'node:path';
import { readJson, root } from './lib.mjs';

const nodeType = process.argv[2];
const apply = process.argv.includes('--apply');
if (!nodeType) {
  console.error('Usage: node knowledge/tools/allocate-id.mjs <node-type> [--apply]');
  process.exit(2);
}
const ontology = readJson(path.join(root, 'ontology', 'ontology.json'));
const prefix = ontology.id_prefixes[nodeType];
if (!prefix) {
  console.error(`Unknown node type: ${nodeType}`);
  process.exit(2);
}
const file = path.join(root, 'governance', 'id-ledger.json');
const ledger = readJson(file);
const next = (ledger.prefixes[prefix] ?? 0) + 1;
const id = `${prefix}-${String(next).padStart(6, '0')}`;
if (ledger.tombstones.includes(id)) throw new Error(`Allocator attempted to reuse tombstone ${id}`);
console.log(`${apply ? 'ALLOCATED' : 'DRY-RUN'} ${id}`);
if (apply) {
  ledger.prefixes[prefix] = next;
  ledger.generated_at = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(ledger, null, 2) + '\n');
}
