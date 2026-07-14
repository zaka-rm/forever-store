import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, root } from './lib.mjs';

const graph = loadGraph();
const ledger = { version: '1.1.0', generated_at: new Date().toISOString(), prefixes: {}, tombstones: [] };
for (const node of graph.nodes) {
  const match = node.id.match(/^([A-Z][A-Z0-9-]*)-([0-9]{6})$/);
  if (!match) continue;
  const [, prefix, number] = match;
  const n = Number(number);
  ledger.prefixes[prefix] = Math.max(ledger.prefixes[prefix] ?? 0, n);
  if (node.status === 'Archived') ledger.tombstones.push(node.id);
}
fs.mkdirSync(path.join(root, 'governance'), { recursive: true });
fs.writeFileSync(path.join(root, 'governance', 'id-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
console.log(`Ledger rebuilt for ${Object.keys(ledger.prefixes).length} prefixes; ${ledger.tombstones.length} tombstones`);
