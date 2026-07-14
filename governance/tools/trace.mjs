import { loadGraph, indexes, label } from './lib.mjs';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node knowledge/tools/trace.mjs <PERMANENT-ID>');
  process.exit(2);
}
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
if (!byId.has(id)) {
  console.error(`Unknown ID: ${id}`);
  process.exit(2);
}
console.log(label(byId.get(id)));
console.log('\nOutgoing');
for (const edge of (outgoing.get(id) ?? []).sort((a, b) => a.type.localeCompare(b.type))) console.log(`  -${edge.type}-> ${label(byId.get(edge.to))}`);
console.log('\nIncoming');
for (const edge of (incoming.get(id) ?? []).sort((a, b) => a.type.localeCompare(b.type))) console.log(`  <-${edge.type}- ${label(byId.get(edge.from))}`);
