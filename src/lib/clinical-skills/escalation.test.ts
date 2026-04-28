/**
 * escalation.test.ts
 *
 * Calibration test for the TypeScript port of the cardiometabolic escalation
 * rule set. Loads the 8 calibration scenarios from
 * `evals/eval-harness/scenarios.json` (the shared canonical fixture used by
 * the Python harness) and asserts that `assessEscalationState` predicts the
 * `ground_truth` state for each.
 *
 * Run with:
 *   npx tsx src/lib/clinical-skills/escalation.test.ts
 *
 * The repo has no vitest/jest installed; tsx + node:assert is the native test
 * runner used elsewhere in the project (e.g. evals/run-evals.ts). Exit code 0
 * on full pass, 1 on any failure, suitable for CI.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assessEscalationState } from "./escalation.js";
import type { EscalationResult, EscalationState, PatientInput, ScenarioInput } from "./escalation.types.js";

interface ScenarioRecord extends ScenarioInput {
  id: string;
  patient_id: string;
  title: string;
  journey_day?: number;
  ground_truth: EscalationState;
  ground_truth_subtype?: string;
}

interface PatientRecord extends PatientInput {
  id: string;
  name: string;
}

interface ScenarioFile {
  scenarios: ScenarioRecord[];
  patients: Record<string, PatientRecord>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_PATH = resolve(__dirname, "../../../evals/eval-harness/scenarios.json");

function loadScenarios(): ScenarioFile {
  return JSON.parse(readFileSync(SCENARIOS_PATH, "utf8"));
}

function fmtCell(label: string, width: number): string {
  return label.padEnd(width);
}

function main(): void {
  const data = loadScenarios();
  const scenarios = data.scenarios;
  const patients = data.patients;

  let stateMatches = 0;
  let subtypeMatches = 0;
  const failures: Array<{
    id: string;
    title: string;
    expected_state: EscalationState;
    actual_state: EscalationState;
    expected_subtype?: string;
    actual_subtype: string;
    triggers: string[];
  }> = [];

  console.log("");
  console.log("Vardana — Cardiometabolic Escalation Rule Set");
  console.log("TypeScript port calibration test");
  console.log("=".repeat(78));
  console.log(
    fmtCell("ID", 6) +
    fmtCell("Expected", 12) +
    fmtCell("Actual", 12) +
    fmtCell("Subtype", 44),
  );
  console.log("-".repeat(78));

  for (const scenario of scenarios) {
    const patient = patients[scenario.patient_id];
    assert.ok(
      patient,
      `Scenario ${scenario.id} references unknown patient ${scenario.patient_id}`,
    );
    const result: EscalationResult = assessEscalationState(scenario, patient);

    const stateOK = result.state === scenario.ground_truth;
    const subtypeOK = result.subtype === scenario.ground_truth_subtype;
    const marker = stateOK ? "✓" : "✗";
    const subtypeMarker = subtypeOK ? " " : "≠";

    console.log(
      fmtCell(`${scenario.id} ${marker}`, 6) +
      fmtCell(scenario.ground_truth, 12) +
      fmtCell(result.state, 12) +
      fmtCell(`${subtypeMarker} ${result.subtype}`, 44),
    );

    if (stateOK) stateMatches++;
    if (subtypeOK) subtypeMatches++;
    if (!stateOK || !subtypeOK) {
      failures.push({
        id: scenario.id,
        title: scenario.title,
        expected_state: scenario.ground_truth,
        actual_state: result.state,
        expected_subtype: scenario.ground_truth_subtype,
        actual_subtype: result.subtype,
        triggers: result.triggers,
      });
    }
  }

  console.log("-".repeat(78));
  console.log(
    `State agreement:    ${stateMatches}/${scenarios.length} (${((stateMatches / scenarios.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Subtype agreement:  ${subtypeMatches}/${scenarios.length} (${((subtypeMatches / scenarios.length) * 100).toFixed(1)}%)`,
  );

  if (failures.length > 0) {
    console.log("");
    console.log("FAILURES:");
    for (const f of failures) {
      console.log(`  ${f.id} — ${f.title}`);
      if (f.expected_state !== f.actual_state) {
        console.log(`    state:   expected ${f.expected_state}, got ${f.actual_state}`);
      }
      if (f.expected_subtype !== f.actual_subtype) {
        console.log(`    subtype: expected ${f.expected_subtype}, got ${f.actual_subtype}`);
      }
      console.log(`    triggers: ${f.triggers.join(", ")}`);
    }
  }

  // The contract from PRODUCTION_RULE_SET_PORT.md Phase 2 is "All 8 should
  // pass" on state. Subtype agreement is the secondary check the harness uses;
  // we surface it but only state failures fail the test.
  const stateAllPass = stateMatches === scenarios.length;
  console.log("");
  console.log(stateAllPass ? "PASS — all calibration scenarios match ground truth state." : "FAIL — see failures above.");
  process.exit(stateAllPass ? 0 : 1);
}

main();
