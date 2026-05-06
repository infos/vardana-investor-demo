import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { VoiceCallDemo } from "./App.jsx"; // legacy — kept on import for /demo/{token} flow only; not rendered from this view
import ChatCheckinDemo from "./ChatCheckinDemo.jsx";
import LiveKitVoiceOverlay from "./components/LiveKitVoiceOverlay.jsx";
import { scenariosForPatient, loadScenario } from "./chatScenarios.js";
import { MetricTile } from "./components/CareConsole/MetricTile.jsx";
import { AdherenceRow } from "./components/CareConsole/AdherenceRow.jsx";
import { SessionsCadence } from "./components/CareConsole/SessionsCadence.jsx";
import { CrossSessionInsight } from "./components/CareConsole/CrossSessionInsight.jsx";
import { SessionCard } from "./components/CareConsole/SessionCard.jsx";
import {
  computeTrend,
  sourceForAdherence,
  cadenceFromSessions,
  MARCUS_SESSIONS,
  MARCUS_CROSS_SESSION_INSIGHT,
} from "./components/CareConsole/careConsoleData.js";
import CoordinatorSidebar from "./components/CoordinatorSidebar.jsx";
import { useIsMobile } from "./demo/useIsMobile";

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ── Styles ──
const S = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  // textLight darkened from #8C8C7A (≈3.3:1 on cream — fails WCAG AA) to
  // #5C5C4A (≈6.8:1 — passes) so muted captions stay legible on clinical
  // content. textMed already passed; left as-is.
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  // Sidebar (navy bg) slate token. Bumped from #475569 (≈2.4:1 on navy —
  // fails) to #94A3B8 (≈6.1:1 — passes AA) so ALERTS/PATIENTS labels and
  // patient meta rows read cleanly on the dark rail.
  sidebarMuted: "#94A3B8",
  accent: "#E2D5B8", chip: "#EEEBD8",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};
// Font stack. DM Sans / DM Serif Display / IBM Plex Mono are loaded in
// index.html already; we just weren't using them here. Sans becomes the
// default for body copy and labels; mono is reserved for raw technical
// content (transcripts, numeric inputs, and the Medplum source footer).
//
// Type scale.
// Minimum 13px for any clinical UI text. 14px+ for anything a clinician
// reads as language during patient care. Smaller sizes violate readability
// standards for healthcare software users (most clinicians 40+ with mild
// presbyopia).
//   xs   13 — technical metadata: patient IDs, ICD codes, dates, footer
//   sm   14 — section labels, sidebar items, tab labels, pills, badges
//   base 15 — body content: conditions, medications, dosing, summaries
//   lg   18 — card-level emphasis
//   xl   24 — display numerals (158/98, 96.8, ASCVD %)
const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
  size: { xs: 13, sm: 14, base: 15, lg: 18, xl: 24 },
};

// ── Small presentational helpers ──
function Chip({ children }) {
  return <span style={{ fontSize: 14, ...css.sans, color: S.textMed, background: S.chip, padding: "2px 7px", borderRadius: 3 }}>{children}</span>;
}
const allergyChipStyle = {
  fontSize: 14, ...css.sans, background: S.redBg, color: S.redText,
  border: `1px solid #FECACA`, padding: "2px 8px", borderRadius: 3, fontWeight: 600,
};
const nkdaChipStyle = {
  fontSize: 14, ...css.sans, background: "#F5F3ED", color: S.textMed,
  padding: "2px 7px", borderRadius: 3, letterSpacing: "0.05em",
};
function Badge({ children, color = "blue" }) {
  const colors = {
    blue: { bg: S.blueBg, text: S.blue }, green: { bg: S.greenBg, text: S.greenText },
    red: { bg: S.redBg, text: S.redText }, amber: { bg: S.amberBg, text: S.amberText },
    gray: { bg: "#F5F3ED", text: S.textMed },
  };
  const c = colors[color] || colors.blue;
  return <span style={{ fontSize: 14, ...css.sans, padding: "2px 5px", borderRadius: 3, background: c.bg, color: c.text }}>{children}</span>;
}
function GuidelineBadge({ children, type }) {
  const colors = { acc: { bg: S.blueBg, text: S.blue, border: "#BFDBFE" }, ada: { bg: S.greenBg, text: S.greenText, border: "#BBF7D0" }, aha: { bg: S.redBg, text: S.redText, border: "#FECACA" } };
  const c = colors[type] || colors.acc;
  return <span style={{ fontSize: 14, ...css.sans, padding: "2px 6px", borderRadius: 3, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{children}</span>;
}
function HelpBtn({ onClick }) {
  return <button onClick={onClick} style={{ width: 18, height: 18, borderRadius: "50%", background: S.border, color: S.textMed, fontSize: 13, ...css.sans, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?</button>;
}
function Tooltip({ visible, title, children }) {
  if (!visible) return null;
  return <div style={{ background: S.navy, color: S.navyText, borderRadius: 6, padding: "10px 12px", fontSize: 14, ...css.sans, lineHeight: 1.6, marginBottom: 10 }}><div style={{ fontSize: 15, color: S.navyText, fontWeight: 700, marginBottom: 4 }}>{title}</div>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: S.textLight, ...css.sans, marginBottom: 10 }}>{children}</div>;
}
function PRow({ label, value, badge, badgeColor }) {
  return <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: `1px solid #F0EEE8`, ...css.sans, fontSize: 15 }}>
    <span style={{ flex: "0 0 170px", color: S.text }}>{label}</span>
    <span style={{ color: S.textMed, flex: 1 }}>{value}</span>
    {badge && <Badge color={badgeColor}>{badge}</Badge>}
  </div>;
}
function EmptyState({ children }) {
  return <div style={{ fontSize: 15, ...css.sans, color: S.textLight, padding: "10px 0" }}>{children}</div>;
}

// ── Helpers ──
export function initialsFromName(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "??";
  return ((parts[0][0] || "") + (parts[parts.length - 1][0] || "")).toUpperCase();
}
export function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
// Infer risk tier from summary roster data (BP readings, conditions)
export function inferRiskLevel(summary) {
  const bp = summary.latestBP;
  const hasHTN = (summary.conditions || []).some(c => /hypertension|htn/i.test(c.text || ""));
  const hasT2DM = hasActiveDiabetes(summary.conditions);
  if (bp && (bp.systolic >= 155 || bp.diastolic >= 95)) return "high";
  if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) return "mod";
  if (hasHTN && hasT2DM) return "mod";
  return "low";
}
export function inferConditionsSummary(conditions) {
  if (!conditions?.length) return "—";
  const parts = [];
  if (conditions.some(c => /hypertension|htn/i.test(c.text || ""))) parts.push("HTN");
  if (hasActiveDiabetes(conditions)) parts.push("T2DM");
  if (conditions.some(c => /hyperlipidemia|dyslipidemia/i.test(c.text || ""))) parts.push("HLD");
  return parts.join(" · ") || conditions[0].text?.slice(0, 20) || "—";
}
function identifierMatchesMarcus(summary) {
  const name = (summary?.name || "").toLowerCase();
  return name.includes("marcus") && name.includes("williams");
}

// ── Shared PCE utilities ──
// ACC/AHA Pooled Cohort Equations (2013, endorsed 2018). Used by both the
// Risk tab (interactive calculator) and the Overview tab (headline tile).
// Keep here so both call sites produce identical numbers.
function calcPCE(inputs) {
  const { age, tc, hdl, sbp, bptx, dm, smoke, group } = inputs;
  const la = Math.log(age), lt = Math.log(tc), lh = Math.log(hdl), ls = Math.log(sbp);
  let r = 0;
  if (group === "wm") { const s = 12.344*la+11.853*lt-2.664*la*lt-7.990*lh+1.769*la*lh+(bptx?1.797:1.764)*ls+7.837*smoke-1.795*la*smoke+0.661*dm; r = 1-Math.pow(0.9144,Math.exp(s-61.18)); }
  // NHW Female: Goff 2013 Table A. Mean coefficient sum is -29.18 (negative),
  // so the exponent is exp(s - (-29.18)) = exp(s + 29.18). The sign matters —
  // using s - 29.799 (the |ln Age| coefficient) clamps all output to the 0.1%
  // floor for realistic inputs.
  else if (group === "wf") { const s = -29.799*la+4.884*la*la+13.540*lt-3.114*la*lt-13.578*lh+3.149*la*lh+(bptx?2.019:1.957)*ls+7.574*smoke-1.665*la*smoke+0.661*dm; r = 1-Math.pow(0.9665,Math.exp(s+29.18)); }
  else if (group === "am") { const s = 2.469*la+0.302*lt-0.307*lh+(bptx?1.916:1.809)*ls+0.549*smoke+0.645*dm; r = 1-Math.pow(0.8954,Math.exp(s-19.54)); }
  // NHB Female: smoker coefficient is 0.8738 but diabetes coefficient is
  // 0.5421 (not 0.8738 — they happen to share smoker's value in some
  // summaries but are distinct per Goff 2013 Table A).
  else { const s = 17.1141*la+0.9396*lt-18.9196*lh+4.4748*la*lh+(bptx?29.2907:27.8197)*ls+(bptx?-6.4321:-6.0873)*la*ls+0.8738*smoke+0.5421*dm; r = 1-Math.pow(0.9533,Math.exp(s-86.61)); }
  return Math.max(0.001, Math.min(0.99, r)) * 100;
}
function pceTierLabel(pct) {
  if (pct < 5) return "Low (<5%)";
  if (pct < 7.5) return "Borderline (5–7.5%)";
  if (pct < 20) return "Intermediate (7.5–20%)";
  return "High (≥20%)";
}
function pceTierColors(pct) {
  if (pct < 5) return { bg: S.greenBg, text: S.greenText, bar: S.green };
  if (pct < 7.5) return { bg: S.amberBg, text: S.amberText, bar: S.amber };
  return { bg: S.redBg, text: S.redText, bar: S.red };
}
// Classify diabetes by ICD-10 code, not display-string regex. The
// substring pattern /diabetes|t2dm/i matches "Prediabetes" (R73.03) as
// a false positive, which materially inflates ASCVD risk for prediabetic
// patients. Count only E10.* (Type 1) and E11.* (Type 2) with an active
// clinical status.
function hasActiveDiabetes(conditions = []) {
  return conditions.some(c => {
    const code = (c.code || "").toUpperCase();
    const active = !c.status || c.status === "active";
    return active && /^E1[01](\.|$)/.test(code);
  });
}
function defaultPCEInputs(patientData) {
  const latestBP = patientData?.latestBP;
  const hasDM = hasActiveDiabetes(patientData?.conditions);
  // Route to the correct race/sex PCE group. Sex comes from the FHIR
  // Patient.gender field; race is not carried on our current Patient
  // resources (US Core race extension would be authoritative), so default
  // to white. The Risk tab's Race/sex select lets a clinician override.
  const gender = (patientData?.patient?.gender || "").toLowerCase();
  const group = gender === "female" ? "wf" : "wm";
  return {
    age: ageFromBirthDate(patientData?.patient?.birthDate) || 58,
    tc: 195, hdl: 42, sbp: latestBP?.systolic || 138,
    bptx: 1, dm: hasDM ? 1 : 0, smoke: 0, group,
  };
}

// Normalize a local FHIR transaction Bundle into the same shape as /api/medplum-fhir?action=patient
// Shift all demo-dated fields in a FHIR Bundle forward so that the
// bundle's `_demoAnchor` date lands on today. This keeps scenario
// vitals, CarePlan periods, goal due dates, and adherence events
// perpetually "current" regardless of when the demo is run, without
// hand-editing the fixtures. Historical facts (Patient.birthDate,
// Condition.onsetDateTime) and static code references are NOT shifted.
// No-op if the bundle has no `_demoAnchor` or the anchor is already
// in the future.
function shiftBundleDates(bundle) {
  const anchor = bundle?._demoAnchor;
  if (!anchor) return bundle;
  const anchorDate = parseLocalDate(anchor);
  if (!anchorDate) return bundle;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offsetMs = today.getTime() - anchorDate.getTime();
  if (offsetMs <= 0) return bundle;
  const shiftIso = (iso) => {
    if (typeof iso !== "string" || !iso) return iso;
    const hasTime = iso.includes("T");
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const shifted = new Date(d.getTime() + offsetMs);
    return hasTime ? shifted.toISOString().replace(/\.\d{3}Z$/, "Z") : shifted.toISOString().slice(0, 10);
  };
  const clone = JSON.parse(JSON.stringify(bundle));
  for (const entry of clone.entry || []) {
    const r = entry.resource;
    if (!r) continue;
    switch (r.resourceType) {
      case "Observation":
      case "DiagnosticReport":
        if (r.effectiveDateTime) r.effectiveDateTime = shiftIso(r.effectiveDateTime);
        break;
      case "Encounter":
        if (r.period?.start) r.period.start = shiftIso(r.period.start);
        if (r.period?.end) r.period.end = shiftIso(r.period.end);
        break;
      case "CarePlan":
        if (r.period?.start) r.period.start = shiftIso(r.period.start);
        if (r.period?.end) r.period.end = shiftIso(r.period.end);
        if (r.created) r.created = shiftIso(r.created);
        for (const act of r.activity || []) {
          for (const ext of act.extension || []) {
            if (ext.url === ADHERENCE_EXT_URL) {
              for (const sub of ext.extension || []) {
                if (sub.url === "lastEventDate" && sub.valueDate) {
                  sub.valueDate = shiftIso(sub.valueDate);
                }
              }
            }
          }
        }
        break;
      case "Goal":
        if (r.startDate) r.startDate = shiftIso(r.startDate);
        for (const t of r.target || []) {
          if (t.dueDate) t.dueDate = shiftIso(t.dueDate);
        }
        break;
      // Patient / Condition / MedicationRequest / AllergyIntolerance:
      // intentionally unshifted (historical facts or no date fields).
    }
  }
  return clone;
}

