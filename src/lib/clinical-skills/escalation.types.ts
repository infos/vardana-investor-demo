/**
 * escalation.types.ts
 *
 * Canonical shared types for the cardiometabolic (HTN + T2DM) escalation rule
 * set. Same shape used in TypeScript (frontend, voice-chat Vercel function) and
 * mirrored in Python (vardana-voice/escalation_rules.py + the eval harness).
 *
 * Field names match `evals/eval-harness/scenarios.json` exactly so a scenario
 * JSON can be passed straight into the rule set with no translation. snake_case
 * is intentional and load-bearing — do not rename.
 */

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
  conditions: string[]; // e.g. ["HTN", "T2DM", "CKD_3a"]
  ckd_stage?: string;
  egfr?: number;
}

export interface EscalationResult {
  state: EscalationState;
  subtype: string;
  triggers: string[];
  citation: string;
}
