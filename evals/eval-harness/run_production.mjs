/**
 * run_production.mjs
 *
 * Adapter that runs the harness against the *production* JS escalation rule
 * set at `api/_lib/escalation.js`. Reads `{scenario, patient}` JSON from
 * stdin, writes `{state, subtype, triggers, citation}` JSON to stdout.
 *
 * Used by `production_rules.py` to bridge the Python harness against the
 * production code path (the JS port shipped to Vercel functions).
 *
 *   echo '{"scenario": {...}, "patient": {...}}' \
 *     | node evals/eval-harness/run_production.mjs
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const escalationPath = resolve(__dirname, '../../api/_lib/escalation.js');
const { assessEscalationState } = require(escalationPath);

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');

const result = assessEscalationState(input.scenario || {}, input.patient || {});
process.stdout.write(JSON.stringify(result));
