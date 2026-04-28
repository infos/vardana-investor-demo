/**
 * escalation.ts
 *
 * Vardana cardiometabolic (HTN + T2DM) escalation rule set — TypeScript port
 * of `evals/eval-harness/rules.py`. Pure functions, no I/O, no side effects.
 *
 * Guideline basis: 2025 AHA/ACC HTN Guideline, ADA Standards of Care 2026.
 *
 * Each rule returns either an `EscalationResult` or `null`. The first rule
 * that fires wins. Evaluation order = highest priority first (IMMEDIATE
 * safety hard gates, then SAME-DAY, then WATCH, then ROUTINE default).
 *
 * Trigger strings and citation strings must match `rules.py` verbatim — they
 * are surfaced to coordinators via Flag resources and quoted in the framework
 * deck. Do not paraphrase.
 */

import type {
  EscalationResult,
  PatientInput,
  ScenarioInput,
} from "./escalation.types.js";

// Internal scenario shape with patient conditions injected, mirroring how the
// Python reference implementation passes context through the rules.
interface ScenarioWithPatient extends ScenarioInput {
  _patient_conditions: string[];
}

// ─── IMMEDIATE — safety hard gates (must fire first) ──────────────────────

function ruleHypertensiveEmergency(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const sym = s.symptoms;
  const sbp = v.current_bp_systolic ?? 0;
  const dbp = v.current_bp_diastolic ?? 0;
  if (sbp >= 180 || dbp >= 120) {
    const endOrgan: string[] = [];
    if (sym.severe_headache && sym.vision_changes) {
      endOrgan.push("severe_headache_with_vision_changes");
    }
    if (sym.chest_pain) endOrgan.push("chest_pain");
    if (sym.focal_neuro_deficit) endOrgan.push("focal_neuro_deficit");
    if (sym.headache_worst_of_life) endOrgan.push("worst_headache_of_life");
    if (endOrgan.length > 0) {
      return {
        state: "IMMEDIATE",
        subtype: "hypertensive_emergency",
        triggers: [`bp_${sbp}_${dbp}`, ...endOrgan],
        citation:
          "2025 AHA/ACC HTN Guideline · Hypertensive Crises (>=180/120 + end-organ symptoms)",
      };
    }
  }
  return null;
}

function ruleLevel2Hypoglycemia(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const sym = s.symptoms;
  const g = v.current_glucose_mgdl;
  if (g != null && g < 54) {
    const neuro: string[] = [];
    if (sym.neuroglycopenic) neuro.push("neuroglycopenic_reported");
    if (sym.confusion) neuro.push("confusion");
    if (sym.slurred_speech) neuro.push("slurred_speech");
    if (sym.altered_mental_status) neuro.push("altered_mental_status");
    if (neuro.length > 0) {
      return {
        state: "IMMEDIATE",
        subtype: "level_2_hypoglycemia",
        triggers: [`glucose_${g}`, ...neuro],
        citation:
          "ADA Standards of Care 2026 · Section 6 · Hypoglycemia Levels (<54 + neuroglycopenic)",
      };
    }
  }
  return null;
}

function ruleHyperglycemicCrisis(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const sym = s.symptoms;
  const g = v.current_glucose_mgdl;
  if (g == null || g < 250) return null;
  const triggers: string[] = [`glucose_${g}`];
  if (sym.kussmaul_breathing) {
    triggers.push("kussmaul_breathing");
    return {
      state: "IMMEDIATE",
      subtype: "hyperglycemic_crisis",
      triggers,
      citation:
        "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)",
    };
  }
  if (sym.altered_mental_status) {
    triggers.push("altered_mental_status");
    return {
      state: "IMMEDIATE",
      subtype: "hyperglycemic_crisis",
      triggers,
      citation:
        "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)",
    };
  }
  // HHS-pattern fallback: severe hyperglycemia + multi-day osmotic progression + dehydration cues
  const progressionDays = sym.symptom_progression_days ?? 0;
  if (g >= 400 && sym.osmotic_symptoms && progressionDays >= 3) {
    triggers.push("osmotic_symptoms", `progression_${progressionDays}d`);
    return {
      state: "IMMEDIATE",
      subtype: "hyperglycemic_crisis",
      triggers,
      citation:
        "ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (HHS pattern)",
    };
  }
  return null;
}

// ─── SAME-DAY — high priority within 4 hours ─────────────────────────────

