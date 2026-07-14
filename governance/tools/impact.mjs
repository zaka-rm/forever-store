import { loadGraph, indexes, label } from './lib.mjs';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node knowledge/tools/impact.mjs <PERMANENT-ID> [--depth=N]');
  process.exit(2);
}
const depthArg = process.argv.find((x) => x.startsWith('--depth='));
const maxDepth = depthArg ? Number(depthArg.split('=')[1]) : 5;
const includeGovernance = process.argv.includes('--include-governance');
const impactEdges = new Set([
  'belongs_to', 'supports', 'depends_on', 'implemented_by', 'specified_by', 'documented_by',
  'verified_by', 'released_in', 'produces', 'consumes', 'governs', 'exposes', 'uses',
  'measured_by', 'notifies', 'automates', 'persists', 'deployed_as', 'located_at',
  'evidenced_by', 'mitigates', 'tests', 'traces_to', 'supersedes'
]);
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
if (!byId.has(id)) {
  console.error(`Unknown ID: ${id}`);
  process.exit(2);
}

const queue = [{ id, depth: 0, path: [] }];
const best = new Map([[id, 0]]);
const found = [];
while (queue.length) {
  const current = queue.shift();
  if (current.depth >= maxDepth) continue;
  const neighbors = [
    ...(outgoing.get(current.id) ?? []).map((e) => ({ edge: e, next: e.to, direction: 'out' })),
    ...(incoming.get(current.id) ?? []).map((e) => ({ edge: e, next: e.from, direction: 'in' })),
  ].filter((item) => {
    if (!includeGovernance && !impactEdges.has(item.edge.type)) return false;
    // Hierarchy is traversed upward by default. Walking incoming belongs_to edges
    // would treat every sibling in a module/capability as impacted.
    if (!includeGovernance && item.edge.type === 'belongs_to' && item.direction === 'in') return false;
    return true;
  });
  for (const item of neighbors) {
    const depth = current.depth + 1;
    if ((best.get(item.next) ?? Infinity) <= depth) continue;
    best.set(item.next, depth);
    const step = `${current.id} ${item.direction === 'out' ? '-' + item.edge.type + '->' : '<-' + item.edge.type + '-'} ${item.next}`;
    const path = [...current.path, step];
    found.push({ id: item.next, depth, path });
    queue.push({ id: item.next, depth, path });
  }
}

console.log(`Impact analysis for ${label(byId.get(id))}`);
for (const type of [...new Set(found.map((x) => byId.get(x.id)?.type))].sort()) {
  console.log(`\n${type}`);
  for (const item of found.filter((x) => byId.get(x.id)?.type === type).sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))) {
    console.log(`  depth ${item.depth}: ${label(byId.get(item.id))}`);
    console.log(`    ${item.path.join(' | ')}`);
  }
}
