import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadGraph() {
  const registries = path.join(root, 'registries');
  const nodes = [];
  for (const file of fs.readdirSync(registries).filter((x) => x.endsWith('.json')).sort()) {
    const registry = readJson(path.join(registries, file));
    for (const record of registry.records ?? []) nodes.push(record);
  }
  const edgeFile = path.join(root, 'relationships', 'edges.json');
  const edges = readJson(edgeFile).edges;
  const ontology = readJson(path.join(root, 'ontology', 'ontology.json'));
  return { nodes, edges, ontology };
}

export function indexes(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of graph.edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }
  return { byId, outgoing, incoming };
}

export function label(node) {
  return node ? `${node.id} [${node.type}] ${node.name} (${node.status})` : '<missing>';
}
