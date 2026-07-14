import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, root } from './lib.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node knowledge/tools/ingest-openapi.mjs <openapi.json>');
const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
const graph = loadGraph();
const registered = new Set(graph.nodes.filter((node) => node.type === 'api').flatMap((node) => [node.name, ...(node.aliases ?? [])]));
const observed = [];
for (const [route, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    observed.push({ route, method: method.toUpperCase(), operation_id: operation.operationId ?? null, registered: registered.has(operation.operationId) });
  }
}
const report = { version: '1.1.0', generated_at: new Date().toISOString(), source: path.resolve(file), observed, unregistered: observed.filter((x) => !x.registered) };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'openapi-observation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`OpenAPI operations: ${observed.length}; unregistered: ${report.unregistered.length}`);
