import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, CartesianGrid } from "recharts";

// ── Data ──
const WEIGHT_DATA = [
  { day: 1, date: "Feb 15", weight: 187.2 },
  { day: 2, date: "Feb 16", weight: 187.0 },
  { day: 3, date: "Feb 17", weight: 186.8 },
  { day: 4, date: "Feb 18", weight: 186.6 },
  { day: 5, date: "Feb 19", weight: 186.4 },
  { day: 6, date: "Feb 20", weight: 186.2 },
  { day: 7, date: "Feb 21", weight: 186.0 },
  { day: 8, date: "Feb 22", weight: 185.8 },
  { day: 9, date: "Feb 23", weight: 185.7 },
  { day: 10, date: "Feb 24", weight: 185.6 },
  { day: 11, date: "Feb 25", weight: 185.5 },
  { day: 12, date: "Feb 26", weight: 185.4 },
  { day: 13, date: "Feb 27", weight: 186.5 },
  { day: 14, date: "Feb 28", weight: 187.7 },
];

const BP_DATA = [
  { date: "Feb 15", sys: 138, dia: 88 },
  { date: "Feb 19", sys: 134, dia: 84 },
  { date: "Feb 22", sys: 130, dia: 82 },
  { date: "Feb 24", sys: 128, dia: 80 },
  { date: "Feb 26", sys: 126, dia: 78 },
  { date: "Feb 27", sys: 132, dia: 84 },
  { date: "Feb 28", sys: 136, dia: 86 },
];

const ROSTER = [
  { id: 1, name: "Sarah Chen", age: 67, day: 15, phase: "Stabilize → Optimize", risk: 72, riskLevel: "high", alert: true, alertType: "Decompensation risk", alertTime: "38 min ago", trend: "worsening", scheduledOutreach: null },
  { id: 2, name: "Robert Williams", age: 74, day: 52, phase: "Optimize", risk: 34, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: "Today 2:00 PM · Voice" },
  { id: 3, name: "Maria Gonzalez", age: 61, day: 8, phase: "Stabilize", risk: 45, riskLevel: "moderate", alert: false, trend: "improving", scheduledOutreach: "Tomorrow 10:00 AM · SMS" },
  { id: 4, name: "James Thompson", age: 79, day: 83, phase: "Maintain", risk: 22, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: null },
];

const VOICE_TRANSCRIPT = [
  { t: 1200, speaker: "AI", text: "Good morning Sarah. This is the Vardana care concierge calling for your check-in. I hope you're having a good morning." },
  { t: 4500, speaker: "Sarah", text: "Oh hi. Yes, go ahead." },
  { t: 6500, speaker: "AI", text: "I'm checking in because I noticed your weight went up a couple of pounds over the last two days. How are you feeling this morning?" },
  { t: 10500, speaker: "Sarah", text: "Now that you mention it — I do feel more tired than usual. And my ankles look a little puffy." },
  { t: 14000, speaker: "AI", text: "Thank you for telling me that, Sarah. That's really important. Let me pull up your recent readings..." },
  { t: 17500, speaker: "AI", text: "Your weight has increased 2.3 pounds in 48 hours, and your blood pressure is a little higher than your best last week. Combined with the ankle swelling and fatigue, I want to make sure your care team is aware today." },
  { t: 23000, speaker: "Sarah", text: "Is that serious? Should I be worried?" },
  { t: 25500, speaker: "AI", text: "We're being careful, not alarmed. I'm letting Rachel Kim know right now so she can follow up with you and your cardiologist today. Are you having any trouble breathing, especially when lying flat?" },
  { t: 31000, speaker: "Sarah", text: "A little. Had to use an extra pillow last night." },
  { t: 33500, speaker: "AI", text: "That's helpful. I've sent a priority alert to your coordinator with everything we discussed. Rachel will call you today. In the meantime, please stay on your medications and keep sodium low. Do you have any questions?" },
  { t: 39000, speaker: "Sarah", text: "No, I think I understand. Thank you." },
  { t: 41000, speaker: "AI", text: "You're welcome Sarah. We'll be in touch very soon. Take care." },
];

const FHIR_QUERIES = [
  { t: 14200, method: "GET", path: "/Patient/sarah-chen-001", result: "Patient demographics loaded", color: "#2563EB" },
  { t: 15000, method: "GET", path: "/Observation?patient=sarah-chen&code=body-weight&_sort=-date&_count=14", result: "14 weight readings · Latest: 187.7 lbs", color: "#2563EB" },
  { t: 15700, method: "GET", path: "/Observation?patient=sarah-chen&code=blood-pressure", result: "BP trend: 126/78 → 136/86 mmHg", color: "#D97706" },
  { t: 16300, method: "GET", path: "/CarePlan?patient=sarah-chen&status=active", result: "Day 15/90 · Phase: Stabilize → Optimize", color: "#2563EB" },
  { t: 16900, method: "GET", path: "/Condition?patient=sarah-chen", result: "HFrEF, CKD3a, HTN, T2DM", color: "#2563EB" },
  { t: 34200, method: "POST", path: "/Flag", result: "P1 Alert created · ID: flag-sc-001", color: "#DC2626" },
  { t: 34800, method: "POST", path: "/Communication", result: "Coordinator alert dispatched → Rachel Kim", color: "#DC2626" },
];

// ── Theme ──
const c = {
  bg: "#F4F5F7",
  card: "#FFFFFF",
  navy: "#0F1A2A",
  navyLight: "#1B2D45",
  text: "#1A1F36",
  textMed: "#4E5D78",
  textLight: "#8492A6",
  accent: "#2563EB",
  accentLight: "#EFF4FF",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenBg: "#F0FDF4",
  orange: "#D97706",
  orangeLight: "#FEF3C7",
  orangeBg: "#FFFBEB",
  red: "#DC2626",
  redLight: "#FEE2E2",
  redBg: "#FEF2F2",
  purple: "#7C3AED",
  purpleLight: "#F3E8FF",
  teal: "#0D9488",
  tealLight: "#CCFBF1",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.08)",
  radius: 12,
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

// ── Utility ──
function RiskBadge({ level, score }) {
  const colors = {
    high: { bg: c.redLight, text: c.red, border: "#FECACA" },
    moderate: { bg: c.orangeLight, text: c.orange, border: "#FDE68A" },
    low: { bg: c.greenLight, text: c.green, border: "#A7F3D0" },
  };
  const s = colors[level] || colors.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.text }} />
      {score}/100
    </span>
  );
}

function TrendArrow({ trend }) {
  const config = {
    worsening: { symbol: "↗", color: c.red, label: "Worsening" },
    stable: { symbol: "→", color: c.green, label: "Stable" },
    improving: { symbol: "↘", color: c.green, label: "Improving" },
  };
  const t2 = config[trend] || config.stable;
  return <span style={{ fontSize: 11, fontWeight: 600, color: t2.color }}>{t2.symbol} {t2.label}</span>;
}

