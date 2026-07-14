import { loadGraph, indexes } from './lib.mjs';

const graph = loadGraph();
const { byId } = indexes(graph);
const errors = [];
const warnings = [];
const ids = new Set();
const aliases = new Map();
const statuses = new Set(graph.ontology.lifecycle_states);
const nodeTypes = new Set(graph.ontology.node_types);
const edgeTypes = new Set(graph.ontology.edge_types);
const idPattern = /^[A-Z][A-Z0-9-]*-[0-9]{6}$/;

for (const node of graph.nodes) {
  if (!idPattern.test(node.id)) errors.push(`${node.id}: invalid permanent ID`);
  if (ids.has(node.id)) errors.push(`${node.id}: duplicate node ID`);
  ids.add(node.id);
  if (!nodeTypes.has(node.type)) errors.push(`${node.id}: unknown node type ${node.type}`);
  if (!statuses.has(node.status)) errors.push(`${node.id}: unknown state ${node.status}`);
  if (!node.name || !node.owner || !node.version || !node.governance) errors.push(`${node.id}: missing mandatory metadata`);
  if (node.owner && !node.owner.startsWith('TEAM-')) errors.push(`${node.id}: owner must be a TEAM ID`);
  for (const alias of node.aliases ?? []) {
    if (aliases.has(alias)) warnings.push(`${node.id}: alias ${alias} also used by ${aliases.get(alias)}`);
    aliases.set(alias, node.id);
  }
}

const edgeIds = new Set();
for (const edge of graph.edges) {
  if (edgeIds.has(edge.id)) errors.push(`${edge.id}: duplicate edge ID`);
  edgeIds.add(edge.id);
  if (!edgeTypes.has(edge.type)) errors.push(`${edge.id}: unknown edge type ${edge.type}`);
  if (!byId.has(edge.from)) errors.push(`${edge.id}: missing from node ${edge.from}`);
  if (!byId.has(edge.to)) errors.push(`${edge.id}: missing to node ${edge.to}`);
  if (edge.from === edge.to) warnings.push(`${edge.id}: self edge`);
}

for (const node of graph.nodes.filter((n) => !['team', 'constitution', 'constitutional_clause'].includes(n.type))) {
  if (!byId.has(node.owner)) errors.push(`${node.id}: missing owner team ${node.owner}`);
}

const capabilityIds = graph.nodes.filter((n) => n.type === 'capability').map((n) => n.id);
for (const id of capabilityIds) {
  const hasDecision = graph.edges.some((e) => e.from === id && e.type === 'supports' && byId.get(e.to)?.type === 'decision');
  const hasModule = graph.edges.some((e) => e.from === id && e.type === 'belongs_to' && byId.get(e.to)?.type === 'module');
  const hasArtifact = graph.edges.some((e) => e.from === id && ['documented_by', 'specified_by'].includes(e.type));
  if (!hasDecision) errors.push(`${id}: capability does not support a decision`);
  if (!hasModule) errors.push(`${id}: capability does not belong to a module`);
  if (!hasArtifact) warnings.push(`${id}: capability has no document/specification edge`);
}

console.log(`Nodes: ${graph.nodes.length}`);
console.log(`Edges: ${graph.edges.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
for (const item of errors) console.error(`ERROR ${item}`);
for (const item of warnings) console.warn(`WARN ${item}`);
if (errors.length) process.exit(1);
