import { loadGraph, indexes, label } from './lib.mjs';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node knowledge/tools/release-readiness.mjs <PERMANENT-ID>');
  process.exit(2);
}
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
const node = byId.get(id);
if (!node) {
  console.error(`Unknown ID: ${id}`);
  process.exit(2);
}
const relations = [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])];
const relationTypes = new Set(relations.map((e) => e.type));
const checks = [
  ['owner', Boolean(byId.get(node.owner))],
  ['supported decision', relationTypes.has('supports')],
  ['governing constitution', relationTypes.has('governed_by')],
  ['approved requirement artifact', relationTypes.has('documented_by')],
  ['technical specification', relationTypes.has('specified_by')],
  ['blueprint/build relationship', relationTypes.has('implemented_by')],
  ['verification relationship', relationTypes.has('verified_by')],
  ['release relationship', relationTypes.has('released_in')],
];
console.log(label(node));
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'MISS'} ${name}`);
if (checks.some((x) => !x[1])) process.exitCode = 1;
