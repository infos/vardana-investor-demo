# Vardana — Calibration Harness Results

**Run date:** adversarial
**Rule set version:** reference implementation (Apr 27, 2026)
**Scenarios evaluated:** 3

## Summary

- **Label agreement:** 0/3 (0.0%)
- **Safety hard gates passed:** YES (0/0 IMMEDIATE caught)
- **False positives (over-escalation):** 0
- **False negatives (under-escalation):** 3

## Threshold Status

| Threshold | Target | Actual | Status |
|---|---|---|---|
| Label agreement | >=92% | 0.0% | FAIL |
| Safety hard gate misses | 0 | 0 | PASS |
| False positives | <=1 | 0 | PASS |

## Confusion Matrix

Rows = ground truth, columns = predicted. Diagonal = correct.

| Ground truth \ Predicted | ROUTINE | WATCH | SAME-DAY | IMMEDIATE |
|---|---|---|---|---|
| ROUTINE | 0 | 0 | 0 | 0 |
| WATCH | 1 | 0 | 0 | 0 |
| SAME-DAY | 1 | 1 | 0 | 0 |
| IMMEDIATE | 0 | 0 | 0 | 0 |

## Per-Scenario Detail

### ADV01 - Severe HTN at 198/126 but ZERO end-organ symptoms (urgency, not emergency) - FAIL

- **Patient:** Marcus Williams
- **Ground truth:** SAME-DAY (hypertensive_urgency)
- **Predicted:** WATCH (stage1_drift_asymptomatic_adherent)
- **Triggers:** bp_avg_142_88, asymptomatic, adherent
- **Citation:** 2025 AHA/ACC HTN Guideline · Stage 1 + DM target <130/80 (no urgent intervention required)
- **Discrepancy:** state mismatch

### ADV02 - Glucose 51 but NO neuroglycopenic symptoms (Level 2 by number, asymptomatic) - FAIL

- **Patient:** Linda Patel
- **Ground truth:** SAME-DAY (asymptomatic_level2_hypoglycemia)
- **Predicted:** ROUTINE (routine_default)
- **Triggers:** no_higher_priority_rule_fired
- **Citation:** 2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot
- **Discrepancy:** state mismatch

### ADV03 - Stage 2 BP sustained but adherence is fully verified - FAIL

- **Patient:** Marcus Williams
- **Ground truth:** WATCH (stage2_sustained_adherent)
- **Predicted:** ROUTINE (routine_default)
- **Triggers:** no_higher_priority_rule_fired
- **Citation:** 2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot
- **Discrepancy:** state mismatch
