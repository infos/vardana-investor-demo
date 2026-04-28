/**
 * ChatCheckinDemo
 *
 * Two-pane chat surface used inside the Care Console — same deterministic
 * brain as voice. Live mode talks to /api/voice-chat (the existing Vercel
 * function). The function runs assessEscalationState server-side and
 * returns reply, escalationState, fhirQueries, and a brief assessment.
 *
 * Replay mode plays back a static JSON scenario at recorded delays — no
 * backend traffic.
 *
 * Design system: reuses the CoordinatorDashboard palette (S object). No new
 * tokens introduced.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

// Same tokens as CoordinatorDashboard. Inlined here so this component is
// self-contained and can be used outside the dashboard if needed.
const S = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};
const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

const VOICE_CHAT_ENDPOINT = "/api/voice-chat";
// Cap how many turns the model expects so its prompt stays focused.
const MAX_TURNS = 12;

// Build the patientContext payload that /api/voice-chat expects. Mirrors the
// shape App.jsx's VoiceCallDemo sends. Conditions / medications / labs come
// straight from the parsed FHIR bundle so the model sees real clinical data.
function buildPatientContext(patient, patientData) {
  if (!patient) return undefined;
  const age = patientData?.patient?.birthDate
    ? Math.floor((Date.now() - new Date(patientData.patient.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : undefined;
  const gender = patientData?.patient?.gender || undefined;
  const conditions = (patientData?.conditions || [])
    .filter(c => !c.status || c.status === "active")
    .map(c => ({ text: c.text, status: c.status || "active" }));
  const medications = (patientData?.medications || [])
    .filter(m => !m.status || m.status === "active")
    .map(m => ({ name: m.name, dosage: m.dosage }));
  const labs = (patientData?.labs || [])
    .slice(0, 12)
    .map(l => ({ name: l.name, value: l.value, unit: l.unit }));
  return {
    name: patient.name,
    age,
    gender,
    conditions,
    medications,
    labs,
  };
}

// Static demo risk values for Marcus — match the recorded voice demo panel.
// Other patients render only what's actually in their FHIR bundle.
const MARCUS_RISK_PANEL = [
  { label: "ACC/AHA PCE",   value: "17.3%",  note: "10-year ASCVD risk" },
  { label: "AHA/ACC 2017 HTN", value: "Stage 1", note: "BP 130-139/80-89" },
  { label: "ADA 2024 CV Risk", value: "High",    note: "T2DM + HTN + Hyperlipidemia" },
];

// Lab status thresholds for the right-pane summary. Marcus-specific demo
// values dominate; for other patients we fall back to the bundle's labs.
const LAB_STATUS = {
  HbA1c: (v) => (v >= 7 ? "high" : v >= 6.5 ? "elevated" : "ok"),
  "Fasting Glucose": (v) => (v >= 126 ? "high" : v >= 100 ? "elevated" : "ok"),
  LDL: (v) => (v >= 130 ? "high" : v >= 100 ? "elevated" : "ok"),
  Creatinine: (v) => (v > 1.3 ? "high" : v >= 1.1 ? "elevated" : "ok"),
  eGFR: (v) => (v < 60 ? "high" : v < 90 ? "elevated" : "ok"),
  "Microalbumin/Cr": (v) => (v >= 30 ? "high" : "ok"),
};
const LAB_DOT = { ok: S.green, elevated: S.amber, high: S.red };

function classifyLab(name, value) {
  const fn = LAB_STATUS[name];
  if (!fn || value == null) return "ok";
  return fn(value);
}

const ESCALATION_BADGE_COLORS = {
  STABLE: { bg: S.greenBg, text: S.greenText, border: "#BBF7D0" },
  WATCH: { bg: S.amberBg, text: S.amberText, border: "#FDE68A" },
  "SAME-DAY": { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
  IMMEDIATE: { bg: S.redBg, text: S.redText, border: "#FECACA" },
};

// Patient bubbles use the warm amber-on-cream palette already in the dashboard;
// AI bubbles use the dark navy slate for the same look as the rest of the
// console. No new tokens.
function Bubble({ role, text }) {
  const isAI = role === "ai";
  return (
    <div style={{
      display: "flex",
      justifyContent: isAI ? "flex-start" : "flex-end",
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: "75%",
        background: isAI ? S.navy : S.amberBg,
        color: isAI ? S.navyText : S.amberText,
        padding: "10px 14px",
        borderRadius: 14,
        borderTopLeftRadius: isAI ? 4 : 14,
        borderTopRightRadius: isAI ? 14 : 4,
        fontSize: 15,
        ...css.sans,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        border: isAI ? "none" : `1px solid #FDE68A`,
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
      <div style={{
        background: S.navy, color: S.navyText, padding: "10px 14px",
        borderRadius: 14, borderTopLeftRadius: 4,
        display: "inline-flex", gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: S.navyText, opacity: 0.5,
            animation: `chatBubblePulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function EscalationBadge({ state }) {
  const c = ESCALATION_BADGE_COLORS[state] || ESCALATION_BADGE_COLORS.STABLE;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 13, ...css.sans, fontWeight: 700,
      background: c.bg, color: c.text,
      padding: "3px 8px", borderRadius: 4,
      border: `1px solid ${c.border}`,
      letterSpacing: "0.04em",
    }}>{state}</span>
  );
}

function FhirCallRow({ method, path, result }) {
  const isPost = method === "POST";
  return (
    <div style={{
      background: "#FAFAF8", borderRadius: 6, padding: "7px 10px",
      border: `1px solid ${isPost ? "#FDE68A" : S.border}`,
      animation: "chatFhirIn 0.3s ease",
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: isPost ? S.amberBg : "#ECFDF5",
          color: isPost ? S.amberText : S.greenText,
          padding: "1px 5px", borderRadius: 3,
        }}>{method}</span>
        <span style={{
          fontSize: 11, ...css.mono, color: S.textMed,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>{path}</span>
      </div>
      <div style={{ fontSize: 12, ...css.sans, color: S.textMed }}>→ {result}</div>
    </div>
  );
}

// ── Right-pane summary cards ──────────────────────────────────────────────
// Mirrors the "patient summary" panel from the recorded voice demo so the
// chat surface tells the same story at a glance: vitals, recent labs, risk
// scores, plus the deterministic escalation badge and FHIR activity stream.

function SectionHead({ children }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase",
      color: S.textLight, marginBottom: 8, fontWeight: 700, ...css.sans,
    }}>{children}</div>
  );
}

function MetricTile({ label, value, sub, tone = "neutral" }) {
  const colorByTone = {
    high: S.red, elevated: S.amber, ok: S.green, neutral: S.text,
  };
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "#FFFFFF", border: `1px solid ${S.border}`,
      borderRadius: 8, padding: "9px 11px",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
        color: S.textLight, fontWeight: 700, ...css.sans }}>{label}</div>
      <div style={{ fontSize: 19, ...css.serif, color: colorByTone[tone] || S.text, marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: S.textLight, ...css.sans, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function LabRow({ name, value, unit, status, date }) {
  const dotColor = LAB_DOT[status] || S.green;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4 }} />
      <span style={{ fontSize: 13, ...css.sans, color: S.text, fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: 13, ...css.sans, color: S.textMed, marginLeft: 4 }}>
        {value}{unit ? ` ${unit}` : ""}
      </span>
      <span style={{ flex: 1 }} />
      {date && <span style={{ fontSize: 11, ...css.mono, color: S.textLight }}>{date}</span>}
    </div>
  );
}

function RiskRow({ label, value, note }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", padding: "5px 0", gap: 10 }}>
      <span style={{ fontSize: 13, ...css.sans, color: S.text, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, ...css.sans, color: S.text }}>{value}</span>
      <span style={{ flex: 1 }} />
      {note && <span style={{ fontSize: 11, ...css.sans, color: S.textLight, textAlign: "right" }}>{note}</span>}
    </div>
  );
}

// Marcus's bundle ships rich vitals/labs but no HR / SpO2 observations, so
// the demo reuses the same baseline numbers shown in the voice demo. This
// stays narrow to Marcus on purpose — other patients render only what's in
// their bundle, no fabricated values.
const MARCUS_DEMO_VITALS = {
  glucose: { value: "186", unit: "mg/dL", sub: "Fasting, elevated", tone: "high" },
  bp:      { value: "158/98", sub: "4-day worsening, was 142/88 on Day 18", tone: "high" },
  hr:      { value: "78", unit: "bpm", sub: null, tone: "ok" },
  spo2:    { value: "97", unit: "%", sub: null, tone: "ok" },
};

const MARCUS_DEMO_LABS = [
  { name: "HbA1c",            value: "8.4",  unit: "%",     status: "high",     date: "Feb 25" },
  { name: "Fasting Glucose",  value: "182",  unit: "mg/dL", status: "high",     date: "Feb 25" },
  { name: "LDL",              value: "118",  unit: "mg/dL", status: "elevated", date: "Feb 25" },
  { name: "Creatinine",       value: "1.1",  unit: "mg/dL", status: "elevated", date: "Feb 25" },
  { name: "eGFR",             value: "72",   unit: "mL/min",status: "elevated", date: "Feb 25" },
  { name: "Microalbumin/Cr",  value: "42",   unit: "mg/g",  status: "high",     date: "Feb 25" },
];

function PatientSummaryPane({
  patient, patientData, isMarcus,
  escalationState, escalationSubtype,
  synthesis, riskScore,
  fhirActivity,
}) {
  // Active medications (from bundle); deduped, capped to keep the column compact.
  const meds = useMemo(() => {
    const list = (patientData?.medications || [])
      .filter(m => m?.name && (!m.status || m.status === "active"))
      .map(m => ({
        name: m.name.replace(/\s+\d.*$/, "").trim(),
        dose: (m.dosage || "").replace(/.*?(\d+\s*(mg|mcg|g|units?))(?:\b|\W).*/i, "$1") || "",
      }));
    const seen = new Set();
    return list.filter(m => { if (seen.has(m.name)) return false; seen.add(m.name); return true; }).slice(0, 6);
  }, [patientData]);

  // Vitals: prefer bundle values when present, fall back to Marcus demo numbers.
  const latestBp = patientData?.latestBP;
  const vitals = isMarcus ? MARCUS_DEMO_VITALS : {
    glucose: null,
    bp: latestBp ? { value: `${latestBp.systolic}/${latestBp.diastolic}`, sub: null, tone: "neutral" } : null,
    hr: null, spo2: null,
  };

  // Labs: prefer bundle (sorted, classified). Marcus uses the demo set when
  // his bundle doesn't expose all six rows the voice demo shows.
  const labRows = useMemo(() => {
    const fromBundle = (patientData?.labs || [])
      .filter(l => l?.name && l.value != null)
      .slice(0, 6)
      .map(l => ({
        name: l.name,
        value: typeof l.value === "number" ? l.value : l.value,
        unit: l.unit || "",
        status: classifyLab(l.name, parseFloat(l.value)),
        date: l.date ? new Date(l.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
      }));
    if (isMarcus && fromBundle.length < 4) return MARCUS_DEMO_LABS;
    return fromBundle;
  }, [patientData, isMarcus]);

  return (
    <div style={{
      width: 340, flexShrink: 0, display: "flex", flexDirection: "column",
      background: S.card, overflowY: "auto",
    }}>
      {/* Escalation + synthesis */}
      <div style={{ padding: "16px 18px 4px" }}>
        <SectionHead>Escalation state</SectionHead>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <EscalationBadge state={escalationState} />
          {escalationSubtype && (
            <span style={{ fontSize: 11, ...css.mono, color: S.textLight }}>
              {escalationSubtype.replace(/_/g, " ")}
            </span>
          )}
          {typeof riskScore === "number" && (
            <span style={{
              fontSize: 11, ...css.mono, color: S.textLight,
              marginLeft: "auto",
            }}>
              risk {riskScore}
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: "10px 18px 12px" }}>
        <SectionHead>Synthesis</SectionHead>
        <div style={{
          fontSize: 13, color: S.text, lineHeight: 1.55,
          background: S.bg, padding: "9px 11px",
          borderRadius: 6, border: `1px solid ${S.border}`,
        }}>
          {synthesis}
        </div>
      </div>

      {/* Active meds */}
      {meds.length > 0 && (
        <div style={{ padding: "10px 18px 6px", borderTop: `1px solid ${S.border}` }}>
          <SectionHead>Active medications</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {meds.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", padding: "3px 0" }}>
                <span style={{ fontSize: 13, ...css.sans, color: S.text, fontWeight: 500 }}>{m.name}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, ...css.mono, color: S.textMed }}>{m.dose}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current vitals */}
      <div style={{ padding: "12px 18px 6px", borderTop: `1px solid ${S.border}` }}>
        <SectionHead>Current vitals</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {vitals.glucose && (
            <MetricTile label="Glucose" value={`${vitals.glucose.value} ${vitals.glucose.unit || ""}`.trim()} sub={vitals.glucose.sub} tone={vitals.glucose.tone} />
          )}
          {vitals.bp && (
            <MetricTile label="Blood pressure" value={vitals.bp.value} sub={vitals.bp.sub} tone={vitals.bp.tone} />
          )}
          {vitals.hr && (
            <MetricTile label="Heart rate" value={`${vitals.hr.value} ${vitals.hr.unit || ""}`.trim()} sub={vitals.hr.sub} tone={vitals.hr.tone} />
          )}
          {vitals.spo2 && (
            <MetricTile label="SpO₂" value={`${vitals.spo2.value} ${vitals.spo2.unit || ""}`.trim()} sub={vitals.spo2.sub} tone={vitals.spo2.tone} />
          )}
        </div>
      </div>

      {/* Recent labs */}
      {labRows.length > 0 && (
        <div style={{ padding: "12px 18px 6px", borderTop: `1px solid ${S.border}` }}>
          <SectionHead>Recent labs</SectionHead>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {labRows.map((l, i) => <LabRow key={i} {...l} />)}
          </div>
        </div>
      )}

      {/* Risk assessment — Marcus only for now (matches recorded voice demo) */}
      {isMarcus && (
        <div style={{ padding: "12px 18px 6px", borderTop: `1px solid ${S.border}` }}>
          <SectionHead>Risk assessment</SectionHead>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {MARCUS_RISK_PANEL.map((r, i) => <RiskRow key={i} {...r} />)}
          </div>
        </div>
      )}

      {/* FHIR activity — same as before */}
      <div style={{ padding: "12px 18px 6px", borderTop: `1px solid ${S.border}` }}>
        <SectionHead>FHIR activity</SectionHead>
      </div>
      <div style={{ padding: "0 14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        {fhirActivity.length === 0 ? (
          <div style={{ fontSize: 13, color: S.textLight, textAlign: "center", padding: "10px 0", lineHeight: 1.5 }}>
            No FHIR calls yet.
          </div>
        ) : (
          fhirActivity.slice().reverse().map((q, i) => (
            <FhirCallRow key={fhirActivity.length - 1 - i} {...q} />
          ))
        )}
      </div>
    </div>
  );
}

