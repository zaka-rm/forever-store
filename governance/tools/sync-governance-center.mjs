import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.mjs';

const workspace = path.resolve(root, '..');
const source = path.join(root, 'graph.snapshot.json');
const destination = path.join(workspace, 'governance-center', 'app', 'product-model.json');
if (!fs.existsSync(source)) throw new Error(`Missing canonical snapshot: ${source}`);
if (!fs.existsSync(path.dirname(destination))) throw new Error('Governance Center is not initialized');
fs.copyFileSync(source, destination);
const packSummary = path.join(root, 'generated-packs', 'generation-summary.json');
if (fs.existsSync(packSummary)) fs.copyFileSync(packSummary, path.join(workspace, 'governance-center', 'app', 'pack-generation-summary.json'));
const implementationReport = path.join(root, 'reports', 'implementation-synchronization.json');
if (fs.existsSync(implementationReport)) fs.copyFileSync(implementationReport, path.join(workspace, 'governance-center', 'app', 'implementation-synchronization.json'));
console.log(`Governance Center synchronized: ${destination}`);
