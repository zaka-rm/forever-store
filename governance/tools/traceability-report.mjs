import fs from 'node:fs';
import path from 'node:path';
import { loadGraph, indexes, root } from './lib.mjs';

const requested = process.argv[2] ?? '--all';
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
const capabilities = requested === '--all' ? graph.nodes.filter((n) => n.type === 'capability') : [byId.get(requested)].filter(Boolean);
if (!capabilities.length || capabilities.some((n) => n.type !== 'capability')) throw new Error('Usage: node knowledge/tools/traceability-report.mjs <CAP-ID>|--all');

function links(id, type, direction = 'out') {
  return (direction === 'out' ? outgoing.get(id) ?? [] : incoming.get(id) ?? []).filter((e) => e.type === type).map((e) => byId.get(direction === 'out' ? e.to : e.from)).filter(Boolean);
}
function unique(items) { return [...new Map(items.map((x) => [x.id, x])).values()]; }
function fresh(node) {
  const next = node?.governance?.next_review;
  return !next || next >= new Date().toISOString().slice(0, 10) ? 'Current' : 'Stale';
}
function assess(cap) {
  const features = links(cap.id, 'belongs_to', 'in').filter((n) => n.type === 'feature');
  const governed = links(cap.id, 'governed_by');
  const decisions = links(cap.id, 'supports').filter((n) => n.type === 'decision');
  const documented = links(cap.id, 'documented_by');
  const specified = links(cap.id, 'specified_by');
  const prds = documented.filter((n) => /PRD/i.test(n.name));
  const technical = specified.filter((n) => /Technical|TS_/i.test(n.name));
  const blueprints = specified.filter((n) => /Blueprint|BP-/i.test(n.name));
  const builds = unique(features.flatMap((f) => links(f.id, 'implemented_by')));
  const qa = unique(builds.flatMap((b) => links(b.id, 'verified_by')));
  const tests = unique(features.flatMap((f) => links(f.id, 'tests', 'in')));
  const releases = unique([...documented, ...specified, ...builds, ...qa].flatMap((n) => links(n.id, 'released_in')));
  const repositories = unique([...builds, ...features].flatMap((n) => links(n.id, 'located_at')));
  const production = unique([...builds, ...features].flatMap((n) => links(n.id, 'deployed_as')));
  const stageRecords = { authority: governed, decision: decisions, prd: prds, technical_specification: technical, blueprint: blueprints, build_pack: builds, qa_pack: qa, repository: repositories, tests, release: releases, production };
  const stages = Object.entries(stageRecords).map(([stage, records]) => ({ stage, status: records.length ? (records.some((n) => fresh(n) === 'Stale') ? 'STALE' : 'COVERED') : 'MISSING', records: records.map((n) => ({ id: n.id, type: n.type, name: n.name, status: n.status, freshness: fresh(n) })) }));
  const maturity = graph.ontology.lifecycle_states.indexOf(cap.status);
  const required = ['authority', 'decision', 'prd', 'technical_specification', 'blueprint'];
  if (maturity >= graph.ontology.lifecycle_states.indexOf('Implementation Ready')) required.push('build_pack', 'qa_pack');
  if (maturity >= graph.ontology.lifecycle_states.indexOf('In QA')) required.push('tests');
  if (maturity >= graph.ontology.lifecycle_states.indexOf('Released')) required.push('repository', 'release', 'production');
  const missingRequired = stages.filter((s) => required.includes(s.stage) && s.status !== 'COVERED').map((s) => s.stage);
  const covered = stages.filter((s) => s.status === 'COVERED').length;
  return { capability: { id: cap.id, name: cap.name, status: cap.status, owner: cap.owner }, generated_at: new Date().toISOString(), stages, coverage: { covered, total: stages.length, percent: Math.round(covered / stages.length * 100) }, freshness: stages.some((s) => s.status === 'STALE') ? 'STALE' : 'CURRENT', required_for_current_maturity: required, missing_required: missingRequired, gate: missingRequired.length ? 'BLOCKED_MISSING_REQUIRED_TRACE' : 'PASS_CURRENT_MATURITY' };
}

const assessments = capabilities.map(assess);
const portfolio = { version: '2.2.0', generated_at: new Date().toISOString(), capabilities: assessments.length, average_coverage_percent: Math.round(assessments.reduce((s, x) => s + x.coverage.percent, 0) / assessments.length), blocked: assessments.filter((x) => x.gate.startsWith('BLOCKED')).length, stale: assessments.filter((x) => x.freshness === 'STALE').length, assessments };
const reports = path.join(root, 'reports'); fs.mkdirSync(reports, { recursive: true });
for (const item of assessments) fs.writeFileSync(path.join(reports, `traceability-${item.capability.id}.json`), JSON.stringify({ version: '2.2.0', ...item }, null, 2) + '\n');
if (requested === '--all') fs.writeFileSync(path.join(reports, 'traceability-portfolio.json'), JSON.stringify(portfolio, null, 2) + '\n');
let md = `# ZYVORA Traceability Portfolio\n\nCapabilities: ${portfolio.capabilities}  \nAverage coverage: ${portfolio.average_coverage_percent}%  \nBlocked at current maturity: ${portfolio.blocked}  \nStale: ${portfolio.stale}\n\n`;
for (const item of assessments) md += `## ${item.capability.id} — ${item.capability.name}\n\n- Maturity: ${item.capability.status}\n- Coverage: ${item.coverage.covered}/${item.coverage.total} (${item.coverage.percent}%)\n- Freshness: ${item.freshness}\n- Gate: ${item.gate}\n- Missing required: ${item.missing_required.join(', ') || 'None'}\n\n`;
if (requested === '--all') fs.writeFileSync(path.join(reports, 'traceability-portfolio.md'), md);
console.log(`Traceability portfolio: ${portfolio.capabilities} capabilities, ${portfolio.average_coverage_percent}% average, ${portfolio.blocked} blocked, ${portfolio.stale} stale`);
