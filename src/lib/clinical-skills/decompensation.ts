// =============================================================================
// Decompensation Risk Assessment Algorithm
// =============================================================================
// Deterministic scoring based on AHA/ACC 2022 HF guidelines.
// Inputs: vitals trend, symptoms, journey day, comorbidity count, adherence.
// Output: risk level (low/moderate/high/critical) + numeric score 0–100.

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface VitalReading {
  date: string;
  weightLbs?: number;
  systolic?: number;
  diastolic?: number;
}

export interface PatientSymptoms {
  dyspnea?: boolean;
  edema?: boolean;
  orthopnea?: boolean;
  fatigue?: boolean;
  chestPain?: boolean;
  syncope?: boolean;
}

export interface DecompensationInput {
  vitals: VitalReading[];
  symptoms: PatientSymptoms;
  journeyDay: number;
  conditionCount: number;
  missedDoses?: number;
}

export interface DecompensationResult {
  riskLevel: RiskLevel;
  riskScore: number;
}

// ── helpers ──

function getWeightGain48hr(vitals: VitalReading[]): number {
  const withWeight = vitals.filter(v => v.weightLbs != null);
  if (withWeight.length < 2) return 0;
  const latest = withWeight[withWeight.length - 1].weightLbs!;

  // Look back ~48hr (last 2-3 readings before latest)
  for (let i = withWeight.length - 2; i >= Math.max(0, withWeight.length - 4); i--) {
    const daysDiff = (new Date(withWeight[withWeight.length - 1].date).getTime() -
      new Date(withWeight[i].date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 1.5 && daysDiff <= 3) {
      return latest - withWeight[i].weightLbs!;
    }
  }
  // Fallback: compare last two
  const prev = withWeight[withWeight.length - 2].weightLbs!;
  return latest - prev;
}

function getWeightGain7day(vitals: VitalReading[]): number {
  const withWeight = vitals.filter(v => v.weightLbs != null);
  if (withWeight.length < 2) return 0;
  const latest = withWeight[withWeight.length - 1].weightLbs!;

  // Look for reading ~4-8 days back
  for (let i = 0; i < withWeight.length - 1; i++) {
    const daysDiff = (new Date(withWeight[withWeight.length - 1].date).getTime() -
      new Date(withWeight[i].date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff >= 4 && daysDiff <= 8) {
      return latest - withWeight[i].weightLbs!;
    }
  }
  return 0;
}

function getLatestSystolic(vitals: VitalReading[]): number | null {
  const withBP = vitals.filter(v => v.systolic != null);
  return withBP.length > 0 ? withBP[withBP.length - 1].systolic! : null;
}

function getSystolicTrend(vitals: VitalReading[]): number {
  const withBP = vitals.filter(v => v.systolic != null);
  if (withBP.length < 2) return 0;
  // Use recent 3 BP readings for trend (avoids dilution from long stable baselines)
  const recent = withBP.slice(-3);
  return recent[recent.length - 1].systolic! - recent[0].systolic!;
}

function countSymptoms(symptoms: PatientSymptoms): number {
  return Object.values(symptoms).filter(Boolean).length;
}

// ── main algorithm ──

export function assessDecompensationRisk(input: DecompensationInput): DecompensationResult {
  const { vitals, symptoms, journeyDay, conditionCount, missedDoses = 0 } = input;
  let score = 0;

  // ─── Emergency signals: chest pain or syncope → critical ───
  if (symptoms.chestPain || symptoms.syncope) {
    const latestSystolic = getLatestSystolic(vitals);
    const hasHypotension = latestSystolic != null && latestSystolic < 90;
    score = (symptoms.chestPain && symptoms.dyspnea) ? 95 :
            (symptoms.syncope && symptoms.dyspnea) ? 95 :
            hasHypotension ? 95 : 90;
    return { riskLevel: 'critical', riskScore: score };
  }

  // ─── Weight gain scoring ───
  const wg48 = getWeightGain48hr(vitals);
  const wg7d = getWeightGain7day(vitals);

  if (wg48 >= 3.0) score += 30;
  else if (wg48 >= 2.0) score += 22;
  else if (wg48 >= 1.5) score += 16;      // Sub-threshold but clinically relevant
  else if (wg48 >= 1.0) score += 5;

  // Gradual gain over 7 days — additive regardless of 48hr gain
  if (wg7d >= 3.0) score += 15;
  else if (wg7d >= 2.0) score += 8;

  // ─── Blood pressure scoring ───
  const latestSys = getLatestSystolic(vitals);
  const bpTrend = getSystolicTrend(vitals);

  if (latestSys != null) {
    if (latestSys >= 160) score += 35;     // Hypertensive urgency in HF
    else if (latestSys >= 145) score += 15;
    else if (latestSys >= 135) score += 8;

    // Hypotension in HF context
    if (latestSys < 90) score += 30;
  }

  if (bpTrend >= 20) score += 15;          // Rapid BP rise
  else if (bpTrend >= 12) score += 8;      // Moderate BP rise

  // ─── Symptom scoring ───
  if (symptoms.orthopnea) score += 32;     // High-weight: pulmonary congestion signal
  if (symptoms.dyspnea) score += 15;       // Exertional dyspnea
  if (symptoms.edema) score += 12;         // Peripheral edema
  if (symptoms.fatigue) score += 8;        // Non-specific but relevant in HF

  // Multi-symptom amplifier
  const symCount = countSymptoms(symptoms);
  if (symCount >= 3) score += 10;
  else if (symCount === 2) score += 5;

  // ─── Signal integration amplifiers ───
  // Concurrent weight gain + elevated BP (multi-signal concern)
  if (wg48 >= 1.5 && latestSys != null && latestSys >= 130) score += 8;

  // Weight gain + medication non-adherence (causal concern)
  if (wg48 >= 1.0 && missedDoses >= 2) score += 10;

  // Orthopnea in HF patient (pulmonary congestion in known cardiac disease)
  if (symptoms.orthopnea && conditionCount >= 4) score += 10;

  // Sub-threshold weight gain + any symptom in high-comorbidity patient
  if (wg48 >= 1.0 && wg48 < 2.0 && symCount >= 1 && conditionCount >= 4) score += 10;

  // ─── Journey phase risk modifier ───
  // Days 1-14 (Stabilize) carry highest readmission risk
  if (journeyDay <= 7) score += 15;
  else if (journeyDay <= 14) score += 12;
  // Days 61-90 (Maintain) — stable patients get a small reduction
  else if (journeyDay >= 61) score = Math.max(0, score - 5);

  // ─── Comorbidity burden ───
  if (conditionCount >= 5) score += 8;
  else if (conditionCount >= 3) score += 5;

  // ─── Medication non-adherence ───
  if (missedDoses >= 3) score += 15;
  else if (missedDoses >= 1) score += 4;

  // ─── Clamp and classify ───
  score = Math.max(0, Math.min(100, score));

  let riskLevel: RiskLevel;
  if (score >= 80) riskLevel = 'critical';
  else if (score >= 50) riskLevel = 'high';
  else if (score >= 20) riskLevel = 'moderate';
  else riskLevel = 'low';

  return { riskLevel, riskScore: score };
}
