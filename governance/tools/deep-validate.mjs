import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, readJson, root } from './lib.mjs';

const graph = loadGraph();
const { outgoing, incoming } = indexes(graph);
const contracts = readJson(path.join(root, 'governance', 'registry-contracts.json')).contracts;
const errors = [];
const debt = [];
const rank = new Map(graph.ontology.lifecycle_states.map((state, index) => [state, index]));

function missingAttributes(node, required) {
  return required.filter((key) => !(key in (node.attributes ?? {})));
}
function edgeTypes(map, id) {
  return new Set((map.get(id) ?? []).map((edge) => edge.type));
}
function requireEdges(node, direction, required) {
  const types = edgeTypes(direction === 'out' ? outgoing : incoming, node.id);
  return required.filter((type) => !types.has(type));
}

for (const node of graph.nodes) {
  const contract = contracts[node.type];
  if (!contract) continue;
  const missing = missingAttributes(node, contract.required_attributes ?? []);
  const missingOut = requireEdges(node, 'out', contract.required_outgoing_edges ?? []);
  const missingIn = requireEdges(node, 'in', contract.required_incoming_edges ?? []);
  if (missing.length) errors.push(`${node.id}: missing attributes ${missing.join(', ')}`);
  if (missingOut.length) errors.push(`${node.id}: missing outgoing edges ${missingOut.join(', ')}`);
  if (missingIn.length) errors.push(`${node.id}: missing incoming edges ${missingIn.join(', ')}`);

  if (node.type === 'metric' && node.attributes?.formula_status !== 'approved') {
    if ((rank.get(node.status) ?? 0) >= rank.get('Specified')) errors.push(`${node.id}: metric claims ${node.status} without approved formula`);
    else debt.push(`${node.id}: formula, units, inputs, cadence, and rounding require domain approval`);
  }
  if (node.type === 'event' && node.status === 'Blueprint Ready' && node.attributes?.payload?.domain_payload_status !== 'approved') {
    errors.push(`${node.id}: event is Blueprint Ready without approved domain payload`);
  }
  if (node.type === 'prompt' && node.attributes?.template_status !== 'approved') {
    if ((rank.get(node.status) ?? 0) >= rank.get('Specified')) errors.push(`${node.id}: prompt claims ${node.status} without approved template and evaluations`);
    else debt.push(`${node.id}: prompt template, inputs, outputs, evaluation tests, and thresholds require AI authority approval`);
  }
  if (node.type === 'workflow' && node.attributes?.step_definition_status !== 'approved') {
    if ((rank.get(node.status) ?? 0) >= rank.get('Specified')) errors.push(`${node.id}: workflow claims ${node.status} without approved ordered steps`);
    else debt.push(`${node.id}: ordered steps, actors, inputs, outputs, exceptions, and timing require domain approval`);
  }
  if (node.type === 'ui_flow' && node.attributes?.flow_definition_status !== 'approved') {
    if ((rank.get(node.status) ?? 0) >= rank.get('Specified')) errors.push(`${node.id}: UI flow claims ${node.status} without approved transitions and recovery states`);
    else debt.push(`${node.id}: transitions, validation, confirmation, and recovery states require Design approval`);
  }
  if (node.type === 'capability' && (rank.get(node.status) ?? 0) >= rank.get('Implementation Ready')) {
    const missingReady = requireEdges(node, 'out', contract.implementation_ready_edges ?? []);
    if (missingReady.length) errors.push(`${node.id}: Implementation Ready but missing ${missingReady.join(', ')}`);
  }
}

const dependencyContract = contracts.dependency;
const dependencyEdges = graph.edges.filter((edge) => dependencyContract.edge_types.includes(edge.type));
for (const edge of dependencyEdges) {
  const missing = dependencyContract.required_edge_attributes.filter((key) => !(key in (edge.attributes ?? {})));
  if (missing.length) errors.push(`${edge.id}: dependency edge missing ${missing.join(', ')}`);
}

const report = {
  version: '3.0.0',
  generated_at: new Date().toISOString(),
  nodes: graph.nodes.length,
  edges: graph.edges.length,
  dependency_edges: dependencyEdges.length,
  errors,
  readiness_debt: debt,
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'deep-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Deep validation errors: ${errors.length}`);
console.log(`Readiness debt: ${debt.length}`);
for (const item of errors) console.error(`ERROR ${item}`);
for (const item of debt.slice(0, 20)) console.warn(`DEBT ${item}`);
if (debt.length > 20) console.warn(`DEBT ... ${debt.length - 20} more in knowledge/reports/deep-validation.json`);
if (errors.length) process.exit(1);
