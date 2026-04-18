import { useState, useEffect, useMemo } from "react";
import { VoiceCallDemo } from "./App.jsx";

// ── Styles ──
const S = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#8C8C7A",
  accent: "#E2D5B8", chip: "#EEEBD8",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};
const css = {
  mono: { fontFamily: "monospace" },
  serif: { fontFamily: "Georgia, serif" },
};

// ── Small presentational helpers ──
function Chip({ children }) {
  return <span style={{ fontSize: 10, ...css.mono, color: S.textMed, background: S.chip, padding: "2px 7px", borderRadius: 3 }}>{children}</span>;
}
function Badge({ children, color = "blue" }) {
  const colors = {
    blue: { bg: S.blueBg, text: S.blue }, green: { bg: S.greenBg, text: S.greenText },
    red: { bg: S.redBg, text: S.redText }, amber: { bg: S.amberBg, text: S.amberText },
    gray: { bg: "#F5F3ED", text: S.textMed },
  };
  const c = colors[color] || colors.blue;
  return <span style={{ fontSize: 9, ...css.mono, padding: "2px 5px", borderRadius: 3, background: c.bg, color: c.text }}>{children}</span>;
}
function GuidelineBadge({ children, type }) {
  const colors = { acc: { bg: S.blueBg, text: S.blue, border: "#BFDBFE" }, ada: { bg: S.greenBg, text: S.greenText, border: "#BBF7D0" }, aha: { bg: S.redBg, text: S.redText, border: "#FECACA" }, le8: { bg: S.amberBg, text: S.amberText, border: "#FDE68A" } };
  const c = colors[type] || colors.acc;
  return <span style={{ fontSize: 9, ...css.mono, padding: "2px 6px", borderRadius: 3, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{children}</span>;
}
function HelpBtn({ onClick }) {
  return <button onClick={onClick} style={{ width: 18, height: 18, borderRadius: "50%", background: S.border, color: S.textMed, fontSize: 11, ...css.mono, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>?</button>;
}
function Tooltip({ visible, title, children }) {
  if (!visible) return null;
  return <div style={{ background: S.navy, color: S.navyText, borderRadius: 6, padding: "10px 12px", fontSize: 10, ...css.mono, lineHeight: 1.6, marginBottom: 10 }}><div style={{ fontSize: 11, color: S.navyText, fontWeight: 700, marginBottom: 4 }}>{title}</div>{children}</div>;
}
function CardTitle({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: S.textLight, ...css.mono, marginBottom: 10 }}>{children}</div>;
}
function PRow({ label, value, badge, badgeColor }) {
  return <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: `1px solid #F0EEE8`, ...css.mono, fontSize: 11 }}>
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
  return <div style={{ fontSize: 11, ...css.mono, color: S.textLight, padding: "10px 0" }}>{children}</div>;
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

// Roster card colors cycle
const CARD_COLORS = [
  { bg: "#3B2F1E", fg: "#E2D5B8" }, { bg: "#1B3A2A", fg: "#9FE1CB" },
  { bg: "#1E2D3D", fg: "#85B7EB" }, { bg: "#1A2E1A", fg: "#C0DD97" },
  { bg: "#2E1E3B", fg: "#C8A0E2" }, { bg: "#3B2920", fg: "#E6B89A" },
];

// ── Tab: Overview ──
function OverviewTab({ patientData }) {
  if (!patientData) return <EmptyState>No patient data loaded from Medplum.</EmptyState>;
  const { conditions = [], medications = [], vitals = {} } = patientData;
  const latestBP = patientData.latestBP;
  const latestWeight = patientData.latestWeight;
  const bps = (vitals.bloodPressures || []).slice(0, 5).reverse();
  const weights = (vitals.weights || []).slice(0, 5).reverse();
  const bpBars = bps.length ? bps.map(b => Math.min(100, Math.max(20, b.systolic - 80))) : [70, 72, 75, 73, 78];
  const wtBars = weights.length ? weights.map(w => Math.min(100, Math.max(20, (w.value || 80)))) : [72, 74, 73, 72, 72];

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10 }}>
        <CardTitle>Latest BP</CardTitle>
        <div>
          <span style={{ fontSize: 24, ...css.serif }}>{latestBP ? `${latestBP.systolic}` : "—"}</span>
          <span style={{ fontSize: 11, color: S.textLight, ...css.mono }}>{latestBP ? `/${latestBP.diastolic} mmHg` : ""}</span>
        </div>
        <div style={{ fontSize: 10, ...css.mono, color: S.amber, marginTop: 2 }}>{latestBP ? fmtDate(latestBP.date) : "No data"}</div>
        <MiniChart bars={bpBars} accentColor={S.amber} />
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10 }}>
        <CardTitle>Weight</CardTitle>
        <div>
          <span style={{ fontSize: 24, ...css.serif }}>{latestWeight ? latestWeight.value : "—"}</span>
          <span style={{ fontSize: 11, color: S.textLight, ...css.mono }}>{latestWeight ? ` ${latestWeight.unit || "lb"}` : ""}</span>
        </div>
        <div style={{ fontSize: 10, ...css.mono, color: S.textLight, marginTop: 2 }}>{latestWeight ? fmtDate(latestWeight.date) : "No data"}</div>
        <MiniChart bars={wtBars} accentColor="#8C8C7A" />
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 6, padding: 10 }}>
        <CardTitle>Care plan</CardTitle>
        <div style={{ fontSize: 13, ...css.serif }}>{patientData.carePlan?.title || "—"}</div>
        <div style={{ fontSize: 10, ...css.mono, color: S.textLight, marginTop: 4, lineHeight: 1.5 }}>
          {patientData.carePlan?.description?.slice(0, 80) || "No active care plan in Medplum."}
        </div>
      </div>
    </div>
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
  </div>;
}