// ── Header ──
function Header({ onBack, patientSelected }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${c.navy} 0%, ${c.navyLight} 100%)`, color: "white", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {patientSelected && onBack && (
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13, fontFamily: c.font, fontWeight: 600 }}>← Back</button>
        )}
        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: c.font, letterSpacing: "-0.03em" }}>
          Vardana<span style={{ color: "#38BDF8" }}>.</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.5, borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 12 }}>
          Care Coordinator
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
        <span style={{ opacity: 0.6 }}>Nurse Rachel Kim</span>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>RK</div>
      </div>
    </div>
  );
}

// ── Roster View ──
function RosterView({ onSelect }) {
  const alertCount = ROSTER.filter(p => p.alert).length;
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: c.text, margin: 0, fontFamily: c.font }}>Patient Roster</h1>
          <p style={{ fontSize: 13, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>
            {ROSTER.length} patients · {alertCount} pending alert{alertCount !== 1 && "s"} · 2 outreach scheduled today
          </p>
        </div>
        <div style={{ fontSize: 12, color: c.textLight, fontFamily: c.font }}>March 1, 2026 · 8:23 AM</div>
      </div>

      {alertCount > 0 && (
        <div style={{ background: c.redBg, border: `1px solid ${c.redLight}`, borderRadius: c.radius, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.redLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔴</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.red, fontFamily: c.font }}>{alertCount} patient{alertCount !== 1 && "s"} need{alertCount === 1 && "s"} attention</div>
            <div style={{ fontSize: 13, color: c.textMed, fontFamily: c.font }}>AI has flagged clinical concerns requiring coordinator review</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ROSTER.sort((a, b) => (b.alert ? 1 : 0) - (a.alert ? 1 : 0) || b.risk - a.risk).map(p => (
          <button key={p.id} onClick={() => onSelect(p)} style={{ width: "100%", background: c.card, border: `1px solid ${p.alert ? "#FECACA" : c.border}`, borderRadius: c.radius, padding: "16px 20px", cursor: "pointer", fontFamily: c.font, textAlign: "left", boxShadow: c.shadow, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 16, borderLeft: p.alert ? `4px solid ${c.red}` : `4px solid transparent` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{p.name}</span>
                <span style={{ fontSize: 12, color: c.textLight }}>{p.age}F</span>
              </div>
              {p.alert && <div style={{ fontSize: 13, color: c.red, fontWeight: 600, marginTop: 4 }}>⚡ {p.alertType} — {p.alertTime}</div>}
              {p.scheduledOutreach && !p.alert && (
                <div style={{ fontSize: 12, color: c.teal, fontWeight: 600, marginTop: 4 }}>
                  📅 {p.scheduledOutreach}
                </div>
              )}
            </div>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Day {p.day}</div>
              <div style={{ fontSize: 11, color: c.textLight }}>{p.phase}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <RiskBadge level={p.riskLevel} score={p.risk} />
              <div style={{ marginTop: 4 }}><TrendArrow trend={p.trend} /></div>
            </div>
            <span style={{ fontSize: 16, color: c.textLight }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Outreach Modal ──
function OutreachModal({ patient, onClose, onInitiate }) {
  const [channel, setChannel] = useState("voice");
  const [timing, setTiming] = useState("now");
  const [schedDate, setSchedDate] = useState("2026-03-01");
  const [schedTime, setSchedTime] = useState("10:00");

  const channels = [
    {
      id: "voice",
      icon: "📞",
      label: "Voice Call",
      badge: "Demo",
      badgeColor: c.accent,
      description: "AI concierge calls the patient directly. Structured conversation captures symptoms, vitals context, and generates a clinical summary. Typical call: 3–5 minutes.",
      detail: "Best for: complex assessments, high-risk patients, first post-discharge check-in",
    },
    {
      id: "sms",
      icon: "💬",
      label: "SMS",
      badge: null,
      description: "Patient receives a text with a check-in link. Can complete a structured assessment asynchronously. Message includes an app download link for richer ongoing monitoring.",
      detail: "Best for: routine check-ins, lower-acuity patients, patients who prefer async",
    },
    {
      id: "app",
      icon: "📱",
      label: "App Notification",
      badge: null,
      description: "Push notification to the Vardana patient app. Patient must have the app installed. Opens directly into a guided check-in with full vitals context from Apple/Google Health.",
      detail: "Best for: engaged patients already using the app",
    },
  ];

  const sel = channels.find(ch => ch.id === channel);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,26,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: c.card, borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", fontFamily: c.font }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${c.navy} 0%, ${c.navyLight} 100%)`, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Initiate Outreach</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{patient.name} · Day {patient.day} · Risk {patient.risk}/100</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* AI Context */}
          <div style={{ background: c.redBg, border: `1px solid ${c.redLight}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
            <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>
              AI recommends contacting this patient within <strong style={{ color: c.red }}>4 hours</strong>. Patient was informed by AI concierge at 7:45 AM that a coordinator would follow up today.
            </div>
          </div>

          {/* Channel selection */}
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Select Channel</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setChannel(ch.id)} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: `2px solid ${channel === ch.id ? c.accent : c.border}`, background: channel === ch.id ? c.accentLight : c.card, cursor: "pointer", fontFamily: c.font, transition: "all 0.15s", position: "relative" }}>
                {ch.badge && (
                  <span style={{ position: "absolute", top: -8, right: -4, fontSize: 9, fontWeight: 800, background: ch.badgeColor, color: "white", padding: "2px 6px", borderRadius: 4 }}>{ch.badge}</span>
                )}
                <div style={{ fontSize: 20, marginBottom: 4 }}>{ch.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: channel === ch.id ? c.accent : c.text }}>{ch.label}</div>
              </button>
            ))}
          </div>

          {/* Channel description */}
          <div style={{ background: c.borderLight, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>{sel.description}</div>
            <div style={{ fontSize: 12, color: c.textLight, marginTop: 6 }}>{sel.detail}</div>
          </div>

          {/* Timing */}
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Timing</div>
          <div style={{ display: "flex", gap: 8, marginBottom: timing === "scheduled" ? 12 : 20 }}>
            {["now", "scheduled"].map(t => (
              <button key={t} onClick={() => setTiming(t)} style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${timing === t ? c.accent : c.border}`, background: timing === t ? c.accentLight : c.card, cursor: "pointer", fontFamily: c.font, fontSize: 13, fontWeight: 700, color: timing === t ? c.accent : c.textMed, transition: "all 0.15s" }}>
                {t === "now" ? "⚡ Immediately" : "📅 Schedule"}
              </button>
            ))}
          </div>

          {timing === "scheduled" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 4 }}>DATE</div>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: c.font, fontSize: 13, color: c.text, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 4 }}>TIME</div>
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: c.font, fontSize: 13, color: c.text, outline: "none" }} />
              </div>
            </div>
          )}

          {/* CTA */}
          <button onClick={() => onInitiate(channel, timing, schedDate, schedTime)} style={{ width: "100%", padding: "14px", borderRadius: 12, background: channel === "voice" ? `linear-gradient(135deg, ${c.navy} 0%, #1B3A6B 100%)` : `linear-gradient(135deg, ${c.accent} 0%, #1D4ED8 100%)`, color: "white", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {channel === "voice" ? "📞" : channel === "sms" ? "💬" : "📱"}
            {timing === "now" ? `Initiate ${sel.label} Now` : `Schedule ${sel.label} for ${schedTime}`}
          </button>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", marginTop: 8, border: "none", background: "none", color: c.textLight, fontSize: 13, cursor: "pointer", fontFamily: c.font }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Voice Call Demo ──
function VoiceCallDemo({ patient, onComplete }) {
  // ── state ──
  const [uiState, setUiState] = useState("setup"); // setup|loading|dialing|connected|active|alert|done
  const [apiKey, setApiKey]   = useState("");
  const [apiError, setApiError] = useState("");
  const [loadProgress, setLoadProgress] = useState(0);
  const [transcript, setTranscript]   = useState([]);
  const [fhirLog, setFhirLog]         = useState([]);
  const [riskScore, setRiskScore]     = useState(72);
  const [alertGenerated, setAlertGenerated] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [waveFrame, setWaveFrame] = useState(0);
  const [muted, setMuted]       = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  const transcriptRef = useRef(null);
  const audioRef      = useRef(null);   // currently playing Audio element
  const mutedRef      = useRef(false);
  const cancelRef     = useRef(false);
  const blobUrls      = useRef([]);
  const timersRef     = useRef([]);

  const addTimer = (fn, ms) => { const id = setTimeout(fn, ms); timersRef.current.push(id); return id; };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  // cleanup on unmount / navigation away
  useEffect(() => () => {
    cancelRef.current = true;
    clearTimers();
    audioRef.current?.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    blobUrls.current.forEach(u => URL.revokeObjectURL(u));
  }, []);

  // elapsed + wave animation while call is live
  useEffect(() => {
    if (!["connected", "active", "alert"].includes(uiState)) return;
    const t1 = setInterval(() => setElapsed(e => e + 1), 1000);
    const t2 = setInterval(() => setWaveFrame(f => (f + 1) % 12), 130);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [uiState]);

  // auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  const [showKey, setShowKey]       = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | "testing" | "ok" | "error"
  const [testMsg, setTestMsg]       = useState("");

  // Rachel = calm/clinical AI voice; Charlotte = warm patient voice
  const EL_VOICES = { AI: "21m00Tcm4TlvDq8ikWAM", Sarah: "XB0fDUnXU5powFXDhCwa" };

  // ── Validate key before burning quota ──
  const testKey = async (key) => {
    setTestStatus("testing");
    setTestMsg("");
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        const remaining = data?.subscription?.character_count_limit - data?.subscription?.character_count;
        setTestStatus("ok");
        setTestMsg(`✓ Key valid · ${remaining?.toLocaleString() ?? "?"} chars remaining`);
        return true;
      }
      if (res.status === 401) { setTestStatus("error"); setTestMsg("401 Unauthorized — key is invalid or expired."); return false; }
      if (res.status === 403) { setTestStatus("error"); setTestMsg("403 Forbidden — key may lack TTS permissions."); return false; }
      setTestStatus("error"); setTestMsg(`HTTP ${res.status} — unexpected response from ElevenLabs.`); return false;
    } catch (e) {
      // Network/CORS failure
      setTestStatus("error");
      setTestMsg(`Network error: ${e.message}. This environment may block direct API calls — see workaround below.`);
      return false;
    }
  };

  const fetchAudio = async (text, speaker, key) => {
    let res;
    try {
      res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICES[speaker]}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",   // faster + cheaper than multilingual_v2
          voice_settings: {
            stability:        speaker === "AI" ? 0.70 : 0.55,
            similarity_boost: 0.80,
            style:            speaker === "AI" ? 0.10 : 0.35,
            use_speaker_boost: true,
          },
        }),
      });
    } catch (e) {
      throw new Error(`Network error — ${e.message}`);
    }
    if (!res.ok) {
      let detail = "";
      try { const j = await res.json(); detail = j?.detail?.message || j?.detail || ""; } catch {}
      throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
    }
    const url = URL.createObjectURL(await res.blob());
    blobUrls.current.push(url);
    return url;
  };

  // ── shared effects that fire at specific line indices ──
  const triggerEffects = (idx) => {
    if (idx === 4) {
      [0, 520, 1060, 1620, 2200].forEach((d, i) =>
        addTimer(() => { if (!cancelRef.current) setFhirLog(p => [...p, FHIR_QUERIES[i]]); }, d)
      );
    }
    if (idx === 5) setRiskScore(78);
    if (idx === 8) setRiskScore(82);
    if (idx === 9) {
      setRiskScore(84);
      addTimer(() => {
        if (cancelRef.current) return;
        setFhirLog(p => [...p, FHIR_QUERIES[5]]);
        addTimer(() => {
          if (cancelRef.current) return;
          setFhirLog(p => [...p, FHIR_QUERIES[6]]);
          setAlertGenerated(true);
          setUiState("alert");
        }, 900);
      }, 1200);
    }
  };

  // ── ElevenLabs playback sequence ──
  const playElevenLabs = async (urls) => {
    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) return;
      const line = VOICE_TRANSCRIPT[i];
      setTranscript(p => [...p, line]);
      setActiveSpeaker(line.speaker);
      triggerEffects(i);

      const audio = new Audio(urls[i]);
      audio.volume = mutedRef.current ? 0 : 1;
      audioRef.current = audio;

      await new Promise(resolve => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });

      setActiveSpeaker(null);
      if (cancelRef.current) return;
      const gap = VOICE_TRANSCRIPT[i + 1]?.speaker !== line.speaker ? 680 : 260;
      await new Promise(r => setTimeout(r, gap));
    }
    if (!cancelRef.current) setUiState("done");
  };

  // ── Start demo with ElevenLabs ──
  const startElevenLabs = async () => {
    const key = apiKey.trim();
    if (!key) { setApiError("Paste your ElevenLabs API key above."); return; }
    setApiError("");
    // Validate key first
    const valid = await testKey(key);
    if (!valid) return;
    setUiState("loading");
    try {
      const urls = [];
      for (let i = 0; i < VOICE_TRANSCRIPT.length; i++) {
        if (cancelRef.current) return;
        urls.push(await fetchAudio(VOICE_TRANSCRIPT[i].text, VOICE_TRANSCRIPT[i].speaker, key));
        setLoadProgress(Math.round(((i + 1) / VOICE_TRANSCRIPT.length) * 100));
      }
      launchCall(() => playElevenLabs(urls));
    } catch (err) {
      setApiError(err.message || "Audio fetch failed.");
      setUiState("setup");
    }
  };

  // ── Browser TTS fallback ──
  const startBrowserTTS = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const voices = synth.getVoices();
    const pick = (speaker) => {
      if (speaker === "AI")
        return voices.find(v => /samantha|google uk english female|google us english/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en")) || voices[0];
      const ai = pick("AI");
      return voices.find(v => /victoria|karen|moira|tessa/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en") && v !== ai) || ai;
    };
    let idx = 0;
    const playNext = () => {
      if (cancelRef.current || idx >= VOICE_TRANSCRIPT.length) {
        if (!cancelRef.current) setUiState("done");
        return;
      }
      const line = VOICE_TRANSCRIPT[idx];
      setTranscript(p => [...p, line]);
      setActiveSpeaker(line.speaker);
      triggerEffects(idx);
      const utt = new SpeechSynthesisUtterance(line.text);
      const v = pick(line.speaker); if (v) utt.voice = v;
      utt.rate   = line.speaker === "AI" ? 0.87 : 0.95;
      utt.pitch  = line.speaker === "AI" ? 0.82 : 1.14;
      utt.volume = mutedRef.current ? 0 : 1;
      utt.onend = utt.onerror = () => {
        setActiveSpeaker(null);
        idx++;
        const gap = VOICE_TRANSCRIPT[idx]?.speaker !== line.speaker ? 700 : 280;
        setTimeout(playNext, gap);
      };
      synth.cancel();
      synth.speak(utt);
    };
    // Wait for voices to load on first call
    if (voices.length === 0) { synth.onvoiceschanged = () => launchCall(playNext); }
    else { launchCall(playNext); }
  };

  const launchCall = (playFn) => {
    setUiState("dialing");
    addTimer(() => { if (!cancelRef.current) setUiState("connected"); }, 2000);
    addTimer(() => { if (!cancelRef.current) { setUiState("active"); playFn(); } }, 3500);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (audioRef.current) audioRef.current.volume = next ? 0 : 1;
  };

  const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const waveHeights = [0.3, 0.6, 1.0, 0.7, 0.4, 0.8, 1.0, 0.5, 0.3, 0.7, 0.9, 0.4];
  const isActive    = ["active", "alert"].includes(uiState);
  const riskColor   = riskScore >= 80 ? c.red : riskScore >= 60 ? c.orange : c.green;
  const waveOn      = isActive && activeSpeaker !== null && !muted;

  // ─────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────
  if (uiState === "setup") return (
    <div style={{ position: "fixed", inset: 0, background: c.navy, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: c.font, padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>Vardana<span style={{ color: "#38BDF8" }}>.</span></div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 5 }}>Voice Demo · AI Concierge Call · Sarah Chen</div>
        </div>

        {/* Scenario card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 28 }}>👩</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Sarah Chen, 67F — CHF · Day 15/90</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>2.3 lb weight gain. AI calls to assess. Decompensation detected → FHIR alert fires mid-call.</div>
            </div>
          </div>
        </div>

        {/* ElevenLabs panel */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🎙</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>ElevenLabs TTS</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Free tier · 10K chars/mo · ~800 chars per demo run</div>
            </div>
            <a href="https://elevenlabs.io/app/sign-in" target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#38BDF8", textDecoration: "none", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, padding: "4px 10px" }}>
              Get API key ↗
            </a>
          </div>

          {/* Key input row */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            API Key — found at elevenlabs.io → Profile → API Keys
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type={showKey ? "text" : "password"}
                placeholder="Paste your ElevenLabs API key here"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setApiError(""); setTestStatus(null); }}
                onKeyDown={e => e.key === "Enter" && apiKey.trim() && startElevenLabs()}
                autoComplete="off"
                spellCheck={false}
                style={{ width: "100%", padding: "10px 38px 10px 12px", borderRadius: 9, border: `1.5px solid ${testStatus === "ok" ? "#22C55E" : testStatus === "error" ? "#EF4444" : "rgba(255,255,255,0.12)"}`, background: "rgba(255,255,255,0.07)", color: "white", fontFamily: "monospace", fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
              <button onClick={() => setShowKey(s => !s)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 14, padding: 2 }}>
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
            <button onClick={() => apiKey.trim() && testKey(apiKey.trim())}
              disabled={!apiKey.trim() || testStatus === "testing"}
              style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: testStatus === "ok" ? "#22C55E" : "#94A3B8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: c.font, whiteSpace: "nowrap", opacity: !apiKey.trim() ? 0.4 : 1 }}>
              {testStatus === "testing" ? "Testing..." : testStatus === "ok" ? "✓ Valid" : "Test Key"}
            </button>
          </div>

          {/* Test result / error display */}
          {(testMsg || apiError) && (
            <div style={{ padding: "9px 12px", borderRadius: 8, background: testStatus === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${testStatus === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, fontSize: 12, color: testStatus === "ok" ? "#86EFAC" : "#FCA5A5", lineHeight: 1.5, marginBottom: 12, wordBreak: "break-word" }}>
              {testMsg || apiError}
            </div>
          )}

          {/* CORS workaround note — shown only on network error */}
          {testStatus === "error" && testMsg.includes("Network error") && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 11, color: "#FCD34D", lineHeight: 1.6, marginBottom: 12 }}>
              <strong>CORS restriction detected.</strong> This sandbox blocks direct API calls.<br />
              Workaround: Open this component in a local React app or CodeSandbox where external fetch is unrestricted. Or use the browser TTS fallback below.
            </div>
          )}

          <button onClick={startElevenLabs} disabled={!apiKey.trim() || testStatus === "testing"}
            style={{ width: "100%", padding: "12px", borderRadius: 10, background: testStatus === "ok" ? "linear-gradient(135deg, #16A34A, #15803D)" : "linear-gradient(135deg, #F59E0B, #D97706)", color: "white", border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: c.font, opacity: !apiKey.trim() ? 0.5 : 1, transition: "all 0.2s" }}>
            {testStatus === "ok" ? "✓ Generate Audio & Start Demo" : "🎙 Start Demo with ElevenLabs"}
          </button>
        </div>

        {/* Browser TTS fallback */}
        <button onClick={startBrowserTTS}
          style={{ width: "100%", padding: "11px", borderRadius: 10, background: "transparent", color: "#64748B", border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: c.font }}>
          Use browser voices (robotic but no API key needed)
        </button>

        <button onClick={onComplete}
          style={{ width: "100%", marginTop: 8, padding: "9px", border: "none", background: "none", color: "#334155", fontSize: 12, cursor: "pointer", fontFamily: c.font }}>
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────
  if (uiState === "loading") return (
    <div style={{ position: "fixed", inset: 0, background: c.navy, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: c.font }}>
      <div style={{ width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 20 }}>🎙</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 8 }}>Generating audio</div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>
          Rendering {VOICE_TRANSCRIPT.length} lines via ElevenLabs...
        </div>
        {/* Progress bar */}
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #F59E0B, #38BDF8)", width: `${loadProgress}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>{loadProgress}% · Line {Math.ceil(loadProgress / (100 / VOICE_TRANSCRIPT.length))} of {VOICE_TRANSCRIPT.length}</div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // CALL SCREEN (dialing / connected / active / alert / done)
  // ─────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: c.navy, zIndex: 300, display: "flex", flexDirection: "column", fontFamily: c.font }}>

      {/* Top bar */}
      <div style={{ padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: uiState === "done" ? "#475569" : "#22C55E", boxShadow: isActive ? "0 0 0 4px rgba(34,197,94,0.2)" : "none", transition: "all 0.3s" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
            {uiState === "dialing"   ? "Connecting to Sarah Chen..." :
             uiState === "connected" ? "Connected · AI Concierge Active" :
             uiState === "done"      ? "Call Completed" :
             activeSpeaker === "AI"    ? "🤖 Vardana AI speaking..." :
             activeSpeaker === "Sarah" ? "👩 Sarah responding..." : "Live · AI Concierge"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isActive && (
            <button onClick={toggleMute} style={{ background: muted ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${muted ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.12)"}`, color: muted ? "#FCA5A5" : "#CBD5E1", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>
              {muted ? "🔇 Muted" : "🔊 Audio On"}
            </button>
          )}
          {isActive && <span style={{ fontSize: 13, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{formatTime(elapsed)}</span>}
          {uiState === "done" && (
            <button onClick={onComplete} style={{ background: c.accent, border: "none", color: "white", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: c.font, fontSize: 13, fontWeight: 700 }}>Return to Dashboard</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left: speakers + gauge ── */}
        <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 18px", borderRight: "1px solid rgba(255,255,255,0.08)", gap: 18 }}>

          {/* AI avatar */}
          <div style={{ position: "relative" }}>
            {activeSpeaker === "AI" && <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.5)", animation: "ping 1s ease-out infinite" }} />}
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, #1B3A6B, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: `3px solid ${activeSpeaker === "AI" ? "rgba(56,189,248,0.7)" : "rgba(255,255,255,0.08)"}`, boxShadow: activeSpeaker === "AI" ? "0 0 24px rgba(56,189,248,0.35)" : "none", transition: "all 0.35s" }}>🤖</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: activeSpeaker === "AI" ? "#38BDF8" : "#475569", letterSpacing: "0.04em", transition: "color 0.3s" }}>VARDANA AI</div>

          {/* Shared waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 32, opacity: waveOn ? 1 : 0.15, transition: "opacity 0.4s" }}>
            {Array.from({ length: 22 }, (_, i) => {
              const h = waveOn ? waveHeights[(i + waveFrame) % 12] : 0.12;
              return <div key={i} style={{ width: 2.5, height: `${Math.max(3, h * 28)}px`, borderRadius: 2, background: activeSpeaker === "Sarah" ? "#A78BFA" : "#38BDF8", transition: "height 0.11s ease, background 0.3s" }} />;
            })}
          </div>

          {/* Sarah avatar */}
          <div style={{ position: "relative" }}>
            {activeSpeaker === "Sarah" && <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.5)", animation: "ping 1s ease-out infinite" }} />}
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, #3730A3, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: `3px solid ${activeSpeaker === "Sarah" ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.08)"}`, boxShadow: activeSpeaker === "Sarah" ? "0 0 24px rgba(124,58,237,0.4)" : "none", transition: "all 0.35s" }}>👩</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: activeSpeaker === "Sarah" ? "#A78BFA" : "#475569", letterSpacing: "0.04em", transition: "color 0.3s" }}>SARAH CHEN · 67F</div>

          {/* Risk gauge */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px", width: "100%", textAlign: "center", marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Decompensation Risk</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: riskColor, fontVariantNumeric: "tabular-nums", lineHeight: 1, transition: "all 0.9s ease" }}>{riskScore}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>/ 100</div>
            {riskScore > 72 && <div style={{ fontSize: 10, fontWeight: 700, color: riskColor, marginTop: 6 }}>↑ Updated live during call</div>}
          </div>

          {/* Alert */}
          {alertGenerated && (
            <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.35)", borderRadius: 10, padding: "10px 12px", width: "100%", animation: "fadeIn 0.4s ease" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#F87171", marginBottom: 2 }}>🚨 P1 ALERT GENERATED</div>
              <div style={{ fontSize: 10, color: "#FCA5A5", lineHeight: 1.4 }}>FHIR Flag posted · Coordinator notified</div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
            {[
              { icon: muted ? "🔇" : "🔊", active: muted, fn: toggleMute },
              { icon: "⏸", active: false, fn: null },
              { icon: "📋", active: false, fn: null },
              { icon: "🔴", active: isActive, fn: null },
            ].map((btn, i) => (
              <div key={i} onClick={btn.fn || undefined} style={{ width: 38, height: 38, borderRadius: "50%", background: btn.active ? (i === 0 ? "rgba(220,38,38,0.25)" : "rgba(220,38,38,0.15)") : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: btn.fn ? "pointer" : "default", border: btn.active && i === 0 ? "1px solid rgba(220,38,38,0.4)" : "1px solid transparent" }}>{btn.icon}</div>
            ))}
          </div>
        </div>

        {/* ── Center: transcript ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "13px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>Live Transcript</div>
            {activeSpeaker && (
              <div style={{ fontSize: 11, fontWeight: 700, color: activeSpeaker === "AI" ? "#38BDF8" : "#A78BFA", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "pulse 1s infinite" }} />
                {activeSpeaker === "AI" ? "AI Speaking" : "Patient Speaking"}
              </div>
            )}
          </div>
          <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {uiState === "dialing" && (
              <div style={{ textAlign: "center", padding: "52px 0", color: "#475569" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📞</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8" }}>Initiating AI concierge call...</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Ringing Sarah Chen · (206) 555-0142</div>
              </div>
            )}
            {uiState === "connected" && transcript.length === 0 && (
              <div style={{ textAlign: "center", padding: "52px 0", color: "#475569" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>🟢</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#22C55E" }}>Connected</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>AI concierge beginning structured check-in...</div>
              </div>
            )}
            {transcript.map((line, i) => {
              const speaking = i === transcript.length - 1 && activeSpeaker === line.speaker;
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "slideUp 0.25s ease" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: speaking ? (line.speaker === "AI" ? "rgba(56,189,248,0.2)" : "rgba(167,139,250,0.2)") : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginTop: 3, border: speaking ? `1px solid ${line.speaker === "AI" ? "rgba(56,189,248,0.5)" : "rgba(167,139,250,0.5)"}` : "1px solid transparent", transition: "all 0.3s" }}>
                    {line.speaker === "AI" ? "🤖" : "👩"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: line.speaker === "AI" ? (speaking ? "#38BDF8" : "#334155") : (speaking ? "#A78BFA" : "#334155"), marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em", transition: "color 0.3s" }}>
                      {line.speaker === "AI" ? "Vardana AI" : "Sarah Chen"}
                    </div>
                    <div style={{ fontSize: 13, color: speaking ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)", lineHeight: 1.6, background: speaking ? (line.speaker === "AI" ? "rgba(56,189,248,0.08)" : "rgba(167,139,250,0.08)") : "rgba(255,255,255,0.03)", padding: "9px 13px", borderRadius: 10, border: `1px solid ${speaking ? (line.speaker === "AI" ? "rgba(56,189,248,0.25)" : "rgba(167,139,250,0.25)") : "rgba(255,255,255,0.05)"}`, transition: "all 0.35s" }}>
                      {line.text}
                    </div>
                  </div>
                </div>
              );
            })}
            {uiState === "done" && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>✓ Call completed · {formatTime(elapsed)}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 5 }}>Transcript saved · Clinical summary generated · Alert dispatched</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: FHIR + assessment ── */}
        <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>FHIR Activity</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {fhirLog.length === 0 ? (
              <div style={{ fontSize: 12, color: "#334155", textAlign: "center", marginTop: 28, lineHeight: 1.6 }}>Waiting for AI to<br />begin querying...</div>
            ) : fhirLog.map((q, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "7px 9px", border: `1px solid ${q.color === c.red ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)"}`, animation: "slideUp 0.25s ease" }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, background: q.color === c.red ? "rgba(220,38,38,0.2)" : "rgba(37,99,235,0.18)", color: q.color, padding: "1px 4px", borderRadius: 3 }}>{q.method}</span>
                  <span style={{ fontSize: 8, color: "#475569", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{q.path.length > 34 ? q.path.slice(0, 34) + "…" : q.path}</span>
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>→ {q.result}</div>
              </div>
            ))}
          </div>

          {transcript.length >= 6 && (
            <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>AI Assessment</div>
              {[
                { label: "Weight gain", value: "+2.3 lbs/48hr", flag: true },
                { label: "Orthopnea",   value: transcript.length >= 9 ? "Confirmed" : "Pending", flag: transcript.length >= 9 },
                { label: "Ankle edema", value: "Confirmed", flag: true },
                { label: "Adherence",   value: "Meds taken", flag: false },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: "#475569" }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.flag ? "#F87171" : "#34D399" }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ping    { 0%   { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>
    </div>
  );
}

// ── SMS Path Demo ──
function SMSPathDemo({ patient, onComplete }) {
  const [smsStep, setSmsStep] = useState(0);
  // 0: SMS sent view, 1: patient phone, 2: app download, 3: health connect, 4: synced

  const steps = [
    { id: 0, label: "SMS Sent" },
    { id: 1, label: "Patient Receives" },
    { id: 2, label: "App Download" },
    { id: 3, label: "Health Connect" },
    { id: 4, label: "First Sync" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: c.bg, zIndex: 300, display: "flex", flexDirection: "column", fontFamily: c.font }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${c.navy} 0%, ${c.navyLight} 100%)`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>SMS Outreach Path</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 12 }}>Sarah Chen → App Onboarding</span>
        </div>
        <button onClick={onComplete} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: c.font, fontSize: 13, fontWeight: 600 }}>✕ Close</button>
      </div>

      {/* Step progress */}
      <div style={{ background: "white", borderBottom: `1px solid ${c.border}`, padding: "12px 24px", display: "flex", gap: 0 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setSmsStep(step.id)}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: smsStep >= step.id ? c.accent : c.border, color: smsStep >= step.id ? "white" : c.textLight, flexShrink: 0, transition: "all 0.3s" }}>
                {smsStep > step.id ? "✓" : step.id + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: smsStep >= step.id ? c.accent : c.textLight, whiteSpace: "nowrap" }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: smsStep > step.id ? c.accent : c.border, margin: "0 8px", transition: "background 0.3s" }} />}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 32, gap: 40 }}>

        {/* Left: coordinator action */}
        {smsStep === 0 && (
          <div style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${c.teal}, #0D7A6E)`, padding: "18px 22px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>💬 SMS Outreach Initiated</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Sent via Twilio · March 1, 2026 · 8:24 AM</div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", marginBottom: 10 }}>Message Sent To</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👩</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Sarah Chen</div>
                    <div style={{ fontSize: 13, color: c.textLight }}>(206) 555-0142</div>
                  </div>
                </div>
                <div style={{ background: c.borderLight, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, marginBottom: 8 }}>MESSAGE CONTENT</div>
                  <div style={{ fontSize: 14, color: c.text, lineHeight: 1.6 }}>
                    Hi Sarah — this is your Vardana care team. We'd like to check in with you today. Tap here to start: <span style={{ color: c.accent, fontWeight: 700 }}>vardana.ai/checkin/sc</span>
                    <br /><br />
                    For the best experience with your health data, <span style={{ color: c.accent, fontWeight: 700 }}>download the Vardana app ↗</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ label: "Delivered", color: c.green }, { label: "Read in 3 min", color: c.accent }, { label: "Link tapped", color: c.teal }].map((s, i) => (
                    <div key={i} style={{ flex: 1, background: s.color + "10", border: `1px solid ${s.color}25`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setSmsStep(1)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, marginTop: 16 }}>Next: Patient View →</button>
          </div>
        )}

        {smsStep === 1 && (
          <div style={{ display: "flex", gap: 40, alignItems: "flex-start", maxWidth: 700, width: "100%" }}>
            {/* Phone mockup */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 280, background: "#1A1A1A", borderRadius: 48, padding: "16px 12px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", border: "2px solid #333" }}>
                {/* Notch */}
                <div style={{ width: 100, height: 24, background: "#1A1A1A", borderRadius: 12, margin: "0 auto 12px", border: "2px solid #2A2A2A" }} />
                {/* Screen */}
                <div style={{ background: "#F2F2F7", borderRadius: 32, overflow: "hidden", minHeight: 480 }}>
                  {/* Status bar */}
                  <div style={{ background: "white", padding: "8px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: c.text }}>
                    <span>9:41</span><span>●●● 5G ■■■</span>
                  </div>
                  {/* Messages header */}
                  <div style={{ background: "white", padding: "8px 16px 12px", borderBottom: "1px solid #E5E5EA", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Vardana Health</div>
                    <div style={{ fontSize: 11, color: c.textLight }}>(888) 555-0100</div>
                  </div>
                  {/* Messages */}
                  <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Incoming SMS */}
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ maxWidth: "80%", background: "#E9E9EB", borderRadius: "18px 18px 18px 4px", padding: "10px 13px", fontSize: 13, color: c.text, lineHeight: 1.5 }}>
                        Hi Sarah — this is your Vardana care team. We'd like to check in with you today.<br /><br />
                        <span style={{ color: "#007AFF", fontWeight: 600 }}>vardana.ai/checkin/sc</span><br /><br />
                        For the best experience, <span style={{ color: "#007AFF", fontWeight: 600 }}>download the app ↗</span>
                        <div style={{ fontSize: 10, color: "#8E8E93", marginTop: 4 }}>8:24 AM</div>
                      </div>
                    </div>
                    {/* Patient reply */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "80%", background: "#007AFF", borderRadius: "18px 18px 4px 18px", padding: "10px 13px", fontSize: 13, color: "white", lineHeight: 1.5 }}>
                        Hi! I'll download the app.
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>8:27 AM</div>
                      </div>
                    </div>
                    {/* App store prompt */}
                    <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", border: "1px solid #E5E5EA", margin: "4px 0" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${c.navy}, ${c.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>V</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Vardana Health</div>
                          <div style={{ fontSize: 10, color: c.textLight }}>Care Management</div>
                        </div>
                        <div style={{ background: "#007AFF", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12 }}>GET</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ width: 120, height: 4, background: "#333", borderRadius: 2, margin: "12px auto 4px" }} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ background: c.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${c.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 8 }}>Why the app link matters</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "🔗", text: "SMS check-in works — but limited to self-reported data only" },
                    { icon: "📱", text: "App unlocks Apple Health / Google Fit integration — passive vitals, steps, sleep" },
                    { icon: "⚖️", text: "Smart scale Bluetooth sync: weight logged automatically without daily action" },
                    { icon: "📊", text: "Richer data = better decompensation detection = fewer missed events" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: c.textMed, lineHeight: 1.4 }}>
                      <span style={{ flexShrink: 0, fontSize: 15 }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSmsStep(2)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Next: App Download →</button>
            </div>
          </div>
        )}

        {smsStep === 2 && (
          <div style={{ maxWidth: 460, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden" }}>
              {/* App store header */}
              <div style={{ background: "linear-gradient(135deg, #0F1A2A, #1B3A6B)", padding: "24px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #2563EB, #38BDF8)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>V</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>Vardana Health</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>CHF Care Concierge · Post-Discharge Recovery</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
                  {"★★★★☆".split("").map((s, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 18 }}>{s}</span>)}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4, lineHeight: 2 }}>4.8 · 2.1K ratings</span>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  {["HIPAA Secure", "Works with Apple Health", "No setup required"].map((tag, i) => (
                    <div key={i} style={{ flex: 1, background: c.borderLight, borderRadius: 8, padding: "8px 6px", textAlign: "center", fontSize: 11, fontWeight: 600, color: c.textMed }}>{tag}</div>
                  ))}
                </div>
                <div style={{ background: "#000", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ fontSize: 24 }}>🍎</span>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Download on the</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>App Store</div>
                  </div>
                </div>
                <div style={{ background: "#1a73e8", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", marginTop: 10 }}>
                  <span style={{ fontSize: 24 }}>▶</span>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Get it on</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Google Play</div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setSmsStep(3)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, marginTop: 16 }}>Next: Health Data Connection →</button>
          </div>
        )}

        {smsStep === 3 && (
          <div style={{ maxWidth: 480, width: "100%" }}>
            {/* Phone mockup with Health Connect screen */}
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: "linear-gradient(135deg, #FF2D55, #FF9500)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>❤️</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Apple Health</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Requesting access to your health data</div>
                </div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>Vardana Health would like to read:</div>
                <div style={{ fontSize: 13, color: c.textMed, marginBottom: 16 }}>Your care team uses this data for daily health monitoring.</div>
                {[
                  { icon: "⚖️", name: "Body Weight", source: "Withings scale · daily", active: true },
                  { icon: "🫀", name: "Heart Rate", source: "Apple Watch · continuous", active: true },
                  { icon: "🩺", name: "Blood Pressure", source: "Omron BP monitor", active: true },
                  { icon: "👣", name: "Steps", source: "iPhone · automatic", active: true },
                  { icon: "😴", name: "Sleep Analysis", source: "Apple Watch", active: false },
                  { icon: "🩸", name: "Blood Oxygen (SpO2)", source: "Apple Watch", active: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 5 ? `1px solid ${c.borderLight}` : "none" }}>
                    <span style={{ fontSize: 18, width: 24 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: c.textLight }}>{item.source}</div>
                    </div>
                    <div style={{ width: 44, height: 26, borderRadius: 13, background: item.active ? "#34C759" : "#E5E5EA", display: "flex", alignItems: "center", padding: "0 3px", justifyContent: item.active ? "flex-end" : "flex-start" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#E5E5EA", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", color: c.text, fontFamily: c.font }}>Deny All</button>
                  <button onClick={() => setSmsStep(4)} style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#007AFF", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "white", fontFamily: c.font }}>Allow Access</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {smsStep === 4 && (
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: `linear-gradient(135deg, ${c.teal}, #0D7A6E)`, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✓</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Health Data Connected</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>First sync complete · March 1, 2026</div>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Synced to Sarah's Profile</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { icon: "⚖️", label: "Weight (14 days)", value: "187.7 lbs", subtext: "+2.3 lbs trend flagged", color: c.red },
                    { icon: "🫀", label: "Resting Heart Rate", value: "82 bpm", subtext: "Avg over 7 days", color: c.orange },
                    { icon: "👣", label: "Daily Steps", value: "1,840", subtext: "↓ 67% vs last week", color: c.orange },
                    { icon: "🩸", label: "SpO2", value: "95%", subtext: "Last reading: 7:12 AM", color: c.orange },
                  ].map((item, i) => (
                    <div key={i} style={{ background: c.borderLight, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.textLight }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: c.textLight, marginTop: 2 }}>{item.subtext}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: c.accentLight, border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.accent, marginBottom: 6 }}>Impact on coordinator view</div>
                  <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>
                    Sarah's passive wearable data now supplements FHIR vitals. The AI concierge automatically incorporates step decline, SpO2 trend, and resting HR elevation into the decompensation risk score — no manual data entry required.
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onComplete} style={{ width: "100%", padding: "12px", borderRadius: 10, background: `linear-gradient(135deg, ${c.navy}, #1B3A6B)`, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Return to Coordinator Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Reasoning Card ──
function AIReasoningCard({ onOutreach }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: c.card, borderRadius: c.radius, boxShadow: c.shadowLg, border: `1.5px solid #FECACA`, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #991B1B 0%, #B91C1C 100%)", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>AI Clinical Assessment — Action Required</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Generated 38 min ago · Confidence: High</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>P2 — Urgent</div>
      </div>

      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 10, lineHeight: 1.4 }}>Early decompensation pattern detected — fluid reaccumulation likely</div>
        <div style={{ fontSize: 14, color: c.textMed, lineHeight: 1.6 }}>
          Sarah's weight increased 2.3 lbs over 48 hours (185.4 → 187.7 lbs), coinciding with the end of the Stabilize phase (Day 14). Blood pressure has reversed from a best of 126/78 to 136/86. Patient self-reported increased fatigue yesterday and ankle edema this morning via the AI concierge.
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Corroborating Signals</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "⚖️", label: "Weight", value: "+2.3 lbs / 48hr", status: "critical", detail: "Exceeded 2 lb/48hr threshold" },
            { icon: "🩺", label: "Blood Pressure", value: "136/86 mmHg", status: "warning", detail: "Reversed from 126/78 best" },
            { icon: "💬", label: "Patient Report", value: "Fatigue + edema", status: "critical", detail: "Ankle swelling confirmed today" },
            { icon: "📊", label: "Trajectory", value: "3-day reversal", status: "warning", detail: "Trend inflection after 12-day decline" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: s.status === "critical" ? c.redBg : c.orangeBg, border: `1px solid ${s.status === "critical" ? c.redLight : c.orangeLight}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.textMed }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.status === "critical" ? c.red : c.orange }}>{s.value}</div>
              <div style={{ fontSize: 11, color: c.textMed, marginTop: 2 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, background: c.purpleLight + "40" }}>
        <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.6 }}>
          Patient is at Day 15 — transitioning from <strong style={{ color: c.text }}>Stabilize → Optimize</strong> phase. Weight reversal at phase transition occurs in approximately <strong style={{ color: c.text }}>23% of CHF post-discharge patients</strong> and is associated with suboptimal diuretic dosing in 68% of cases.
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, background: c.accentLight }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Recommended Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { priority: "1", action: "Contact patient within 4 hours", detail: "Assess edema severity, dyspnea at rest, medication adherence. Patient expects outreach — AI concierge informed her this morning.", tag: "Coordinator" },
            { priority: "2", action: "Discuss Furosemide dose increase with cardiology", detail: "40mg → 60mg. CKD Stage 3a (eGFR 48) — monitor creatinine if dose changed.", tag: "Clinical" },
            { priority: "3", action: "Schedule weight check follow-up at 48 hours", detail: "If weight does not decrease by ≥1 lb post-adjustment, escalate to cardiology appointment.", tag: "Follow-up" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: c.card, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: c.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{r.priority}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{r.action}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.purpleLight, color: c.purple }}>{r.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMed, marginTop: 4, lineHeight: 1.5 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", padding: "14px 20px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: expanded ? `1px solid ${c.border}` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.textMed }}>AI Concierge Conversation Log (2 exchanges)</span>
        </div>
        <span style={{ fontSize: 14, color: c.textLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>⌄</span>
      </button>

      {expanded && (
        <div style={{ padding: "12px 20px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { time: "Yesterday 8:00 AM", who: "AI → Patient", text: "Asked about weight increase (+1.1 lbs). Patient reported feeling 'a little more tired than usual.' AI advised low-sodium diet, confirmed Furosemide adherence." },
              { time: "Today 7:45 AM", who: "AI → Patient", text: "Flagged 2.3 lb/48hr weight gain. Patient confirmed ankle swelling. AI informed patient that care coordinator would reach out. Advised continued medication adherence and sodium restriction." },
            ].map((ex, i) => (
              <div key={i} style={{ padding: "10px 14px", background: c.borderLight, borderRadius: 8, borderLeft: `3px solid ${c.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>{ex.who}</span>
                  <span style={{ fontSize: 11, color: c.textLight }}>{ex.time}</span>
                </div>
                <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>{ex.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 10, background: c.borderLight }}>
        <button onClick={onOutreach} style={{ flex: 2, padding: "13px 16px", borderRadius: 10, background: `linear-gradient(135deg, ${c.navy}, #1B3A6B)`, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          📞 Initiate Outreach
        </button>
        <button style={{ flex: 1, padding: "13px 16px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>📋 Open in EHR</button>
        <button style={{ padding: "13px 16px", borderRadius: 10, background: c.card, color: c.textMed, border: `1px solid ${c.border}`, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Dismiss</button>
      </div>
    </div>
  );
}

// ── Supporting Data ──
function SupportingData() {
  const [openSection, setOpenSection] = useState(null);
  const toggle = (id) => setOpenSection(openSection === id ? null : id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>Supporting Data</div>
      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("weight")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>⚖️ Weight Trend — 14 days</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.red }}>187.7 lbs (+2.3)</span>
            <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
          </div>
        </button>
        {openSection === "weight" && (
          <div style={{ padding: "0 12px 14px" }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={WEIGHT_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="wg3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.accent} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={c.accent} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis domain={[184, 189]} tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} width={40} />
                  <ReferenceLine y={186} stroke={c.red} strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: "Alert", position: "right", fontSize: 10, fill: c.red }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: c.font }} />
                  <Area type="monotone" dataKey="weight" stroke={c.accent} strokeWidth={2.5} fill="url(#wg3)" dot={{ r: 3.5, fill: c.accent, stroke: "white", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("bp")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>🩺 Blood Pressure Trend</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.orange }}>136/86 mmHg</span>
            <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
          </div>
        </button>
        {openSection === "bp" && (
          <div style={{ padding: "0 12px 14px" }}>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={BP_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 150]} tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, fontFamily: c.font }} />
                  <Area type="monotone" dataKey="sys" stroke={c.red} strokeWidth={2} fill="none" dot={{ r: 3, fill: c.red, stroke: "white", strokeWidth: 2 }} name="Systolic" />
                  <Area type="monotone" dataKey="dia" stroke={c.accent} strokeWidth={2} fill="none" dot={{ r: 3, fill: c.accent, stroke: "white", strokeWidth: 2 }} name="Diastolic" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("labs")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>🧪 Lab Results (Feb 14)</span>
          <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
        </button>
        {openSection === "labs" && (
          <div style={{ padding: "0 18px 14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: c.font }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {["Test", "Value", "Ref", ""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 4px", textAlign: "left", fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { test: "NT-proBNP", val: "1,850 pg/mL", ref: "<300", status: "High", color: c.red },
                  { test: "Creatinine", val: "1.4 mg/dL", ref: "0.6–1.2", status: "High", color: c.red },
                  { test: "eGFR", val: "48 mL/min", ref: ">60", status: "Low", color: c.orange },
                  { test: "Sodium", val: "138 mEq/L", ref: "136–145", status: "Normal", color: c.green },
                  { test: "Potassium", val: "4.2 mEq/L", ref: "3.5–5.0", status: "Normal", color: c.green },
                  { test: "HbA1c", val: "7.8%", ref: "<7%", status: "High", color: c.red },
                ].map((l, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: c.text }}>{l.test}</td>
                    <td style={{ padding: "8px 4px", color: l.color, fontWeight: 700 }}>{l.val}</td>
                    <td style={{ padding: "8px 4px", color: c.textLight }}>{l.ref}</td>
                    <td style={{ padding: "8px 4px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: l.color === c.green ? c.greenLight : l.color === c.orange ? c.orangeLight : c.redLight, color: l.color }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Medications (5)</div>
          {["Carvedilol 12.5mg BID", "Lisinopril 10mg daily", "Furosemide 40mg daily AM", "Metformin 1000mg BID", "Spironolactone 25mg daily"].map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < 4 ? `1px solid ${c.borderLight}` : "none" }}>{m}</div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12, color: c.red, fontWeight: 600 }}>⚠ Allergy: Sulfa drugs</div>
        </div>
        <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Conditions (5)</div>
          {["Chronic systolic HFrEF, NYHA III", "Hypertensive heart disease", "Type 2 diabetes", "CKD Stage 3a (eGFR 48)", "Morbid obesity (BMI 34.2)"].map((cond, i) => (
            <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < 4 ? `1px solid ${c.borderLight}` : "none" }}>{cond}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Patient Detail View ──
function PatientDetail({ patient, onBack, onOutreach }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: c.text, margin: 0, fontFamily: c.font }}>{patient.name}</h1>
          <p style={{ fontSize: 14, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>
            {patient.age}F · Dr. James Harrington · Day {patient.day} of 90 · {patient.phase}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RiskBadge level={patient.riskLevel} score={patient.risk} />
        </div>
      </div>

      <AIReasoningCard onOutreach={onOutreach} />
      <div style={{ marginTop: 20 }}><SupportingData /></div>
    </div>
  );
}

// ── Main App ──
export default function CareCoordinatorView() {
  const [view, setView] = useState("roster"); // roster | patient | voiceCall | smsPath
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);

  const handleInitiate = (channel, timing) => {
    setShowOutreachModal(false);
    if (channel === "voice" && timing === "now") {
      setView("voiceCall");
    } else if (channel === "sms") {
      setView("smsPath");
    } else {
      // Scheduled: just show confirmation (simplified)
      alert(`Outreach scheduled via ${channel}.`);
    }
  };

  if (view === "voiceCall") {
    return <VoiceCallDemo patient={selectedPatient} onComplete={() => { setView("patient"); }} />;
  }

  if (view === "smsPath") {
    return <SMSPathDemo patient={selectedPatient} onComplete={() => { setView("patient"); }} />;
  }

  return (
    <div style={{ fontFamily: c.font, background: c.bg, minHeight: "100vh" }}>
      
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        button:active { opacity: 0.9; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 3px; }
      `}</style>
      <Header patientSelected={view === "patient"} onBack={() => setView("roster")} />
      {view === "patient" && selectedPatient ? (
        <PatientDetail
          patient={selectedPatient}
          onBack={() => setView("roster")}
          onOutreach={() => setShowOutreachModal(true)}
        />
      ) : (
        <RosterView onSelect={(p) => { setSelectedPatient(p); setView("patient"); }} />
      )}
      {showOutreachModal && selectedPatient && (
        <OutreachModal
          patient={selectedPatient}
          onClose={() => setShowOutreachModal(false)}
          onInitiate={handleInitiate}
        />
      )}
    </div>
  );
}