// Build the post-session summary card payload that CoordinatorDashboard's
// PostCallSummary component renders on the Overview tab. Shape mirrors what
// VoiceCallDemo.onComplete sends so the dashboard can treat both surfaces
// uniformly. Risk tier is derived from the deterministic escalation state.
function escalationToRiskLevel(state) {
  switch (state) {
    case "IMMEDIATE": return "critical";
    case "SAME-DAY":  return "high";
    case "WATCH":     return "moderate";
    default:          return "low";
  }
}

function buildLiveChatSummary({
  patientName, sessionStartedAt, messages, escalationState, synthesis, riskScore,
}) {
  const endedAt = new Date();
  const seconds = Math.max(1, Math.round((endedAt.getTime() - sessionStartedAt.getTime()) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const duration = `${mins}m ${secs.toString().padStart(2, "0")}s`;
  const transcript = messages.map(m => ({
    speaker: m.role === "ai" ? "AI" : (patientName || "Patient"),
    text: m.text,
  }));
  const summaryLine = synthesis && synthesis !== "Conversation starting."
    ? synthesis
    : `Chat check-in completed. Escalation: ${escalationState}.`;
  return {
    kind: "chat",
    duration,
    timestamp: endedAt.toLocaleString(),
    riskLevel: escalationToRiskLevel(escalationState),
    alertGenerated: escalationState === "IMMEDIATE" || escalationState === "SAME-DAY",
    summary: summaryLine,
    transcript,
    riskScore: typeof riskScore === "number" ? riskScore : null,
    escalationState,
  };
}

const KICKOFF_PATIENT_MESSAGE = "Hi, I just opened the chat for my check-in.";

export default function ChatCheckinDemo({
  patient,             // { id, name } — id is the FHIR Patient.id
  patientData = null,  // parsed FHIR bundle from CoordinatorDashboard (live mode)
  mode = "live",       // "live" | "replay"
  scenario = null,     // required for mode="replay"; the parsed scenario JSON
  onClose,             // ({reason}) => void — fired when the user dismisses
  onComplete,          // (summary) => void — fired with a session summary in live mode
}) {
  const isReplay = mode === "replay";

  // The /api/voice-chat function expects messages in Anthropic's role format
  // ("user" | "assistant"). UI bubbles use "patient" | "ai" — we keep the two
  // separate so the API payload stays clean while the UI layer is free to
  // restyle without API churn.
  const [messages, setMessages] = useState([]);            // [{ role: 'patient'|'ai', text }]
  const [conversation, setConversation] = useState([]);    // [{ role: 'user'|'assistant', content }] for the API
  const [fhirActivity, setFhirActivity] = useState([]);    // [{ method, path, result }]
  const [escalationState, setEscalationState] = useState("STABLE");
  const [escalationSubtype, setEscalationSubtype] = useState(null);
  const [synthesis, setSynthesis] = useState("Conversation starting.");
  const [riskScore, setRiskScore] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [replayDone, setReplayDone] = useState(false);
  const [sessionStartedAt] = useState(() => new Date());
  // Live-mode "session readiness" — flips true after the first AI greeting
  // returns so the input field becomes editable. Replaces the old EC2
  // session_id gate (we no longer hold a server-side session).
  const [liveReady, setLiveReady] = useState(false);

  const threadRef = useRef(null);
  const cancelledRef = useRef(false);
  const inputRef = useRef(null);

  const patientContext = useMemo(
    () => buildPatientContext(patient, patientData),
    [patient, patientData],
  );
  // Drives the Marcus-specific demo prompt + risk panel.
  const isMarcus = useMemo(
    () => /marcus/i.test(patient?.name || "") && /williams/i.test(patient?.name || ""),
    [patient],
  );
  // Tracks the scenario_id last handled by the replay-reset effect. Used to
  // distinguish "initial mount" (state is already at its initial values, no
  // reset needed) from "scenario actually swapped mid-flight" (must reset).
  // Without this guard, the reset effect runs after the play useEffect on
  // mount and resetReplay() calls clearTimeout() on the timer the play
  // effect just scheduled — so the first turn never fires and replay stalls.
  const lastScenarioIdRef = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  // Auto-focus the input when the AI finishes a turn so the coordinator
  // can keep typing without clicking. Live mode only -- replay has no input.
  useEffect(() => {
    if (isReplay) return;
    if (!liveReady) return;
    if (isTyping) return;
    // Avoid stealing focus while the user is interacting with something else
    // outside the chat overlay (defensive -- normally focus stays in the
    // overlay via the disabled-input pattern while the AI is "typing").
    if (inputRef.current && !inputRef.current.disabled) {
      inputRef.current.focus();
    }
  }, [isTyping, liveReady, isReplay, messages.length]);

  // ── LIVE MODE: greet patient via /api/voice-chat on mount ──
  // No EC2, no session_id — the Vercel function is stateless. Conversation
  // history is replayed in full on every turn so the model has context.
  useEffect(() => {
    if (isReplay) return;
    cancelledRef.current = false;

    (async () => {
      try {
        // Kickoff turn: a synthetic patient message that prompts the AI
        // to introduce itself and read the patient's vitals. Hidden in the
        // UI so the AI's first reply *looks* unprompted to the coordinator.
        const kickoffConv = [{ role: "user", content: KICKOFF_PATIENT_MESSAGE }];
        await sendTurnViaApi(kickoffConv, /*hideUserBubble=*/ true);
        if (!cancelledRef.current) setLiveReady(true);
      } catch (e) {
        if (!cancelledRef.current) setError(`Could not start chat: ${e.message}`);
      }
    })();

    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplay, patient.id]);

  // POST a full conversation slice to /api/voice-chat. Updates UI bubbles,
  // FHIR activity, escalation, synthesis, and risk score from the response.
  async function sendTurnViaApi(conv, hideUserBubble = false) {
    const lastUser = conv[conv.length - 1];
    const isUserTurn = lastUser?.role === "user";
    if (isUserTurn && !hideUserBubble) {
      setMessages(prev => [...prev, { role: "patient", text: lastUser.content }]);
    }
    setIsTyping(true);
    try {
      const res = await fetch(VOICE_CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conv,
          patientContext,
          turn: Math.floor(conv.length / 2),
          maxTurns: MAX_TURNS,
          chatMode: true,
          // The voice-chat function uses this hint to pick Marcus-specific
          // priors (BP/A1c baselines, system prompt). Other patients fall
          // through to the generic prompt path.
          ...(isMarcus && { patient: "marcus" }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Chat API ${res.status}`);
      }
      const data = await res.json();
      if (cancelledRef.current) return;
      setIsTyping(false);

      // Strip the trailing <metadata>{...}</metadata> block the voice prompt
      // appends in voice mode. Chat mode tells the model not to emit it but
      // we defensively strip just in case (matches voice-chat.js client logic).
      const replyText = (data.reply || data.text || "").replace(/<metadata>[\s\S]*?<\/metadata>\s*$/i, "").trim();
      if (replyText) {
        setMessages(prev => [...prev, { role: "ai", text: replyText }]);
        setConversation(prev => [...prev, ...conv.slice(prev.length), { role: "assistant", content: replyText }]);
      }
      if (data.fhirQueries?.length) {
        setFhirActivity(prev => [...prev, ...data.fhirQueries.map(q => ({
          method: q.method,
          path: q.path,
          result: q.result || q.summary || "",
        }))]);
      }
      if (data.escalationState) setEscalationState(data.escalationState);
      if (data.escalationSubtype) setEscalationSubtype(data.escalationSubtype);
      if (data.assessment && Object.keys(data.assessment).length) {
        const lines = Object.entries(data.assessment)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");
        setSynthesis(lines);
      }
      if (typeof data.riskScore === "number") setRiskScore(data.riskScore);
    } catch (e) {
      if (!cancelledRef.current) {
        setIsTyping(false);
        setError(e.message);
      }
    }
  }

  function handleSendLive() {
    const text = input.trim();
    if (!text || isTyping || !liveReady) return;
    setInput("");
    const nextConv = [...conversation, { role: "user", content: text }];
    setConversation(nextConv);
    sendTurnViaApi(nextConv);
  }

  // ── REPLAY MODE: iterate scenario.turns at recorded pacing ──
  // Driver state machine: idx points to the next turn to play. paused gates the
  // tick. Skip-to-end flushes everything synchronously. Replay resets state.
  const [replayIdx, setReplayIdx] = useState(0);
  const replayTimerRef = useRef(null);

  function resetReplay() {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setMessages([]);
    setFhirActivity([]);
    setEscalationState("STABLE");
    setSynthesis(scenario?.synthesis_initial || "Conversation starting.");
    setIsTyping(false);
    setReplayIdx(0);
    setReplayDone(false);
    setPaused(false);
  }

  function skipReplayToEnd() {
    if (!isReplay || !scenario) return;
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsTyping(false);
    const remaining = scenario.turns.slice(replayIdx);
    const allMessages = [
      ...messages,
      ...remaining.map(t => ({ role: t.role, text: t.content })),
    ];
    const allFhir = [
      ...fhirActivity,
      ...remaining.flatMap(t => t.fhir_calls || []),
    ];
    setMessages(allMessages);
    setFhirActivity(allFhir);
    if (scenario.escalation_state) setEscalationState(scenario.escalation_state);
    if (scenario.synthesis) setSynthesis(scenario.synthesis);
    setReplayIdx(scenario.turns.length);
    setReplayDone(true);
  }

  useEffect(() => {
    if (!isReplay || !scenario) return;
    if (paused || replayDone) return;
    if (replayIdx >= scenario.turns.length) {
      setReplayDone(true);
      if (scenario.synthesis) setSynthesis(scenario.synthesis);
      if (scenario.escalation_state) setEscalationState(scenario.escalation_state);
      return;
    }

    const turn = scenario.turns[replayIdx];
    const delay = Math.max(200, turn.delay_ms || 1200);

    if (turn.role === "ai") setIsTyping(true);

    replayTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: turn.role, text: turn.content }]);
      if (turn.fhir_calls?.length) {
        setFhirActivity(prev => [...prev, ...turn.fhir_calls]);
      }
      if (turn.escalation_state) setEscalationState(turn.escalation_state);
      if (turn.synthesis_snapshot) setSynthesis(turn.synthesis_snapshot);
      setReplayIdx(i => i + 1);
    }, delay);

    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [isReplay, scenario, replayIdx, paused, replayDone]);

  // Reset state when the scenario is swapped to a *different* recording.
  // On initial mount, state is already at its replay defaults and the play
  // effect has just scheduled the first turn's timer — calling resetReplay()
  // here would clearTimeout() that timer and stall the playback. So the
  // first observed scenario_id is recorded without resetting; only a true
  // swap (different scenario_id) triggers the reset.
  useEffect(() => {
    if (!isReplay) return;
    const sid = scenario?.scenario_id ?? null;
    if (lastScenarioIdRef.current !== null && lastScenarioIdRef.current !== sid) {
      resetReplay();
    }
    lastScenarioIdRef.current = sid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.scenario_id, isReplay]);

  const sessionTimestamp = useMemo(() =>
    sessionStartedAt.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }), [sessionStartedAt]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 1000, display: "flex", alignItems: "stretch", justifyContent: "center",
    }}>
      <div style={{
        flex: 1, background: S.bg, display: "flex", flexDirection: "column",
        ...css.sans,
      }}>
        {/* Header */}
        <div style={{
          background: S.card, borderBottom: `1px solid ${S.border}`,
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
          height: 56, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, ...css.serif, color: S.text }}>
              {patient.name} — Chat check-in
            </div>
            <div style={{ fontSize: 12, color: S.textLight, ...css.sans }}>
              Session opened {sessionTimestamp}
            </div>
          </div>

          {isReplay && (
            <span style={{
              marginLeft: 8,
              fontSize: 12, ...css.sans, fontWeight: 700,
              background: S.amberBg, color: S.amberText,
              padding: "3px 9px", borderRadius: 4,
              border: `1px solid #FDE68A`, letterSpacing: "0.04em",
            }}>
              ● Recorded — playing back
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={() => {
            // In live mode, hand a summary back to the dashboard so it can
            // pin the post-session card on the Overview tab — same flow voice
            // uses via VoiceCallDemo.onComplete. Skip for replay (no real
            // session to summarize) and when no AI replies have arrived yet.
            if (!isReplay && messages.some(m => m.role === "ai") && typeof onComplete === "function") {
              onComplete(buildLiveChatSummary({
                patientName: patient?.name,
                sessionStartedAt,
                messages,
                escalationState,
                synthesis,
                riskScore,
              }));
            }
            onClose?.();
          }} style={{
            // Prominent end-session button — same visual weight as Initiate
            // chat / call so coordinators don't miss it.
            fontSize: 14, fontWeight: 700, ...css.sans,
            background: S.red, color: "#FFFFFF",
            border: "none", padding: "10px 20px", borderRadius: 6,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
            letterSpacing: "0.02em",
          }}>End Call</button>
        </div>

        {error && (
          <div style={{ background: S.redBg, borderBottom: `1px solid #FECACA`, padding: "8px 16px", display: "flex", gap: 10 }}>
            <span style={{ fontSize: 14, color: S.redText, flex: 1 }}>{error}</span>
            <button onClick={() => setError("")} style={{ fontSize: 12, background: "transparent", color: S.redText, border: `1px solid #FECACA`, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {/* Two-pane body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left pane: chat thread */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${S.border}` }}>
            <div ref={threadRef} style={{
              flex: 1, overflowY: "auto",
              padding: "20px 24px",
              background: S.bg,
            }}>
              {messages.length === 0 && !isTyping && (
                <div style={{
                  textAlign: "center", color: S.textLight, fontSize: 14,
                  marginTop: 60, lineHeight: 1.6,
                }}>
                  {isReplay
                    ? `Recorded scenario: ${scenario?.scenario_id || "—"}`
                    : "Connecting to AI care concierge…"}
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} text={m.text} />
              ))}
              {isTyping && <TypingDots />}
            </div>

            {/* Footer: input (live) or replay controls */}
            {isReplay ? (
              <div style={{
                background: S.card, borderTop: `1px solid ${S.border}`,
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, color: S.textMed, flex: 1 }}>
                  {replayDone
                    ? "Recording complete."
                    : paused
                      ? "Paused."
                      : "Playing recorded conversation…"}
                </span>
                {!replayDone && (
                  <>
                    <button onClick={() => setPaused(p => !p)} style={replayBtnStyle()}>
                      {paused ? "Play" : "Pause"}
                    </button>
                    <button onClick={skipReplayToEnd} style={replayBtnStyle()}>
                      Skip to end
                    </button>
                  </>
                )}
                {replayDone && (
                  <button onClick={resetReplay} style={replayBtnStyle("primary")}>
                    Replay
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                background: S.card, borderTop: `1px solid ${S.border}`,
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  placeholder={liveReady ? "Type a message…" : "Connecting…"}
                  disabled={!liveReady || isTyping}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSendLive(); }}
                  autoFocus
                  style={{
                    flex: 1, fontSize: 14, ...css.sans,
                    padding: "8px 12px", borderRadius: 6,
                    border: `1px solid ${S.border}`, background: "#FFFFFF",
                    color: S.text, outline: "none",
                  }}
                />
                <button
                  onClick={handleSendLive}
                  disabled={!liveReady || isTyping || !input.trim()}
                  style={{
                    padding: "8px 16px", borderRadius: 6,
                    background: (!liveReady || isTyping || !input.trim()) ? "#CBD5E1" : S.navy,
                    color: "#FFFFFF", fontWeight: 700, fontSize: 13,
                    border: "none", cursor: "pointer",
                    ...css.sans,
                  }}
                >Send</button>
              </div>
            )}
          </div>

          {/* Right pane: clinical context — mirrors the recorded voice demo */}
          <PatientSummaryPane
            patient={patient}
            patientData={patientData}
            isMarcus={isMarcus}
            escalationState={escalationState}
            escalationSubtype={escalationSubtype}
            synthesis={synthesis}
            riskScore={riskScore}
            fhirActivity={fhirActivity}
          />
        </div>

        <style>{`
          @keyframes chatBubblePulse {
            0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-2px); }
          }
          @keyframes chatFhirIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

function replayBtnStyle(variant) {
  const base = {
    fontSize: 13, ...css.sans,
    padding: "6px 12px", borderRadius: 4, cursor: "pointer",
    border: `1px solid ${S.border}`,
  };
  if (variant === "primary") {
    return { ...base, background: S.navy, color: "#FFFFFF", border: "none", fontWeight: 700 };
  }
  return { ...base, background: "transparent", color: S.textMed };
}