// ── Tab: Risk Profile ──
function RiskTab({ patientData }) {
  const latestBP = patientData?.latestBP;
  const conditions = patientData?.conditions || [];
  const hasDM = conditions.some(c => /diabetes|t2dm/i.test(c.text || ""));
  const [pceInputs, setPceInputs] = useState({
    age: ageFromBirthDate(patientData?.patient?.birthDate) || 58,
    tc: 195, hdl: 42, sbp: latestBP?.systolic || 138,
    bptx: 1, dm: hasDM ? 1 : 0, smoke: 0, group: "wm",
  });
  const [tips, setTips] = useState({});

  useEffect(() => {
    setPceInputs(p => ({
      ...p,
      age: ageFromBirthDate(patientData?.patient?.birthDate) || p.age,
      sbp: latestBP?.systolic || p.sbp,
      dm: hasDM ? 1 : 0,
    }));
  }, [patientData, latestBP?.systolic, hasDM]);

  function calcPCE(inputs) {
    const { age, tc, hdl, sbp, bptx, dm, smoke, group } = inputs;
    const la = Math.log(age), lt = Math.log(tc), lh = Math.log(hdl), ls = Math.log(sbp);
    let r = 0;
    if (group === "wm") { const s = 12.344*la+11.853*lt-2.664*la*lt-7.990*lh+1.769*la*lh-1.766*lt*lh+(bptx?1.797:1.764)*ls+7.837*smoke-1.795*la*smoke+0.661*dm; r = 1-Math.pow(0.9144,Math.exp(s-61.18)); }
    else if (group === "wf") { const s = -29.799*la+4.884*la*la+13.540*lt-3.114*la*lt-13.578*lh+3.149*la*lh+(bptx?2.019:1.957)*ls+7.574*smoke-1.665*la*smoke+0.661*dm; r = 1-Math.pow(0.9665,Math.exp(s-29.799)); }
    else if (group === "am") { const s = 2.469*la+0.302*lt-0.307*lh+(bptx?1.916:1.809)*ls+0.549*smoke+0.645*dm; r = 1-Math.pow(0.8954,Math.exp(s-19.54)); }
    else { const s = 17.1141*la+0.9396*lt-18.9196*lh+4.4748*la*lh+(bptx?29.2907:27.8197)*ls+(bptx?-6.4321:-6.0873)*la*ls+0.8738*smoke+0.8738*dm; r = 1-Math.pow(0.9533,Math.exp(s-86.61)); }
    return Math.max(0.001, Math.min(0.99, r)) * 100;
  }
  const pct = calcPCE(pceInputs);
  const tierLabel = pct < 5 ? "Low (<5%)" : pct < 7.5 ? "Borderline (5–7.5%)" : pct < 20 ? "High (7.5–20%)" : "Very high (>20%)";
  const tierColors = pct < 5 ? { bg: S.greenBg, text: S.greenText, bar: S.green } : pct < 7.5 ? { bg: S.amberBg, text: S.amberText, bar: S.amber } : { bg: S.redBg, text: S.redText, bar: S.red };
  const toggleTip = (k) => setTips(t => ({ ...t, [k]: !t[k] }));

  const inp = (id, label, type = "number", opts) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <span style={{ fontSize: 11, ...css.mono, color: S.textMed, flex: "0 0 160px" }}>{label}</span>
      {type === "select"
        ? <select value={pceInputs[id]} onChange={e => setPceInputs(p => ({ ...p, [id]: e.target.value }))} style={{ flex: "0 0 90px", border: `1px solid ${S.border}`, borderRadius: 5, padding: "4px 7px", fontSize: 11, ...css.mono }}>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : <input type="number" value={pceInputs[id]} onChange={e => setPceInputs(p => ({ ...p, [id]: parseFloat(e.target.value) || 0 }))} style={{ flex: "0 0 80px", border: `1px solid ${S.border}`, borderRadius: 5, padding: "4px 7px", fontSize: 11, ...css.mono }} />}
    </div>
  );

  return <div>
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid #F0EEE8` }}>
        <span style={{ fontSize: 12, ...css.mono, color: S.text, fontWeight: 700, flex: 1 }}>10-year ASCVD risk</span>
        <GuidelineBadge type="acc">ACC/AHA 2018</GuidelineBadge>
        <HelpBtn onClick={() => toggleTip("pce")} />
      </div>
      <Tooltip visible={tips.pce} title="ACC/AHA Pooled Cohort Equations (2018)">Estimates 10-year risk of first atherosclerotic cardiovascular event. Inputs seeded from Medplum observations.</Tooltip>
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
          <div style={{ fontSize: 10, ...css.mono, color: S.textLight, marginBottom: 6 }}>10-yr ASCVD</div>
          <div style={{ fontSize: 11, ...css.mono, padding: "4px 6px", borderRadius: 4, background: tierColors.bg, color: tierColors.text }}>{tierLabel}</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 7, background: S.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: tierColors.bar, borderRadius: 3, width: `${Math.min(100, pct / 30 * 100).toFixed(1)}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>
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
        <div style={{ fontSize: 13, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Problems</div>
        {conditions.length === 0 && <EmptyState>No conditions in Medplum.</EmptyState>}
        {conditions.map((c, i) => <PRow key={i} label={c.text} value={`${c.code || ""}${c.onset ? ` · Since ${fmtDate(c.onset)}` : ""}`} badge={c.status === "active" ? "Active" : (c.status || "—")} badgeColor="green" />)}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Allergies</div>
        {allergies.length === 0 && <EmptyState>No allergies recorded.</EmptyState>}
        {allergies.map((a, i) => <PRow key={i} label={a.substance || "—"} value={[a.reaction, a.status].filter(Boolean).join(" · ") || "—"} badge="Allergy" badgeColor="red" />)}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 13, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Recent labs</div>
        {labs.length === 0 && <EmptyState>No labs in Medplum.</EmptyState>}
        {labs.slice(0, 8).map((l, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < Math.min(labs.length, 8) - 1 ? `1px solid #F0EEE8` : "none", ...css.mono, fontSize: 11 }}>
          <span style={{ flex: "0 0 150px", color: S.text }}>{l.name}</span>
          <span style={{ flex: 1, color: S.textMed }}>{l.value}{l.unit ? ` ${l.unit}` : ""}{l.date ? ` · ${fmtDate(l.date)}` : ""}</span>
        </div>)}
      </div>
    </div>
    <div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 13, ...css.serif, marginBottom: 10, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>Medications</div>
        {medications.length === 0 && <EmptyState>No medications in Medplum.</EmptyState>}
        {medications.map((m, i) => <div key={i} style={{ padding: "8px 0", borderBottom: i < medications.length - 1 ? `1px solid #F0EEE8` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, ...css.mono, flex: 1 }}>{m.name}</span>
            <Badge color={m.status === "active" ? "blue" : "gray"}>{m.status || "—"}</Badge>
          </div>
          {m.dosage && <div style={{ fontSize: 10, ...css.mono, color: S.textMed, marginTop: 2 }}>{m.dosage}</div>}
        </div>)}
      </div>
    </div>
  </div>;
}

