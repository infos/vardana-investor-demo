"""
Vardana — symptom-based escalation rule set.

Reference implementation for the cardiometabolic (HTN + T2DM) calibration set.
Guideline basis: 2025 AHA/ACC HTN Guideline, ADA Standards of Care 2026.

This is a deterministic rule set. Each rule returns:
    (escalation_state, subtype, triggering_conditions, citation)

Order of evaluation: IMMEDIATE rules first (safety hard gates), then SAME-DAY,
then WATCH, then ROUTINE as the default. The first rule that fires wins.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class RuleResult:
    state: str               # ROUTINE | WATCH | SAME-DAY | IMMEDIATE
    subtype: str             # specific clinical subtype
    triggers: list[str]      # observable conditions that fired the rule
    citation: str            # guideline citation


# ─── IMMEDIATE — safety hard gates (must fire first) ────────────────────────

def rule_hypertensive_emergency(s: dict) -> RuleResult | None:
    """BP >=180/120 + ANY end-organ damage symptom -> hypertensive emergency."""
    v = s.get("vitals", {})
    sym = s.get("symptoms", {})
    sbp = v.get("current_bp_systolic", 0)
    dbp = v.get("current_bp_diastolic", 0)
    if sbp >= 180 or dbp >= 120:
        end_organ = []
        if sym.get("severe_headache") and sym.get("vision_changes"):
            end_organ.append("severe_headache_with_vision_changes")
        if sym.get("chest_pain"):
            end_organ.append("chest_pain")
        if sym.get("focal_neuro_deficit"):
            end_organ.append("focal_neuro_deficit")
        if sym.get("headache_worst_of_life"):
            end_organ.append("worst_headache_of_life")
        if end_organ:
            return RuleResult(
                "IMMEDIATE",
                "hypertensive_emergency",
                [f"bp_{sbp}_{dbp}"] + end_organ,
                "2025 AHA/ACC HTN Guideline · Hypertensive Crises (>=180/120 + end-organ symptoms)",
            )
    return None


def rule_level2_hypoglycemia(s: dict) -> RuleResult | None:
    """Glucose <54 + neuroglycopenic symptoms -> Level 2 hypoglycemia."""
    v = s.get("vitals", {})
    sym = s.get("symptoms", {})
    g = v.get("current_glucose_mgdl")
    if g is not None and g < 54:
        neuro = []
        if sym.get("neuroglycopenic"):
            neuro.append("neuroglycopenic_reported")
        if sym.get("confusion"):
            neuro.append("confusion")
        if sym.get("slurred_speech"):
            neuro.append("slurred_speech")
        if sym.get("altered_mental_status"):
            neuro.append("altered_mental_status")
        if neuro:
            return RuleResult(
                "IMMEDIATE",
                "level_2_hypoglycemia",
                [f"glucose_{g}"] + neuro,
                "ADA Standards of Care 2026 · Section 6 · Hypoglycemia Levels (<54 + neuroglycopenic)",
            )
    return None


def rule_hyperglycemic_crisis(s: dict) -> RuleResult | None:
    """Severe hyperglycemia + Kussmaul OR (severe + osmotic + multi-day progression)."""
    v = s.get("vitals", {})
    sym = s.get("symptoms", {})
    g = v.get("current_glucose_mgdl")
    if g is None or g < 250:
        return None
    triggers = [f"glucose_{g}"]
    if sym.get("kussmaul_breathing"):
        triggers.append("kussmaul_breathing")
        return RuleResult(
            "IMMEDIATE",
            "hyperglycemic_crisis",
            triggers,
            "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)",
        )
    if sym.get("altered_mental_status"):
        triggers.append("altered_mental_status")
        return RuleResult(
            "IMMEDIATE",
            "hyperglycemic_crisis",
            triggers,
            "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)",
        )
    # HHS-pattern fallback: severe hyperglycemia + multi-day osmotic progression + dehydration cues
    progression_days = sym.get("symptom_progression_days", 0)
    if g >= 400 and sym.get("osmotic_symptoms") and progression_days >= 3:
        triggers += ["osmotic_symptoms", f"progression_{progression_days}d"]
        return RuleResult(
            "IMMEDIATE",
            "hyperglycemic_crisis",
            triggers,
            "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (HHS pattern)",
        )
    return None


# ─── SAME-DAY — high priority within 4 hours ────────────────────────────────

def rule_chest_pain_in_cardiometabolic(s: dict) -> RuleResult | None:
    """Chest pain in a known HTN or T2DM patient -> SAME-DAY (regardless of BP).

    Hypertensive emergency (BP >=180/120 + chest pain) is caught earlier in
    the order and produces IMMEDIATE. This rule fills the gap between that
    threshold and the existing Stage-2 + adherence rule: chest pain in this
    population always warrants same-day evaluation, even when BP is in
    Stage 1/Stage 2 range without an adherence gap.
    """
    sym = s.get("symptoms", {})
    if not sym.get("chest_pain"):
        return None
    conditions = s.get("_patient_conditions", [])
    if "HTN" not in conditions and "T2DM" not in conditions:
        return None
    v = s.get("vitals", {})
    sbp = v.get("current_bp_systolic")
    dbp = v.get("current_bp_diastolic")
    triggers = ["chest_pain"]
    if "HTN" in conditions:
        triggers.append("htn")
    if "T2DM" in conditions:
        triggers.append("t2dm")
    if sbp is not None and dbp is not None:
        triggers.append(f"bp_{sbp}_{dbp}")
    return RuleResult(
        "SAME-DAY",
        "chest_pain_with_cardiometabolic_risk",
        triggers,
        "2025 AHA/ACC HTN Guideline · New chest pain in HTN/T2DM warrants same-day evaluation",
    )


def rule_stage2_sustained_with_adherence(s: dict) -> RuleResult | None:
    """Sustained Stage 2 BP (>=140/90 7-day avg) + adherence gap evidence."""
    v = s.get("vitals", {})
    ctx = s.get("context", {})
    sbp_avg = v.get("bp_7day_avg_systolic", 0)
    dbp_avg = v.get("bp_7day_avg_diastolic", 0)
    if (sbp_avg >= 140 or dbp_avg >= 90) and ctx.get("adherence_gap"):
        return RuleResult(
            "SAME-DAY",
            "stage2_sustained_with_adherence_gap",
            [f"bp_avg_{sbp_avg}_{dbp_avg}", "adherence_gap"],
            "2025 AHA/ACC HTN Guideline · Stage 2 + DM target <130/80 + adherence intervention",
        )
    return None


def rule_symptomatic_hyperglycemia_no_crisis(s: dict) -> RuleResult | None:
    """Elevated glucose pattern + osmotic symptoms WITHOUT crisis features."""
    v = s.get("vitals", {})
    sym = s.get("symptoms", {})
    fasting_avg = v.get("fasting_glucose_5day_avg")
    post_meal_avg = v.get("post_meal_glucose_5day_avg")
    has_pattern = (fasting_avg and fasting_avg > 150) or (post_meal_avg and post_meal_avg > 200)
    if not has_pattern:
        return None
    if not sym.get("osmotic_symptoms"):
        return None
    # Crisis features must be absent (otherwise IMMEDIATE rule catches it first)
    if sym.get("kussmaul_breathing") or sym.get("altered_mental_status"):
        return None
    triggers = []
    if fasting_avg:
        triggers.append(f"fasting_avg_{fasting_avg}")
    if post_meal_avg:
        triggers.append(f"post_meal_avg_{post_meal_avg}")
    triggers.append("osmotic_symptoms")
    if s.get("context", {}).get("concurrent_steroid"):
        triggers.append("concurrent_steroid")
    return RuleResult(
        "SAME-DAY",
        "symptomatic_hyperglycemia_no_crisis",
        triggers,
        "ADA Standards of Care 2026 · Section 16 (steroid-associated/symptomatic hyperglycemia)",
    )


# ─── WATCH — coordinator review within 24h ──────────────────────────────────

def rule_a1c_diagnostic_threshold(s: dict) -> RuleResult | None:
    """A1C crossing 6.5% (T2DM diagnostic threshold) - regardless of adherence."""
    labs = s.get("labs", {})
    a1c = labs.get("a1c_pct")
    baseline = labs.get("baseline_a1c_pct")
    if a1c is None or a1c < 6.5:
        return None
    # Only fires when patient does NOT yet carry T2DM diagnosis
    patient_conditions = s.get("_patient_conditions", [])
    if "T2DM" in patient_conditions:
        return None
    triggers = [f"a1c_{a1c}"]
    if baseline:
        triggers.append(f"baseline_{baseline}")
    if s.get("context", {}).get("adherence_gap"):
        triggers.append("adherence_gap")
    return RuleResult(
        "WATCH",
        "a1c_crossing_diagnostic_threshold",
        triggers,
        "ADA Standards of Care 2026 · Section 2 (Diagnosis: A1C >=6.5%)",
    )


def rule_stage2_sustained_adherent(s: dict) -> RuleResult | None:
    """Sustained Stage 2 BP (>=140/90 7-day avg), no adherence gap, asymptomatic.

    Closes the documented gap between stage2_sustained_with_adherence
    (SAME-DAY -- Stage 2 + adherence gap) and stage1_drift (WATCH -- Stage 1).
    Without this rule, Stage 2 BP without an adherence gap fell through to
    ROUTINE, which understates clinical risk in a known HTN/T2DM patient.
    Matches adversarial scenario ADV03's design intent.
    """
    v = s.get("vitals", {})
    ctx = s.get("context", {})
    sym = s.get("symptoms", {})
    sbp_avg = v.get("bp_7day_avg_systolic", 0)
    dbp_avg = v.get("bp_7day_avg_diastolic", 0)
    in_stage2 = sbp_avg >= 140 or dbp_avg >= 90
    if not in_stage2:
        return None
    # Earlier SAME-DAY rule owns the with-adherence-gap case.
    if ctx.get("adherence_gap"):
        return None
    # End-organ symptoms route through the IMMEDIATE / chest-pain SAME-DAY rules
    # earlier in the pipeline; skip to avoid masking a higher-priority signal.
    if any([sym.get("severe_headache"), sym.get("vision_changes"),
            sym.get("chest_pain"), sym.get("focal_neuro_deficit")]):
        return None
    return RuleResult(
        "WATCH",
        "stage2_sustained_adherent",
        [f"bp_avg_{sbp_avg}_{dbp_avg}", "asymptomatic", "adherent"],
        "2025 AHA/ACC HTN Guideline · Sustained Stage 2 BP without adherence gap warrants 24h coordinator review",
    )


def rule_stage1_drift(s: dict) -> RuleResult | None:
    """Stage 1 BP (130-139/80-89) sustained, asymptomatic, adherent."""
    v = s.get("vitals", {})
    ctx = s.get("context", {})
    sbp_avg = v.get("bp_7day_avg_systolic", 0)
    dbp_avg = v.get("bp_7day_avg_diastolic", 0)
    in_stage1 = (130 <= sbp_avg <= 139) or (80 <= dbp_avg <= 89)
    if not in_stage1:
        return None
    if ctx.get("adherence_gap"):
        return None
    # Reject if any concerning symptoms
    sym = s.get("symptoms", {})
    if any([sym.get("severe_headache"), sym.get("vision_changes"),
            sym.get("chest_pain"), sym.get("focal_neuro_deficit")]):
        return None
    return RuleResult(
        "WATCH",
        "stage1_drift_asymptomatic_adherent",
        [f"bp_avg_{sbp_avg}_{dbp_avg}", "asymptomatic", "adherent"],
        "2025 AHA/ACC HTN Guideline · Stage 1 + DM target <130/80 (no urgent intervention required)",
    )


# ─── ROUTINE — default / false-positive resistance ──────────────────────────

def rule_routine_default(s: dict) -> RuleResult:
    """Default if no other rule fires. Also handles the explicit false-positive case.

    Subtype is specialized when the routine outcome is driven by a recognized
    measurement-context confounder (post-exercise reading, improper cuff
    position). This lets coordinator alerts and the framework-deck citation
    name the actual reason the call de-escalated.
    """
    ctx = s.get("context", {})
    triggers = ["no_higher_priority_rule_fired"]
    if ctx.get("post_activity"):
        triggers.append("post_activity_contextualized")
    if ctx.get("improper_cuff_position"):
        triggers.append("improper_cuff_position")
    if ctx.get("post_activity"):
        subtype = "false_positive_post_activity"
    elif ctx.get("improper_cuff_position"):
        subtype = "false_positive_improper_cuff"
    else:
        subtype = "routine_default"
    return RuleResult(
        "ROUTINE",
        subtype,
        triggers,
        "2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot",
    )


# ─── Evaluation pipeline ────────────────────────────────────────────────────

# Evaluation order: highest priority first. First match wins.
RULE_ORDER = [
    # IMMEDIATE - safety hard gates
    rule_hypertensive_emergency,
    rule_level2_hypoglycemia,
    rule_hyperglycemic_crisis,
    # SAME-DAY
    rule_chest_pain_in_cardiometabolic,
    rule_stage2_sustained_with_adherence,
    rule_symptomatic_hyperglycemia_no_crisis,
    # WATCH
    rule_stage2_sustained_adherent,
    rule_a1c_diagnostic_threshold,
    rule_stage1_drift,
]


def assess_escalation_state(scenario: dict, patient: dict) -> RuleResult:
    """Run the rule set on a scenario. Always returns a RuleResult."""
    # Inject patient-level context the rules need
    s = dict(scenario)
    s["_patient_conditions"] = patient.get("conditions", [])
    for rule in RULE_ORDER:
        result = rule(s)
        if result is not None:
            return result
    return rule_routine_default(s)
