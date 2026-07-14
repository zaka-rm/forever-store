import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, root } from './lib.mjs';

const releaseId = process.argv[2];
if (!releaseId) throw new Error('Usage: node knowledge/tools/release-gate.mjs <REL-ID>');
const graph = loadGraph();
const { byId, incoming, outgoing } = indexes(graph);
const release = byId.get(releaseId);
if (!release || release.type !== 'release') throw new Error(`Unknown release ${releaseId}`);
const members = (incoming.get(releaseId) ?? []).filter((edge) => edge.type === 'released_in').map((edge) => byId.get(edge.from)).filter(Boolean);
const checks = [];
for (const member of members) {
  const links = new Set([...(outgoing.get(member.id) ?? []), ...(incoming.get(member.id) ?? [])].map((edge) => edge.type));
  if (member.type === 'build_pack') checks.push({ object: member.id, gate: 'paired QA Pack', pass: links.has('verified_by') });
  checks.push({ object: member.id, gate: 'owner', pass: Boolean(byId.get(member.owner)) });
  checks.push({ object: member.id, gate: 'governance', pass: links.has('governed_by') || member.type === 'release' });
}
if (!members.length) checks.push({ object: releaseId, gate: 'release has members', pass: false });
const report = { version: '1.1.0', generated_at: new Date().toISOString(), release: releaseId, status: release.status, members: members.map((x) => x.id), checks, pass: checks.every((x) => x.pass) };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', `release-gate-${releaseId}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(`Release ${releaseId}: ${report.pass ? 'PASS' : 'BLOCKED'} (${checks.filter((x) => !x.pass).length} missing gates)`);
for (const check of checks.filter((x) => !x.pass)) console.error(`MISS ${check.object}: ${check.gate}`);
if (!report.pass) process.exit(1);
