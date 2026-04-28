# Vardana Eval Harness — Production Validation Task

## Goal

Run the 8 calibration scenarios and the 3 adversarial scenarios through the production escalation rule set (the live `assess_escalation_state` implementation). Diff production output against the reference implementation. Produce a written report. Do not fix any divergences found in this task — measure and report only.

This is eval work, not product work. The build freeze does not apply.

## Context

- Harness lives at `evals/eval-harness/` relative to repo root
- Reference rules: `evals/eval-harness/rules.py`
- Calibration scenarios: `evals/eval-harness/scenarios.json` (8 scenarios)
- Adversarial scenarios: `evals/eval-harness/scenarios_adversarial.json` (3 edge cases)
- Production rule set: `assess_escalation_state` tool, location TBD by Phase 1
- Read `CLAUDE.md` and `evals/eval-harness/README.md` before starting

## Phase 1 — Locate production rules

Before writing any code, find and report the following. Do not propose changes yet.

1. Where `assess_escalation_state` is implemented (file path)
2. Language (TypeScript/JavaScript on the frontend chat endpoint, or Python in the voice pipeline)
3. Input contract — what shape does it take (FHIR resources? Plain dict? Patient ID + lookup?)
4. Output contract — what does it return (string? Object? What fields?)
5. Whether the rule logic is a single function or split across multiple files
6. Whether there is any non-deterministic component (LLM-in-the-loop reasoning, fuzzy matching) or whether it is fully deterministic

Stop here and surface findings before continuing.

## Phase 2 — Build the adapter

Branch on language.

**If Python:** create `evals/eval-harness/production_rules.py` that exports `assess_escalation_state(scenario, patient) -> RuleResult` matching the reference contract. Translate the structured scenario JSON into whatever shape production expects. Import the production function directly.

**If TypeScript/JavaScript:** create two files. `evals/eval-harness/run_production.mjs` reads scenario+patient JSON from stdin, calls the production rule function, writes a `{state, subtype, triggers, citation}` JSON object to stdout. Then `evals/eval-harness/production_rules.py` wraps it in a subprocess call and returns a `RuleResult` for the harness. Use Node's existing module resolution from the production codebase — do not duplicate or reimplement rule logic.

The contract the harness expects:

```python
RuleResult(
    state: str,        # "ROUTINE" | "WATCH" | "SAME-DAY" | "IMMEDIATE"
    subtype: str,      # short identifier like "hypertensive_emergency"
    triggers: list[str],  # observable conditions that fired the rule
    citation: str,     # guideline citation
)
```

If production output does not produce a `subtype` or `triggers` list, fill those with placeholder values (`subtype="production_unspecified"`, `triggers=[]`) and note this as a structural gap in the report. Subtype mismatch is a soft signal; state mismatch is the primary measure.

## Phase 3 — Patch the harness to be pluggable

The current `harness.py` imports rules statically (`from rules import assess_escalation_state, RuleResult`). Patch it to accept a `--rules` argument that loads a rules module from a path.

Add this to the imports:

```python
import importlib.util
```

Add this helper:

```python
def load_rules_module(path_str: str):
    """Load a rules module either by name (default) or by file path."""
    if path_str in (None, "", "rules"):
        import rules
        return rules
    path = Path(path_str).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Rules module not found: {path}")
    spec = importlib.util.spec_from_file_location("custom_rules", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["custom_rules"] = module
    spec.loader.exec_module(module)
    return module
```

Modify `run_all` to accept the rules module as an argument and call `rules_module.assess_escalation_state(...)` instead of the imported symbol. Modify `main()` to add `parser.add_argument("--rules", default="rules", ...)` and pass the loaded module through.

The `RuleResult` dataclass should still be imported from the reference `rules.py` for the harness's internal use — production adapters return whatever they want as long as it has `.state`, `.subtype`, `.triggers`, `.citation` attributes.

Verify the patch with `python harness.py` (default reference path) — should still produce 8/8 PASS.

## Phase 4 — Run and capture

Run three configurations and save each console output to a file.

```
python harness.py --json > runs/reference_calibration.txt
python harness.py --rules production_rules.py --json > runs/production_calibration.txt
python harness.py --rules production_rules.py --scenarios scenarios_adversarial.json --json > runs/production_adversarial.txt
```

Each run produces a `report_*.md` and a `report_*.json`. Keep them.

## Phase 5 — Diff report

Write `evals/eval-harness/production_validation_report.md` with the following sections.

**Summary table.** Per scenario (S01-S08 + ADV01-ADV03): scenario ID, ground-truth label, reference prediction, production prediction, agreement Y/N, notes. Mark any safety hard gate failures (production downgrades a ground-truth IMMEDIATE) with a CRITICAL flag.

**Safety hard gate check.** Explicitly state whether production caught all three IMMEDIATE-tier calibration scenarios (S01, S02, S03). Zero misses required. If any miss is found, stop and surface immediately to Atma before completing the rest of the report — this is a deploy-blocker.

**Calibration divergences.** For each scenario where reference and production disagree, list: the divergence (e.g. "production predicted WATCH, reference predicted SAME-DAY"), what triggered each, and a short hypothesis on why production behaves differently (missing rule, different threshold, different priority order).

**Adversarial coverage.** For each adversarial scenario, state whether production caught it correctly or fell into the same trap as reference. Three reference rule gaps are documented in the harness README — note whether production has the same gaps, fewer, or more.

**Structural gaps.** If production output is missing the `subtype`, `triggers`, or `citation` fields, document this. These are needed for coordinator alert UX and for guideline citation in the framework PDF.

**Recommendation.** Prioritized list of issues found. Do not fix anything in this task. Each item should include severity (CRITICAL safety / HIGH clinical accuracy / MEDIUM UX / LOW cosmetic), the affected scenario(s), and a one-line description.

## Constraints

- Do not modify any production code in this task. The point is to measure, not fix.
- Do not merge to main. Work on a branch named `eval/production-validation`.
- All work stays within `evals/eval-harness/`. No edits to product code, FHIR tools, or system prompts.
- If you discover a CRITICAL safety hard gate failure in production, halt and surface it before continuing the rest of the report.
- The harness has no third-party dependencies. Keep it that way. The adapter can use whatever the production codebase already uses.

## Deliverable

A single PR description in the branch summary covering:

1. Where production rules live (Phase 1 findings)
2. What adapter shape was used (Python direct or Node subprocess)
3. The headline numbers — calibration agreement %, hard gate misses, adversarial pass rate
4. The top 3 issues from the recommendation section
5. Files added or changed: `production_rules.py`, optionally `run_production.mjs`, patched `harness.py`, `production_validation_report.md`, `runs/*.txt`, `report_*.{md,json}`

Atma will review the report and decide which findings to address in product code. That is a separate task with separate scope.