// ── Tab: Sessions (placeholder — not in Medplum) ──
function SessionsTab() {
  return <EmptyState>Session history will appear here once voice check-ins are logged to Medplum Communication resources.</EmptyState>;
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
          <div style={{ fontSize: 12, ...css.serif }}>{o.name}</div>
          <div style={{ fontSize: 10, color: S.textLight, ...css.mono }}>{o.desc}</div>
        </div>))}
    </div>
    {selected === "call" && (
      <div style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, background: S.card }}>
        <div style={{ fontSize: 12, ...css.mono, color: S.textMed, marginBottom: 10 }}>Start a live AI voice check-in with {name} now.</div>
        <button onClick={onInitiateCall} style={{ fontSize: 11, ...css.mono, padding: "7px 16px", background: S.navy, color: S.navyText, border: "none", borderRadius: 6, cursor: "pointer" }}>Initiate live call</button>
      </div>
    )}
  </div>;
}

// ── Tab: Experience (static demo) ──
function ExperienceTab({ patientData }) {
  const name = patientData?.patient?.name?.split(" ")[0] || "Patient";
  return <div style={{ fontSize: 12, ...css.mono, color: S.textMed }}>
    Patient-facing experience for {name}. SMS onboarding, welcome email, and voice check-in scripts would render here.
  </div>;
}

