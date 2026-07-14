import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadGraph, indexes, readJson, root } from './lib.mjs';

const target = process.argv[2];
const value = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const title = value('title');
const reason = value('reason');
const kind = value('kind') ?? 'product_model_change';
const requester = value('requested-by');
const apply = process.argv.includes('--apply');
if (!target || !title || !reason || !requester) {
  console.error('Usage: node knowledge/tools/propose-change.mjs <TARGET-ID> --title="..." --reason="..." --requested-by=TEAM-000001 [--kind=...] [--apply]');
  process.exit(2);
}
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
if (!byId.has(target)) throw new Error(`Unknown target ${target}`);
if (!byId.has(requester) || byId.get(requester).type !== 'team') throw new Error(`Unknown requesting team ${requester}`);

const visited = new Set([target]);
let frontier = [target];
const traversable = new Set(['supports', 'depends_on', 'implemented_by', 'specified_by', 'documented_by', 'verified_by', 'released_in', 'produces', 'consumes', 'governs', 'exposes', 'uses', 'measured_by', 'notifies', 'automates', 'persists', 'deployed_as', 'located_at', 'evidenced_by', 'tests', 'traces_to', 'renders', 'uses_prompt', 'assesses', 'invalidates']);
for (let depth = 0; depth < 4; depth++) {
  const next = [];
  for (const id of frontier) for (const edge of [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])].filter((item) => traversable.has(item.type))) {
    const other = edge.from === id ? edge.to : edge.from;
    if (!visited.has(other)) { visited.add(other); next.push(other); }
  }
  frontier = next;
}
const registryFile = path.join(root, 'registries', 'change_requests.json');
const registry = readJson(registryFile);
const nextNumber = Math.max(0, ...registry.records.map((r) => Number(r.id.split('-')[1]))) + 1;
const id = `CR-${String(nextNumber).padStart(6, '0')}`;
console.log(`${apply ? 'APPLY' : 'DRY-RUN'} ${id}: ${title}`);
console.log(`Target ${target}; ${visited.size - 1} records within four-hop impact boundary`);
if (!apply) process.exit(0);

const today = new Date().toISOString().slice(0, 10);
registry.records.push({
  id, type: 'change_request', name: title, description: reason, status: 'Planned', owner: requester,
  version: '1.0.0', aliases: [], tags: ['governed-change'],
  attributes: { change_kind: kind, reason, requested_by: requester, approved_by: [], impact_report_required: true, rollback_required: true, implemented_version: null, impact_count: visited.size - 1, decision_history: [] },
  governance: { responsible_team: requester, approver: 'TEAM-000001', review_cycle: 'Per change', last_reviewed: today, next_review: today, classification: 'Internal - Product Architecture and Engineering', supersedes: [], effective_from: today }
});
fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2) + '\n');
const edgeFile = path.join(root, 'relationships', 'edges.json');
const relationshipSet = readJson(edgeFile);
const nextEdge = Math.max(0, ...relationshipSet.edges.map((e) => Number(e.id.split('-')[1]))) + 1;
relationshipSet.edges.push({ id: `EDGE-${String(nextEdge).padStart(6, '0')}`, type: 'proposes_change_to', from: id, to: target, status: 'Released', version: '1.0.0', description: reason, attributes: { semantic_class: 'change_control', criticality: 'required' }, governance: { owner: requester, last_reviewed: today } });
fs.writeFileSync(edgeFile, JSON.stringify(relationshipSet, null, 2) + '\n');
const reportDir = path.join(root, 'reports');
execFileSync(process.execPath, [path.join(root, 'tools', 'impact-report.mjs'), target, '--depth=4'], { stdio: 'inherit' });
const impact = readJson(path.join(reportDir, `impact-${target}.json`));
const created = registry.records.find((item) => item.id === id);
created.attributes.impact_count = impact.summary.total_affected;
created.attributes.impact_severity = impact.overall_severity;
created.attributes.compatibility = impact.compatibility;
created.attributes.impact_gate = impact.gate;
created.attributes.required_approvers = impact.required_approvers.map((item) => item.id);
created.attributes.invalidated_artifact_count = impact.invalidated_artifacts.length;
created.attributes.required_test_count = impact.required_tests.length;
created.attributes.affected_release_count = impact.affected_releases.length;
fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2) + '\n');
fs.copyFileSync(path.join(reportDir, `impact-${target}.json`), path.join(reportDir, `change-impact-${id}.json`));
console.log(`Created ${id}; validation is required before review.`);
