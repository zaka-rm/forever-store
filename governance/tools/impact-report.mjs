import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, label, root } from './lib.mjs';

const id = process.argv[2];
const maxDepth = Number(process.argv.find((x) => x.startsWith('--depth='))?.split('=')[1] ?? 4);
if (!id) throw new Error('Usage: node knowledge/tools/impact-report.mjs <ID> [--depth=N]');
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
const source = byId.get(id);
if (!source) throw new Error(`Unknown ID ${id}`);

const traversable = new Set(['supports', 'depends_on', 'implemented_by', 'specified_by', 'documented_by', 'verified_by', 'released_in', 'produces', 'consumes', 'governs', 'exposes', 'uses', 'measured_by', 'notifies', 'automates', 'persists', 'deployed_as', 'located_at', 'evidenced_by', 'tests', 'traces_to', 'renders', 'uses_prompt', 'assesses', 'invalidates']);
const contractual = new Set(['business_rule', 'event', 'api', 'entity', 'permission', 'metric', 'prompt', 'workflow']);
const delivery = new Set(['artifact', 'build_pack', 'qa_pack', 'test_case', 'repository_path', 'release', 'runtime_component']);
const queue = [{ id, depth: 0, path: [] }];
const seen = new Map([[id, 0]]);
const impacted = [];
while (queue.length) {
  const current = queue.shift();
  if (current.depth >= maxDepth) continue;
  const neighbors = [
    ...(outgoing.get(current.id) ?? []).map((edge) => ({ edge, next: edge.to, direction: 'out' })),
    ...(incoming.get(current.id) ?? []).map((edge) => ({ edge, next: edge.from, direction: 'in' })),
  ].filter((item) => traversable.has(item.edge.type));
  for (const item of neighbors) {
    const depth = current.depth + 1;
    if ((seen.get(item.next) ?? Infinity) <= depth) continue;
    seen.set(item.next, depth);
    const target = byId.get(item.next);
    if (!target) continue;
    const step = { from: current.id, edge: item.edge.type, direction: item.direction, to: item.next, criticality: item.edge.attributes?.criticality ?? 'contextual' };
    const pathSteps = [...current.path, step];
    const severity = depth === 1 && (contractual.has(target.type) || item.edge.attributes?.criticality === 'required') ? 'Critical' : contractual.has(target.type) || delivery.has(target.type) ? 'High' : depth <= 2 ? 'Medium' : 'Low';
    impacted.push({ id: target.id, type: target.type, name: target.name, status: target.status, owner: target.owner, depth, severity, path: pathSteps, explanation: pathSteps.map((x) => `${x.from} ${x.direction === 'out' ? '-' + x.edge + '->' : '<-' + x.edge + '-'} ${x.to}`).join(' | ') });
    queue.push({ id: target.id, depth, path: pathSteps });
  }
}

const counts = Object.fromEntries([...new Set(impacted.map((x) => x.type))].sort().map((type) => [type, impacted.filter((x) => x.type === type).length]));
const severityCounts = Object.fromEntries(['Critical', 'High', 'Medium', 'Low'].map((s) => [s, impacted.filter((x) => x.severity === s).length]));
const affectedOwners = [...new Set(impacted.map((x) => x.owner))].sort().map((owner) => ({ id: owner, name: byId.get(owner)?.name ?? owner, affected_count: impacted.filter((x) => x.owner === owner).length }));
const compatibility = contractual.has(source.type) ? 'Potentially breaking contract or behavior change' : ['screen', 'component', 'ui_flow'].includes(source.type) ? 'Experience compatibility review required' : 'Structural or additive change; verify transitive consumers';
const approvers = new Set(affectedOwners.map((x) => x.id));
approvers.add('TEAM-000001');
if (impacted.some((x) => ['api', 'event', 'entity', 'permission'].includes(x.type))) { approvers.add('TEAM-000002'); approvers.add('TEAM-000004'); approvers.add('TEAM-000005'); }
if (impacted.some((x) => ['screen', 'component', 'ui_flow', 'user_journey'].includes(x.type))) approvers.add('TEAM-000003');
if (impacted.some((x) => ['prompt', 'ai_capability'].includes(x.type))) approvers.add('TEAM-000006');
const invalidated = impacted.filter((x) => ['artifact', 'build_pack', 'qa_pack'].includes(x.type)).map((x) => ({ id: x.id, type: x.type, action: x.type === 'artifact' ? 'review_or_regenerate' : 'invalidate_until_reapproved' }));
const tests = impacted.filter((x) => x.type === 'test_case').map((x) => ({ id: x.id, action: 'rerun_and_attach_evidence' }));
const releases = impacted.filter((x) => x.type === 'release').map((x) => ({ id: x.id, action: 'block_until_impact_actions_complete' }));
const overallSeverity = severityCounts.Critical ? 'Critical' : severityCounts.High ? 'High' : severityCounts.Medium ? 'Medium' : 'Low';
const gate = overallSeverity === 'Critical' || overallSeverity === 'High' ? 'BLOCKED_PENDING_REVIEW' : 'REVIEW_REQUIRED';
const actions = [
  { action: 'Review affected records', count: impacted.length },
  { action: 'Route required approvals', count: approvers.size },
  { action: 'Review or invalidate artifacts', count: invalidated.length },
  { action: 'Rerun selected tests', count: tests.length },
  { action: 'Reassess affected releases', count: releases.length },
  { action: 'Define migration and rollback', count: contractual.has(source.type) ? 1 : 0 },
];
const report = { version: '2.1.0', generated_at: new Date().toISOString(), source: { id, type: source.type, name: source.name, label: label(source) }, max_depth: maxDepth, overall_severity: overallSeverity, compatibility, gate, summary: { total_affected: impacted.length, by_type: counts, by_severity: severityCounts }, affected_owners: affectedOwners, required_approvers: [...approvers].sort().map((team) => ({ id: team, name: byId.get(team)?.name ?? team })), invalidated_artifacts: invalidated, required_tests: tests, affected_releases: releases, required_actions: actions, impacted };
const reports = path.join(root, 'reports');
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, `impact-${id}.json`), JSON.stringify(report, null, 2) + '\n');
let md = `# Impact Intelligence Report: ${label(source)}\n\nGenerated: ${report.generated_at}  \nDepth: ${maxDepth}  \nGate: **${gate}**  \nSeverity: **${overallSeverity}**  \nCompatibility: ${compatibility}  \nAffected: ${impacted.length}\n\n## Required actions\n\n`;
for (const item of actions) md += `- ${item.action}: ${item.count}\n`;
md += `\n## Owners and approvals\n\n${affectedOwners.map((x) => `- ${x.id} — ${x.name}: ${x.affected_count} records`).join('\n')}\n\n## Explainable paths\n\n`;
for (const item of impacted.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))) md += `- **${item.severity}** ${item.id} — ${item.name}: ${item.explanation}\n`;
fs.writeFileSync(path.join(reports, `impact-${id}.md`), md);
console.log(`Impact intelligence ${id}: ${impacted.length} records, ${overallSeverity}, ${gate}`);