function normalizeBundle(rawBundle) {
  const bundle = shiftBundleDates(rawBundle);
  const entries = bundle?.entry || [];
  const get = (rt) => entries.map(e => e.resource).filter(r => r?.resourceType === rt);
  const patient = get("Patient")[0];
  const conditions = get("Condition").map(c => ({
    text: c.code?.coding?.[0]?.display || c.code?.text,
    code: c.code?.coding?.[0]?.code,
    status: c.clinicalStatus?.coding?.[0]?.code,
    onset: c.onsetDateTime,
  }));
  const medications = get("MedicationRequest").map(m => ({
    name: m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display,
    dosage: m.dosageInstruction?.[0]?.text,
    status: m.status,
  }));
  const observations = get("Observation");
  const weights = [];
  const bloodPressures = [];
  const labs = [];
  for (const obs of observations) {
    const code = obs.code?.coding?.[0]?.code;
    const cat = obs.category?.[0]?.coding?.[0]?.code;
    if (code === "29463-7" && obs.valueQuantity) {
      weights.push({ value: obs.valueQuantity.value, unit: obs.valueQuantity.unit, date: obs.effectiveDateTime });
    } else if (code === "85354-9" && obs.component) {
      const sys = obs.component.find(c => c.code?.coding?.[0]?.code === "8480-6");
      const dia = obs.component.find(c => c.code?.coding?.[0]?.code === "8462-4");
      if (sys && dia) bloodPressures.push({ systolic: sys.valueQuantity?.value, diastolic: dia.valueQuantity?.value, date: obs.effectiveDateTime });
    } else if (cat === "laboratory" || obs.valueQuantity) {
      labs.push({
        code: obs.code?.coding?.[0]?.code,
        name: obs.code?.coding?.[0]?.display || obs.code?.text,
        value: obs.valueQuantity?.value,
        unit: obs.valueQuantity?.unit,
        date: obs.effectiveDateTime,
      });
    }
  }
  weights.sort((a, b) => new Date(b.date) - new Date(a.date));
  bloodPressures.sort((a, b) => new Date(b.date) - new Date(a.date));
  const allergies = get("AllergyIntolerance").map(a => ({
    substance: a.code?.text || a.code?.coding?.[0]?.display,
    status: a.clinicalStatus?.coding?.[0]?.code,
    reaction: a.reaction?.[0]?.manifestation?.[0]?.text,
  }));
  const cp = get("CarePlan")[0];
  const goals = get("Goal");
  const carePlan = cp ? buildCarePlanView(cp, goals) : null;
  return {
    source: "local-bundle",
    patient: {
      id: patient?.id,
      name: `${patient?.name?.[0]?.given?.[0] || ""} ${patient?.name?.[0]?.family || ""}`.trim(),
      gender: patient?.gender,
      birthDate: patient?.birthDate,
      phone: patient?.telecom?.find(t => t.system === "phone")?.value,
      email: patient?.telecom?.find(t => t.system === "email")?.value,
      generalPractitioner: patient?.generalPractitioner?.[0]?.display,
    },
    conditions,
    medications,
    labs,
    allergies,
    vitals: { weights, bloodPressures },
    latestWeight: weights[0] || null,
    latestBP: bloodPressures[0] || null,
    carePlan,
  };
}

// ── CarePlan view-model helpers ──
// The custom extension URL used for per-activity adherence, namespaced under
// vardana.ai so it will not collide with standard FHIR extensions. This is a
// demo-speed shortcut; production should move to Observation-linked tracking.
const ADHERENCE_EXT_URL = "https://vardana.ai/fhir/StructureDefinition/activity-adherence";
function parseAdherence(activity) {
  const ext = (activity?.extension || []).find(e => e.url === ADHERENCE_EXT_URL);
  if (!ext) return null;
  const sub = ext.extension || [];
  const pick = (u) => sub.find(s => s.url === u);
  const num = (u) => {
    const v = pick(u);
    if (!v) return null;
    if (typeof v.valueDecimal === "number") return v.valueDecimal;
    if (typeof v.valueInteger === "number") return v.valueInteger;
    return null;
  };
  const str = (u) => {
    const v = pick(u);
    if (!v) return null;
    return v.valueString || v.valueDate || null;
  };
  return {
    percent: num("adherencePercent"),
    actual: num("actualCount"),
    expected: num("expectedCount"),
    lastEventDate: str("lastEventDate"),
    note: str("adherenceNote"),
    weeklyMinutesActual: num("weeklyMinutesActual"),
    weeklyMinutesTarget: num("weeklyMinutesTarget"),
  };
}
function buildCarePlanView(cp, goalResources = []) {
  const goals = (cp.goal || [])
    .map(ref => {
      const id = (ref.reference || "").split("/").pop();
      return goalResources.find(g => g.id === id);
    })
    .filter(Boolean)
    .map(g => ({
      id: g.id,
      description: g.description?.text || "",
      priority: g.priority?.coding?.[0]?.code || null,
      category: g.category?.[0]?.coding?.[0]?.display || null,
      startDate: g.startDate || null,
      status: g.achievementStatus?.coding?.[0]?.display
        || g.achievementStatus?.coding?.[0]?.code
        || g.lifecycleStatus || "",
      targets: (g.target || []).map(t => ({
        measure: t.measure?.coding?.[0]?.display || "",
        code: t.measure?.coding?.[0]?.code || "",
        value: t.detailQuantity?.value ?? null,
        unit: t.detailQuantity?.unit || "",
        dueDate: t.dueDate || null,
      })),
      note: g.note?.[0]?.text || "",
    }));
  const activities = (cp.activity || []).map(a => {
    const d = a.detail || {};
    return {
      kind: d.kind || "",
      code: d.code?.text || d.productReference?.display || "",
      status: d.status || "unknown",
      description: d.description || "",
      timing: d.scheduledTiming?.repeat || null,
      adherence: parseAdherence(a),
    };
  });
  return {
    id: cp.id,
    title: cp.title || "Care plan",
    description: cp.description || "",
    period: cp.period || null,
    created: cp.created || null,
    author: cp.author?.display || cp.author?.reference || "",
    goals,
    activities,
  };
}

// ── Local fixture patients ──
// Each entry seeds a roster card AND knows where its full FHIR bundle
// lives. Used both as the demo default (when Medplum is unavailable)
// and as authoritative data in front of Medplum for named patients
// (see roster loader below).
export const LOCAL_MARCUS_ID = "local-marcus";
export const LOCAL_PATIENTS = [
  {
    id: LOCAL_MARCUS_ID,
    name: "Marcus Williams",
    initials: "MW",
    meta: "HTN · T2DM · HLD",
    risk: "high",
    bg: "#3B2F1E",
    fg: "#E2D5B8",
    bundlePath: "/data/marcus-williams-bundle.json",
    summary: null,
    local: true,
    // Demographics duplicated from the bundle so the grid view can render
    // age/sex without a per-row bundle fetch.
    birthDate: "1967-06-03",
    gender: "male",
  },
];
const LOCAL_MARCUS_ROSTER = LOCAL_PATIENTS[0];
export const LOCAL_PATIENT_BY_ID = new Map(LOCAL_PATIENTS.map(p => [p.id, p]));
export const LOCAL_PATIENT_NAMES = new Set(LOCAL_PATIENTS.map(p => p.name));
// Local-fixture roster IDs that DO have a real Medplum Patient.id
// counterpart on the backend. Used by the Sessions tab fetch to translate
// the frontend fixture key (e.g. "local-marcus") into the FHIR UUID that
// vardana-voice's persist_voice_encounter writes Encounters under
// (resolve_patient_id maps the slug "marcus-williams-test" to this same
// UUID server-side). Keep this in lockstep with vardana-voice's
// DEMO_PATIENTS map and with FHIR_ID_TO_SLUG further down this file.
export const LOCAL_FIXTURE_TO_FHIR_ID = {
  [LOCAL_MARCUS_ID]: "1de9768a-2459-4586-a888-d184a70479cc",
};
// Patients suppressed from the Medplum roster for this demo. They are
// not deleted — older links, eval fixtures, and recorded demo content
// may still reference them. Suppression is reversible; deletion is not.
export const SUPPRESSED_PATIENT_NAMES = new Set([
  "Sarah Chen",
  "Robert Williams",
  "James Thompson",
]);
// Display order for the left-nav roster. Anything not listed keeps its
// Medplum-returned order and falls to the tail.
export const ROSTER_ORDER = [
  "Marcus Williams",
  "Linda Patel",
  "Maria Gonzalez",
  "David Brooks",
];

// Roster card colors cycle
const CARD_COLORS = [
  { bg: "#3B2F1E", fg: "#E2D5B8" }, { bg: "#1B3A2A", fg: "#9FE1CB" },
  { bg: "#1E2D3D", fg: "#85B7EB" }, { bg: "#1A2E1A", fg: "#C0DD97" },
  { bg: "#2E1E3B", fg: "#C8A0E2" }, { bg: "#3B2920", fg: "#E6B89A" },
];

