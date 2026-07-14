import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, root } from './lib.mjs';

const workspace = path.resolve(root, '..');
const graph = loadGraph();
const artifacts = graph.nodes.filter((node) => ['artifact', 'build_pack', 'qa_pack'].includes(node.type));
const drift = [];
for (const artifact of artifacts) {
  const relative = artifact.attributes?.path;
  if (!relative) continue;
  const file = path.join(workspace, relative);
  if (!fs.existsSync(file)) {
    drift.push({ id: artifact.id, kind: 'missing_artifact', path: relative });
    continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const expected = artifact.attributes?.sha256;
  if (expected && actual !== expected) drift.push({ id: artifact.id, kind: 'checksum_mismatch', path: relative, expected, actual });
}
const report = { version: '1.1.0', generated_at: new Date().toISOString(), checked: artifacts.length, drift };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'artifact-drift.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Artifacts checked: ${artifacts.length}`);
console.log(`Drift findings: ${drift.length}`);
for (const item of drift) console.error(`DRIFT ${item.id} ${item.kind} ${item.path}`);
if (drift.length) process.exit(1);