function ruleChestPainInCardiometabolic(s: ScenarioWithPatient): EscalationResult | null {
  // Chest pain in a known HTN or T2DM patient -> SAME-DAY (regardless of BP).
  // Fills the gap between hypertensive_emergency (BP >=180/120 + symptoms,
  // IMMEDIATE) and stage2_sustained_with_adherence (Stage 2 + adherence gap).
  // Chest pain in this population always warrants same-day evaluation.
  const sym = s.symptoms;
  if (!sym.chest_pain) return null;
  const conditions = s._patient_conditions || [];
  if (!conditions.includes("HTN") && !conditions.includes("T2DM")) return null;
  const v = s.vitals;
  const sbp = v.current_bp_systolic;
  const dbp = v.current_bp_diastolic;
  const triggers: string[] = ["chest_pain"];
  if (conditions.includes("HTN")) triggers.push("htn");
  if (conditions.includes("T2DM")) triggers.push("t2dm");
  if (sbp != null && dbp != null) triggers.push(`bp_${sbp}_${dbp}`);
  return {
    state: "SAME-DAY",
    subtype: "chest_pain_with_cardiometabolic_risk",
    triggers,
    citation:
      "2025 AHA/ACC HTN Guideline · New chest pain in HTN/T2DM warrants same-day evaluation",
  };
}

function ruleStage2SustainedWithAdherence(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const ctx = s.context;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  if ((sbpAvg >= 140 || dbpAvg >= 90) && ctx.adherence_gap) {
    return {
      state: "SAME-DAY",
      subtype: "stage2_sustained_with_adherence_gap",
      triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, "adherence_gap"],
      citation:
        "2025 AHA/ACC HTN Guideline · Stage 2 + DM target <130/80 + adherence intervention",
    };
  }
  return null;
}

function ruleSymptomaticHyperglycemiaNoCrisis(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const sym = s.symptoms;
  const fastingAvg = v.fasting_glucose_5day_avg;
  const postMealAvg = v.post_meal_glucose_5day_avg;
  const hasPattern =
    (fastingAvg != null && fastingAvg > 150) ||
    (postMealAvg != null && postMealAvg > 200);
  if (!hasPattern) return null;
  if (!sym.osmotic_symptoms) return null;
  // Crisis features must be absent (otherwise IMMEDIATE rule catches it first)
  if (sym.kussmaul_breathing || sym.altered_mental_status) return null;
  const triggers: string[] = [];
  if (fastingAvg != null) triggers.push(`fasting_avg_${fastingAvg}`);
  if (postMealAvg != null) triggers.push(`post_meal_avg_${postMealAvg}`);
  triggers.push("osmotic_symptoms");
  if (s.context.concurrent_steroid) triggers.push("concurrent_steroid");
  return {
    state: "SAME-DAY",
    subtype: "symptomatic_hyperglycemia_no_crisis",
    triggers,
    citation:
      "ADA Standards of Care 2026 · Section 16 (steroid-associated/symptomatic hyperglycemia)",
  };
}

// ─── WATCH — coordinator review within 24h ───────────────────────────────

function ruleStage2SustainedAdherent(s: ScenarioWithPatient): EscalationResult | null {
  // Sustained Stage 2 BP (>=140/90 7-day avg), no adherence gap, asymptomatic.
  // Closes the gap between stage2_sustained_with_adherence (SAME-DAY) and
  // stage1_drift (WATCH). Without this rule, Stage 2 BP without an adherence
  // gap falls through to ROUTINE, which understates clinical risk in a known
  // HTN/T2DM patient. Matches adversarial scenario ADV03.
  const v = s.vitals;
  const ctx = s.context;
  const sym = s.symptoms;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  const inStage2 = sbpAvg >= 140 || dbpAvg >= 90;
  if (!inStage2) return null;
  if (ctx.adherence_gap) return null;
  if (sym.severe_headache || sym.vision_changes || sym.chest_pain || sym.focal_neuro_deficit) {
    return null;
  }
  return {
    state: "WATCH",
    subtype: "stage2_sustained_adherent",
    triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, "asymptomatic", "adherent"],
    citation:
      "2025 AHA/ACC HTN Guideline · Sustained Stage 2 BP without adherence gap warrants 24h coordinator review",
  };
}

function ruleA1cDiagnosticThreshold(s: ScenarioWithPatient): EscalationResult | null {
  const labs = s.labs;
  const a1c = labs.a1c_pct;
  const baseline = labs.baseline_a1c_pct;
  if (a1c == null || a1c < 6.5) return null;
  // Only fires when patient does NOT yet carry T2DM diagnosis
  if (s._patient_conditions.includes("T2DM")) return null;
  const triggers: string[] = [`a1c_${a1c}`];
  if (baseline != null) triggers.push(`baseline_${baseline}`);
  if (s.context.adherence_gap) triggers.push("adherence_gap");
  return {
    state: "WATCH",
    subtype: "a1c_crossing_diagnostic_threshold",
    triggers,
    citation: "ADA Standards of Care 2026 · Section 2 (Diagnosis: A1C >=6.5%)",
  };
}

