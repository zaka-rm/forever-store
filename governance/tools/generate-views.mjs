import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, label, root } from './lib.mjs';

const graph = loadGraph();
const { byId, outgoing } = indexes(graph);
const views = path.join(root, 'views');
fs.mkdirSync(views, { recursive: true });

const counts = new Map();
for (const node of graph.nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
let summary = '# ZYVORA Knowledge Graph Summary\n\n';
summary += `Nodes: ${graph.nodes.length}  \nEdges: ${graph.edges.length}\n\n`;
summary += '| Type | Count |\n|---|---:|\n';
for (const [type, count] of [...counts.entries()].sort()) summary += `| ${type} | ${count} |\n`;
fs.writeFileSync(path.join(views, 'graph-summary.md'), summary);

let capabilities = '# Capability Registry View\n\n| ID | Capability | Status | Owner | Module | Decisions |\n|---|---|---|---|---|---|\n';
for (const node of graph.nodes.filter((n) => n.type === 'capability').sort((a, b) => a.id.localeCompare(b.id))) {
  const edges = outgoing.get(node.id) ?? [];
  const module = edges.find((e) => e.type === 'belongs_to');
  const decisions = edges.filter((e) => e.type === 'supports').map((e) => byId.get(e.to)?.name).filter(Boolean).join('; ');
  capabilities += `| ${node.id} | ${node.name} | ${node.status} | ${byId.get(node.owner)?.name ?? node.owner} | ${byId.get(module?.to)?.name ?? ''} | ${decisions} |\n`;
}
fs.writeFileSync(path.join(views, 'capability-registry.md'), capabilities);

let trace = '# Artifact Traceability View\n\n| Artifact | Type | Status | Relationships |\n|---|---|---|---|\n';
for (const node of graph.nodes.filter((n) => ['artifact', 'build_pack', 'qa_pack'].includes(n.type)).sort((a, b) => a.id.localeCompare(b.id))) {
  const links = (outgoing.get(node.id) ?? []).map((e) => `${e.type}: ${label(byId.get(e.to))}`).join('<br>');
  trace += `| ${node.id} ${node.name} | ${node.type} | ${node.status} | ${links} |\n`;
}
fs.writeFileSync(path.join(views, 'artifact-traceability.md'), trace);

console.log(`Generated views in ${views}`);