// ── Main Dashboard ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk profile" },
  { id: "sessions", label: "Sessions" },
  { id: "pami", label: "PAMI" },
  { id: "outreach", label: "Outreach" },
  { id: "experience", label: "Patient experience" },
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

  // ── Fetch roster from Medplum on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/medplum-fhir?action=roster");
        if (!res.ok) throw new Error(`Roster fetch failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const items = (data.patients || []).map((p, i) => ({
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
        setRoster(items);
        // Auto-select: prefer Marcus if present, else first patient
        const marcus = items.find(identifierMatchesMarcus);
        setSelectedPatientId((marcus || items[0])?.id || null);
      } catch (err) {
        if (!cancelled) setRosterError(err.message);
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

  const selectedRosterItem = useMemo(() => roster.find(r => r.id === selectedPatientId), [roster, selectedPatientId]);
  const isMarcusSelected = selectedRosterItem ? identifierMatchesMarcus(selectedRosterItem.summary) : false;

  // Live call overlay — launches VoiceCallDemo in live mode
  // Currently the live call only has Marcus-specific clinical context, so
  // button is enabled only when Marcus is selected.
  const patientForCall = isMarcusSelected
    ? { id: 101, name: "Marcus Williams", age: 58, gender: "M" }
    : null;

  const riskDot = (r) => ({ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: r === "high" ? S.red : r === "mod" ? S.amber : S.green, boxShadow: r === "high" ? "0 0 5px rgba(239,68,68,0.5)" : "none" });

  const tabContent = {
    overview: <OverviewTab patientData={patientData} />,
    risk: <RiskTab patientData={patientData} />,
    sessions: <SessionsTab />,
    pami: <PamiTab patientData={patientData} />,
    outreach: <OutreachTab patientData={patientData} onInitiateCall={() => setCallOpen(true)} />,
    experience: <ExperienceTab patientData={patientData} />,
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
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2, ...css.mono }}>Care Console</div>
        </div>

        {rosterLoading && <div style={{ padding: 16, fontSize: 11, ...css.mono, color: "#475569" }}>Loading roster from Medplum…</div>}
        {rosterError && <div style={{ padding: 16, fontSize: 11, ...css.mono, color: S.red }}>Roster error: {rosterError}</div>}

        {roster.filter(p => p.alert).length > 0 && (
          <div style={{ padding: "10px 10px 4px", fontSize: 10, letterSpacing: "1.2px", textTransform: "uppercase", color: "#475569", ...css.mono }}>Alerts</div>
        )}
        {roster.filter(p => p.alert).map((p) => (
          <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderLeft: `3px solid ${selectedPatientId === p.id ? S.navyText : "transparent"}`, background: selectedPatientId === p.id ? "rgba(226,213,184,0.12)" : "rgba(226,213,184,0.08)", cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, ...css.mono, flexShrink: 0 }}>{p.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#CBD5E1" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#475569", ...css.mono }}>{p.meta}</div>
            </div>
            <span style={{ background: S.red, color: "white", fontSize: 9, ...css.mono, padding: "1px 4px", borderRadius: 2 }}>1</span>
            <div style={riskDot(p.risk)} />
          </div>))}

        {roster.filter(p => !p.alert).length > 0 && (
          <div style={{ padding: "10px 10px 4px", marginTop: 6, fontSize: 10, letterSpacing: "1.2px", textTransform: "uppercase", color: "#475569", ...css.mono }}>Patients</div>
        )}
        {roster.filter(p => !p.alert).map((p) => (
          <div key={p.id} onClick={() => setSelectedPatientId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderLeft: `3px solid ${selectedPatientId === p.id ? S.navyText : "transparent"}`, background: selectedPatientId === p.id ? "rgba(226,213,184,0.08)" : "transparent", cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, ...css.mono, flexShrink: 0 }}>{p.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#CBD5E1" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#475569", ...css.mono }}>{p.meta}</div>
            </div>
            <div style={riskDot(p.risk)} />
          </div>))}

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
          <div style={{ padding: "7px 10px", color: "#475569", fontSize: 11, ...css.mono }}>Source: Medplum FHIR R4</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, ...css.serif }}>{displayName}</div>
            <div style={{ fontSize: 11, color: S.textLight, ...css.mono }}>
              {age != null ? `${age} yo · ` : ""}{gender}{mrn !== "—" ? ` · ${mrn}` : ""}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { if (patientForCall) setCallOpen(true); }}
            disabled={!patientForCall}
            title={patientForCall ? "Start live AI voice call" : "Live call demo is wired for Marcus Williams only"}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11, ...css.mono,
              background: patientForCall ? S.navy : "#CBD5CB",
              color: patientForCall ? S.navyText : S.textLight,
              border: "none", cursor: patientForCall ? "pointer" : "not-allowed",
            }}
          >
            Initiate call
          </button>
        </div>

        {/* Patient header */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "14px 20px", flexShrink: 0 }}>
          {patientLoading && <div style={{ fontSize: 11, ...css.mono, color: S.textLight }}>Loading patient data from Medplum…</div>}
          {!patientLoading && patient && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: selectedRosterItem?.bg || "#3B2F1E", color: selectedRosterItem?.fg || S.navyText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, ...css.mono, fontWeight: 700, flexShrink: 0 }}>{initialsFromName(displayName)}</div>
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
            <div style={{ fontSize: 11, ...css.mono, color: S.textLight }}>Select a patient from the roster.</div>
          )}
          {patientData?.error && (
            <div style={{ fontSize: 11, ...css.mono, color: S.red }}>Failed to load patient: {patientData.error}</div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ background: S.card, borderBottom: `1px solid ${S.border}`, padding: "0 20px", display: "flex", flexShrink: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 14px", fontSize: 11, ...css.mono, color: activeTab === t.id ? S.text : S.textLight, cursor: "pointer", borderBottom: `2px solid ${activeTab === t.id ? S.navy : "transparent"}`, transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {t.label}
            </div>))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {tabContent[activeTab]}
        </div>
      </div>

      {/* Live-call overlay */}
      {callOpen && patientForCall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, overflow: "auto" }}>
          <div style={{ position: "relative", minHeight: "100vh", background: "#F8F9FB" }}>
            <button
              onClick={() => setCallOpen(false)}
              style={{ position: "absolute", top: 12, right: 12, zIndex: 1001, padding: "6px 14px", fontSize: 12, ...css.mono, background: S.navy, color: S.navyText, border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              Close call ×
            </button>
            <VoiceCallDemo
              patient={patientForCall}
              autoStartLive={true}
              isMarcusDemo={true}
              onComplete={() => setCallOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