// ── Post-call summary card ──
// Pinned to the top of the Overview tab right after the coordinator hangs
// up so the summary is visible without a tab switch. Dismissable; also
// shows the Medplum persistence status (saving / saved / error).
function PostCallSummary({ summary, status, onDismiss, onViewSessions }) {
  if (!summary) return null;
  const { patientName, duration, timestamp, riskLevel, alertGenerated, summary: summaryText, transcript, kind } = summary;
  const when = timestamp || new Date().toLocaleString();
  const tier = (riskLevel || "").toUpperCase();
  const sessionLabel = kind === "chat" ? "Chat just ended" : "Call just ended";
  const transcriptText = Array.isArray(transcript)
    ? transcript.map(t => `${t.speaker || "AI"}: ${t.text || ""}`).join("\n")
    : (transcript || "");
  let statusText = null;
  let statusColor = S.textLight;
  if (status === "saving") { statusText = "Saving to Medplum…"; statusColor = S.textMed; }
  else if (status === "saved") { statusText = "Saved to Medplum."; statusColor = S.green; }
  else if (status === "demo") { statusText = "Demo mode — this summary is NOT saved to Medplum."; statusColor = S.amber; }
  else if (typeof status === "string" && status.startsWith("error:")) { statusText = `Medplum write failed: ${status.slice(6)}`; statusColor = S.red; }
  return (
    <div style={{ background: S.card, border: `1px solid ${S.navy}`, borderLeft: `4px solid ${S.amber}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: S.amber, fontWeight: 700, ...css.sans }}>{sessionLabel}</span>
        <span style={{ fontSize: 13, ...css.sans, color: S.textLight }}>{when}{duration ? ` · ${duration}` : ""}</span>
        <span style={{ flex: 1 }} />
        {alertGenerated && <Badge color="red">Alert generated</Badge>}
        {tier && <Badge color={tier === "CRITICAL" || tier === "HIGH" ? "red" : tier === "MODERATE" ? "amber" : "green"}>Risk tier: {tier}</Badge>}
        <button onClick={onDismiss} style={{ fontSize: 18, ...css.sans, background: "transparent", color: S.textLight, border: "none", cursor: "pointer", padding: "0 4px" }}>×</button>
      </div>
      <div style={{ fontSize: 18, ...css.serif, color: S.text, marginBottom: 6 }}>{patientName}</div>
      <div style={{ fontSize: 15, ...css.sans, color: S.textMed, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{summaryText || "Summary not available."}</div>
      {transcriptText && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 14, ...css.sans, color: S.navy, cursor: "pointer" }}>Show transcript</summary>
          <pre style={{ fontSize: 13, ...css.mono, color: S.textMed, background: "#F6F4EC", padding: 10, borderRadius: 4, marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.55, maxHeight: 260, overflowY: "auto" }}>{transcriptText}</pre>
        </details>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        {statusText && <span style={{ fontSize: 14, ...css.sans, color: statusColor }}>{statusText}</span>}
        <span style={{ flex: 1 }} />
        <button onClick={onViewSessions} style={{ fontSize: 14, ...css.sans, background: "transparent", color: S.navy, border: "none", cursor: "pointer", padding: 0 }}>View all sessions →</button>
      </div>
    </div>
  );
}

// ── Care Plan helpers ──
// Parse a YYYY-MM-DD string as local midnight (not UTC). Standard `new
// Date("2026-04-01")` treats it as UTC midnight, which renders as the
// previous day in negative-UTC timezones. We want date-only fields to
// stay calendar-accurate regardless of tz.
function parseLocalDate(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) { const d = new Date(iso); return isNaN(d.getTime()) ? null : d; }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function fmtLocalDate(iso) {
  const d = parseLocalDate(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}
function dayOfProgram(startIso) {
  const start = parseLocalDate(startIso);
  if (!start) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const ms = now - start;
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}
// ADA quarterly milestone (Q1=90d, Q2=180d, Q3=270d, Q4=360d from program
// start) — used to frame goal due dates as review checkpoints rather than
// arbitrary fixed-program deadlines.
function reviewMilestone(dueDateIso, startIso) {
  const due = parseLocalDate(dueDateIso), start = parseLocalDate(startIso);
  if (!due || !start) return null;
  const days = Math.round((due - start) / 86400000);
  const q = Math.round(days / 90);
  return q >= 1 && q <= 4 ? `Q${q} review` : null;
}
// Short goal labels for the compact Overview list; falls back to full text
// if no heuristic match. Keeps the tile scannable in 5 seconds.
function shortGoalLabel(goal, programStart) {
  const desc = (goal.description || "").toLowerCase();
  const target = goal.targets?.[0];
  const due = target?.dueDate;
  const milestone = reviewMilestone(due, programStart);
  const dueStr = due
    ? (milestone ? `${milestone} · ${fmtLocalDate(due)}` : fmtLocalDate(due))
    : "";
  const sep = dueStr ? " · " : "";
  if (desc.includes("bp") || /blood pressure/.test(desc)) {
    const sys = goal.targets?.find(t => /systolic/i.test(t.measure))?.value;
    const dia = goal.targets?.find(t => /diastolic/i.test(t.measure))?.value;
    if (sys && dia) return `BP <${sys}/${dia}${sep}${dueStr}`;
  }
  if (/a1c|hemoglobin/.test(desc) && target?.value != null) {
    return `A1C <${target.value}%${sep}${dueStr}`;
  }
  if (/ldl/.test(desc) && target?.value != null) {
    return `LDL <${target.value} mg/dL${sep}${dueStr}`;
  }
  if (/weight/.test(desc) && target?.value != null) {
    return `Weight ↓ to ${target.value} ${target.unit || "kg"}${sep}${dueStr}`;
  }
  return goal.description || "";
}
// Group activities into the 4-row adherence summary shown on the Overview
// tile. Meds-other collapses Amlodipine/Metformin/Atorvastatin into one
// row so the tile stays readable. Activity uses weeklyMinutesActual vs
// Target when available.
function summarizeAdherence(activities = []) {
  const rows = [];
  const find = (fn) => activities.find(fn);
  const bp = find(a => /bp monitoring/i.test(a.code));
  if (bp) rows.push({ label: "BP monitoring", percent: bp.adherence?.percent, note: null });
  const lisinopril = find(a => /lisinopril/i.test(a.code));
  if (lisinopril) rows.push({ label: "Lisinopril", percent: lisinopril.adherence?.percent, note: lisinopril.adherence?.note });
  const otherMeds = activities.filter(a =>
    a.kind === "MedicationRequest" && !/lisinopril/i.test(a.code) && a.adherence?.percent != null
  );
  if (otherMeds.length) {
    const vals = otherMeds.map(a => a.adherence.percent).sort((a, b) => a - b);
    const range = vals.length > 1 && vals[0] !== vals[vals.length - 1]
      ? `${vals[0]}–${vals[vals.length - 1]}%`
      : `${vals[0]}%`;
    rows.push({ label: "Other meds", percent: vals[vals.length - 1], display: range });
  }
  const activity = find(a => /aerobic|activity/i.test(a.code));
  if (activity?.adherence) {
    const { weeklyMinutesActual, weeklyMinutesTarget, percent } = activity.adherence;
    const label = weeklyMinutesActual != null && weeklyMinutesTarget != null
      ? `Activity ${weeklyMinutesActual}/${weeklyMinutesTarget} min`
      : "Activity";
    rows.push({ label, percent });
  }
  return rows;
}
function adherenceBadgeColor(pct) {
  if (pct == null) return { bg: "#F5F3ED", text: S.textMed };
  if (pct >= 85) return { bg: S.greenBg, text: S.greenText };
  return { bg: S.amberBg, text: S.amberText };
}
function CarePlanOverviewCard({ carePlan, onViewFull }) {
  if (!carePlan) {
    return (
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <CardTitle>Care plan</CardTitle>
        <EmptyState>No active care plan in Medplum.</EmptyState>
      </div>
    );
  }
  const day = dayOfProgram(carePlan.period?.start);
  const rows = summarizeAdherence(carePlan.activities);
  const goals = (carePlan.goals || []).slice(0, 4);
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <CardTitle>Care plan</CardTitle>
        <div style={{ flex: 1 }} />
        {day != null && (
          <span style={{ fontSize: 13, ...css.sans, color: S.textMed, background: S.chip, padding: "2px 7px", borderRadius: 3 }}>
            Day {day} · Continuous Care
          </span>
        )}
      </div>
      <div style={{ fontSize: 18, ...css.serif, color: S.text, marginBottom: 12 }}>{carePlan.title}</div>
      <div style={{ display: "grid", gridTemplateColumns: rows.length ? "1fr 1fr" : "1fr", gap: 18 }}>
        <div>
          <div style={{ fontSize: 13, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Goals</div>
          {goals.length === 0 && <EmptyState>No goals defined.</EmptyState>}
          {goals.map(g => (
            <div key={g.id} style={{ fontSize: 14, ...css.sans, color: S.text, padding: "4px 0", display: "flex", gap: 8 }}>
              <span style={{ color: S.textLight }}>•</span>
              <span>{shortGoalLabel(g, carePlan.period?.start)}</span>
            </div>
          ))}
        </div>
        {rows.length > 0 && <div>
          <div style={{ fontSize: 13, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Adherence this week</div>
          {rows.map((r, i) => {
            const pct = r.percent;
            const { source, confidence, detail: sourceDetail } = sourceForAdherence(r.label);
            const rowDetail = r.display || sourceDetail;
            const status = pct == null
              ? "missing"
              : pct >= 85
                ? "ok"
                : "warn";
            return (
              <AdherenceRow
                key={i}
                label={r.label}
                pct={pct}
                source={pct == null ? "no device sync" : source}
                detail={pct == null ? "no recent reading" : rowDetail}
                confidence={confidence}
                status={status}
              />
            );
          })}
        </div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button onClick={onViewFull} style={{ fontSize: 14, ...css.sans, color: S.navy, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
          View full care plan →
        </button>
      </div>
    </div>
  );
}

// ── Tab: Care Plan ──
function CarePlanTab({ patientData }) {
  const cp = patientData?.carePlan;
  if (!cp) return <EmptyState>No active care plan in Medplum.</EmptyState>;
  const day = dayOfProgram(cp.period?.start);
  const frequencyLabel = (timing) => {
    if (!timing) return "";
    const { frequency, period, periodUnit } = timing;
    if (!frequency || !periodUnit) return "";
    const unit = periodUnit === "d" ? "day" : periodUnit === "wk" ? "week" : periodUnit === "mo" ? "month" : periodUnit;
    const per = !period || period === 1 ? unit : `${period} ${unit}s`;
    return frequency === 1 ? `${frequency}× per ${per}` : `${frequency}× per ${per}`;
  };
  return <div>
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 20, ...css.serif, color: S.text, flex: 1 }}>{cp.title}</div>
        {day != null && (
          <span style={{ fontSize: 13, ...css.sans, color: S.textMed, background: S.chip, padding: "2px 7px", borderRadius: 3 }}>Day {day} · Continuous Care</span>
        )}
      </div>
      {cp.description && <div style={{ fontSize: 14, ...css.sans, color: S.textMed, lineHeight: 1.5, marginBottom: 8 }}>{cp.description}</div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, ...css.sans, color: S.textLight }}>
        {cp.author && <span>Author: {cp.author}</span>}
        {cp.period?.start && <span>Started: {fmtLocalDate(cp.period.start)}</span>}
      </div>
    </div>

    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <CardTitle>Goals ({cp.goals?.length || 0})</CardTitle>
      {(cp.goals || []).length === 0 && <EmptyState>No goals defined.</EmptyState>}
      {(cp.goals || []).map(g => {
        const target = g.targets?.[0];
        return (
          <div key={g.id} style={{ padding: "10px 0", borderBottom: `1px solid #F0EEE8`, ...css.sans }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 15, color: S.text, fontWeight: 700, flex: 1 }}>{shortGoalLabel(g, cp.period?.start)}</div>
              {g.priority && <Badge color={g.priority === "high-priority" ? "red" : g.priority === "medium-priority" ? "amber" : "gray"}>
                {g.priority === "high-priority" ? "High" : g.priority === "medium-priority" ? "Medium" : g.priority}
              </Badge>}
              {g.status && <Badge color="blue">{g.status}</Badge>}
            </div>
            <div style={{ fontSize: 14, color: S.textMed, lineHeight: 1.5, marginBottom: 4 }}>{g.description}</div>
            {g.targets?.length > 0 && (
              <div style={{ fontSize: 13, color: S.textLight, marginBottom: 4 }}>
                Target{g.targets.length > 1 ? "s" : ""}: {g.targets.map((t) => {
                  const base = `${t.measure} ${t.value}${t.unit ? " " + t.unit : ""}`;
                  if (!t.dueDate) return base;
                  const milestone = reviewMilestone(t.dueDate, cp.period?.start);
                  return milestone
                    ? `${base} · ${milestone} · ${fmtLocalDate(t.dueDate)}`
                    : `${base} by ${fmtLocalDate(t.dueDate)}`;
                }).join(" · ")}
              </div>
            )}
            {g.note && <div style={{ fontSize: 13, color: S.textLight, fontStyle: "italic" }}>{g.note}</div>}
          </div>
        );
      })}
    </div>

    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <CardTitle>Activities ({cp.activities?.length || 0})</CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 1fr", gap: 10, padding: "8px 0", borderBottom: `1px solid ${S.border}`, fontSize: 13, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>
        <div>Activity</div>
        <div>Schedule</div>
        <div>Adherence</div>
        <div>Progress</div>
      </div>
      {(cp.activities || []).map((a, i) => {
        const pct = a.adherence?.percent;
        const colors = adherenceBadgeColor(pct);
        const progress = a.adherence?.actual != null && a.adherence?.expected != null
          ? `${a.adherence.actual}/${a.adherence.expected}`
          : a.adherence?.weeklyMinutesActual != null && a.adherence?.weeklyMinutesTarget != null
            ? `${a.adherence.weeklyMinutesActual}/${a.adherence.weeklyMinutesTarget} min`
            : "—";
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 1fr", gap: 10, padding: "10px 0", borderBottom: i < cp.activities.length - 1 ? `1px solid #F0EEE8` : "none", fontSize: 14, ...css.sans, alignItems: "start" }}>
            <div>
              <div style={{ color: S.text, fontWeight: 700 }}>{a.code}</div>
              {a.description && <div style={{ color: S.textLight, fontSize: 13, marginTop: 2, lineHeight: 1.4 }}>{a.description}</div>}
              {a.adherence?.note && <div style={{ color: S.amberText, fontSize: 13, marginTop: 2, fontStyle: "italic" }}>{a.adherence.note}</div>}
            </div>
            <div style={{ color: S.textMed }}>{frequencyLabel(a.timing) || "As needed"}</div>
            <div>
              <span style={{ padding: "2px 6px", borderRadius: 4, background: colors.bg, color: colors.text, fontWeight: 700 }}>{pct == null ? "—" : `${pct}%`}</span>
            </div>
            <div style={{ color: S.textMed, fontSize: 13 }}>
              <div>{progress}</div>
              {a.adherence?.lastEventDate && <div style={{ color: S.textLight, marginTop: 2 }}>Last: {fmtLocalDate(a.adherence.lastEventDate)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  </div>;
}

// ── Overview cards: Conditions, Medications, Labs ──
// Active-only filter applied client-side. TODO: push clinicalStatus=active
// filter into the Medplum resolver so inactive conditions never ship.
function ConditionsCard({ conditions = [] }) {
  const active = conditions.filter(c => !c.status || c.status === "active");
  const historical = conditions.filter(c => c.status && c.status !== "active");
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <CardTitle>Active conditions</CardTitle>
      {active.length === 0 && <EmptyState>No active conditions.</EmptyState>}
      {active.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: i < active.length - 1 ? `1px solid #F0EEE8` : "none", ...css.sans }}>
          <span style={{ fontSize: 15, color: S.text, flex: 1 }}>{c.text}</span>
          {c.code && <span style={{ fontSize: 13, ...css.mono, color: S.textLight }}>{c.code}</span>}
          {c.onset && <span style={{ fontSize: 13, ...css.mono, color: S.textLight }}>Since {fmtDate(c.onset)}</span>}
        </div>
      ))}
      {historical.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 13, ...css.sans, color: S.textLight, cursor: "pointer" }}>
            History ({historical.length})
          </summary>
          {historical.map((c, i) => (
            <div key={i} style={{ fontSize: 14, ...css.sans, color: S.textMed, padding: "6px 0 0", lineHeight: 1.5 }}>
              {c.text}{c.code ? ` · ${c.code}` : ""} · {c.status}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

// Clinical ordering: BP meds first for HTN patients, then glycemic, then
// lipids, then prophylactic, then anything uncategorized. Do not
// alphabetize — chart summary tic, not clinical reasoning.
const MED_CLASS_ORDER = ["htn", "glycemic", "lipid", "prophylactic", "other"];
const MED_CLASSIFIERS = [
  { cls: "htn", re: /(lisinopril|losartan|valsartan|ramipril|enalapril|amlodipine|hydrochlorothiazide|hctz|metoprolol|carvedilol|atenolol|chlorthalidone)/i },
  { cls: "glycemic", re: /(metformin|glipizide|glyburide|sitagliptin|empagliflozin|dapagliflozin|liraglutide|semaglutide|ozempic|jardiance|mounjaro|insulin)/i },
  { cls: "lipid", re: /(atorvastatin|rosuvastatin|simvastatin|pravastatin|ezetimibe|evolocumab|statin)/i },
  { cls: "prophylactic", re: /(aspirin|clopidogrel|warfarin|apixaban|rivaroxaban|ticagrelor)/i },
];
function classifyMed(name = "") {
  for (const c of MED_CLASSIFIERS) if (c.re.test(name)) return c.cls;
  return "other";
}
function MedicationsCard({ medications = [] }) {
  const active = medications.filter(m => !m.status || m.status === "active");
  const sorted = active
    .map((m, idx) => ({ ...m, cls: classifyMed(m.name), idx }))
    .sort((a, b) => {
      const ai = MED_CLASS_ORDER.indexOf(a.cls);
      const bi = MED_CLASS_ORDER.indexOf(b.cls);
      if (ai !== bi) return ai - bi;
      return a.idx - b.idx; // preserve source order within class
    });
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <CardTitle>Current medications</CardTitle>
      {sorted.length === 0 && <EmptyState>No active medications.</EmptyState>}
      {sorted.map((m, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: i < sorted.length - 1 ? `1px solid #F0EEE8` : "none", ...css.sans }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 15, color: S.text, flex: 1 }}>{m.name}</span>
          </div>
          {m.dosage && (
            <div style={{ fontSize: 13, color: S.textMed, marginTop: 2, lineHeight: 1.5 }}>{m.dosage}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Group labs by LOINC, compute trend for each. Filters to codes with ≥2
// readings in the last 30 days so the "trended labs" grid only shows
// actionable directional data. Single-reading labs go to a collapsed
// affordance below.
const LAB_CONFIG = {
  "41604-0": { label: "Fasting glucose", target: "<130", targetMax: 130, loinc: "41604-0" },
  "1558-6":  { label: "Fasting glucose", target: "<130", targetMax: 130, loinc: "1558-6" },
  "4548-4":  { label: "Hemoglobin A1c",  target: "<7.0", targetMax: 7.0, loinc: "4548-4" },
  "2089-1":  { label: "LDL cholesterol", target: "<70",  targetMax: 70,  loinc: "2089-1" },
  "2160-0":  { label: "Creatinine",      target: "0.7–1.3" },
  "69405-9": { label: "eGFR",            target: "≥60" },
  "14959-1": { label: "Microalbumin/Cr", target: "<30",  targetMax: 30, loinc: "14959-1" },
};
function LabsRow({ labs = [] }) {
  const groups = new Map();
  for (const l of labs) {
    if (!l.code) continue;
    if (!groups.has(l.code)) groups.set(l.code, []);
    groups.get(l.code).push(l);
  }

  // Window: readings from the last 30 days only.
  const now = Date.now();
  const horizonMs = 30 * 24 * 60 * 60 * 1000;
  const trended = [];
  const single = [];
  for (const [code, readings] of groups) {
    const windowed = readings.filter(r => r.date && now - new Date(r.date).getTime() <= horizonMs);
    const cfg = LAB_CONFIG[code];
    const label = cfg?.label || readings[0]?.name || code;
    if (windowed.length >= 2) {
      const trend = computeTrend(windowed, {
        limit: 5,
        format: r => `${r.value}`,
      });
      const latest = [...windowed].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const status = cfg?.targetMax != null && latest.value != null
        ? (latest.value <= cfg.targetMax ? "ok" : "alert")
        : "neutral";
      trended.push({ code, label, cfg, trend, latest, status });
    } else if (windowed.length === 1) {
      single.push({ code, label, cfg, reading: windowed[0] });
    }
  }

  if (trended.length === 0 && single.length === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 14, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 1, margin: "6px 0 10px" }}>
        Recent labs — trended
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {trended.map(t => (
          <MetricTile
            key={t.code}
            label={t.label}
            value={t.latest.value}
            unit={t.latest.unit}
            date={fmtDate(t.latest.date)}
            status={t.status}
            trend={t.trend && { arrow: t.trend.arrow, series: t.trend.series, window: t.trend.window, target: t.cfg?.target }}
          />
        ))}
      </div>
      {single.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, ...css.sans, color: S.textLight, cursor: "pointer" }}>
            Recent labs (single readings) · {single.length}
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 8 }}>
            {single.map(s => (
              <div key={s.code} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10, ...css.sans }}>
                <div style={{ fontSize: 13, color: S.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, ...css.serif, color: S.text }}>
                  {s.reading.value}
                  <span style={{ fontSize: 13, ...css.sans, color: S.textLight, marginLeft: 6 }}>{s.reading.unit || ""}</span>
                </div>
                <div style={{ fontSize: 13, color: S.textLight, marginTop: 4 }}>
                  {fmtDate(s.reading.date)}{s.cfg?.target ? ` · target ${s.cfg.target}` : ""}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Clinical state per patient (hardcoded for the demo) ──
// Keyed by patient name as returned from Medplum / LOCAL_PATIENTS. Patients
// not present here render no Current Clinical State block — silence is
// preferred over placeholder text. Replace with a server-side resolver
// once a clinical-state rule engine exists.
const CLINICAL_STATES = {
  "Marcus Williams": {
    state: "watch",
    reason: "BP 158/98 above target, suboptimal adherence",
    action: "Reinforce medication adherence, repeat BP in 48h",
    threshold: "≥180 systolic or symptoms → SAME-DAY",
  },
  "Linda Patel": {
    state: "stable",
    reason: "BP at target, glucose stable, A1C 6.8%, eGFR 52",
    action: "Continue current cadence",
    threshold: "SBP ≥150, hypoglycemia symptoms, or eGFR <45 → WATCH",
  },
  "David Brooks": {
    state: "watch",
    reason: "BP drifting up (138 → 152, 14d), adherence-naive",
    action: "Reinforce lisinopril adherence, BP technique check",
    threshold: "SBP ≥160 or symptoms → SAME-DAY",
  },
  "Maria Gonzalez": {
    state: "stable",
    reason: "BP and weight stable, on full regimen",
    action: "Continue current cadence",
    threshold: "SBP ≥150 or new symptoms → WATCH",
  },
};
const STATE_TONES = {
  stable:    { label: "STABLE",    fg: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  watch:     { label: "WATCH",     fg: "#78350F", bg: "#FFFBEB", border: "#FCD34D" },
  sameDay:   { label: "SAME-DAY",  fg: "#7F1D1D", bg: "#FEF2F2", border: "#FCA5A5" },
  emergency: { label: "EMERGENCY", fg: "#FFFFFF", bg: "#A93226", border: "#A93226" },
};

// ── Sessions strip (top of Overview) ──
// Source: medplumSessions for non-Marcus patients (already shaped by the
// CoordinatorDashboard sessions resolver), MARCUS_SESSIONS fixture for
// Marcus. If there are zero sessions render the strip in muted form
// rather than hiding — sessions ARE the product, the absence of them
// is itself a signal.
function SessionsStrip({ patientName, isMarcus, medplumSessions, onViewAll }) {
  // Build the unified session list ordered newest-first.
  let sessions;
  if (!medplumSessions?.length && isMarcus) {
    sessions = MARCUS_SESSIONS.map(s => ({
      sortDate: s.sortDate,
      label: s.date,
      synthesis: s.synthesis,
    }));
  } else {
    const list = medplumSessions || [];
    sessions = [...list]
      .map(s => ({
        sortDate: s.date,
        label: fmtSessionDateTime(s.date),
        synthesis: s.summary || s.reason || "AI voice check-in",
      }))
      .sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
  }

  const last = sessions[0];
  const total = sessions.length;
  // Compute window from earliest to latest. Floor to 1d so a single-session
  // patient still reads as "1 session in 1d" rather than 0d.
  const windowDays = total > 1
    ? Math.max(1, Math.ceil((new Date(sessions[0].sortDate) - new Date(sessions[total - 1].sortDate)) / 86400000))
    : 1;
  const insight = isMarcus ? MARCUS_CROSS_SESSION_INSIGHT : null;

  return (
    <div
      style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        borderRadius: 8,
        padding: 14,
        marginBottom: 14,
        ...css.sans,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <CardTitle>Sessions</CardTitle>
        {total > 0 && (
          <span style={{ fontSize: 13, color: S.textLight, fontVariantNumeric: "tabular-nums" }}>
            {total} {total === 1 ? "session" : "sessions"} in {windowDays}d
          </span>
        )}
      </div>
      {last ? (
        <div>
          <div style={{ fontSize: 13, color: S.textLight, ...css.mono, marginBottom: 4 }}>
            Last session · {last.label}
          </div>
          <div style={{ fontSize: 15, color: S.text, lineHeight: 1.5 }}>{last.synthesis}</div>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: S.textLight, fontStyle: "italic" }}>No sessions yet</div>
      )}
      {insight && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${S.border}`,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: STATE_TONES.watch.fg,
              background: STATE_TONES.watch.bg,
              border: `1px solid ${STATE_TONES.watch.border}`,
              padding: "2px 6px",
              borderRadius: 3,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {insight.severity === "sameDay" ? "Same-day" : insight.severity}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: S.text, fontWeight: 600 }}>{insight.title}</div>
            <div style={{ fontSize: 13, color: S.textMed, marginTop: 2, lineHeight: 1.5 }}>{insight.body}</div>
          </div>
        </div>
      )}
      {total > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={onViewAll} style={{ fontSize: 14, ...css.sans, color: S.navy, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            View all sessions →
          </button>
        </div>
      )}
    </div>
  );
}

// Format an ISO date as "Apr 22, 8:14 AM" or "Today, 8:14 AM" if same day.
function fmtSessionDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

// ── Current Clinical State block ──
function CurrentClinicalState({ patientName }) {
  const cs = CLINICAL_STATES[patientName];
  if (!cs) return null;
  const tone = STATE_TONES[cs.state] || STATE_TONES.stable;
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14, ...css.sans }}>
      <CardTitle>Current clinical state</CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "10px 16px", alignItems: "baseline" }}>
        <div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: tone.fg,
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              padding: "4px 8px",
              borderRadius: 3,
            }}
          >
            {tone.label}
          </span>
        </div>
        <div style={{ fontSize: 15, color: S.text, lineHeight: 1.5 }}>{cs.reason}</div>

        <div style={{ fontSize: 12, color: S.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Action</div>
        <div style={{ fontSize: 14, color: S.text, lineHeight: 1.5 }}>{cs.action}</div>

        <div style={{ fontSize: 12, color: S.textLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>Escalation</div>
        <div style={{ fontSize: 13, color: S.textMed, lineHeight: 1.5, ...css.mono }}>{cs.threshold}</div>
      </div>
    </div>
  );
}

// ── Tab: Overview ──
function OverviewTab({ patientData, onViewAllSessions, onViewRiskProfile, onViewCarePlan, medplumSessions, lastCallSummary, sessionLogStatus, onDismissLastCall }) {
  if (!patientData) return <EmptyState>No patient data loaded from Medplum.</EmptyState>;
  const { conditions = [], medications = [], vitals = {} } = patientData;
  const patientName = patientData?.patient?.name || "";
  const isMarcus = /marcus\s+williams/i.test(patientName);
  const pcePct = calcPCE(defaultPCEInputs(patientData));
  const pceTier = pceTierLabel(pcePct);
  const pceColors = pceTierColors(pcePct);
  const pceShort = pcePct >= 20 ? "High" : pcePct >= 7.5 ? "Intermediate" : pcePct >= 5 ? "Borderline" : "Low";
  const latestBP = patientData.latestBP;
  const latestWeight = patientData.latestWeight;
  const bps = (vitals.bloodPressures || []).slice(0, 5);
  const weights = (vitals.weights || []).slice(0, 5);
  const bpTrend = computeTrend(bps, {
    limit: 5,
    format: r => `${r.systolic}/${r.diastolic}`,
  });
  const wtTrend = computeTrend(weights, {
    limit: 5,
    format: r => `${r.value}`,
  });
  const bpStatus = latestBP
    ? (latestBP.systolic >= 140 || latestBP.diastolic >= 90 ? "alert" : "ok")
    : "neutral";

  return <div>
    {lastCallSummary && <PostCallSummary summary={lastCallSummary} status={sessionLogStatus} onDismiss={onDismissLastCall} onViewSessions={onViewAllSessions} />}
    <SessionsStrip
      patientName={patientName}
      isMarcus={isMarcus}
      medplumSessions={medplumSessions}
      onViewAll={onViewAllSessions}
    />
    <CurrentClinicalState patientName={patientName} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
      <MetricTile
        label="Latest BP"
        value={latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : "—"}
        unit={latestBP ? "mmHg" : ""}
        date={latestBP ? fmtDate(latestBP.date) : "No data"}
        status={bpStatus}
        trend={bpTrend && {
          arrow: bpTrend.arrow,
          series: bpTrend.series,
          window: bpTrend.window,
          target: "<130/80",
        }}
      />
      <MetricTile
        label="Weight"
        value={latestWeight ? latestWeight.value : "—"}
        unit={latestWeight ? (latestWeight.unit || "lb") : ""}
        date={latestWeight ? fmtDate(latestWeight.date) : "No data"}
        status="neutral"
        trend={wtTrend && {
          arrow: wtTrend.arrow,
          series: wtTrend.series,
          window: wtTrend.window,
          target: null,
        }}
      />
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10, display: "flex", flexDirection: "column" }}>
        <CardTitle>10-year ASCVD risk</CardTitle>
        <div>
          <span style={{ fontSize: 24, ...css.serif }}>{pcePct.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: S.textLight, ...css.sans }}>%</span>
        </div>
        <div style={{ fontSize: 14, ...css.sans, padding: "2px 6px", borderRadius: 4, background: pceColors.bg, color: pceColors.text, alignSelf: "flex-start", marginTop: 4 }}>{pceShort}</div>
        <div style={{ fontSize: 13, ...css.sans, color: S.textLight, marginTop: 4 }}>Per ACC/AHA PCE (2013)</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={onViewRiskProfile}
          style={{ fontSize: 14, ...css.sans, color: S.navy, background: "transparent", border: "none", cursor: "pointer", padding: 0, marginTop: 8, textAlign: "left" }}
        >
          View full risk profile →
        </button>
      </div>
    </div>
    <CarePlanOverviewCard carePlan={patientData.carePlan} onViewFull={onViewCarePlan} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
      <ConditionsCard conditions={conditions} />
      <MedicationsCard medications={medications} conditions={conditions} />
    </div>
    <LabsRow labs={patientData.labs} />
  </div>;
}

// ── Tab: Risk Profile ──
function RiskTab({ patientData }) {
  const latestBP = patientData?.latestBP;
  const hasDM = hasActiveDiabetes(patientData?.conditions);
  const [pceInputs, setPceInputs] = useState(() => defaultPCEInputs(patientData));
  const [tips, setTips] = useState({});

  useEffect(() => {
    setPceInputs(p => ({
      ...p,
      age: ageFromBirthDate(patientData?.patient?.birthDate) || p.age,
      sbp: latestBP?.systolic || p.sbp,
      dm: hasDM ? 1 : 0,
    }));
  }, [patientData, latestBP?.systolic, hasDM]);

  const pct = calcPCE(pceInputs);
  const tierLabel = pceTierLabel(pct);
  const tierColors = pceTierColors(pct);
  const toggleTip = (k) => setTips(t => ({ ...t, [k]: !t[k] }));

  const inp = (id, label, type = "number", opts) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 15, ...css.sans, color: S.textMed, flex: "0 0 160px" }}>{label}</span>
      {type === "select"
        ? <select value={pceInputs[id]} onChange={e => setPceInputs(p => ({ ...p, [id]: e.target.value }))} style={{ flex: "0 0 90px", border: `1px solid ${S.border}`, borderRadius: 5, padding: "4px 7px", fontSize: 14, ...css.mono }}>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : <input type="number" value={pceInputs[id]} onChange={e => setPceInputs(p => ({ ...p, [id]: parseFloat(e.target.value) || 0 }))} style={{ flex: "0 0 80px", border: `1px solid ${S.border}`, borderRadius: 5, padding: "4px 7px", fontSize: 14, ...css.mono }} />}
    </div>
  );

  return <div>
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid #F0EEE8` }}>
        <span style={{ fontSize: 18, ...css.sans, color: S.text, fontWeight: 700, flex: 1 }}>10-year ASCVD risk</span>
        <GuidelineBadge type="acc">ACC/AHA PCE (2013)</GuidelineBadge>
        <HelpBtn onClick={() => toggleTip("pce")} />
      </div>
      <Tooltip visible={tips.pce} title="ACC/AHA Pooled Cohort Equations (2013)">Estimates 10-year risk of first atherosclerotic cardiovascular event. Inputs seeded from Medplum observations.</Tooltip>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {inp("age", "Age")}
          {inp("tc", "Total cholesterol (mg/dL)")}
          {inp("hdl", "HDL-C (mg/dL)")}
          {inp("sbp", "Systolic BP (mmHg)")}
          {inp("bptx", "On BP treatment", "select", [{ v: 1, l: "Yes" }, { v: 0, l: "No" }])}
          {inp("dm", "Diabetes", "select", [{ v: 1, l: "Yes" }, { v: 0, l: "No" }])}
          {inp("smoke", "Current smoker", "select", [{ v: 0, l: "No" }, { v: 1, l: "Yes" }])}
          {inp("group", "Race / sex", "select", [{ v: "wm", l: "White male" }, { v: "wf", l: "White female" }, { v: "am", l: "Black male" }, { v: "af", l: "Black female" }])}
        </div>
        <div style={{ flex: "0 0 150px", textAlign: "center", paddingTop: 6 }}>
          <div style={{ fontSize: 36, ...css.serif }}>{pct.toFixed(1)}%</div>
          <div style={{ fontSize: 13, ...css.sans, color: S.textLight, marginBottom: 6 }}>10-yr ASCVD</div>
          <div style={{ fontSize: 14, ...css.sans, padding: "4px 6px", borderRadius: 4, background: tierColors.bg, color: tierColors.text }}>{tierLabel}</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 7, background: S.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: tierColors.bar, borderRadius: 3, width: `${Math.min(100, pct / 30 * 100).toFixed(1)}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginTop: 14 }}>
      <CardTitle>In-call escalation triggers</CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 1fr", gap: 10, padding: "8px 0", borderBottom: `1px solid ${S.border}`, fontSize: 13, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>
        <div>Trigger</div>
        <div>State</div>
        <div>Citation</div>
      </div>
      {[
        { trigger: "SBP ≥140 or DBP ≥90, no symptoms", state: "Flag: Stage 2 HTN", citation: "AHA/ACC 2017 HTN", citeType: "aha" },
        { trigger: "SBP ≥180 or DBP ≥120, no end-organ symptoms", state: "Urgent: hypertensive urgency, same-day clinical evaluation", citation: "AHA/ACC 2017 HTN", citeType: "aha" },
        { trigger: "SBP ≥180 or DBP ≥120 WITH end-organ symptoms (severe headache + vision changes, chest pain, neurologic deficit, dyspnea)", state: "Emergency: hypertensive emergency, 911 guidance", citation: "AHA/ACC 2017 HTN §11.2", citeType: "aha" },
        { trigger: "Chest pain reported", state: "Emergency: ACS concern, 911 guidance", citation: "AHA/ACC ACS guidance", citeType: "aha" },
        { trigger: "Glucose <70 mg/dL reported", state: "Urgent: hypoglycemia", citation: "ADA Standards of Care 2026", citeType: "ada" },
        { trigger: "Glucose >240 mg/dL with symptoms", state: "Urgent: possible DKA/HHS", citation: "ADA Standards of Care 2026", citeType: "ada" },
        { trigger: "Medication adherence gap ≥3 days", state: "Flag: adherence concern", citation: "ADA Standards of Care 2026", citeType: "ada" },
      ].map((row, i, arr) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 1fr", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid #F0EEE8` : "none", ...css.sans, fontSize: 15 }}>
          <div style={{ color: S.text }}>{row.trigger}</div>
          <div style={{ color: S.textMed }}>{row.state}</div>
          <div><GuidelineBadge type={row.citeType}>{row.citation}</GuidelineBadge></div>
        </div>
      ))}
      <div style={{ fontSize: 13, ...css.sans, color: S.textLight, marginTop: 12, lineHeight: 1.55 }}>
        Symptom-based escalation rules aligned to published guidelines. Informational only. All clinical decisions by the treating clinician.
      </div>
    </div>
  </div>;
}

// ── Session fixtures ──
// Shared between OverviewTab's "Recent sessions" card and SessionsTab.
// Keyed by patient name; falls back to a generic set when no match.
// Replace with Medplum Communication / Encounter resources once those are seeded.
const GENERIC_SESSIONS = [
  { id: "s-gen-1", date: "2026-02-27", duration: "4m 12s", summary: "Weekly check-in. Vitals stable. Patient reports good medication adherence and no new symptoms." },
  { id: "s-gen-2", date: "2026-02-20", duration: "5m 48s", summary: "Reviewed sodium intake and daily weight log. Reinforced warning signs. Care plan on track." },
  { id: "s-gen-3", date: "2026-02-13", duration: "6m 05s", summary: "Post-discharge onboarding. Confirmed pharmacy, PCP contact, and care journey expectations." },
];
export const SESSION_FIXTURES = {
  "Marcus Williams": [
    { id: "s-mw-1", date: "2026-03-05", duration: "5m 22s", summary: "BP 158/98, 4-day worsening trend. Missed Lisinopril dose confirmed. Escalated P2 to David Park." },
    { id: "s-mw-2", date: "2026-02-28", duration: "4m 08s", summary: "Routine HTN check-in. BP 142/88. Reinforced evening Lisinopril routine and home cuff technique." },
    { id: "s-mw-3", date: "2026-02-22", duration: "3m 51s", summary: "Patient declined glucose-log review. No new symptoms. Agreed to resume weekly readings." },
  ],
  "Linda Patel": [
    { id: "s-lp-1", date: "2026-04-22", duration: "4m 47s", summary: "Home BP 130/78, eGFR stable at 52 mL/min. Reinforced Losartan + HCTZ timing. Asked about salt-substitute safety given CKD3a." },
    { id: "s-lp-2", date: "2026-04-15", duration: "5m 31s", summary: "Fasting glucose averaging 104 on Metformin + Glipizide. A1c due in next quarterly review. No hypoglycemia episodes." },
    { id: "s-lp-3", date: "2026-04-08", duration: "4m 02s", summary: "Quarterly review prep. BP cuff technique reviewed; nephrology follow-up scheduled for Q2 review cycle." },
  ],
  "Angela Ruiz": [
    { id: "s-ar-1", date: "2026-04-22", duration: "5m 18s", summary: "Week 12 on Ozempic. Weight 94.5 kg (−7.5 kg from baseline). Mild nausea early in week, resolved with smaller evening meals." },
    { id: "s-ar-2", date: "2026-04-15", duration: "6m 03s", summary: "A1c 7.2% on most recent draw, down from 8.1% at GLP-1 initiation. Fasting glucose trending 126–132 range. Good tolerance." },
    { id: "s-ar-3", date: "2026-04-08", duration: "4m 55s", summary: "GI side-effect triage: intermittent early satiety, no vomiting or dehydration. Reinforced hydration + slow meal pacing." },
  ],
  "Maria Gonzalez": [
    { id: "s-mg-1", date: "2026-02-28", duration: "7m 01s", summary: "HTN + HLD follow-up in Spanish. BP 148/92 trending down on Lisinopril + Atorvastatin. Reinforced sodium 1500 mg target and daily AM weight logging." },
    { id: "s-mg-2", date: "2026-02-24", duration: "5m 48s", summary: "BP cuff technique reviewed. Patient reports good medication adherence. Scheduled lipid panel for next month." },
    { id: "s-mg-3", date: "2026-02-21", duration: "6m 22s", summary: "Onboarding in Spanish. Confirmed pharmacy, PCP, and care journey structure." },
  ],
  "David Brooks": [
    { id: "s-db-1", date: "2026-04-23", duration: "3m 42s", summary: "Home BP 130/80 stable on Lisinopril 10mg. Fasting glucose trending 114–120 — reinforced continued risk of progression to T2DM without lifestyle change." },
    { id: "s-db-2", date: "2026-04-16", duration: "4m 15s", summary: "Reviewed DASH diet pattern and 150 min/week aerobic target. Patient hitting ~90 min/week; discussed barriers." },
    { id: "s-db-3", date: "2026-04-08", duration: "3m 58s", summary: "Onboarding. Confirmed home BP cuff, lifestyle goals, and quarterly A1c cadence." },
  ],
};
export function getSessionsFor(patientName) {
  return SESSION_FIXTURES[patientName] || GENERIC_SESSIONS;
}
function fmtSessionDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Merge Medplum-fetched sessions with the fixture set. Real sessions always
// take precedence; fixtures only fill in when Medplum has nothing logged for
// this patient yet (keeps scripted demos working until live sessions exist).
function resolveSessions(medplumSessions, patientName) {
  if (medplumSessions && medplumSessions.length) {
    return medplumSessions.map(s => ({
      id: s.id,
      date: s.date,
      duration: s.duration || "",
      summary: s.summary || s.reason || "AI voice check-in",
      transcript: s.transcript || "",
      riskLevel: s.riskLevel || null,
      alertGenerated: !!s.alertGenerated,
      source: "medplum",
    }));
  }
  return (getSessionsFor(patientName) || []).map(s => ({ ...s, source: "fixture" }));
}

// ── Tab: Sessions ──
// Three-layer structure: cadence header → cross-session insight → per-session cards.
// Marcus's chart uses hard-coded MARCUS_SESSIONS so Teja demos read as the
// product's spine. Generalized rule engine TODO (see data dependencies).
function SessionsTab({ patientData, medplumSessions, loading }) {
  const name = patientData?.patient?.name || "";
  const isMarcus = /marcus\s+williams/i.test(name);

  if (loading) return <EmptyState>Loading sessions from Medplum…</EmptyState>;

  // Prefer real Medplum sessions when present. Fall back to the rich
  // Marcus fixture for the demo; other patients fall through to the
  // lightweight legacy fixtures.
  const hasMedplum = medplumSessions && medplumSessions.length > 0;
  let cards = [];
  if (hasMedplum) {
    cards = medplumSessions.map(s => ({
      id: s.id,
      date: fmtSessionDate(s.date),
      sortDate: s.date,
      durationSec: parseDurationToSec(s.duration),
      synthesis: s.summary || s.reason || "AI voice check-in",
      transcript: s.transcript || "",
      outcome: inferOutcomeFromMedplum(s),
    }));
  } else if (isMarcus) {
    cards = MARCUS_SESSIONS;
  } else {
    const legacy = getSessionsFor(name) || [];
    cards = legacy.map(s => ({
      id: s.id,
      date: fmtSessionDate(s.date),
      sortDate: s.date,
      durationSec: parseDurationToSec(s.duration),
      synthesis: s.summary,
      transcript: s.transcript || "",
      outcome: { state: "stable", reason: "" },
    }));
  }

  if (!cards.length) return <EmptyState>No sessions logged yet. Complete an AI check-in to populate this list.</EmptyState>;

  const cadence = cadenceFromSessions(cards);
  const insight = isMarcus ? MARCUS_CROSS_SESSION_INSIGHT : null;

  return (
    <div>
      {cadence && (
        <SessionsCadence
          totalSessions={cadence.totalSessions}
          windowDays={cadence.windowDays}
          avgDurationSec={cadence.avgDurationSec}
          completionRate={cadence.completionRate}
          lastSession={cadence.lastSession}
        />
      )}
      {insight && (
        <CrossSessionInsight
          severity={insight.severity}
          title={insight.title}
          body={insight.body}
          flaggedAt={insight.flaggedAt}
        />
      )}
      {cards.map((c, i) => (
        <SessionCard
          key={c.id}
          date={c.date}
          durationSec={c.durationSec}
          synthesis={c.synthesis}
          outcome={c.outcome}
          transcript={c.transcript}
          defaultOpen={i === 0 && isMarcus}
        />
      ))}
    </div>
  );
}

// "4m 12s" → 252. Tolerates bare seconds and missing values.
function parseDurationToSec(str) {
  if (!str || typeof str !== "string") return null;
  const m = str.match(/(\d+)m\s*(\d+)?s?/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2] || 0, 10);
  const n = parseInt(str, 10);
  return Number.isFinite(n) ? n : null;
}

function inferOutcomeFromMedplum(s) {
  if (s.alertGenerated) return { state: "sameDay", reason: s.reason || "Alert escalated" };
  if (s.riskLevel === "high") return { state: "sameDay", reason: "High risk" };
  if (s.riskLevel === "moderate") return { state: "watch", reason: "Moderate risk" };
  return { state: "stable", reason: "" };
}

// ── Tab: Outreach ──
function OutreachTab({ patientData, onInitiateCall }) {
  const [selected, setSelected] = useState(null);
  const phone = patientData?.patient?.phone || "—";
  const email = patientData?.patient?.email || "—";
  const name = patientData?.patient?.name || "Patient";
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
      {[{ id: "sms", icon: "✉", name: "SMS", desc: phone }, { id: "call", icon: "☎", name: "Voice call", desc: "Vardana AI check-in" }, { id: "email", icon: "@", name: "Email", desc: email }].map(o => (
        <div key={o.id} onClick={() => setSelected(selected === o.id ? null : o.id)} style={{ border: `1px solid ${selected === o.id ? S.navy : S.border}`, borderRadius: 8, padding: 12, cursor: "pointer", background: selected === o.id ? "#F5F3ED" : S.card, textAlign: "center", transition: "all 0.15s" }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{o.icon}</div>
          <div style={{ fontSize: 14, ...css.serif }}>{o.name}</div>
          <div style={{ fontSize: 13, color: S.textLight, ...css.sans }}>{o.desc}</div>
        </div>))}
    </div>
    {selected === "call" && (
      <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, background: S.card }}>
        <div style={{ fontSize: 15, ...css.sans, color: S.textMed, marginBottom: 10 }}>Start a live AI voice check-in with {name} now.</div>
        <button onClick={onInitiateCall} style={{ fontSize: 14, ...css.sans, padding: "7px 16px", background: S.navy, color: S.navyText, border: "none", borderRadius: 6, cursor: "pointer" }}>Initiate live call</button>
      </div>
    )}
  </div>;
}

// ── In-call three-panel shell ──
// Left: ASCVD risk view (sourced from existing patientData via calcPCE).
// Center: live transcript region (placeholder until a Pipecat-side
// transcript fanout is added — see PR description) + the embedded
// LiveKitVoiceOverlay control strip at the bottom.
// Right: patient chart sidebar — allergies, conditions, medications,
// latest vitals, recent labs. All rendered from the patientData the
// dashboard has already loaded; no new fetches.
//
// LiveKitVoiceOverlay is mounted in `sessionMode='embedded'` mode so it
// renders only the audio renderer + a slim status/mute control strip.
// The full three-panel chrome stays here in the dashboard so the overlay
// remains reusable for /voice-test (which renders its own standalone
// chrome via sessionMode='voice-test').
function InCallShell({ patient, patientData, onEnd, onCallComplete }) {
  const [elapsed, setElapsed] = useState(0);
  const [connState, setConnState] = useState(null);
  // Live transcript — appended on each onTranscript event from the
  // overlay's useDataChannel subscriber. One entry per finalized turn
  // emitted by vardana-voice's User/AssistantTranscriptProcessor.
  const [transcript, setTranscript] = useState([]);
  const transcriptScrollRef = useRef(null);
  // Live patient-reported observations — keyed by kind. Updated on
  // each onObservation event from the overlay's useDataChannel
  // subscriber, sourced from vardana-voice's record_observation tool
  // when the patient verbally reports a vital. The right-panel chart
  // prefers these over patientData.latestBP / latestWeight when
  // present, with a "just now" badge to mark them as in-call captures.
  // Shape: { blood_pressure?: {...}, glucose?: {...}, weight?: {...} }
  const [liveObservations, setLiveObservations] = useState({});

  useEffect(() => {
    // Freeze the elapsed counter once the call ends — otherwise the
    // top-bar timer keeps ticking past disconnect and looks like the
    // call is still live.
    if (connState === "disconnected") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [connState]);

  // Auto-scroll transcript pane to the latest line on every append.
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript.length]);

  // Stable across renders so useDataChannel's effect doesn't re-bind
  // every paint. setTranscript via functional updater so we don't
  // depend on the latest closure.
  const handleTranscript = useCallback(({ role, text, timestamp }) => {
    if (!text || !text.trim()) return;
    setTranscript(prev => {
      // Defensive dedupe — if Pipecat retransmits the exact same turn
      // (rare but possible if a frame replays), drop the duplicate.
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.text === text && last.timestamp === timestamp) {
        return prev;
      }
      return [...prev, { role, text, timestamp, key: `${role}-${timestamp}-${prev.length}` }];
    });
  }, []);

  // Live patient-reported observation handler. Replaces the kind's
  // entry — if the patient self-corrects ("wait, 137/95 not 138/96"),
  // the bot re-fires record_observation with the new value and the
  // chart shows the latest. Older Observations are still in Medplum
  // (we don't try to retract); the chart just reflects what the
  // patient most recently said.
  const handleObservation = useCallback(({ kind, summary, value, occurredAt, observationId }) => {
    if (!kind) return;
    setLiveObservations(prev => ({
      ...prev,
      [kind]: { summary, value, occurredAt, observationId, receivedAt: Date.now() },
    }));
  }, []);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isConnected = connState === "connected";
  const isConnecting = connState === "connecting" || connState === "reconnecting";
  const callEnded = connState === "disconnected";
  const statusLabel =
    connState === "connected" ? "Connected · live" :
    connState === "connecting" ? "Connecting to LiveKit room…" :
    connState === "reconnecting" ? "Reconnecting…" :
    callEnded ? "Call ended" :
    "Starting voice session…";
  const statusColor =
    isConnected ? S.green :
    isConnecting ? S.amber :
    callEnded ? S.textLight :
    S.textLight;

  // ── Risk view (left panel) ──
  const pceInputs = useMemo(() => defaultPCEInputs(patientData), [patientData]);
  const pcePct = calcPCE(pceInputs);
  const pceTier = pceTierLabel(pcePct);
  const pceColors = pceTierColors(pcePct);

  // ── Patient chart (right panel) ──
  const chartName = patientData?.patient?.name || patient?.name || "Patient";
  const chartAge = ageFromBirthDate(patientData?.patient?.birthDate) || patient?.age;
  const chartGender = (patientData?.patient?.gender || patient?.gender || "")
    .toString()
    .charAt(0)
    .toUpperCase();
  const dob = patientData?.patient?.birthDate;
  const allergies = patientData?.allergies || [];
  const activeConditions = (patientData?.conditions || []).filter(
    c => !c.status || c.status === "active",
  );
  const activeMeds = (patientData?.medications || []).filter(
    m => !m.status || m.status === "active",
  );
  const latestBP = patientData?.latestBP;
  const latestWeight = patientData?.latestWeight;
  // Derive latestGlucose from labs since normalizeBundle doesn't break
  // it out into its own latest* shortcut. Match the LOINC codes the
  // bot's _summarize_glucose accepts (capillary or POC fasting glucose).
  const latestGlucose = useMemo(() => {
    const glucoseLabs = (patientData?.labs || []).filter(
      l => l.code === "41653-7" || l.code === "2339-0"
    );
    if (!glucoseLabs.length) return null;
    return glucoseLabs
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
  }, [patientData]);
  const recentLabs = (patientData?.labs || [])
    .slice()
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 4);

  const sectionHead = {
    fontSize: 11,
    fontWeight: 700,
    color: "#7A96B0",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 8,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        overflow: "auto",
        ...css.sans,
      }}
    >
      <div
        style={{
          // Hard bound the modal at viewport height, NOT minHeight. With
          // minHeight the modal could grow with content and the inner
          // CENTER column's `flex:1 + overflowY:auto` scroll container
          // would never get a bounded height to scroll within — so new
          // transcript bubbles pushed older ones off-screen at the
          // bottom instead of auto-scrolling. Locking to 100vh restores
          // the standard flex+overflow chain.
          height: "100vh",
          background: "#F8F9FB",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            background: S.navy,
            color: S.navyText,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: isConnected ? `0 0 6px ${S.green}66` : "none",
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 700 }}>{statusLabel}</div>
          <div
            style={{
              fontSize: 13,
              color: "#94A3B8",
              fontVariantNumeric: "tabular-nums",
              ...css.mono,
            }}
          >
            {formatElapsed(elapsed)}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, color: "#94A3B8" }}>
            {chartName}
            {chartAge ? ` · ${chartAge}` : ""}
            {chartGender ? ` · ${chartGender}` : ""}
          </div>
          <button
            onClick={onEnd}
            aria-label={callEnded ? "Call ended — return to dashboard" : "End call and return to dashboard"}
            style={{
              // Once the call has ended, swap the red "End call" CTA for a
              // softer navy "Return to dashboard" affordance — the
              // destructive action is no longer applicable, the user is
              // dismissing a finished call.
              background: callEnded ? S.navy : S.red,
              color: callEnded ? S.navyText : "white",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              ...css.sans,
            }}
          >
            {callEnded ? "Call ended · Return to dashboard" : "End call"}
          </button>
        </div>

        {/* ── Three-panel body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* LEFT: Risk view */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              background: S.card,
              borderRight: `1px solid ${S.border}`,
              padding: "18px 16px",
              overflowY: "auto",
            }}
          >
            <div style={sectionHead}>10-year ASCVD risk</div>
            <div
              style={{
                background: "#F0EEE8",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 32, ...css.serif, color: pceColors.text, lineHeight: 1.1 }}>
                {pcePct.toFixed(1)}
                <span style={{ fontSize: 18, marginLeft: 2 }}>%</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  ...css.sans,
                  marginTop: 6,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: pceColors.bg,
                  color: pceColors.text,
                  display: "inline-block",
                }}
              >
                {pceTier}
              </div>
              <div style={{ fontSize: 11, color: S.textLight, marginTop: 8 }}>
                Per ACC/AHA PCE (2013)
              </div>
            </div>

            <div style={sectionHead}>Tier inputs</div>
            <div style={{ fontSize: 13, color: S.textMed, lineHeight: 1.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Age</span><span>{pceInputs.age}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Systolic BP</span><span>{pceInputs.sbp} mmHg</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Diabetes</span><span>{pceInputs.dm ? "Yes" : "No"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>On BP Tx</span><span>{pceInputs.bptx ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          {/* CENTER: Transcript + audio control strip */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              // minWidth: 0 keeps long transcript words from blowing out
              // the column horizontally; minHeight: 0 is the flexbox+overflow
              // gotcha that lets the inner scroll container actually
              // activate scrolling. Without minHeight: 0 a child with
              // `flex: 1 + overflowY: auto` cannot constrain its height
              // because flex defaults min-height to its content size.
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderBottom: `1px solid ${S.border}`,
                fontSize: 11,
                fontWeight: 700,
                color: "#7A96B0",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                background: S.card,
              }}
            >
              Live transcript
            </div>
            <div
              ref={transcriptScrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                background: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {transcript.length === 0 && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: S.card,
                    border: `1px solid ${S.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    color: S.textMed,
                    lineHeight: 1.55,
                  }}
                >
                  {isConnecting && "Negotiating with LiveKit Cloud and joining the room…"}
                  {isConnected && (
                    <>
                      Connected to {chartName}'s voice session. Speak into your
                      microphone — the conversation will appear here as you talk.
                    </>
                  )}
                  {connState === "disconnected" && "Call ended. Click Return to dashboard above to dismiss this view."}
                  {!connState && "Waiting on session-start handshake…"}
                </div>
              )}
              {transcript.map((line) => {
                const isAI = line.role === "assistant";
                return (
                  <div
                    key={line.key}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isAI ? "#3DBFA0" : S.navy,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {isAI ? "V" : (chartName.charAt(0) || "P")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: S.textLight,
                          marginBottom: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {isAI ? "Vardana AI" : (chartName || "Patient")}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: S.text,
                          lineHeight: 1.55,
                          background: isAI ? "#EEF6F3" : "#EEF1F5",
                          border: `1px solid ${isAI ? "#C2E8DE" : "#D1D9E0"}`,
                          padding: "9px 13px",
                          borderRadius: 10,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "12px 20px", borderTop: `1px solid ${S.border}`, background: S.card }}>
              <LiveKitVoiceOverlay
                patient={patient}
                sessionMode="embedded"
                onConnectionStateChange={(state) => setConnState(String(state))}
                onTranscript={handleTranscript}
                onObservation={handleObservation}
                onCallComplete={onCallComplete}
              />
            </div>
          </div>

          {/* RIGHT: Patient chart sidebar */}
          <div
            style={{
              width: 320,
              flexShrink: 0,
              background: S.card,
              borderLeft: `1px solid ${S.border}`,
              padding: "18px 16px",
              overflowY: "auto",
            }}
          >
            <div style={sectionHead}>Patient chart</div>
            <div style={{ fontSize: 13, color: S.textMed, marginBottom: 14, lineHeight: 1.6 }}>
              {dob && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: S.textLight }}>DOB</span>
                  <span>{dob}</span>
                </div>
              )}
              {allergies.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: S.textLight }}>Allergies</span>
                  <span style={{ color: S.green }}>None known</span>
                </div>
              ) : (
                <div>
                  <div style={{ color: S.textLight, marginBottom: 4 }}>Allergies</div>
                  {allergies.map((a, i) => (
                    <div key={i} style={{ color: S.amberText, fontSize: 12 }}>
                      • {a.substance}
                      {a.reaction ? ` — ${a.reaction}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={sectionHead}>Active conditions</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
              {activeConditions.length === 0 ? (
                <span style={{ fontSize: 12, color: S.textLight }}>None on record</span>
              ) : (
                activeConditions.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#4A6380",
                      background: "#EEF1F5",
                      border: "1px solid #E8EDF3",
                      borderRadius: 4,
                      padding: "2px 7px",
                    }}
                  >
                    {c.text}
                  </span>
                ))
              )}
            </div>

            <div style={sectionHead}>Active medications</div>
            <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 4 }}>
              {activeMeds.length === 0 ? (
                <span style={{ fontSize: 12, color: S.textLight }}>None on record</span>
              ) : (
                activeMeds.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: S.text,
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    {m.dosage ? <span style={{ color: S.textLight }}> · {m.dosage}</span> : null}
                  </div>
                ))
              )}
            </div>

            <div style={sectionHead}>Recent vitals</div>
            <div
              style={{
                display: "grid",
                // Three tiles in one row: BP / Glucose / Weight. Each
                // tile is ~90-100px wide in the 320px sidebar after
                // padding + gap, which fits "138/95" and "186 mg/dL"
                // comfortably. Live patient-reported observations
                // (received via record_observation data-channel
                // messages during the call) replace the static chart
                // values for any of the three kinds.
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {/* Blood Pressure tile */}
              {(() => {
                const live = liveObservations.blood_pressure;
                const sys = live ? live.value.systolic : latestBP?.systolic;
                const dia = live ? live.value.diastolic : latestBP?.diastolic;
                const display = (sys != null && dia != null) ? `${sys}/${dia}` : "—";
                const isElevated = sys && dia && (sys >= 140 || dia >= 90);
                const dateLabel = live
                  ? "Just now · live"
                  : (latestBP ? fmtDate(latestBP.date) : "No data");
                return (
                  <div style={{
                    background: live ? "#EEF6F3" : "#F6F7F9",
                    border: live ? "1px solid #3DBFA0" : "1px solid transparent",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>
                      Blood Pressure
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: isElevated ? S.red : S.text }}>
                      {display}
                    </div>
                    <div style={{ fontSize: 10, color: live ? "#059669" : S.textLight, marginTop: 2, fontWeight: live ? 600 : 400 }}>
                      {dateLabel}
                    </div>
                  </div>
                );
              })()}

              {/* Glucose tile */}
              {(() => {
                const live = liveObservations.glucose;
                const val = live ? live.value.value : latestGlucose?.value;
                const unit = live ? (live.value.unit || "mg/dL") : (latestGlucose?.unit || "mg/dL");
                const ctx = live ? live.value.context : null;
                const display = (val != null) ? `${val}` : "—";
                const dateLabel = live
                  ? `Just now · live${ctx ? ` · ${ctx}` : ""}`
                  : (latestGlucose ? fmtDate(latestGlucose.date) : "No data");
                return (
                  <div style={{
                    background: live ? "#EEF6F3" : "#F6F7F9",
                    border: live ? "1px solid #3DBFA0" : "1px solid transparent",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>
                      Glucose
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: S.text }}>
                      {display}
                      {val != null && <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 2 }}>{unit}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: live ? "#059669" : S.textLight, marginTop: 2, fontWeight: live ? 600 : 400 }}>
                      {dateLabel}
                    </div>
                  </div>
                );
              })()}

              {/* Weight tile */}
              {(() => {
                const live = liveObservations.weight;
                const val = live ? live.value.value : latestWeight?.value;
                const unit = live ? (live.value.unit || "lb") : (latestWeight?.unit || "lb");
                const display = (val != null) ? `${val}` : "—";
                const dateLabel = live
                  ? "Just now · live"
                  : (latestWeight ? fmtDate(latestWeight.date) : "No data");
                return (
                  <div style={{
                    background: live ? "#EEF6F3" : "#F6F7F9",
                    border: live ? "1px solid #3DBFA0" : "1px solid transparent",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>
                      Weight
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: S.text }}>
                      {display}
                      {val != null && <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 2 }}>{unit}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: live ? "#059669" : S.textLight, marginTop: 2, fontWeight: live ? 600 : 400 }}>
                      {dateLabel}
                    </div>
                  </div>
                );
              })()}
            </div>

            {recentLabs.length > 0 && (
              <>
                <div style={sectionHead}>Recent labs</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {recentLabs.map((lab, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 11 }}>
                      <span style={{ color: S.text, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lab.name || lab.code}
                      </span>
                      <span style={{ color: S.textMed, fontWeight: 600 }}>
                        {lab.value}
                        {lab.unit ? ` ${lab.unit}` : ""}
                      </span>
                      <span style={{ color: S.textLight, fontSize: 10 }}>{fmtDate(lab.date)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "care-plan", label: "Care plan" },
  { id: "risk", label: "Risk profile" },
  { id: "outreach", label: "Outreach" },
];

export default function CoordinatorDashboard() {
  const isMobile = useIsMobile(768);
  const [activeTab, setActiveTab] = useState("overview");
  const [roster, setRoster] = useState([]);           // [{ id, name, initials, meta, risk, bg, fg, raw, summary }]
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  // ── Chat surface (additive to voice — voice flow untouched) ──
  // mode "live" hits /chat/turn on the EC2 voice service. mode "replay"
  // plays back a static JSON scenario; never touches the network or Medplum.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState("live");
  const [chatScenario, setChatScenario] = useState(null);
  const [chatScenarioMenuOpen, setChatScenarioMenuOpen] = useState(false);
  const [chatError, setChatError] = useState("");

  // ── Sessions (logged AI check-ins fetched from Medplum) ──
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  // Summary of the call that just ended — pinned to the top of the Overview
  // tab so the coordinator can review it immediately after hanging up.
  const [lastCallSummary, setLastCallSummary] = useState(null);
  // Banner shown while the session is being persisted to Medplum.
  const [sessionLogStatus, setSessionLogStatus] = useState(null); // "saving" | "saved" | "error:<msg>" | null

  // ── Fetch roster from Medplum on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/medplum-fhir?action=roster");
        if (!res.ok) throw new Error(`Roster fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Dedupe by patient id (Medplum sometimes returns duplicates)
        const seen = new Set();
        const uniq = [];
        for (const p of (data.patients || [])) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          uniq.push(p);
        }
        // Suppress CHF / retired-demo patients from the Medplum response
        // AND suppress names for which we have a local fixture (locals
        // take precedence so the demo is deterministic).
        const medplumItems = uniq
          .filter(p => !SUPPRESSED_PATIENT_NAMES.has(p.name))
          .filter(p => !LOCAL_PATIENT_NAMES.has(p.name))
          .map((p, i) => ({
            id: p.id,
            name: p.name || "Unknown",
            initials: initialsFromName(p.name),
            meta: inferConditionsSummary(p.conditions),
            risk: inferRiskLevel(p),
            bg: CARD_COLORS[(LOCAL_PATIENTS.length + i) % CARD_COLORS.length].bg,
            fg: CARD_COLORS[(LOCAL_PATIENTS.length + i) % CARD_COLORS.length].fg,
            summary: p,
          }));
        // Merge local fixtures (always present) with Medplum items, then
        // apply the display order from ROSTER_ORDER; anything not named
        // falls to the tail in its original order.
        const merged = [...LOCAL_PATIENTS, ...medplumItems];
        const orderIdx = (name) => {
          const i = ROSTER_ORDER.indexOf(name);
          return i === -1 ? ROSTER_ORDER.length : i;
        };
        merged.sort((a, b) => orderIdx(a.name) - orderIdx(b.name));
        setRoster(merged);
        // Honor ?patient=<id> deep-link from the panel queue view; fall back
        // to Marcus (always present via LOCAL_PATIENTS) when the param is
        // absent or doesn't match the loaded roster.
        const requested = new URLSearchParams(window.location.search).get("patient");
        const match = requested && merged.find(p => p.id === requested);
        setSelectedPatientId(match ? requested : LOCAL_MARCUS_ID);
      } catch (err) {
        if (cancelled) return;
        // Medplum unreachable (e.g. preview deploys without MEDPLUM_CLIENT_ID
        // scoped to Preview). Surface the error for transparency but still
        // seed the local fixtures so the call flow stays demoable.
        setRosterError(err.message);
        setRoster([...LOCAL_PATIENTS]);
        const requested = new URLSearchParams(window.location.search).get("patient");
        const match = requested && LOCAL_PATIENT_BY_ID.has(requested);
        setSelectedPatientId(match ? requested : LOCAL_MARCUS_ID);
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch selected patient's full bundle ──
  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;
    setPatientLoading(true);
    (async () => {
      try {
        // Local fixture path — load bundle from /public/data
        const localPatient = LOCAL_PATIENT_BY_ID.get(selectedPatientId);
        if (localPatient) {
          const res = await fetch(localPatient.bundlePath);
          if (!res.ok) throw new Error(`Local bundle fetch failed (${localPatient.name}): ${res.status}`);
          const bundle = await res.json();
          if (cancelled) return;
          setPatientData(normalizeBundle(bundle));
          return;
        }
        const res = await fetch(`/api/medplum-fhir?action=patient&patientId=${encodeURIComponent(selectedPatientId)}`);
        if (!res.ok) throw new Error(`Patient fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        // Merge latestBP/latestWeight from roster summary (they aren't in the detail response)
        const summary = roster.find(r => r.id === selectedPatientId)?.summary;
        setPatientData({
          ...data,
          latestBP: summary?.latestBP || null,
          latestWeight: summary?.latestWeight || null,
        });
      } catch (err) {
        if (!cancelled) setPatientData({ error: err.message });
      } finally {
        if (!cancelled) setPatientLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPatientId, roster]);

  // ── Fetch logged sessions for the selected patient ──
  // Refetches whenever the selected patient changes or a new session is
  // logged (sessionLogStatus === "saved"). Local-fixture patients still
  // need their Sessions tab to query Medplum if they have a real FHIR
  // Patient.id seeded backend-side — Marcus is the canonical example:
  // his roster card is rendered from local fixture data (date-shifted
  // vitals via _demoAnchor), but his voice calls persist Encounters
  // under FHIR UUID 1de9768a-… via vardana-voice's resolve_patient_id.
  // Without this map the Sessions tab would short-circuit to [] for him
  // and his voice-call history would never surface despite landing
  // cleanly in Medplum.
  useEffect(() => {
    if (!selectedPatientId) return;
    const fhirId = LOCAL_FIXTURE_TO_FHIR_ID[selectedPatientId];
    const queryId = fhirId || selectedPatientId;
    // Only short-circuit for local-fixture patients with NO Medplum
    // counterpart. Today that's nobody — keeping the branch documents
    // the contract for future fixture-only patients.
    if (LOCAL_PATIENT_BY_ID.has(selectedPatientId) && !fhirId) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    setSessionsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/medplum-fhir?action=sessions&patientId=${encodeURIComponent(queryId)}`);
        if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setSessions(data.sessions || []);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPatientId, sessionLogStatus]);

  // Called by LiveKitVoiceOverlay when the call ends. Pins the summary on
  // Overview. Encounter persistence happens server-side in vardana-voice's
  // persist_voice_encounter inside bot.py's finally block — there's no
  // synchronous return path to the browser. We poll /api/medplum-fhir
  // ?action=session-status until the Encounter shows up (or 5s timeout)
  // and only then flip the status to "saved". This was previously
  // optimistic ("saved" the instant the LiveKit room disconnected), which
  // would have hidden any write failure — see vardana-voice issue #5
  // diagnostic for context.
  const handleCallComplete = (payload) => {
    setCallOpen(false);
    const name = patientData?.patient?.name || roster.find(r => r.id === selectedPatientId)?.name || "Patient";
    setLastCallSummary({ ...payload, patientName: name, patientId: selectedPatientId });

    const sid = payload?.sessionId;
    if (!sid) {
      setSessionLogStatus("error:no session id returned by overlay — Medplum status unverifiable");
      return;
    }

    setSessionLogStatus("saving");
    const startedAt = Date.now();
    const POLL_INTERVAL_MS = 600;
    const POLL_TIMEOUT_MS = 5000;
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setSessionLogStatus(prev => prev === "saving"
          ? `error:Medplum write timed out after ${POLL_TIMEOUT_MS / 1000}s — check EC2 logs`
          : prev);
        return;
      }
      try {
        const res = await fetch(`/api/medplum-fhir?action=session-status&sessionId=${encodeURIComponent(sid)}`);
        if (!res.ok) return; // keep polling on transient errors
        const data = await res.json();
        if (data?.found) {
          clearInterval(interval);
          setSessionLogStatus("saved");
        }
      } catch {
        // network blip — keep polling until timeout
      }
    }, POLL_INTERVAL_MS);
  };

  const selectedRosterItem = useMemo(() => roster.find(r => r.id === selectedPatientId), [roster, selectedPatientId]);
  const isMarcusSelected = selectedRosterItem
    ? (selectedRosterItem.id === LOCAL_MARCUS_ID || identifierMatchesMarcus(selectedRosterItem.summary))
    : false;

  // ── Voice overlay eligibility ──
  // Maps frontend roster ids (LOCAL_PATIENTS or Medplum-loaded names) to the
  // backend DEMO_PATIENTS slug expected by /api/session-start. The slug is
  // resolved server-side by vardana-voice's resolve_patient_id() to a real
  // FHIR Patient.id, which is then used for both the chart pre-fetch and
  // the persisted Encounter. Patients without a known slug get null
  // patientForCall → "Initiate call" button doesn't render for them.
  //
  // Maria Gonzalez is intentionally absent here — her active CarePlan is a
  // CHF program that conflicts with the cardiometabolic-only beachhead.
  // See vardana-voice/vardana_tools.py DEMO_PATIENTS comment.
  // Primary slug resolution: deterministic FHIR Patient.id → slug map. These
  // UUIDs are byte-equal to vardana-voice's DEMO_PATIENTS server-side mapping,
  // verified against production Medplum via Stage 1 backend pre-fetch logs.
  const FHIR_ID_TO_SLUG = {
    "1de9768a-2459-4586-a888-d184a70479cc": "marcus-williams-test",
    "8562846b-5b4c-4b78-b684-0ca9f2159522": "linda-patel-test",
    "ba72d65c-3d3c-44e1-8b9b-e5b31d7c83d5": "david-brooks-test",
  };

  const patientForCall = useMemo(() => {
    if (!selectedRosterItem) return null;
    const id = selectedRosterItem.id;
    const name = (selectedRosterItem.name || "").toLowerCase();
    // Primary: deterministic FHIR Patient.id match.
    let slug = FHIR_ID_TO_SLUG[id];
    // LOCAL_MARCUS fixture (dev-only, before Medplum responds) — preserved exactly.
    if (!slug && (id === LOCAL_MARCUS_ID || identifierMatchesMarcus(selectedRosterItem.summary))) {
      slug = "marcus-williams-test";
    }
    // Name-substring fallback — preserved exactly from existing logic for Linda/David.
    if (!slug) {
      if (name.includes("linda") && name.includes("patel")) slug = "linda-patel-test";
      else if (name.includes("david") && name.includes("brooks")) slug = "david-brooks-test";
    }
    if (!slug) return null;
    return {
      slug,
      name: selectedRosterItem.name,
      // Demographics still useful for UI display even though the bot
      // pre-fetches them server-side from the FHIR Patient resource.
      age: ageFromBirthDate(patientData?.patient?.birthDate || selectedRosterItem.summary?.birthDate),
      gender: patientData?.patient?.gender || selectedRosterItem.summary?.gender || null,
    };
  }, [selectedRosterItem, patientData]);

  // Safari gating — Safari desktop does not implement Web Speech API
  // SpeechRecognition, and requires audio unlock + mic permission inside a
  // user gesture. Prime both here, in the click handler, before mounting
  // VoiceCallDemo (whose useEffect-driven auto-start is NOT a gesture).
  const [callError, setCallError] = useState("");
  const handleInitiateCall = async () => {
    setCallError("");
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    // 1. Unlock AudioContext in-gesture so Safari allows Cartesia playback
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && (!window._vardanaAudioCtx || window._vardanaAudioCtx.state === "closed")) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        // Play a 1-sample silent buffer to fully unlock on iOS Safari
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        window._vardanaAudioCtx = ctx;
      } else if (window._vardanaAudioCtx?.state === "suspended") {
        await window._vardanaAudioCtx.resume();
      }
    } catch (e) {
      console.warn("[CoordinatorDashboard] AudioContext unlock failed:", e);
    }

    // 2. Request mic permission in-gesture so Safari shows the prompt
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        // Release the stream immediately; VoiceCallDemo reacquires via SpeechRecognition.
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      setCallError("Microphone access was blocked. Enable mic permission for vardana.ai in your browser settings and try again.");
      return;
    }

    // 3. Safari has no webkitSpeechRecognition on desktop — warn and bail
    if (!hasSR) {
      if (isSafari) {
        setCallError("Safari does not support in-browser speech recognition. Open this demo in Chrome for the live AI voice call.");
      } else {
        setCallError("This browser does not support speech recognition. Try Chrome.");
      }
      return;
    }

    setCallOpen(true);
  };

  const riskDot = (r) => ({ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: r === "high" ? S.red : r === "mod" ? S.amber : S.green, boxShadow: r === "high" ? "0 0 5px rgba(239,68,68,0.5)" : "none" });

  // ── Chat eligibility & handlers ──
  // Live chat just needs a patient with an ID and a name. /api/voice-chat is
  // stateless and builds the AI's context from whatever conditions /
  // medications / labs the bundle (or Medplum detail) returned -- no
  // CarePlan or prior-Encounter requirement. Recorded chat only needs a
  // patient name (matched against the scenario manifest) and never hits the
  // network, so it must open even when patientData is still loading.
  const chatPatientFromData = (patientData?.patient && patientData.patient.id)
    ? { id: patientData.patient.id, name: patientData.patient.name || selectedRosterItem?.name || "Patient" }
    : null;
  // Replay-only fallback: roster item alone is enough for the header label;
  // ChatCheckinDemo never uses patient.id in replay mode.
  const chatPatientForReplay = chatPatientFromData
    || (selectedRosterItem ? { id: selectedRosterItem.id, name: selectedRosterItem.name } : null);
  const chatLiveEligible = !!chatPatientFromData;
  const chatScenariosAvailable = scenariosForPatient(chatPatientFromData?.name || selectedRosterItem?.name || "");

  const handleInitiateChat = () => {
    if (!chatLiveEligible || !chatPatientFromData) {
      setChatError("Select a patient before starting a live chat.");
      return;
    }
    setChatError("");
    setChatScenario(null);
    setChatMode("live");
    setChatOpen(true);
  };

  const handlePlayRecordedChat = async (scenarioMeta) => {
    setChatError("");
    setChatScenarioMenuOpen(false);
    try {
      const data = await loadScenario(scenarioMeta.file);
      setChatScenario(data);
      setChatMode("replay");
      setChatOpen(true);
    } catch (e) {
      setChatError(`Could not load recorded scenario: ${e.message}`);
    }
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setChatScenario(null);
  };

  // Mirrors handleCallComplete (voice). Pinned to the Overview tab via
  // PostCallSummary so the coordinator sees the chat outcome the same way
  // they see a voice-call outcome. Persistence to Medplum is intentionally
  // SKIPPED in this demo build to keep the test deploy non-destructive --
  // every chat run otherwise wrote a fresh Encounter to the shared Medplum
  // tenant. The summary still pins on Overview; the status note tells the
  // coordinator nothing was persisted.
  const handleChatComplete = (payload) => {
    setChatOpen(false);
    setChatScenario(null);
    const name = patientData?.patient?.name || roster.find(r => r.id === selectedPatientId)?.name || "Patient";
    setLastCallSummary({ ...payload, patientName: name, patientId: selectedPatientId });
    setSessionLogStatus("demo");
  };

  // Only show the post-session card on the patient it belongs to. Without
  // this filter, a chat with Linda would surface as "Chat just ended" on
  // Marcus's Overview tab as soon as the coordinator switched roster
  // selection.
  const summaryForSelected = lastCallSummary && lastCallSummary.patientId === selectedPatientId
    ? lastCallSummary
    : null;

  const tabContent = {
    overview: <OverviewTab
      patientData={patientData}
      onViewAllSessions={() => setActiveTab("sessions")}
      onViewRiskProfile={() => setActiveTab("risk")}
      onViewCarePlan={() => setActiveTab("care-plan")}
      medplumSessions={sessions}
      lastCallSummary={summaryForSelected}
      sessionLogStatus={summaryForSelected ? sessionLogStatus : null}
      onDismissLastCall={() => { setLastCallSummary(null); setSessionLogStatus(null); }}
    />,
    "care-plan": <CarePlanTab patientData={patientData} />,
    risk: <RiskTab patientData={patientData} />,
    sessions: <SessionsTab patientData={patientData} medplumSessions={sessions} loading={sessionsLoading} />,
    outreach: <OutreachTab patientData={patientData} onInitiateCall={handleInitiateCall} />,
  };

  const patient = patientData?.patient;
  const displayName = patient?.name || selectedRosterItem?.name || "—";
  const age = ageFromBirthDate(patient?.birthDate);
  const gender = patient?.gender || "—";
  const mrn = patient?.identifier || patient?.id || "—";
  // Active allergies for the header chip. NKDA (no known drug allergies)
  // is rendered explicitly rather than omitted — silence is dangerous.
  const activeAllergies = (patientData?.allergies || []).filter(
    a => !a.status || a.status === "active",
  );

  // ── Patient-list navigation (breadcrumb + prev/next) ──
  // The sidebar no longer renders a roster — that was a duplicate of the
  // cohort grid and structurally confused which list was canonical. The
  // detail view instead surfaces:
  //   - a breadcrumb back to /coordinator (the grid)
  //   - prev/next icons keyed off the same `roster` state already loaded
  //     above, so the coordinator can advance through a queue without
  //     two-click round-trips through the list
  const rosterIndex = useMemo(
    () => roster.findIndex(p => p.id === selectedPatientId),
    [roster, selectedPatientId],
  );
  const prevPatient = rosterIndex > 0 ? roster[rosterIndex - 1] : null;
  const nextPatient = rosterIndex >= 0 && rosterIndex < roster.length - 1 ? roster[rosterIndex + 1] : null;
  const positionLabel = rosterIndex >= 0 && roster.length
    ? `${rosterIndex + 1} of ${roster.length}`
    : null;
  const goToPatient = (id) => {
    if (!id) return;
    const token = new URLSearchParams(window.location.search).get("token");
    const qs = new URLSearchParams();
    qs.set("patient", id);
    if (token) qs.set("token", token);
    // Replace state instead of pushing so the browser back button still
    // exits the detail view rather than walking back through every patient
    // the user advanced through.
    window.history.replaceState({}, "", `/coordinator?${qs.toString()}`);
    setSelectedPatientId(id);
  };
  const goToList = () => {
    const token = new URLSearchParams(window.location.search).get("token");
    navigate(token ? `/coordinator?token=${encodeURIComponent(token)}` : "/coordinator");
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh", height: isMobile ? "auto" : "100vh", background: S.bg }}>
      {/* Two-item sidebar (Patients / Practice). Detail view is a child
          route of Patients, so the rail keeps Patients highlighted while
          the user is on a patient chart. On mobile the sidebar becomes a
          horizontal top bar so the patient detail can use the full width. */}
      <CoordinatorSidebar active="patients" navigate={navigate} />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Breadcrumb row — guarantees a one-click return to the grid even
            without using the browser back button. Position label gives the
            coordinator a sense of where they are in the queue. */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "8px 20px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, ...css.sans, flexShrink: 0 }}>
          <button
            onClick={goToList}
            style={{ padding: "4px 8px", marginLeft: -8, background: "transparent", border: "none", color: S.navy, fontSize: 13, cursor: "pointer", ...css.sans, fontWeight: 500 }}
          >
            ← Patients
          </button>
          {positionLabel && (
            <span style={{ color: S.textLight }}>· {positionLabel}</span>
          )}
        </div>
        {/* Topbar */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: isMobile ? "10px 16px" : "0 20px", display: "flex", alignItems: "center", gap: 12, minHeight: 52, flexShrink: 0, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div>
            <div style={{ fontSize: 15, ...css.serif }}>{displayName}</div>
            <div style={{ fontSize: 13, color: S.textLight, ...css.sans }}>
              {age != null ? `${age} yo · ` : ""}{gender}{mrn !== "—" ? ` · ${mrn}` : ""}
            </div>
          </div>
          {/* Prev/next: skips between adjacent patients in the loaded roster
              order without forcing a list round-trip. Disabled at the bounds
              (no wraparound — coordinators can land on the first or last
              patient cleanly without overshooting). */}
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            <button
              onClick={() => goToPatient(prevPatient?.id)}
              disabled={!prevPatient}
              title={prevPatient ? `Previous: ${prevPatient.name}` : "No previous patient"}
              aria-label="Previous patient"
              style={{
                width: 28, height: 28, borderRadius: 4,
                background: "transparent",
                color: prevPatient ? S.navy : S.textLight,
                border: `1px solid ${S.border}`,
                cursor: prevPatient ? "pointer" : "not-allowed",
                opacity: prevPatient ? 1 : 0.4,
                fontSize: 14, ...css.sans,
              }}
            >
              ‹
            </button>
            <button
              onClick={() => goToPatient(nextPatient?.id)}
              disabled={!nextPatient}
              title={nextPatient ? `Next: ${nextPatient.name}` : "No next patient"}
              aria-label="Next patient"
              style={{
                width: 28, height: 28, borderRadius: 4,
                background: "transparent",
                color: nextPatient ? S.navy : S.textLight,
                border: `1px solid ${S.border}`,
                cursor: nextPatient ? "pointer" : "not-allowed",
                opacity: nextPatient ? 1 : 0.4,
                fontSize: 14, ...css.sans,
              }}
            >
              ›
            </button>
          </div>
          <div style={{ flex: 1 }} />

          {/* Recorded chat — dropdown of available scenarios for this patient */}
          {chatScenariosAvailable.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setChatScenarioMenuOpen(o => !o)}
                title="Open the chat surface in replay mode with a recorded scenario"
                style={{
                  padding: "10px 16px", borderRadius: 6, fontSize: 14, ...css.sans,
                  background: "transparent", color: S.navy,
                  fontWeight: 600,
                  border: `1px solid ${S.border}`, cursor: "pointer",
                }}
              >
                Play recorded chat ▾
              </button>
              {chatScenarioMenuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
                  background: S.card, border: `1px solid ${S.border}`,
                  borderRadius: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                  minWidth: 280, padding: 4,
                }}>
                  {chatScenariosAvailable.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handlePlayRecordedChat(s)}
                      style={{
                        padding: "8px 12px", borderRadius: 4,
                        cursor: "pointer", fontSize: 13, ...css.sans, color: S.text,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = S.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: S.textLight, marginTop: 2 }}>{s.id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live chat — gated on CarePlan + ≥1 Encounter */}
          {chatPatientFromData && (
            <button
              onClick={handleInitiateChat}
              disabled={!chatLiveEligible}
              title={chatLiveEligible
                ? "Start a live AI chat check-in"
                : "Select a patient to enable live chat."}
              style={{
                padding: "10px 20px", borderRadius: 6, fontSize: 14, ...css.sans,
                background: chatLiveEligible ? S.navy : "#CBD5E1",
                color: "#FFFFFF",
                fontWeight: 700,
                border: "none",
                cursor: chatLiveEligible ? "pointer" : "not-allowed",
                opacity: chatLiveEligible ? 1 : 0.7,
              }}
            >
              Initiate chat
            </button>
          )}

          {patientForCall && (
            <button
              onClick={handleInitiateCall}
              title="Start live AI voice call with Marcus"
              style={{
                padding: "10px 20px", borderRadius: 6, fontSize: 14, ...css.sans,
                background: S.amber, color: "#FFFFFF",
                fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
              }}
            >
              Initiate call
            </button>
          )}
        </div>

        {chatError && (
          <div style={{ background: S.redBg, borderBottom: `1px solid #FECACA`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, ...css.sans, color: S.redText, flex: 1 }}>{chatError}</span>
            <button onClick={() => setChatError("")} style={{ fontSize: 14, ...css.sans, background: "transparent", color: S.redText, border: `1px solid #FECACA`, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {callError && (
          <div style={{ background: S.redBg, borderBottom: `1px solid #FECACA`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, ...css.sans, color: S.redText, flex: 1 }}>{callError}</span>
            <button onClick={() => setCallError("")} style={{ fontSize: 14, ...css.sans, background: "transparent", color: S.redText, border: `1px solid #FECACA`, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {/* Patient header */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "14px 20px", flexShrink: 0 }}>
          {patientLoading && <div style={{ fontSize: 15, ...css.sans, color: S.textLight }}>Loading patient data from Medplum…</div>}
          {!patientLoading && patient && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: selectedRosterItem?.bg || "#3B2F1E", color: selectedRosterItem?.fg || S.navyText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, ...css.sans, fontWeight: 700, flexShrink: 0 }}>{initialsFromName(displayName)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, ...css.serif }}>{displayName}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  {patient.birthDate && <Chip>DOB: {fmtDate(patient.birthDate)}</Chip>}
                  <Chip>{selectedRosterItem?.meta || "—"}</Chip>
                  {patient.generalPractitioner && <Chip>PCP: {patient.generalPractitioner}</Chip>}
                  {patient.phone && <Chip>{patient.phone}</Chip>}
                  {patient.email && <Chip>{patient.email}</Chip>}
                  {activeAllergies.length > 0 ? (
                    <span style={allergyChipStyle} title={activeAllergies.map(a => [a.substance, a.reaction].filter(Boolean).join(" — ")).join("; ")}>
                      ⚠ Allergies: {activeAllergies.map(a => a.substance).filter(Boolean).join(", ")}
                    </span>
                  ) : (
                    <span style={nkdaChipStyle}>NKDA</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {!patientLoading && !patient && !patientData?.error && (
            <div style={{ fontSize: 15, ...css.sans, color: S.textLight }}>Select a patient from the roster.</div>
          )}
          {patientData?.error && (
            <div style={{ fontSize: 15, ...css.sans, color: S.red }}>Failed to load patient: {patientData.error}</div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", flexShrink: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 14px", fontSize: 14, ...css.sans, color: activeTab === t.id ? S.text : S.textLight, cursor: "pointer", borderBottom: `2px solid ${activeTab === t.id ? S.navy : "transparent"}`, transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {t.label}
            </div>))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {tabContent[activeTab]}
        </div>
      </div>

      {/* Live-call overlay — LiveKit + EC2 pipecat pipeline.
          Connects to a LiveKit Cloud room spawned by voice.vardana.ai;
          the bot pre-fetches the patient's chart server-side and
          persists a FHIR Encounter on session end. The 10-minute cap
          in bot.py forces a graceful close if the user lingers. The
          "End call" button just unmounts the overlay — the overlay's
          own cleanup effect fires session-end + onCallComplete, which
          routes through handleCallComplete to pin the PostCallSummary
          card. Single completion path, no race. */}
      {callOpen && patientForCall && (
        <InCallShell
          patient={patientForCall}
          patientData={patientData}
          onEnd={() => setCallOpen(false)}
          onCallComplete={handleCallComplete}
        />
      )}

      {/* Chat overlay — additive to voice. Replay mode never persists an
          Encounter (no /session/end); live mode persists on close.
          Replay uses the roster-fallback patient so the overlay opens even
          while patientData (Medplum/local bundle) is still loading. */}
      {chatOpen && (chatMode === "replay" ? chatPatientForReplay : chatPatientFromData) && (
        <ChatCheckinDemo
          patient={chatMode === "replay" ? chatPatientForReplay : chatPatientFromData}
          patientData={patientData}
          mode={chatMode}
          scenario={chatScenario}
          onClose={handleCloseChat}
          onComplete={handleChatComplete}
        />
      )}
    </div>
  );
}
