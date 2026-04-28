# Vardana — Cardiometabolic Rule Set Port (Production)

## Goal

Replace the CHF-era `assessDecompensationRisk` in production with the cardiometabolic (HTN + T2DM) rule set that already exists in `evals/eval-harness/rules.py`. Update both the TypeScript/JavaScript paths and the Python voice pipeline. Run the harness against the new production code and produce test results.

After this task, the framework deck claim "deterministic guideline-cited rule set" is backed by production code, not by an aspirational reference implementation in `evals/`.

## Context

Phase 1 investigation (already complete) found:

- `src/lib/clinical-skills/decompensation.ts:94` — canonical TypeScript, used by frontend demo. CHF-focused (weight, dyspnea, orthopnea, edema).
- `api/voice-chat.js:63` — JavaScript port of the same algorithm. Plus CHF post-processing at lines 588-596 (lab bumps) and 633 (emergency short-circuit).
- `vardana-voice/chat_turn.py` — LLM-mediated `create_coordinator_alert`, non-deterministic. No deterministic gate.
- `evals/eval-harness/rules.py` — the cardiometabolic rule set, fully written, validates on 8/8 calibration scenarios.

The production rule set answers the wrong clinical question for the current beachhead. Per `CLAUDE.md`: "Out of scope: CHF... If these appear in legacy code, they are technical debt to remove, not active features." This task removes that debt.

## Build freeze nuance

This is technical debt removal explicitly endorsed by `CLAUDE.md`, plus a port of code that already exists in `evals/`. It is not new product development. Branch `fix/cardiometabolic-rule-set`. PR with Vercel preview QA before merge. Demo must remain functional throughout — do not break the live demo URL while this is in flight.

If at any point during this work the demo breaks for the live URL `vardana.ai/demo/144637f2fa33dbee`, halt and surface immediately.

## Scope estimate

This is a 1–2 day task, not a 1-hour task. Three runtime targets, a real refactor, and a test pass. Don't try to ship in one push.

## Phase 1 — Define the contract

Before writing any code, write `src/lib/clinical-skills/escalation.types.ts` with the canonical types shared across all three runtimes. The contract:

```typescript
export type EscalationState = "ROUTINE" | "WATCH" | "SAME-DAY" | "IMMEDIATE";

export interface ScenarioInput {
  vitals: {
    current_bp_systolic?: number;
    current_bp_diastolic?: number;
    bp_7day_avg_systolic?: number;
    bp_7day_avg_diastolic?: number;
    bp_30day_avg_systolic?: number;
    bp_30day_avg_diastolic?: number;
    bp_pre_program_avg_systolic?: number;
    bp_pre_program_avg_diastolic?: number;
    current_glucose_mgdl?: number;
    glucose_verified_twice?: boolean;
    fasting_glucose_5day_avg?: number;
    post_meal_glucose_5day_avg?: number;
    fasting_glucose_recent_readings?: number[];
  };
  labs: {
    a1c_pct?: number;
    a1c_days_old?: number;
    baseline_a1c_pct?: number;
    egfr?: number;
  };
  symptoms: {
    severe_headache?: boolean;
    headache_worst_of_life?: boolean;
    vision_changes?: boolean;
    chest_pain?: boolean;
    focal_neuro_deficit?: boolean;
    kussmaul_breathing?: boolean;
    altered_mental_status?: boolean;
    neuroglycopenic?: boolean;
    confusion?: boolean;
    slurred_speech?: boolean;
    osmotic_symptoms?: boolean;
    polyuria?: boolean;
    polydipsia?: boolean;
    nocturia?: boolean;
    severe_fatigue?: boolean;
    nausea?: boolean;
    symptom_progression_days?: number;
  };
  context: {
    call_type?: string;
    adherence_gap?: boolean;
    missed_doses_past_week?: number;
    concurrent_steroid?: boolean;
    post_activity?: boolean;
    improper_cuff_position?: boolean;
  };
}

export interface PatientInput {
  conditions: string[];  // ["HTN", "T2DM", "CKD_3a"]
  ckd_stage?: string;
  egfr?: number;
}

export interface EscalationResult {
  state: EscalationState;
  subtype: string;
  triggers: string[];
  citation: string;
}
```

Match these field names to `evals/eval-harness/scenarios.json` exactly. Snake_case across the contract — the harness Python file uses snake_case and we're keeping the contract identical for portability.

## Phase 2 — TypeScript port

Create `src/lib/clinical-skills/escalation.ts` exporting `assessEscalationState(scenario, patient): EscalationResult`. Port every rule from `evals/eval-harness/rules.py` line-for-line:

1. `rule_hypertensive_emergency` — IMMEDIATE, BP ≥180/120 + end-organ symptom
2. `rule_level2_hypoglycemia` — IMMEDIATE, glucose <54 + neuroglycopenic
3. `rule_hyperglycemic_crisis` — IMMEDIATE, severe hyperglycemia + Kussmaul/AMS/HHS pattern
4. `rule_stage2_sustained_with_adherence` — SAME-DAY, sustained ≥140/90 + adherence gap
5. `rule_symptomatic_hyperglycemia_no_crisis` — SAME-DAY, elevated pattern + osmotic, no crisis
6. `rule_a1c_diagnostic_threshold` — WATCH, A1C ≥6.5% in patient without T2DM diagnosis
7. `rule_stage1_drift` — WATCH, Stage 1 BP sustained, asymptomatic, adherent
8. `rule_routine_default` — ROUTINE fallback

Same evaluation order. Same first-match-wins semantics. Same trigger strings, same citation strings. Pure functions, no side effects, no I/O.

Write `src/lib/clinical-skills/escalation.test.ts` using whatever test runner is already in the repo (vitest or jest). Load the 8 calibration scenarios from `evals/eval-harness/scenarios.json` and assert that each scenario's predicted state matches its `ground_truth` field. All 8 should pass. If any don't, the port has a bug — fix before continuing.

Delete `src/lib/clinical-skills/decompensation.ts` after confirming nothing else imports it. If imports exist elsewhere (run `grep -r "assessDecompensationRisk\|decompensation" src/ api/ --include="*.ts" --include="*.js"`), update those callers to use `assessEscalationState`.

## Phase 3 — JavaScript voice-chat path

Update `api/voice-chat.js`:

1. Replace the inline JS `assessDecompensationRisk` (line 63) with a call to `assessEscalationState` from the new module. If the build doesn't produce a JS-importable artifact, port the rule logic to a shared `api/_lib/escalation.js` that voice-chat.js requires. Whichever is cleaner given the existing build.
2. Remove the CHF-era post-processing entirely:
   - Lines 588-596 (lab bumps for CHF) — delete. The new rule set handles its own lab thresholds.
   - Line 633 (CHF emergency short-circuit) — delete. Rule 1 (`rule_hypertensive_emergency`) handles all emergency cases.
3. Build a FHIR-to-scenario adapter. Production reads FHIR resources from Medplum; the new rule set takes the structured `ScenarioInput` shape. Write `api/_lib/build_scenario_from_fhir.js` (or wherever fits the existing pattern) that takes the FHIR Patient + Observations + Conditions + MedicationRequests and produces a `ScenarioInput`. Map vitals from latest BP/glucose Observations, labs from latest A1C/eGFR DiagnosticReports, symptoms from the in-call structured questions, context from journey day plus the adherence-tracking logic.
4. The output of `assessEscalationState` is what gets written into the FHIR Flag and surfaced to the coordinator console. The `subtype`, `triggers`, and `citation` fields all need to land in the Flag resource — this is the "every alert carries a guideline citation" claim from the framework deck. Do not drop these fields silently; if the Flag resource doesn't have a place for them, add a `note` field with the citation and triggers.

Before completing this phase, manually walk through the demo on a Vercel preview branch:
- Load Marcus Williams patient
- Confirm risk panel renders
- Confirm a chat turn that should trigger SAME-DAY (sustained Stage 2 + adherence gap) actually surfaces the alert with citation
- Confirm a chat turn that should be ROUTINE concludes the call without escalation

If any of these fail, the FHIR adapter has a bug — debug before moving to Phase 4.

## Phase 4 — Python voice pipeline

The voice pipeline at `vardana-voice/chat_turn.py` currently uses LLM-mediated alerting. The framework deck claims deterministic. Fix the divergence.

1. Drop a copy of the harness rule logic into `vardana-voice/escalation_rules.py`. Either copy `evals/eval-harness/rules.py` directly, or symlink, or pip-install as a local package — whichever fits the existing repo structure. Same canonical source means same behavior.
2. In `chat_turn.py`, before the LLM tool-call loop, build the `ScenarioInput` from the in-call collected data and the patient's FHIR record, call `assess_escalation_state`, and store the result.
3. Pass the deterministic state into the LLM as a hard constraint in the system prompt: "The escalation state for this call is `{state}` per the Vardana rule set, citation `{citation}`. You may not write a Flag with a different state. You may complete the rest of the call within that constraint." This keeps the LLM doing the patient-facing reasoning while the escalation decision stays deterministic.
4. The `create_coordinator_alert` tool now writes the Flag with the deterministic state, subtype, triggers, and citation pre-populated. The LLM contributes the human-language summary of the call, not the state.
5. Smoke test: run the voice pipeline locally against the Marcus Williams scenario for at least one IMMEDIATE case (S01) and one ROUTINE case (S08). Confirm the deterministic state is preserved.

