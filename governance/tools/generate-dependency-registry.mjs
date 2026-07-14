import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, root } from './lib.mjs';

const graph = loadGraph();
const { byId } = indexes(graph);
const types = new Set(['depends_on', 'uses', 'consumes', 'produces', 'persists', 'exposes', 'implemented_by', 'verified_by']);
const dependencies = graph.edges.filter((edge) => types.has(edge.type)).map((edge) => ({
  id: edge.id,
  relationship: edge.type,
  source_id: edge.from,
  source_type: byId.get(edge.from)?.type,
  source_name: byId.get(edge.from)?.name,
  target_id: edge.to,
  target_type: byId.get(edge.to)?.type,
  target_name: byId.get(edge.to)?.name,
  semantic_class: edge.attributes?.semantic_class,
  criticality: edge.attributes?.criticality,
  owner: edge.governance.owner,
  status: edge.status,
}));
const payload = { version: '1.1.0', generated_at: new Date().toISOString(), dependencies };
fs.writeFileSync(path.join(root, 'relationships', 'dependency-registry.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(`Dependency registry: ${dependencies.length} records`);
