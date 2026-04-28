# Vardana — Clinical Calibration Harness

A standalone evaluation harness for the Vardana cardiometabolic (HTN + T2DM)
escalation rule set. Loads scenarios from JSON, runs them through the rule set
in `rules.py`, and emits per-scenario results, a confusion matrix, safety
hard-gate verification, and a markdown report.

## What this is

A test runner for the deterministic escalation logic. It answers:

- Does the rule set produce the expected escalation state for each canonical
  scenario?
- Do all IMMEDIATE-tier safety hard gates fire correctly? (zero misses required)
- How many false positives (over-escalation) does the rule set produce?
- Where does the rule set fail when probed with adversarial scenarios?

## What this is NOT

**This is not clinical validation.** The 8 calibration scenarios in
`scenarios.json` and the rules in `rules.py` were authored from the same source
documents (the scenarios doc and the clinical eval spec). When the harness is
run against the calibration set in this state, 100% pass is the expected
result. It proves the harness wiring works. It does not prove the rules are
clinically correct.

Real validation comes from divergence:

1. A physician adjudicator reviews `scenarios.json` ground-truth labels and
   amends them. Re-running the harness against the amended ground truth shows
   where the rule set disagrees with clinical judgment.
2. An adversarial scenario set (see `scenarios_adversarial.json`) probes edge
   cases the calibration set does not cover. Failures here are real rule gaps.

## Files

```
eval-harness/
  scenarios.json              # 8 calibration scenarios + 3 patient personas
  scenarios_adversarial.json  # edge cases that intentionally probe rule gaps
  rules.py                    # the deterministic rule set under test
  harness.py                  # test runner
  report_<stem>.md            # generated markdown report (per scenarios file)
  report_<stem>.json          # optional structured results
```

## Running

```bash
# Default: run the 8 calibration scenarios
python harness.py

# Run the adversarial set
python harness.py --scenarios scenarios_adversarial.json

# Also emit a JSON results file
python harness.py --json

# Custom output path
python harness.py --report /tmp/my_report.md
```

Exit code is 0 when all safety hard gates pass, 2 otherwise. Useful for CI.

Requires Python 3.10+. No third-party dependencies.

## Output you can show

The console summary is paste-ready:

```
================================================================
Vardana Calibration Harness
================================================================
  Scenarios:        8
  Label agreement:  8/8 (100.0%)
  Safety gates:     PASS (0 misses)
  False positives:  0
  False negatives:  0
----------------------------------------------------------------
  [OK] S01  gt=IMMEDIATE  pred=IMMEDIATE  Hypertensive emergency...
  [OK] S02  gt=IMMEDIATE  pred=IMMEDIATE  Level 2 hypoglycemia...
  ...
================================================================
```

`report_scenarios.md` is the full per-scenario writeup with confusion matrix
and threshold pass/fail. Use this in clinician or pilot conversations as
"here's the current rule set running deterministically against the calibration
scenarios."

## Pre-adjudication usage (recommended)

Run the harness now, before physician calibration review, for two reasons:

1. **Sharper adjudication review.** Hand the physician (Teja or any clinic
   reviewer) the harness output alongside the scenarios doc. Instead of "tell
   us what the right answer is in the abstract," the question becomes "here is
   what our algorithm produces for each scenario today; where do you disagree
   and why?" That converts adjudication from a paper exercise into a real bug
   review.

2. **Adversarial testing surfaces real gaps.** Running
   `scenarios_adversarial.json` immediately exposes three rule gaps not covered
   by the calibration set (hypertensive urgency without end-organ symptoms,
   asymptomatic Level 2 hypoglycemia, sustained Stage 2 BP without adherence
   gap). Fix these before involving an external reviewer so the calibration
   review is about clinical judgment, not basic completeness.

## Extending

### Add a scenario

Add an entry to the `scenarios` array in `scenarios.json` (or a new file). Each
scenario needs:

- `id`, `patient_id`, `title`, `journey_day`
- `ground_truth`: one of `ROUTINE | WATCH | SAME-DAY | IMMEDIATE`
- `ground_truth_subtype`: a short identifier for the clinical subtype
- `vitals`, `labs`, `symptoms`, `context`: structured fields the rules consume

The harness will pick it up automatically.

### Add or modify a rule

Edit `rules.py`. Each rule is a function that takes the scenario dict and
returns a `RuleResult` (or `None` if the rule does not fire). Add the new rule
function to `RULE_ORDER` at the right priority level. The first rule that
fires wins.

### Replace with the production rule set

Replace `assess_escalation_state` in `rules.py` with a call into your
production logic. The harness only requires that `assess_escalation_state(s,
patient)` returns an object with `state`, `subtype`, `triggers`, and
`citation` fields.

## Thresholds

These are the threshold targets the harness checks against. Defined here so
they are visible alongside the rules they validate.

| Threshold                     | Target |
|-------------------------------|--------|
| Label agreement on calibration set | >=92% |
| Safety hard gate misses       | 0      |
| False positives               | <=1    |

The 0-allowed safety hard gate threshold is non-negotiable. The other two are
calibration targets that may be tightened after physician review.
