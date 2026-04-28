# Vardana — Calibration Harness Results

**Run date:** 2026-04-27
**Rule set version:** reference implementation (Apr 27, 2026)
**Scenarios evaluated:** 8

## Summary

- **Label agreement:** 8/8 (100.0%)
- **Safety hard gates passed:** YES (3/3 IMMEDIATE caught)
- **False positives (over-escalation):** 0
- **False negatives (under-escalation):** 0

## Threshold Status

| Threshold | Target | Actual | Status |
|---|---|---|---|
| Label agreement | >=92% | 100.0% | PASS |
| Safety hard gate misses | 0 | 0 | PASS |
| False positives | <=1 | 0 | PASS |

## Confusion Matrix

Rows = ground truth, columns = predicted. Diagonal = correct.

| Ground truth \ Predicted | ROUTINE | WATCH | SAME-DAY | IMMEDIATE |
|---|---|---|---|---|
| ROUTINE | 1 | 0 | 0 | 0 |
| WATCH | 0 | 2 | 0 | 0 |
| SAME-DAY | 0 | 0 | 2 | 0 |
| IMMEDIATE | 0 | 0 | 0 | 3 |

## Per-Scenario Detail

### S01 - Hypertensive emergency with end-organ damage symptoms - PASS

- **Patient:** Marcus Williams
- **Ground truth:** IMMEDIATE (hypertensive_emergency)
- **Predicted:** IMMEDIATE (hypertensive_emergency)
- **Triggers:** bp_198_126, severe_headache_with_vision_changes, chest_pain, worst_headache_of_life
- **Citation:** 2025 AHA/ACC HTN Guideline · Hypertensive Crises (>=180/120 + end-organ symptoms)

### S02 - Level 2 hypoglycemia with neuroglycopenic symptoms - PASS

- **Patient:** Linda Patel
- **Ground truth:** IMMEDIATE (level_2_hypoglycemia)
- **Predicted:** IMMEDIATE (level_2_hypoglycemia)
- **Triggers:** glucose_48, neuroglycopenic_reported, confusion, slurred_speech, altered_mental_status
- **Citation:** ADA Standards of Care 2026 · Section 6 · Hypoglycemia Levels (<54 + neuroglycopenic)

### S03 - Hyperglycemic crisis presentation (DKA / HHS concern) - PASS

- **Patient:** Marcus Williams
- **Ground truth:** IMMEDIATE (hyperglycemic_crisis)
- **Predicted:** IMMEDIATE (hyperglycemic_crisis)
- **Triggers:** glucose_412, kussmaul_breathing
- **Citation:** ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)

### S04 - Stage 2 sustained HTN with confirmed adherence gap - PASS

- **Patient:** Marcus Williams
- **Ground truth:** SAME-DAY (stage2_sustained_with_adherence_gap)
- **Predicted:** SAME-DAY (stage2_sustained_with_adherence_gap)
- **Triggers:** bp_avg_159_96, adherence_gap
- **Citation:** 2025 AHA/ACC HTN Guideline · Stage 2 + DM target <130/80 + adherence intervention

### S05 - Symptomatic hyperglycemia in T2DM, no crisis features - PASS

- **Patient:** Linda Patel
- **Ground truth:** SAME-DAY (symptomatic_hyperglycemia_no_crisis)
- **Predicted:** SAME-DAY (symptomatic_hyperglycemia_no_crisis)
- **Triggers:** fasting_avg_176, post_meal_avg_263, osmotic_symptoms, concurrent_steroid
- **Citation:** ADA Standards of Care 2026 · Section 16 (steroid-associated/symptomatic hyperglycemia)

### S06 - Stage 1 BP drift with controlled T2DM - PASS

- **Patient:** Marcus Williams
- **Ground truth:** WATCH (stage1_drift_asymptomatic_adherent)
- **Predicted:** WATCH (stage1_drift_asymptomatic_adherent)
- **Triggers:** bp_avg_135_83, asymptomatic, adherent
- **Citation:** 2025 AHA/ACC HTN Guideline · Stage 1 + DM target <130/80 (no urgent intervention required)

### S07 - A1C drift with adherence gap identified - PASS

- **Patient:** David Brooks
- **Ground truth:** WATCH (a1c_crossing_diagnostic_threshold)
- **Predicted:** WATCH (a1c_crossing_diagnostic_threshold)
- **Triggers:** a1c_6.5, baseline_6.2, adherence_gap
- **Citation:** ADA Standards of Care 2026 · Section 2 (Diagnosis: A1C >=6.5%)

### S08 - Near-threshold reading in well-controlled patient (false-positive test) - PASS

- **Patient:** Linda Patel
- **Ground truth:** ROUTINE (false_positive_post_activity)
- **Predicted:** ROUTINE (false_positive_post_activity)
- **Triggers:** no_higher_priority_rule_fired, post_activity_contextualized, improper_cuff_position
- **Citation:** 2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot
