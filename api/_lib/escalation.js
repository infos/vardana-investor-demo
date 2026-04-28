/**
 * api/_lib/escalation.js
 *
 * CommonJS port of the cardiometabolic (HTN + T2DM) escalation rule set.
 * Mirrors `src/lib/clinical-skills/escalation.ts` and the Python reference
 * at `evals/eval-harness/rules.py`. Trigger and citation strings are verbatim
 * across all three runtimes — the framework deck quotes them.
 *
 * Pure functions. No I/O, no LLM, no fetches. First-match-wins evaluation.
 *
 * Vercel functions in `api/` use CommonJS, so this file does not import from
 * the TypeScript source — it carries an independent copy of the same rules.
 * If a divergence is found, fix `evals/eval-harness/rules.py` first, then
 * propagate to `escalation.ts` and here.
 */

// ─── IMMEDIATE — safety hard gates (must fire first) ──────────────────────

function ruleHypertensiveEmergency(s) {
  const v = s.vitals;
  const sym = s.symptoms;
  const sbp = v.current_bp_systolic ?? 0;
  const dbp = v.current_bp_diastolic ?? 0;
  if (sbp >= 180 || dbp >= 120) {
    const endOrgan = [];
    if (sym.severe_headache && sym.vision_changes) {
      endOrgan.push('severe_headache_with_vision_changes');
    }
    if (sym.chest_pain) endOrgan.push('chest_pain');
    if (sym.focal_neuro_deficit) endOrgan.push('focal_neuro_deficit');
    if (sym.headache_worst_of_life) endOrgan.push('worst_headache_of_life');
    if (endOrgan.length > 0) {
      return {
        state: 'IMMEDIATE',
        subtype: 'hypertensive_emergency',
        triggers: [`bp_${sbp}_${dbp}`, ...endOrgan],
        citation:
          '2025 AHA/ACC HTN Guideline · Hypertensive Crises (>=180/120 + end-organ symptoms)',
      };
    }
  }
  return null;
}

function ruleLevel2Hypoglycemia(s) {
  const v = s.vitals;
  const sym = s.symptoms;
  const g = v.current_glucose_mgdl;
  if (g != null && g < 54) {
    const neuro = [];
    if (sym.neuroglycopenic) neuro.push('neuroglycopenic_reported');
    if (sym.confusion) neuro.push('confusion');
    if (sym.slurred_speech) neuro.push('slurred_speech');
    if (sym.altered_mental_status) neuro.push('altered_mental_status');
    if (neuro.length > 0) {
      return {
        state: 'IMMEDIATE',
        subtype: 'level_2_hypoglycemia',
        triggers: [`glucose_${g}`, ...neuro],
        citation:
          'ADA Standards of Care 2026 · Section 6 · Hypoglycemia Levels (<54 + neuroglycopenic)',
      };
    }
  }
  return null;
}

function ruleHyperglycemicCrisis(s) {
  const v = s.vitals;
  const sym = s.symptoms;
  const g = v.current_glucose_mgdl;
  if (g == null || g < 250) return null;
  const triggers = [`glucose_${g}`];
  if (sym.kussmaul_breathing) {
    triggers.push('kussmaul_breathing');
    return {
      state: 'IMMEDIATE',
      subtype: 'hyperglycemic_crisis',
      triggers,
      citation:
        'ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)',
    };
  }
  if (sym.altered_mental_status) {
    triggers.push('altered_mental_status');
    return {
      state: 'IMMEDIATE',
      subtype: 'hyperglycemic_crisis',
      triggers,
      citation:
        'ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (DKA/HHS)',
    };
  }
  const progressionDays = sym.symptom_progression_days ?? 0;
  if (g >= 400 && sym.osmotic_symptoms && progressionDays >= 3) {
    triggers.push('osmotic_symptoms', `progression_${progressionDays}d`);
    return {
      state: 'IMMEDIATE',
      subtype: 'hyperglycemic_crisis',
      triggers,
      citation:
        'ADA Standards of Care 2026 · Section 16 · Hyperglycemic Crises (HHS pattern)',
    };
  }
  return null;
}

// ─── SAME-DAY ─────────────────────────────────────────────────────────────

function ruleChestPainInCardiometabolic(s) {
  // Chest pain in a known HTN or T2DM patient -> SAME-DAY (regardless of BP).
  // Fills the gap between hypertensive_emergency (BP >=180/120 + symptoms,
  // IMMEDIATE) and stage2_sustained_with_adherence (Stage 2 + adherence gap).
  // Chest pain in this population always warrants same-day evaluation.
  const sym = s.symptoms;
  if (!sym.chest_pain) return null;
  const conditions = s._patient_conditions || [];
  if (!conditions.includes('HTN') && !conditions.includes('T2DM')) return null;
  const v = s.vitals;
  const sbp = v.current_bp_systolic;
  const dbp = v.current_bp_diastolic;
  const triggers = ['chest_pain'];
  if (conditions.includes('HTN')) triggers.push('htn');
  if (conditions.includes('T2DM')) triggers.push('t2dm');
  if (sbp != null && dbp != null) triggers.push(`bp_${sbp}_${dbp}`);
  return {
    state: 'SAME-DAY',
    subtype: 'chest_pain_with_cardiometabolic_risk',
    triggers,
    citation:
      '2025 AHA/ACC HTN Guideline · New chest pain in HTN/T2DM warrants same-day evaluation',
  };
}

function ruleStage2SustainedWithAdherence(s) {
  const v = s.vitals;
  const ctx = s.context;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  if ((sbpAvg >= 140 || dbpAvg >= 90) && ctx.adherence_gap) {
    return {
      state: 'SAME-DAY',
      subtype: 'stage2_sustained_with_adherence_gap',
      triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, 'adherence_gap'],
      citation:
        '2025 AHA/ACC HTN Guideline · Stage 2 + DM target <130/80 + adherence intervention',
    };
  }
  return null;
}

function ruleSymptomaticHyperglycemiaNoCrisis(s) {
  const v = s.vitals;
  const sym = s.symptoms;
  const fastingAvg = v.fasting_glucose_5day_avg;
  const postMealAvg = v.post_meal_glucose_5day_avg;
  const hasPattern =
    (fastingAvg != null && fastingAvg > 150) ||
    (postMealAvg != null && postMealAvg > 200);
  if (!hasPattern) return null;
  if (!sym.osmotic_symptoms) return null;
  if (sym.kussmaul_breathing || sym.altered_mental_status) return null;
  const triggers = [];
  if (fastingAvg != null) triggers.push(`fasting_avg_${fastingAvg}`);
  if (postMealAvg != null) triggers.push(`post_meal_avg_${postMealAvg}`);
  triggers.push('osmotic_symptoms');
  if (s.context.concurrent_steroid) triggers.push('concurrent_steroid');
  return {
    state: 'SAME-DAY',
    subtype: 'symptomatic_hyperglycemia_no_crisis',
    triggers,
    citation:
      'ADA Standards of Care 2026 · Section 16 (steroid-associated/symptomatic hyperglycemia)',
  };
}

// ─── WATCH ────────────────────────────────────────────────────────────────

function ruleStage2SustainedAdherent(s) {
  // Sustained Stage 2 BP (>=140/90 7-day avg), no adherence gap, asymptomatic.
  // Closes the gap between stage2_sustained_with_adherence (SAME-DAY) and
  // stage1_drift (WATCH). Without this rule, Stage 2 BP without an adherence
  // gap fell through to ROUTINE, which understates clinical risk in a known
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
    state: 'WATCH',
    subtype: 'stage2_sustained_adherent',
    triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, 'asymptomatic', 'adherent'],
    citation:
      '2025 AHA/ACC HTN Guideline · Sustained Stage 2 BP without adherence gap warrants 24h coordinator review',
  };
}

function ruleA1cDiagnosticThreshold(s) {
  const labs = s.labs;
  const a1c = labs.a1c_pct;
  const baseline = labs.baseline_a1c_pct;
  if (a1c == null || a1c < 6.5) return null;
  if (s._patient_conditions.includes('T2DM')) return null;
  const triggers = [`a1c_${a1c}`];
  if (baseline != null) triggers.push(`baseline_${baseline}`);
  if (s.context.adherence_gap) triggers.push('adherence_gap');
  return {
    state: 'WATCH',
    subtype: 'a1c_crossing_diagnostic_threshold',
    triggers,
    citation: 'ADA Standards of Care 2026 · Section 2 (Diagnosis: A1C >=6.5%)',
  };
}

function ruleStage1Drift(s) {
  const v = s.vitals;
  const ctx = s.context;
  const sbpAvg = v.bp_7day_avg_systolic ?? 0;
  const dbpAvg = v.bp_7day_avg_diastolic ?? 0;
  const inStage1 =
    (sbpAvg >= 130 && sbpAvg <= 139) || (dbpAvg >= 80 && dbpAvg <= 89);
  if (!inStage1) return null;
  if (ctx.adherence_gap) return null;
  const sym = s.symptoms;
  if (
    sym.severe_headache ||
    sym.vision_changes ||
    sym.chest_pain ||
    sym.focal_neuro_deficit
  ) {
    return null;
  }
  return {
    state: 'WATCH',
    subtype: 'stage1_drift_asymptomatic_adherent',
    triggers: [`bp_avg_${sbpAvg}_${dbpAvg}`, 'asymptomatic', 'adherent'],
    citation:
      '2025 AHA/ACC HTN Guideline · Stage 1 + DM target <130/80 (no urgent intervention required)',
  };
}

// ─── ROUTINE — default ────────────────────────────────────────────────────

function ruleRoutineDefault(s) {
  const ctx = s.context;
  const triggers = ['no_higher_priority_rule_fired'];
  if (ctx.post_activity) triggers.push('post_activity_contextualized');
  if (ctx.improper_cuff_position) triggers.push('improper_cuff_position');
  let subtype;
  if (ctx.post_activity) {
    subtype = 'false_positive_post_activity';
  } else if (ctx.improper_cuff_position) {
    subtype = 'false_positive_improper_cuff';
  } else {
    subtype = 'routine_default';
  }
  return {
    state: 'ROUTINE',
    subtype,
    triggers,
    citation:
      '2025 AHA/ACC HTN Guideline · HBPM/ABPM standardized conditions; trend over snapshot',
  };
}

// ─── Pipeline ─────────────────────────────────────────────────────────────

const RULE_ORDER = [
  ruleHypertensiveEmergency,
  ruleLevel2Hypoglycemia,
  ruleHyperglycemicCrisis,
  ruleChestPainInCardiometabolic,
  ruleStage2SustainedWithAdherence,
  ruleSymptomaticHyperglycemiaNoCrisis,
  ruleStage2SustainedAdherent,
  ruleA1cDiagnosticThreshold,
  ruleStage1Drift,
];

function assessEscalationState(scenario, patient) {
  const s = {
    vitals: scenario.vitals ?? {},
    labs: scenario.labs ?? {},
    symptoms: scenario.symptoms ?? {},
    context: scenario.context ?? {},
    _patient_conditions: (patient && patient.conditions) ?? [],
  };
  for (const rule of RULE_ORDER) {
    const result = rule(s);
    if (result !== null) return result;
  }
  return ruleRoutineDefault(s);
}

module.exports = { assessEscalationState };
