import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadGraph, indexes, root } from './lib.mjs';

const requested = process.argv[2] ?? '--all';
const graph = loadGraph();
const { byId, outgoing, incoming } = indexes(graph);
const capabilities = requested === '--all' ? graph.nodes.filter((n) => n.type === 'capability') : [byId.get(requested)].filter(Boolean);
if (!capabilities.length || capabilities.some((n) => n.type !== 'capability')) throw new Error('Usage: node knowledge/tools/generate-draft-packs.mjs <CAP-ID>|--all');
const generatedRoot = path.join(root, 'generated-packs');
fs.mkdirSync(generatedRoot, { recursive: true });

const out = (id, type) => (outgoing.get(id) ?? []).filter((e) => !type || e.type === type).map((e) => byId.get(e.to)).filter(Boolean);
const inc = (id, type) => (incoming.get(id) ?? []).filter((e) => !type || e.type === type).map((e) => byId.get(e.from)).filter(Boolean);
const unique = (items) => [...new Map(items.map((x) => [x.id, x])).values()];
const ref = (node) => ({ id: node.id, type: node.type, name: node.name, status: node.status, version: node.version, owner: node.owner });

function related(cap) {
  const module = out(cap.id, 'belongs_to').find((n) => n.type === 'module');
  const capChildren = inc(cap.id, 'belongs_to');
  const features = capChildren.filter((n) => n.type === 'feature');
  const moduleChildren = module ? inc(module.id, 'belongs_to') : [];
  const all = unique([cap, ...(module ? [module] : []), ...capChildren, ...moduleChildren, ...features.flatMap((f) => [...out(f.id), ...inc(f.id)])]);
  const byType = (type) => all.filter((n) => n.type === type);
  const artifacts = unique([...out(cap.id, 'documented_by'), ...out(cap.id, 'specified_by')]);
  return { module, features, all, byType, artifacts };
}
function generate(cap) {
  const r = related(cap);
  const decisions = unique(out(cap.id, 'supports').filter((n) => n.type === 'decision'));
  const rules = r.byType('business_rule'); const workflows = r.byType('workflow'); const entities = r.byType('entity');
  const apis = unique(r.features.flatMap((f) => out(f.id, 'exposes'))); const events = unique(r.module ? out(r.module.id, 'produces').filter((n) => n.type === 'event') : []);
  const permissions = unique(r.features.flatMap((f) => inc(f.id, 'governs')).filter((n) => n.type === 'permission'));
  const screens = r.byType('screen'); const uiFlows = r.byType('ui_flow'); const metrics = unique(out(cap.id, 'measured_by'));
  const ai = unique(out(cap.id, 'uses').filter((n) => n.type === 'ai_capability')); const prompts = unique(ai.flatMap((n) => out(n.id, 'uses_prompt')));
  const automations = unique(r.features.flatMap((f) => inc(f.id, 'automates'))); const notifications = unique(automations.flatMap((a) => out(a.id, 'notifies')));
  const reports = r.byType('report'); const integrations = unique(out(cap.id, 'uses').filter((n) => n.type === 'integration'));
  const traceFile = path.join(root, 'reports', `traceability-${cap.id}.json`); const trace = fs.existsSync(traceFile) ? JSON.parse(fs.readFileSync(traceFile, 'utf8')) : null;
  const blockers = [];
  if (!trace) blockers.push('Traceability assessment is missing'); else if (trace.gate !== 'PASS_CURRENT_MATURITY') blockers.push(...trace.missing_required.map((x) => `Required trace missing: ${x}`));
  for (const m of metrics.filter((n) => n.attributes?.formula_status !== 'approved')) blockers.push(`${m.id}: metric formula is not approved`);
  for (const p of prompts.filter((n) => n.attributes?.template_status !== 'approved')) blockers.push(`${p.id}: prompt template and evaluation are not approved`);
  for (const w of workflows.filter((n) => n.attributes?.step_definition_status !== 'approved')) blockers.push(`${w.id}: ordered workflow steps are not approved`);
  for (const f of uiFlows.filter((n) => n.attributes?.flow_definition_status !== 'approved')) blockers.push(`${f.id}: UI transitions and recovery states are not approved`);
  for (const e of events.filter((n) => n.attributes?.payload?.domain_payload_status !== 'approved')) blockers.push(`${e.id}: event domain payload is not approved`);
  for (const api of apis.filter((n) => n.attributes?.schema_status !== 'approved')) blockers.push(`${api.id}: API request and response schema is not approved`);
  const sourceRecords = unique([cap, ...(r.module ? [r.module] : []), ...decisions, ...r.features, ...rules, ...workflows, ...entities, ...apis, ...events, ...permissions, ...screens, ...uiFlows, ...metrics, ...ai, ...prompts, ...automations, ...notifications, ...reports, ...integrations, ...r.artifacts]);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(sourceRecords.map((n) => [n.id, n.version, n.status]))).digest('hex');
  const base = { generator_version: '2.3.0', generated_at: new Date().toISOString(), source_capability: ref(cap), source_fingerprint: fingerprint, authority: 'DRAFT_NOT_AUTHORIZED', promotion_gate: blockers.length ? 'BLOCKED_SOURCE_INCOMPLETE' : 'AWAITING_HUMAN_APPROVAL', blockers, completeness: { source_records: sourceRecords.length, blocker_count: blockers.length, traceability_gate: trace?.gate ?? 'MISSING', traceability_coverage_percent: trace?.coverage?.percent ?? 0 }, provenance: sourceRecords.map(ref) };
  const build = { ...base, kind: 'draft_build_pack', objective: cap.description, module: r.module ? ref(r.module) : null, supported_decisions: decisions.map(ref), scope: r.features.map(ref), business_rules: rules.map(ref), workflows: workflows.map(ref), data_entities: entities.map(ref), api_contracts: apis.map(ref), event_contracts: events.map(ref), permissions: permissions.map(ref), screens: screens.map(ref), ui_flows: uiFlows.map(ref), ai_and_prompts: [...ai, ...prompts].map(ref), automations: automations.map(ref), notifications: notifications.map(ref), reports: reports.map(ref), integrations: integrations.map(ref), source_artifacts: r.artifacts.map(ref), implementation_constraints: ['Preserve permanent IDs in code, commits, tests, and telemetry.', 'Do not implement blocked or unapproved semantics.', 'Provider-specific services remain behind interfaces.', 'Implementation must attach repository, test, deployment, and runtime evidence.'], acceptance_gate: ['All blockers resolved by accountable owners.', 'Impact assessment approved.', 'Build Pack and paired QA Pack approved.', 'Deployment and rollback approved.', 'No open Critical or High governance exception.'] };
  const scenarios = [
    ...rules.map((n) => ({ id: `RULE-${n.id}`, type: 'unit_and_domain', source: n.id, scenario: `Verify business rule: ${n.attributes?.rule_text ?? n.description}`, expected: 'Exact approved rule holds for valid, invalid, boundary, and concurrent cases.' })),
    ...workflows.map((n) => ({ id: `WF-${n.id}`, type: 'end_to_end', source: n.id, scenario: `Verify happy, alternative, failure, and recovery paths for ${n.name}`, expected: 'Approved workflow outcome, evidence, timing, and recovery requirements are satisfied.' })),
    ...apis.map((n) => ({ id: `API-${n.id}`, type: 'contract_and_security', source: n.id, scenario: `Verify request, response, authorization, idempotency, pagination, validation, and errors for ${n.name}`, expected: 'Approved API contract and security policy are preserved.' })),
    ...events.map((n) => ({ id: `EVT-${n.id}`, type: 'integration', source: n.id, scenario: `Verify production, schema compatibility, ordering, duplication, retry, and idempotent consumption for ${n.name}`, expected: 'Versioned event meaning and compatibility contract are preserved.' })),
    ...permissions.map((n) => ({ id: `PERM-${n.id}`, type: 'security', source: n.id, scenario: `Verify allow, deny, tenant isolation, escalation prevention, and audit evidence for ${n.name}`, expected: 'Least privilege and resource scope are enforced.' })),
    ...screens.map((n) => ({ id: `SCR-${n.id}`, type: 'ui_accessibility', source: n.id, scenario: `Verify responsive, keyboard, screen-reader, loading, empty, error, stale, and permission states for ${n.name}`, expected: 'Decision purpose remains clear and WCAG 2.1 AA obligations pass.' })),
  ];
  const qa = { ...base, kind: 'draft_qa_pack', paired_build_fingerprint: fingerprint, test_scenarios: scenarios, regression_scope: sourceRecords.map((n) => n.id), performance_requirements: ['Validate published performance budgets from the approved Technical Specification.', 'Verify no unbounded query, queue, retry, export, or AI workload.'], security_requirements: ['Tenant isolation', 'Authorization deny paths', 'Sensitive-data handling', 'Audit completeness', 'Rate limiting and abuse controls'], evidence_required: ['Automated test results', 'Accessibility results', 'Security results', 'Performance results', 'Manual exploratory record', 'Deployment and rollback rehearsal'] };
  const dir = path.join(generatedRoot, cap.id); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'BUILD-DRAFT.json'), JSON.stringify(build, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'QA-DRAFT.json'), JSON.stringify(qa, null, 2) + '\n');
  let md = `# Draft Pack Set — ${cap.id} ${cap.name}\n\n**Authority:** ${base.authority}  \n**Promotion gate:** ${base.promotion_gate}  \n**Source fingerprint:** \`${fingerprint}\`  \n**Traceability:** ${base.completeness.traceability_coverage_percent}%  \n**Blockers:** ${blockers.length}\n\n## Blockers\n\n${blockers.map((x) => `- ${x}`).join('\n') || '- None; human approval is still required.'}\n\n## Build scope\n\n${r.features.map((n) => `- ${n.id} — ${n.name}`).join('\n')}\n\n## QA scenarios\n\n${scenarios.map((x) => `- ${x.id}: ${x.scenario}`).join('\n')}\n`;
  fs.writeFileSync(path.join(dir, 'PACK-READINESS.md'), md);
  return { capability: cap.id, source_records: sourceRecords.length, blockers: blockers.length, scenarios: scenarios.length, promotion_gate: base.promotion_gate, fingerprint };
}
const results = capabilities.map(generate);
fs.writeFileSync(path.join(generatedRoot, 'generation-summary.json'), JSON.stringify({ version: '2.3.0', generated_at: new Date().toISOString(), generated: results.length, authorized: 0, results }, null, 2) + '\n');
console.log(`Draft packs: ${results.length} capability sets, ${results.reduce((s,x)=>s+x.blockers,0)} blockers, 0 authorized`);
