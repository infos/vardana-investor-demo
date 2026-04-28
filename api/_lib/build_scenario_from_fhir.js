/**
 * api/_lib/build_scenario_from_fhir.js
 *
 * Build a `ScenarioInput` (the shape `assessEscalationState` consumes) from
 * the structured data we already pull off Medplum FHIR resources and the
 * structured questions we ask in-call.
 *
 * Two callers today:
 *   1. api/voice-chat.js — passes in vitals + symptoms parsed from the chat
 *      transcript, plus the patient's conditions array.
 *   2. (future) anywhere we have raw FHIR Observation / Condition /
 *      DiagnosticReport bundles. The bundle helpers below normalize those
 *      into the inputs `buildScenarioFromInputs` accepts.
 *
 * Pure functions. No I/O. CommonJS — voice-chat.js requires this directly.
 */

// ─── Public entry: the only adapter call sites should use ──────────────────

/**
 * @param {object} input
 * @param {{ id: string, name: string, conditions: string[], ckd_stage?: string }} input.patient
 * @param {Array<{ date: string, systolic: number, diastolic: number }>} [input.bpReadings]
 *   Sorted descending by date (latest first). May be empty.
 * @param {Array<{ date: string, value: number, fasting?: boolean, postMeal?: boolean }>} [input.glucoseReadings]
 *   Sorted descending by date.
 * @param {Array<{ date: string, value: number }>} [input.a1cReadings]
 *   Sorted descending by date.
 * @param {Array<{ date: string, value: number }>} [input.egfrReadings]
 *   Sorted descending by date.
 * @param {object} [input.symptoms] — parsed structured symptoms from the call
 * @param {object} [input.context] — call-context flags (adherence_gap, post_activity, …)
 * @returns {object} ScenarioInput
 */
function buildScenarioFromInputs({
  patient,
  bpReadings = [],
  glucoseReadings = [],
  a1cReadings = [],
  egfrReadings = [],
  symptoms = {},
  context = {},
}) {
  const currentBp = bpReadings[0];
  const last7BpSys = within(bpReadings, 7).map(r => r.systolic).filter(Number.isFinite);
  const last7BpDia = within(bpReadings, 7).map(r => r.diastolic).filter(Number.isFinite);
  const last30BpSys = within(bpReadings, 30).map(r => r.systolic).filter(Number.isFinite);
  const last30BpDia = within(bpReadings, 30).map(r => r.diastolic).filter(Number.isFinite);

  const currentGlucose = glucoseReadings[0];
  const last5Fasting = within(glucoseReadings, 5).filter(g => g.fasting).map(g => g.value).filter(Number.isFinite);
  const last5PostMeal = within(glucoseReadings, 5).filter(g => g.postMeal).map(g => g.value).filter(Number.isFinite);
  const recentFasting = within(glucoseReadings, 5).filter(g => g.fasting).map(g => g.value).filter(Number.isFinite);

  const latestA1c = a1cReadings[0];
  const baselineA1c = a1cReadings[1]; // prior-most-recent A1c, if available
  const latestEgfr = egfrReadings[0];

  return {
    vitals: stripUndef({
      current_bp_systolic: currentBp?.systolic,
      current_bp_diastolic: currentBp?.diastolic,
      bp_7day_avg_systolic: avg(last7BpSys),
      bp_7day_avg_diastolic: avg(last7BpDia),
      bp_30day_avg_systolic: avg(last30BpSys),
      bp_30day_avg_diastolic: avg(last30BpDia),
      current_glucose_mgdl: currentGlucose?.value,
      fasting_glucose_5day_avg: avg(last5Fasting),
      post_meal_glucose_5day_avg: avg(last5PostMeal),
      fasting_glucose_recent_readings: recentFasting.length > 0 ? recentFasting : undefined,
    }),
    labs: stripUndef({
      a1c_pct: latestA1c?.value,
      a1c_days_old: latestA1c ? daysBetween(latestA1c.date, todayIso()) : undefined,
      baseline_a1c_pct: baselineA1c?.value,
      egfr: latestEgfr?.value ?? patient?.egfr,
    }),
    symptoms: { ...symptoms },
    context: { ...context },
  };
}

/**
 * Convenience wrapper: takes a raw FHIR Observation array and pre-sorts /
 * partitions into the structured shape `buildScenarioFromInputs` consumes.
 * Used when the caller has Medplum bundles in hand.
 *
 * @param {object} input
 * @param {object} input.patient — Patient FHIR resource OR our normalized
 *   `{ id, name, conditions[] }` shape from `normalizeBundle`.
 * @param {Array} [input.observations] — Observation FHIR resources
 * @param {Array} [input.diagnosticReports] — DiagnosticReport FHIR resources
 *   (currently unused — A1c/eGFR come back as Observations in our seeds)
 * @param {object} [input.symptoms]
 * @param {object} [input.context]
 */
