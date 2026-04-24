import { useState, useEffect, useMemo } from "react";
import { VoiceCallDemo } from "./App.jsx";

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
function MiniChart({ bars, accentColor }) {
  return <div style={{ height: 50, display: "flex", alignItems: "flex-end", gap: 2, marginTop: 6 }}>
    {bars.map((h, i) => <div key={i} style={{ flex: 1, borderRadius: "2px 2px 0 0", minHeight: 4, height: `${h}%`, background: i === bars.length - 1 ? accentColor : "#CBD5E1" }} />)}
  </div>;
}
function EmptyState({ children }) {
  return <div style={{ fontSize: 15, ...css.sans, color: S.textLight, padding: "10px 0" }}>{children}</div>;
}

// ── Helpers ──
function initialsFromName(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "??";
  return ((parts[0][0] || "") + (parts[parts.length - 1][0] || "")).toUpperCase();
}
function ageFromBirthDate(birthDate) {
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
function inferRiskLevel(summary) {
  const bp = summary.latestBP;
  const hasHTN = (summary.conditions || []).some(c => /hypertension|htn/i.test(c.text || ""));
  const hasT2DM = (summary.conditions || []).some(c => /diabetes|t2dm/i.test(c.text || ""));
  if (bp && (bp.systolic >= 155 || bp.diastolic >= 95)) return "high";
  if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) return "mod";
  if (hasHTN && hasT2DM) return "mod";
  return "low";
}
function inferConditionsSummary(conditions) {
  if (!conditions?.length) return "—";
  const parts = [];
  if (conditions.some(c => /hypertension|htn/i.test(c.text || ""))) parts.push("HTN");
  if (conditions.some(c => /diabetes|t2dm/i.test(c.text || ""))) parts.push("T2DM");
  if (conditions.some(c => /hyperlipidemia|dyslipidemia/i.test(c.text || ""))) parts.push("HLD");
  return parts.join(" · ") || conditions[0].text?.slice(0, 20) || "—";
}
function identifierMatchesMarcus(summary) {
  const name = (summary.name || "").toLowerCase();
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
  else if (group === "wf") { const s = -29.799*la+4.884*la*la+13.540*lt-3.114*la*lt-13.578*lh+3.149*la*lh+(bptx?2.019:1.957)*ls+7.574*smoke-1.665*la*smoke+0.661*dm; r = 1-Math.pow(0.9665,Math.exp(s-29.799)); }
  else if (group === "am") { const s = 2.469*la+0.302*lt-0.307*lh+(bptx?1.916:1.809)*ls+0.549*smoke+0.645*dm; r = 1-Math.pow(0.8954,Math.exp(s-19.54)); }
  else { const s = 17.1141*la+0.9396*lt-18.9196*lh+4.4748*la*lh+(bptx?29.2907:27.8197)*ls+(bptx?-6.4321:-6.0873)*la*ls+0.8738*smoke+0.8738*dm; r = 1-Math.pow(0.9533,Math.exp(s-86.61)); }
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
function defaultPCEInputs(patientData) {
  const latestBP = patientData?.latestBP;
  const conditions = patientData?.conditions || [];
  const hasDM = conditions.some(c => /diabetes|t2dm/i.test(c.text || ""));
  return {
    age: ageFromBirthDate(patientData?.patient?.birthDate) || 58,
    tc: 195, hdl: 42, sbp: latestBP?.systolic || 138,
    bptx: 1, dm: hasDM ? 1 : 0, smoke: 0, group: "wm",
  };
}

// Normalize a local FHIR transaction Bundle into the same shape as /api/medplum-fhir?action=patient
function normalizeBundle(bundle) {
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

const LOCAL_MARCUS_ID = "local-marcus";
const LOCAL_MARCUS_ROSTER = {
  id: LOCAL_MARCUS_ID,
  name: "Marcus Williams",
  initials: "MW",
  meta: "HTN · T2DM · HLD",
  risk: "high",
  alert: true,
  bg: "#3B2F1E",
  fg: "#E2D5B8",
  summary: null,
  local: true,
};

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
  const { patientName, duration, timestamp, riskLevel, alertGenerated, summary: summaryText, transcript } = summary;
  const when = timestamp || new Date().toLocaleString();
  const tier = (riskLevel || "").toUpperCase();
  const transcriptText = Array.isArray(transcript)
    ? transcript.map(t => `${t.speaker || "AI"}: ${t.text || ""}`).join("\n")
    : (transcript || "");
  let statusText = null;
  let statusColor = S.textLight;
  if (status === "saving") { statusText = "Saving to Medplum…"; statusColor = S.textMed; }
  else if (status === "saved") { statusText = "Saved to Medplum."; statusColor = S.green; }
  else if (typeof status === "string" && status.startsWith("error:")) { statusText = `Medplum write failed: ${status.slice(6)}`; statusColor = S.red; }
  return (
    <div style={{ background: S.card, border: `1px solid ${S.navy}`, borderLeft: `4px solid ${S.amber}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: S.amber, fontWeight: 700, ...css.sans }}>Call just ended</span>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
        <div>
          <div style={{ fontSize: 13, ...css.sans, color: S.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Adherence this week</div>
          {rows.length === 0 && <EmptyState>No adherence data.</EmptyState>}
          {rows.map((r, i) => {
            const pct = r.percent;
            const colors = adherenceBadgeColor(pct);
            const flag = pct != null && pct < 85 ? "⚠" : "✓";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 14, ...css.sans }}>
                <span style={{ color: S.text, flex: 1 }}>{r.label}</span>
                <span style={{ padding: "2px 6px", borderRadius: 4, background: colors.bg, color: colors.text, fontWeight: 700, minWidth: 58, textAlign: "center" }}>
                  {pct == null ? "—" : (r.display || `${pct}%`)}
                </span>
                <span style={{ color: pct != null && pct < 85 ? S.amber : S.green, width: 14, textAlign: "center" }}>{flag}</span>
              </div>
            );
          })}
        </div>
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

// ── Tab: Overview ──
function OverviewTab({ patientData, onViewAllSessions, onViewRiskProfile, onViewCarePlan, medplumSessions, lastCallSummary, sessionLogStatus, onDismissLastCall }) {
  if (!patientData) return <EmptyState>No patient data loaded from Medplum.</EmptyState>;
  const { conditions = [], medications = [], vitals = {} } = patientData;
  const recentSessions = resolveSessions(medplumSessions, patientData?.patient?.name || "").slice(0, 3);
  const truncate = (s, n = 120) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s || "");
  const pcePct = calcPCE(defaultPCEInputs(patientData));
  const pceTier = pceTierLabel(pcePct);
  const pceColors = pceTierColors(pcePct);
  const pceShort = pcePct >= 20 ? "High" : pcePct >= 7.5 ? "Intermediate" : pcePct >= 5 ? "Borderline" : "Low";
  const latestBP = patientData.latestBP;
  const latestWeight = patientData.latestWeight;
  const bps = (vitals.bloodPressures || []).slice(0, 5).reverse();
  const weights = (vitals.weights || []).slice(0, 5).reverse();
  const bpBars = bps.length ? bps.map(b => Math.min(100, Math.max(20, b.systolic - 80))) : [70, 72, 75, 73, 78];
  const wtBars = weights.length ? weights.map(w => Math.min(100, Math.max(20, (w.value || 80)))) : [72, 74, 73, 72, 72];

  return <div>
    {lastCallSummary && <PostCallSummary summary={lastCallSummary} status={sessionLogStatus} onDismiss={onDismissLastCall} onViewSessions={onViewAllSessions} />}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10 }}>
        <CardTitle>Latest BP</CardTitle>
        <div>
          <span style={{ fontSize: 24, ...css.serif }}>{latestBP ? `${latestBP.systolic}` : "—"}</span>
          <span style={{ fontSize: 13, color: S.textLight, ...css.sans }}>{latestBP ? `/${latestBP.diastolic} mmHg` : ""}</span>
        </div>
        <div style={{ fontSize: 13, ...css.sans, color: S.amber, marginTop: 2 }}>{latestBP ? fmtDate(latestBP.date) : "No data"}</div>
        <MiniChart bars={bpBars} accentColor={S.amber} />
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10 }}>
        <CardTitle>Weight</CardTitle>
        <div>
          <span style={{ fontSize: 24, ...css.serif }}>{latestWeight ? latestWeight.value : "—"}</span>
          <span style={{ fontSize: 13, color: S.textLight, ...css.sans }}>{latestWeight ? ` ${latestWeight.unit || "lb"}` : ""}</span>
        </div>
        <div style={{ fontSize: 13, ...css.sans, color: S.textLight, marginTop: 2 }}>{latestWeight ? fmtDate(latestWeight.date) : "No data"}</div>
        <MiniChart bars={wtBars} accentColor="#8C8C7A" />
      </div>
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <CardTitle>Active conditions</CardTitle>
        {conditions.length === 0 && <EmptyState>No conditions recorded.</EmptyState>}
        {conditions.map((c, i) => (
          <PRow key={i} label={c.text} value={`${c.code || ""}${c.onset ? ` · Since ${fmtDate(c.onset)}` : ""}`} badge={c.status === "active" ? "Active" : c.status} badgeColor={c.status === "active" ? "green" : "gray"} />
        ))}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <CardTitle>Current medications</CardTitle>
        {medications.length === 0 && <EmptyState>No medications in Medplum.</EmptyState>}
        {medications.map((m, i) => <PRow key={i} label={m.name} value={m.dosage || m.status || ""} />)}
      </div>
    </div>
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginTop: 14 }}>
      <CardTitle>Recent sessions</CardTitle>
      {recentSessions.length === 0 && <EmptyState>No sessions logged yet.</EmptyState>}
      {recentSessions.map((s, i) => (
        <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: i < recentSessions.length - 1 ? `1px solid #F0EEE8` : "none", ...css.sans, fontSize: 15 }}>
          <span style={{ flex: "0 0 120px", color: S.text }}>{fmtSessionDate(s.date)}</span>
          <span style={{ flex: "0 0 70px", color: S.textLight }}>{s.duration}</span>
          <span style={{ flex: 1, color: S.textMed, lineHeight: 1.5 }}>{truncate(s.summary)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button
          onClick={onViewAllSessions}
          style={{ fontSize: 14, ...css.sans, color: S.navy, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
        >
          View all sessions →
        </button>
      </div>
    </div>
  </div>;
}

// ── Tab: Risk Profile ──
function RiskTab({ patientData }) {
  const latestBP = patientData?.latestBP;
  const conditions = patientData?.conditions || [];
  const hasDM = conditions.some(c => /diabetes|t2dm/i.test(c.text || ""));
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

// ── Tab: PAMI (Problems, Allergies, Meds, Investigations) ──
function PamiTab({ patientData }) {
  if (!patientData) return <EmptyState>No patient data loaded from Medplum.</EmptyState>;
  const { conditions = [], allergies = [], medications = [], labs = [] } = patientData;

  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
    <div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 18, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Problems</div>
        {conditions.length === 0 && <EmptyState>No conditions in Medplum.</EmptyState>}
        {conditions.map((c, i) => <PRow key={i} label={c.text} value={`${c.code || ""}${c.onset ? ` · Since ${fmtDate(c.onset)}` : ""}`} badge={c.status === "active" ? "Active" : (c.status || "—")} badgeColor="green" />)}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 18, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Allergies</div>
        {allergies.length === 0 && <EmptyState>No allergies recorded.</EmptyState>}
        {allergies.map((a, i) => <PRow key={i} label={a.substance || "—"} value={[a.reaction, a.status].filter(Boolean).join(" · ") || "—"} badge="Allergy" badgeColor="red" />)}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 18, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Recent labs</div>
        {labs.length === 0 && <EmptyState>No labs in Medplum.</EmptyState>}
        {labs.slice(0, 8).map((l, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < Math.min(labs.length, 8) - 1 ? `1px solid #F0EEE8` : "none", ...css.sans, fontSize: 15 }}>
          <span style={{ flex: "0 0 150px", color: S.text }}>{l.name}</span>
          <span style={{ flex: 1, color: S.textMed }}>{l.value}{l.unit ? ` ${l.unit}` : ""}{l.date ? ` · ${fmtDate(l.date)}` : ""}</span>
        </div>)}
      </div>
    </div>
    <div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 18, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Medications</div>
        {medications.length === 0 && <EmptyState>No medications in Medplum.</EmptyState>}
        {medications.map((m, i) => <div key={i} style={{ padding: "8px 0", borderBottom: i < medications.length - 1 ? `1px solid #F0EEE8` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, ...css.sans, flex: 1 }}>{m.name}</span>
            <Badge color={m.status === "active" ? "blue" : "gray"}>{m.status || "—"}</Badge>
          </div>
          {m.dosage && <div style={{ fontSize: 14, ...css.sans, color: S.textMed, marginTop: 2 }}>{m.dosage}</div>}

        </div>)}
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
const SESSION_FIXTURES = {
  "Marcus Williams": [
    { id: "s-mw-1", date: "2026-03-05", duration: "5m 22s", summary: "BP 158/98, 4-day worsening trend. Missed Lisinopril dose confirmed. Escalated P2 to David Park." },
    { id: "s-mw-2", date: "2026-02-28", duration: "4m 08s", summary: "Routine HTN check-in. BP 142/88. Reinforced evening Lisinopril routine and home cuff technique." },
    { id: "s-mw-3", date: "2026-02-22", duration: "3m 51s", summary: "Patient declined glucose-log review. No new symptoms. Agreed to resume weekly readings." },
  ],
  "Sarah Chen": [
    { id: "s-sc-1", date: "2026-03-05", duration: "6m 14s", summary: "Weight +2.3 lb/48 hr, ankle swelling, orthopnea. P2 CHF decompensation risk — routed to Rachel Kim." },
    { id: "s-sc-2", date: "2026-02-28", duration: "4m 36s", summary: "Stable HFrEF check-in. Weight 187.7 lb, BP 136/86. Medication adherence confirmed across all five." },
    { id: "s-sc-3", date: "2026-02-21", duration: "5m 02s", summary: "Transitioned from Stabilize to Optimize phase. Reviewed Phase 2 goals and Furosemide timing." },
  ],
  "Robert Williams": [
    { id: "s-rw-1", date: "2026-02-28", duration: "3m 44s", summary: "Day 52 check-in. NYHA II, Sacubitril/Valsartan well-tolerated. No AF-related symptoms this week." },
    { id: "s-rw-2", date: "2026-02-21", duration: "4m 17s", summary: "Stable weight, BP 122/74. Patient asked about exercise tolerance — escalated to cardiology for guidance." },
    { id: "s-rw-3", date: "2026-02-14", duration: "5m 30s", summary: "Reviewed Apixaban adherence and bleeding-risk warning signs. Patient articulated them back correctly." },
  ],
  "Maria Gonzalez": [
    { id: "s-mg-1", date: "2026-02-28", duration: "7m 01s", summary: "Day 8 HFpEF follow-up in Spanish. Good response to diuretic; weight down 2.6 lb. Mood stable on sertraline." },
    { id: "s-mg-2", date: "2026-02-24", duration: "5m 48s", summary: "BP 148/92 trending down. Reinforced sodium 1500 mg target and daily AM weight logging." },
    { id: "s-mg-3", date: "2026-02-21", duration: "6m 22s", summary: "Post-discharge onboarding in Spanish. Confirmed pharmacy, PCP, and care journey structure." },
  ],
  "James Thompson": [
    { id: "s-jt-1", date: "2026-02-28", duration: "3m 12s", summary: "Day 83. Quarterly review prep. All metrics in target 21 days. Reviewed ongoing self-management plan." },
    { id: "s-jt-2", date: "2026-02-21", duration: "4m 05s", summary: "Stable on Carvedilol 25 BID. BP 118/70. Discussed calcium/vitamin D adherence for osteoporosis." },
    { id: "s-jt-3", date: "2026-02-14", duration: "3m 38s", summary: "Maintain phase check-in. No new symptoms. Confirmed next cardiology visit scheduled Mar 4." },
  ],
};
function getSessionsFor(patientName) {
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
function SessionsTab({ patientData, medplumSessions, loading }) {
  const name = patientData?.patient?.name || "";
  const sessions = resolveSessions(medplumSessions, name);
  if (loading) return <EmptyState>Loading sessions from Medplum…</EmptyState>;
  if (!sessions.length) return <EmptyState>No sessions logged yet. Complete an AI check-in to populate this list.</EmptyState>;
  return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
    <CardTitle>Session history{sessions[0]?.source === "fixture" && " (sample)"}</CardTitle>
    {sessions.map((s, i) => (
      <div key={s.id} style={{ padding: "10px 0", borderBottom: i < sessions.length - 1 ? `1px solid #F0EEE8` : "none" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 14, ...css.serif, color: S.text }}>{fmtSessionDate(s.date)}</span>
          {s.duration && <Chip>{s.duration}</Chip>}
          {s.alertGenerated && <Badge color="red">Alert</Badge>}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 14, ...css.sans, color: S.textLight }}>AI voice check-in{s.source === "medplum" ? " · Medplum" : ""}</span>
        </div>
        <div style={{ fontSize: 15, ...css.sans, color: S.textMed, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{s.summary}</div>
        {s.transcript && (
          <details style={{ marginTop: 6 }}>
            <summary style={{ fontSize: 14, ...css.sans, color: S.textLight, cursor: "pointer" }}>Show transcript</summary>
            <pre style={{ fontSize: 13, ...css.mono, color: S.textMed, background: "#F6F4EC", padding: 8, borderRadius: 4, marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{s.transcript}</pre>
          </details>
        )}
      </div>
    ))}
  </div>;
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

// ── Main Dashboard ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "care-plan", label: "Care plan" },
  { id: "risk", label: "Risk profile" },
  { id: "sessions", label: "Sessions" },
  { id: "pami", label: "PAMI" },
  { id: "outreach", label: "Outreach" },
];

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [roster, setRoster] = useState([]);           // [{ id, name, initials, meta, risk, alert, bg, fg, raw, summary }]
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

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
        // Dedupe by patient id (Medplum sometimes returns duplicate Sarah Chens)
        const seen = new Set();
        const uniq = [];
        for (const p of (data.patients || [])) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          uniq.push(p);
        }
        let items = uniq.map((p, i) => ({
          id: p.id,
          name: p.name || "Unknown",
          initials: initialsFromName(p.name),
          meta: inferConditionsSummary(p.conditions),
          risk: inferRiskLevel(p),
          alert: inferRiskLevel(p) === "high",
          bg: CARD_COLORS[i % CARD_COLORS.length].bg,
          fg: CARD_COLORS[i % CARD_COLORS.length].fg,
          summary: p,
        }));
        // Ensure Marcus is in the roster. If Medplum doesn't have him, fall
        // back to the local bundle so the demo keeps working.
        const marcusFromMedplum = items.find(identifierMatchesMarcus);
        if (!marcusFromMedplum) {
          items = [LOCAL_MARCUS_ROSTER, ...items];
        }
        setRoster(items);
        // Auto-select Marcus
        const marcus = items.find(identifierMatchesMarcus) || items.find(i => i.id === LOCAL_MARCUS_ID);
        setSelectedPatientId((marcus || items[0])?.id || null);
      } catch (err) {
        if (cancelled) return;
        // Medplum unreachable (e.g. preview deploys without MEDPLUM_CLIENT_ID
        // scoped to Preview). Surface the error for transparency but still
        // seed the local Marcus fixture so the call flow stays demoable.
        setRosterError(err.message);
        setRoster([LOCAL_MARCUS_ROSTER]);
        setSelectedPatientId(LOCAL_MARCUS_ID);
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
        // Local Marcus fallback — load bundle from /public/data
        if (selectedPatientId === LOCAL_MARCUS_ID) {
          const res = await fetch("/data/marcus-williams-bundle.json");
          if (!res.ok) throw new Error(`Local Marcus bundle fetch failed: ${res.status}`);
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
  // logged (sessionLogStatus === "saved"). Local Marcus has no Medplum
  // Patient resource yet, so we short-circuit to [] for him and rely on
  // fixtures + the pinned lastCallSummary card for his demo session view.
  useEffect(() => {
    if (!selectedPatientId) return;
    if (selectedPatientId === LOCAL_MARCUS_ID) { setSessions([]); return; }
    let cancelled = false;
    setSessionsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/medplum-fhir?action=sessions&patientId=${encodeURIComponent(selectedPatientId)}`);
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

  // Called by VoiceCallDemo when the call ends. Persists the encounter to
  // Medplum (when the patient has a real Medplum id) and flashes the summary
  // onto the Overview tab so the coordinator sees it immediately.
  const handleCallComplete = async (payload) => {
    setCallOpen(false);
    const name = patientData?.patient?.name || roster.find(r => r.id === selectedPatientId)?.name || "Patient";
    setLastCallSummary({ ...payload, patientName: name, patientId: selectedPatientId });
    // Don't POST for the local Marcus demo (no Medplum Patient resource).
    if (!selectedPatientId || selectedPatientId === LOCAL_MARCUS_ID) return;
    setSessionLogStatus("saving");
    try {
      const res = await fetch("/api/medplum-fhir?action=log-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId, ...payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Log session failed: ${res.status}`);
      }
      setSessionLogStatus("saved");
    } catch (err) {
      setSessionLogStatus(`error:${err.message}`);
    }
  };

  const selectedRosterItem = useMemo(() => roster.find(r => r.id === selectedPatientId), [roster, selectedPatientId]);
  const isMarcusSelected = selectedRosterItem
    ? (selectedRosterItem.id === LOCAL_MARCUS_ID || identifierMatchesMarcus(selectedRosterItem.summary))
    : false;

  // Live call overlay — launches VoiceCallDemo in live mode
  // Currently the live call only has Marcus-specific clinical context, so
  // button is enabled only when Marcus is selected.
  const patientForCall = isMarcusSelected
    ? { id: 101, name: "Marcus Williams", age: 58, gender: "M" }
    : null;

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

  const tabContent = {
    overview: <OverviewTab
      patientData={patientData}
      onViewAllSessions={() => setActiveTab("sessions")}
      onViewRiskProfile={() => setActiveTab("risk")}
      onViewCarePlan={() => setActiveTab("care-plan")}
      medplumSessions={sessions}
      lastCallSummary={lastCallSummary}
      sessionLogStatus={sessionLogStatus}
      onDismissLastCall={() => { setLastCallSummary(null); setSessionLogStatus(null); }}
    />,
    "care-plan": <CarePlanTab patientData={patientData} />,
    risk: <RiskTab patientData={patientData} />,
    sessions: <SessionsTab patientData={patientData} medplumSessions={sessions} loading={sessionsLoading} />,
    pami: <PamiTab patientData={patientData} />,
    outreach: <OutreachTab patientData={patientData} onInitiateCall={handleInitiateCall} />,
  };

  const patient = patientData?.patient;
  const displayName = patient?.name || selectedRosterItem?.name || "—";
  const age = ageFromBirthDate(patient?.birthDate);
  const gender = patient?.gender || "—";
  const mrn = patient?.identifier || patient?.id || "—";

  return (
    <div style={{ display: "flex", height: "100vh", minHeight: 720, background: S.bg }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: S.navy, color: "#CBD5E1", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 17, ...css.serif, color: S.navyText }}>Vardana</div>
          <div style={{ fontSize: 14, color: S.sidebarMuted, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2, ...css.sans }}>Care Console</div>
        </div>

        {rosterLoading && <div style={{ padding: 16, fontSize: 15, ...css.sans, color: S.sidebarMuted }}>Loading roster from Medplum…</div>}
        {rosterError && <div style={{ padding: 16, fontSize: 15, ...css.sans, color: S.red }}>Roster error: {rosterError}</div>}

        {roster.filter(p => p.alert).length > 0 && (
          <div style={{ padding: "10px 10px 4px", fontSize: 14, letterSpacing: "1.2px", textTransform: "uppercase", color: S.sidebarMuted, ...css.sans }}>Alerts</div>
        )}
        {roster.filter(p => p.alert).map((p) => (
          <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderLeft: `3px solid ${selectedPatientId === p.id ? S.navyText : "transparent"}`, background: selectedPatientId === p.id ? "rgba(226,213,184,0.12)" : "rgba(226,213,184,0.08)", cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, ...css.sans, flexShrink: 0 }}>{p.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#CBD5E1" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: S.sidebarMuted, ...css.sans }}>{p.meta}</div>
            </div>
            <span style={{ background: S.red, color: "white", fontSize: 13, ...css.sans, padding: "1px 4px", borderRadius: 2 }}>1</span>
            <div style={riskDot(p.risk)} />
          </div>))}

        {roster.filter(p => !p.alert).length > 0 && (
          <div style={{ padding: "10px 10px 4px", marginTop: 6, fontSize: 14, letterSpacing: "1.2px", textTransform: "uppercase", color: S.sidebarMuted, ...css.sans }}>Patients</div>
        )}
        {roster.filter(p => !p.alert).map((p) => (
          <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderLeft: `3px solid ${selectedPatientId === p.id ? S.navyText : "transparent"}`, background: selectedPatientId === p.id ? "rgba(226,213,184,0.08)" : "transparent", cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, ...css.sans, flexShrink: 0 }}>{p.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#CBD5E1" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: S.sidebarMuted, ...css.sans }}>{p.meta}</div>
            </div>
            <div style={riskDot(p.risk)} />
          </div>))}

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
          <div style={{ padding: "7px 10px", color: S.sidebarMuted, fontSize: 13, ...css.mono }}>Source: Medplum FHIR R4</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, ...css.serif }}>{displayName}</div>
            <div style={{ fontSize: 13, color: S.textLight, ...css.sans }}>
              {age != null ? `${age} yo · ` : ""}{gender}{mrn !== "—" ? ` · ${mrn}` : ""}
            </div>
          </div>
          <div style={{ flex: 1 }} />
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

      {/* Live-call overlay. VoiceCallDemo owns its own End Call → Return to
          Dashboard flow, which routes through onComplete (generates summary,
          fires handleCallComplete, persists to Medplum). We intentionally do
          NOT render a wrapper-level Close button here — clicking it would
          bypass onComplete and skip both the Medplum write and the post-call
          summary card. One button, one path, always saves. */}
      {callOpen && patientForCall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, overflow: "auto" }}>
          <div style={{ position: "relative", minHeight: "100vh", background: "#F8F9FB" }}>
            <VoiceCallDemo
              patient={patientForCall}
              autoStartLive={true}
              isMarcusDemo={true}
              onComplete={handleCallComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