## Phase 5 — Harness against production, with test results

Three test runs, all results captured.

### 5a. TypeScript harness validation

Build `evals/eval-harness/run_production.mjs` per the original `EVAL_VALIDATION_TASK.md` Phase 2 spec. Reads scenario JSON from stdin, calls `assessEscalationState` from the compiled `escalation.ts` (or imports the source if the project uses ts-node), writes `{state, subtype, triggers, citation}` JSON to stdout.

Build `evals/eval-harness/production_rules.py` that wraps `run_production.mjs` via subprocess. Implements the harness `RuleResult` interface.

Run:
```bash
cd evals/eval-harness
python harness.py --rules production_rules.py --json
python harness.py --rules production_rules.py --scenarios scenarios_adversarial.json --json
```

Expected: 8/8 calibration pass, all three adversarial scenarios fail in the same way the reference rules fail (since both are the same rule logic). If results diverge from reference, the TS port has a bug.

### 5b. Python pipeline validation

Run the harness directly against `vardana-voice/escalation_rules.py`:

```bash
python harness.py --rules /path/to/vardana-voice/escalation_rules.py --json
```

Expected: identical results to TypeScript run. Any divergence is a port bug between TS and Python.

### 5c. End-to-end smoke

For each of the 4 escalation states, run a single end-to-end demo flow against Marcus Williams (or appropriate persona):

| State | Scenario approximation | Expected state | Expected citation contains |
|---|---|---|---|
| IMMEDIATE | BP 198/126 + headache + vision changes | IMMEDIATE | "Hypertensive Crises" |
| SAME-DAY | 7-day BP avg 159/96 + reported missed doses | SAME-DAY | "Stage 2" |
| WATCH | 7-day BP avg 135/83, asymptomatic, adherent | WATCH | "Stage 1" |
| ROUTINE | Single 142/88 reading, post-activity, 7-day avg 124/76 | ROUTINE | "HBPM/ABPM" |

Document each smoke test pass/fail with screenshots of the coordinator console showing the state, citation, and triggers.

### Test results report

Write `evals/eval-harness/production_validation_report.md`:

- Summary table: every test (calibration 8 + adversarial 3 + e2e 4) with pass/fail
- Headline numbers: calibration agreement %, hard-gate misses, e2e smoke pass rate
- Confusion matrices for calibration runs (TS and Python)
- Diff between TS and Python results — should be empty
- Diff between production and reference rules — should be empty
- Screenshots of e2e smoke console output
- Any bugs found during the port, with fix references in commit history

## Constraints

- Branch: `fix/cardiometabolic-rule-set`. PR with Vercel preview before merge to main.
- Demo at `vardana.ai/demo/144637f2fa33dbee` must stay functional. Test against the preview URL before approving merge.
- Citations and trigger strings must match the harness exactly. Don't paraphrase. The framework deck quotes these verbatim.
- Do not introduce new vendor dependencies. The rule set is pure functions — no API calls, no data fetches, no LLM calls inside the assessor.
- If the port reveals a bug in the harness reference rules, fix the bug in `evals/eval-harness/rules.py` first, then port the fix forward. Production should never diverge from harness reference.
- If you find any path where the LLM can override the deterministic state, flag it. The deck claims deterministic; LLM override breaks that claim.
- No new product features. Same surface area, replaced underlying logic.

## Deliverables

A single PR with:

1. New TypeScript: `escalation.types.ts`, `escalation.ts`, `escalation.test.ts`
2. Updated JavaScript: `api/voice-chat.js` (rule call replaced, post-processing removed), `api/_lib/build_scenario_from_fhir.js` (new), optional `api/_lib/escalation.js` if needed for the Vercel function
3. Updated Python: `vardana-voice/escalation_rules.py` (new, copied from harness), `vardana-voice/chat_turn.py` (deterministic state injection)
4. Deleted: `src/lib/clinical-skills/decompensation.ts` and any callers
5. Eval harness adapters: `run_production.mjs`, `production_rules.py`
6. Test results report: `evals/eval-harness/production_validation_report.md` with all 5a, 5b, 5c results
7. PR description summarizing: what was replaced, what was removed, what was added, test pass rates, any bugs found and fixed, any concerns about the deterministic-vs-LLM boundary

Atma reviews the PR. If the test report shows clean passes across all three runs, merge. If any test fails, halt and surface the failure before further changes.
