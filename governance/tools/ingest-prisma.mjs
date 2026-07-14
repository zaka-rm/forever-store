import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, root } from './lib.mjs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node knowledge/tools/ingest-prisma.mjs <schema.prisma>');
const source = fs.readFileSync(file, 'utf8');
const models = [...source.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
const graph = loadGraph();
const entityNames = new Set(graph.nodes.filter((node) => node.type === 'entity').map((node) => node.name.toLowerCase()));
const observed = models.map((name) => ({ model: name, registered: entityNames.has(name.toLowerCase()) }));
const report = { version: '1.1.0', generated_at: new Date().toISOString(), source: path.resolve(file), observed, unregistered: observed.filter((x) => !x.registered) };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'prisma-observation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Prisma models: ${models.length}; unregistered: ${report.unregistered.length}`);