function ruleStage1WithAdherenceGap(s: ScenarioWithPatient): EscalationResult | null {
  // Stage 1 BP (130-139/80-89) + adherence gap -> WATCH. Less acute than
  // Stage 2 + adherence gap (SAME-DAY), but still warrants coordinator
  // follow-up within 24h. Without this rule the case fell through to
  // ROUTINE, which understated the clinical signal.
  const v = s.vitals;
  const ctx = s.context;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  const inStage1 = (sbpAvg >= 130 && sbpAvg <= 139) || (dbpAvg >= 80 && dbpAvg <= 89);
  if (!inStage1) return null;
  if (!ctx.adherence_gap) return null;
  return {
    state: "WATCH",
    subtype: "stage1_with_adherence_gap",
    triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, "adherence_gap"],
    citation:
      "2025 AHA/ACC HTN Guideline · Stage 1 BP + adherence intervention warrants 24h coordinator follow-up",
  };
}

function ruleStage1Drift(s: ScenarioWithPatient): EscalationResult | null {
  const v = s.vitals;
  const ctx = s.context;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  const inStage1 = (sbpAvg >= 130 && sbpAvg <= 139) || (dbpAvg >= 80 && dbpAvg <= 89);
  if (!inStage1) return null;
  if (ctx.adherence_gap) return null;
  // Reject if any concerning symptoms
  const sym = s.symptoms;
  if (sym.severe_headache || sym.vision_changes || sym.chest_pain || sym.focal_neuro_deficit) {
    return null;
  }
  return {
    state: "WATCH",
    subtype: "stage1_drift_asymptomatic_adherent",
    triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, "asymptomatic", "adherent"],
    citation:
      "2025 AHA/ACC HTN Guideline · Stage 1 + DM target <130/80 (no urgent intervention required)",
  };
}

// ─── ROUTINE — default / false-positive resistance ────────────────────────

function ruleRoutineDefault(s: ScenarioWithPatient): EscalationResult {
  const ctx = s.context;
  const triggers: string[] = ["no_higher_priority_rule_fired"];
  if (ctx.post_activity) triggers.push("post_activity_contextualized");
  if (ctx.improper_cuff_position) triggers.push("improper_cuff_position");
  // Specialize subtype when routine outcome is driven by a recognized
  // measurement-context confounder (post-exercise, improper cuff). Lets the
  // coordinator alert and framework-deck citation name the actual reason.
  let subtype: string;
  if (ctx.post_activity) {
    subtype = "false_positive_post_activity";
  } else if (ctx.improper_cuff_position) {
    subtype = "false_positive_improper_cuff";
  } else {
    subtype = "routine_default";
  }
  return {
    state: "ROUTINE",
    subtype,
    triggers,
    citation:
      "2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot",
  };
}

// ─── Evaluation pipeline ──────────────────────────────────────────────────

// Evaluation order: highest priority first. First match wins.
const RULE_ORDER: Array<(s: ScenarioWithPatient) => EscalationResult | null> = [
  // IMMEDIATE — safety hard gates
  ruleHypertensiveEmergency,
  ruleLevel2Hypoglycemia,
  ruleHyperglycemicCrisis,
  // SAME-DAY
  ruleChestPainInCardiometabolic,
  ruleStage2SustainedWithAdherence,
  ruleSymptomaticHyperglycemiaNoCrisis,
  // WATCH
  ruleStage2SustainedAdherent,
  ruleA1cDiagnosticThreshold,
  ruleStage1WithAdherenceGap,
  ruleStage1Drift,
];

export function assessEscalationState(
  scenario: ScenarioInput,
  patient: PatientInput,
): EscalationResult {
  // Default every sub-object to {} so each rule can safely read fields
  // without nullish-checking the parent. Mirrors the `s.get("labs", {})`
  // defensive lookup in the Python reference implementation.
  const s: ScenarioWithPatient = {
    vitals: scenario.vitals ?? {},
    labs: scenario.labs ?? {},
    symptoms: scenario.symptoms ?? {},
    context: scenario.context ?? {},
    _patient_conditions: patient.conditions ?? [],
  };
  for (const rule of RULE_ORDER) {
    const result = rule(s);
    if (result !== null) return result;
  }
  return ruleRoutineDefault(s);
}

// Re-export types so callers can import everything from this module.
export type {
  EscalationResult,
  EscalationState,
  PatientInput,
  ScenarioInput,
} from "./escalation.types.js";