function buildScenarioFromFhirBundle({
  patient,
  observations = [],
  diagnosticReports: _diagnosticReports = [],
  symptoms = {},
  context = {},
}) {
  const normalizedPatient = normalizePatient(patient);
  const bpReadings = sortByDateDesc(extractBpReadings(observations));
  const glucoseReadings = sortByDateDesc(extractGlucoseReadings(observations));
  const a1cReadings = sortByDateDesc(extractScalarObservations(observations, A1C_LOINCS));
  const egfrReadings = sortByDateDesc(extractScalarObservations(observations, EGFR_LOINCS));

  return buildScenarioFromInputs({
    patient: normalizedPatient,
    bpReadings,
    glucoseReadings,
    a1cReadings,
    egfrReadings,
    symptoms,
    context,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const BP_PANEL_LOINC = '85354-9';
const BP_SYSTOLIC_LOINC = '8480-6';
const BP_DIASTOLIC_LOINC = '8462-4';
const A1C_LOINCS = new Set(['4548-4', '17856-6', '4549-2']);
const EGFR_LOINCS = new Set(['33914-3', '48642-3', '48643-1', '62238-1']);
const GLUCOSE_LOINCS = new Set([
  '2339-0',  // Glucose [Mass/volume] in Blood
  '2345-7',  // Glucose [Mass/volume] in Serum or Plasma
  '14743-9', // Glucose [Mass/volume] in Capillary blood by Glucometer (fasting)
  '41653-7', // Glucose [Mass/volume] in Capillary blood by Glucometer
  '1558-6',  // Fasting glucose [Mass/volume] in Serum or Plasma
]);

function normalizePatient(p) {
  if (!p) return { conditions: [] };
  // Already normalized?
  if (Array.isArray(p.conditions) && typeof p.conditions[0] !== 'object') {
    return p;
  }
  // Raw FHIR Patient + conditions in `.conditions[]` (objects from
  // CoordinatorDashboard.normalizeBundle): tag-extract.
  const tags = (p.conditions || [])
    .map(c => conditionTagFromText(c.text || c.code))
    .filter(Boolean);
  return {
    id: p.id,
    name: p.name,
    conditions: tags,
    ckd_stage: p.ckd_stage,
    egfr: p.egfr,
  };
}

function conditionTagFromText(textOrCode) {
  if (!textOrCode) return null;
  const t = String(textOrCode).toLowerCase();
  if (/hypertensi|^i10$|^i1[1-5]/.test(t)) return 'HTN';
  if (/diabetes|^e1[01]/.test(t)) return 'T2DM';
  if (/hyperlipidemi|dyslipidemi|^e78/.test(t)) return 'HLD';
  if (/chronic kidney|ckd|^n18/.test(t)) {
    const stageMatch = t.match(/stage\s*(\d[a-b]?)/i);
    return stageMatch ? `CKD_${stageMatch[1].toUpperCase()}` : 'CKD';
  }
  if (/obesity|^e66/.test(t)) return 'OBESITY';
  return null;
}

function extractBpReadings(observations) {
  const out = [];
  for (const obs of observations) {
    const codes = (obs.code?.coding || []).map(c => c.code);
    if (!codes.includes(BP_PANEL_LOINC)) continue;
    const sysComp = (obs.component || []).find(
      c => (c.code?.coding || []).some(cc => cc.code === BP_SYSTOLIC_LOINC),
    );
    const diaComp = (obs.component || []).find(
      c => (c.code?.coding || []).some(cc => cc.code === BP_DIASTOLIC_LOINC),
    );
    const sys = sysComp?.valueQuantity?.value;
    const dia = diaComp?.valueQuantity?.value;
    const date = obs.effectiveDateTime || obs.issued;
    if (sys != null && dia != null && date) {
      out.push({ date, systolic: sys, diastolic: dia });
    }
  }
  return out;
}

function extractGlucoseReadings(observations) {
  const out = [];
  for (const obs of observations) {
    const codes = (obs.code?.coding || []).map(c => c.code);
    const isGlucose = codes.some(c => GLUCOSE_LOINCS.has(c));
    if (!isGlucose) continue;
    const value = obs.valueQuantity?.value;
    const date = obs.effectiveDateTime || obs.issued;
    if (value == null || !date) continue;
    const isFasting = codes.includes('14743-9') || codes.includes('1558-6')
      || /fasting/i.test(obs.code?.text || '');
    const isPostMeal = /post[- ]?(meal|prandial)/i.test(obs.code?.text || '');
    out.push({ date, value, fasting: isFasting, postMeal: isPostMeal });
  }
  return out;
}

function extractScalarObservations(observations, codeSet) {
  const out = [];
  for (const obs of observations) {
    const codes = (obs.code?.coding || []).map(c => c.code);
    if (!codes.some(c => codeSet.has(c))) continue;
    const value = obs.valueQuantity?.value;
    const date = obs.effectiveDateTime || obs.issued;
    if (value != null && date) out.push({ date, value });
  }
  return out;
}

function sortByDateDesc(arr) {
  return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function within(readings, days) {
  if (!readings.length) return [];
  const latestTs = new Date(readings[0].date).getTime();
  const cutoffTs = latestTs - days * 24 * 60 * 60 * 1000;
  return readings.filter(r => new Date(r.date).getTime() >= cutoffTs);
}

function avg(numbers) {
  if (!numbers || numbers.length === 0) return undefined;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

function daysBetween(isoA, isoB) {
  const ms = Math.abs(new Date(isoB) - new Date(isoA));
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function todayIso() {
  return new Date().toISOString();
}

function stripUndef(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

module.exports = {
  buildScenarioFromInputs,
  buildScenarioFromFhirBundle,
  // Exported for tests / debugging
  conditionTagFromText,
  extractBpReadings,
  extractGlucoseReadings,
  extractScalarObservations,
};
