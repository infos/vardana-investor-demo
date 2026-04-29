import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  inferRiskLevel,
  LOCAL_PATIENTS,
  LOCAL_PATIENT_NAMES,
  SUPPRESSED_PATIENT_NAMES,
  getSessionsFor,
} from "./CoordinatorDashboard.jsx";
import { useIsMobile } from "./demo/useIsMobile";
import CoordinatorTopNav, { topNavTokens as S } from "./components/CoordinatorTopNav.jsx";

const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

// ── Time + math helpers ──
const MS_DAY = 86400000;

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

function daysBack(n) {
  const out = [];
  const start = todayMidnight();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * MS_DAY);
    out.push(d);
  }
  return out;
}

// Mirror the dashboard's outcome inference so the panel, the per-patient
// detail, and these metrics agree on what counts as an escalation. Returns
// "p1" (immediate / hard gate), "p2" (same-day coordinator review),
// "watch" (24h follow-up), or null (routine / no metadata).
function escalationTier(session) {
  if (!session) return null;
  const lvl = (session.riskLevel || "").toLowerCase();
  if (session.alertGenerated) {
    if (lvl === "critical" || lvl === "immediate") return "p1";
    return "p2";
  }
  if (lvl === "high") return "p2";
  if (lvl === "moderate" || lvl === "mod") return "watch";
  return null;
}

// ── Main ──
export default function PracticeDashboard() {
  const [patients, setPatients] = useState([]);
  const [sessionsByPatient, setSessionsByPatient] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useIsMobile(768);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let medplumPatients = [];
      try {
        const res = await fetch("/api/medplum-fhir?action=roster");
        if (res.ok) {
          const data = await res.json();
          const seen = new Set();
          medplumPatients = (data.patients || [])
            .filter(p => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
            .filter(p => !SUPPRESSED_PATIENT_NAMES.has(p.name))
            .filter(p => !LOCAL_PATIENT_NAMES.has(p.name));
        } else {
          setError(`Roster fetch failed: ${res.status}`);
        }
      } catch (e) {
        setError(e.message);
      }
      if (cancelled) return;

      const localUnified = LOCAL_PATIENTS.map(p => ({
        id: p.id, name: p.name, risk: p.risk, local: true,
      }));
      const medplumUnified = medplumPatients.map(p => ({
        id: p.id, name: p.name || "Unknown", risk: inferRiskLevel(p), local: false,
      }));
      const all = [...localUnified, ...medplumUnified];

      // Fanout sessions per patient (no batch endpoint exists). Local
      // fixtures have no Medplum Encounter resources, so fall back to
      // the canned SESSION_FIXTURES for them — same path the per-patient
      // dashboard's Sessions tab uses when Medplum returns empty.
      const sessionPairs = await Promise.all(all.map(async (p) => {
        if (p.local) return [p.id, getSessionsFor(p.name) || []];
        try {
          const r = await fetch(`/api/medplum-fhir?action=sessions&patientId=${encodeURIComponent(p.id)}`);
          if (r.ok) {
            const data = await r.json();
            const arr = data.sessions || [];
            return [p.id, arr.length ? arr : (getSessionsFor(p.name) || [])];
          }
        } catch { /* fall through */ }
        return [p.id, getSessionsFor(p.name) || []];
      }));

      if (cancelled) return;
      setPatients(all);
      setSessionsByPatient(Object.fromEntries(sessionPairs));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived metrics ──
  const metrics = useMemo(() => {
    const total = patients.length;
    const high = patients.filter(p => p.risk === "high").length;
    const mod = patients.filter(p => p.risk === "mod").length;
    const low = patients.filter(p => p.risk === "low").length;
    const allSessions = Object.values(sessionsByPatient).flat();

    const cutoff7 = todayMidnight().getTime() - 7 * MS_DAY;
    const sessions7 = allSessions.filter(s => {
      const t = new Date(s.date).getTime();
      return Number.isFinite(t) && t >= cutoff7;
    });
    const tiers7 = sessions7.map(escalationTier);
    const p1Count = tiers7.filter(t => t === "p1").length;
    const p2Count = tiers7.filter(t => t === "p2").length;

    return {
      total,
      high, mod, low,
      sessions7Count: sessions7.length,
      p1Count, p2Count,
    };
  }, [patients, sessionsByPatient]);

  // Risk tier distribution — single horizontal stacked bar so HIGH/MEDIUM/LOW
  // shares of the cohort are visible in one row.
  const riskBarData = useMemo(() => ([
    { cohort: "All", high: metrics.high, mod: metrics.mod, low: metrics.low },
  ]), [metrics]);

  // Sessions + escalations over the last 30 days. Bucket every session into
  // its calendar day, then count sessions and escalations per day. Days
  // with no activity show as zeros — we explicitly do not interpolate.
  const timeSeries = useMemo(() => {
    const days = daysBack(30);
    const sessionByDay = {};
    const escByDay = {};
    for (const d of days) { sessionByDay[isoDay(d)] = 0; escByDay[isoDay(d)] = 0; }
    for (const arr of Object.values(sessionsByPatient)) {
      for (const s of arr) {
        const t = new Date(s.date);
        if (isNaN(t.getTime())) continue;
        const key = isoDay(t);
        if (!(key in sessionByDay)) continue;
        sessionByDay[key] += 1;
        const tier = escalationTier(s);
        if (tier === "p1" || tier === "p2") escByDay[key] += 1;
      }
    }
    return days.map(d => ({
      day: isoDay(d).slice(5), // MM-DD
      sessions: sessionByDay[isoDay(d)],
      escalations: escByDay[isoDay(d)],
    }));
  }, [sessionsByPatient]);

  const sparseLabel = useMemo(() => {
    const populated = timeSeries.filter(d => d.sessions > 0 || d.escalations > 0).length;
    if (populated >= 7) return null;
    return `${populated} day${populated === 1 ? "" : "s"} of data`;
  }, [timeSeries]);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, ...css.sans }}>
      <CoordinatorTopNav active="practice" navigate={navigate} />
      <div style={{ padding: isMobile ? "20px 16px" : "32px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 style={{ ...css.serif, fontSize: isMobile ? 24 : 28, color: S.text, margin: 0 }}>Practice</h1>
            <span style={{ fontSize: 14, color: S.textLight }}>
              {loading ? "Loading…" : `${metrics.total} patient${metrics.total === 1 ? "" : "s"} enrolled`}
            </span>
          </div>
          <div style={{ fontSize: 14, color: S.textMed, marginBottom: 20 }}>
            Cohort metrics computed from real FHIR data and Vardana session logs.
          </div>

          {error && (
            <div style={{ background: S.amberBg, color: S.amberText, border: `1px solid #FCD34D`, borderRadius: 6, padding: "10px 14px", fontSize: 14, marginBottom: 16 }}>
              Roster source warning: {error}. Showing local fixtures only.
            </div>
          )}

          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: S.textLight }}>Loading metrics…</div>
          ) : (
            <>
              <Tiles metrics={metrics} isMobile={isMobile} />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
                <ChartCard title="Risk tier distribution">
                  <ResponsiveContainer width="100%" height={isMobile ? 120 : 140}>
                    <BarChart data={riskBarData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                      <XAxis type="number" hide domain={[0, Math.max(1, metrics.total)]} />
                      <YAxis type="category" dataKey="cohort" hide />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} formatter={(v, k) => [v, k.toUpperCase()]} />
                      <Bar dataKey="high" stackId="a" fill={S.red} name="HIGH" />
                      <Bar dataKey="mod"  stackId="a" fill={S.amber} name="MEDIUM" />
                      <Bar dataKey="low"  stackId="a" fill={S.green} name="LOW" />
                    </BarChart>
                  </ResponsiveContainer>
                  <RiskLegend metrics={metrics} />
                </ChartCard>

                <ChartCard title="Sessions and escalations · last 30 days" sublabel={sparseLabel}>
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
                    <LineChart data={timeSeries} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                      <CartesianGrid stroke="#EFEAD8" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: S.textLight }} interval={isMobile ? 6 : 3} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: S.textLight }} width={28} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="sessions" stroke={S.navy} strokeWidth={2} dot={false} name="Sessions" />
                      <Line type="monotone" dataKey="escalations" stroke={S.red} strokeWidth={2} dot={false} name="Escalations" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <AboutMetrics />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Local helper because navigate is also used by the top nav — keep this
// module self-contained.
function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ── Tiles ──
function Tiles({ metrics, isMobile }) {
  const highPct = metrics.total > 0 ? Math.round((metrics.high / metrics.total) * 100) : 0;
  const tiles = [
    { label: "Patients enrolled", value: metrics.total, sub: "FHIR Patient resources, demo + Medplum" },
    { label: "At HIGH risk", value: metrics.high, sub: metrics.total > 0 ? `${highPct}% of cohort` : "—" },
    { label: "Sessions · last 7 days", value: metrics.sessions7Count, sub: "Completed Vardana check-ins" },
    {
      label: "Escalations · last 7 days",
      value: metrics.p1Count + metrics.p2Count,
      sub: `P1: ${metrics.p1Count} · P2: ${metrics.p2Count}`,
    },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12 }}>
      {tiles.map(t => (
        <div key={t.label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: S.textLight, marginBottom: 8 }}>{t.label}</div>
          <div style={{ fontSize: isMobile ? 26 : 32, ...css.serif, color: S.text, lineHeight: 1.0 }}>{t.value}</div>
          <div style={{ fontSize: 12, color: S.textLight, marginTop: 6 }}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Chart card shell ──
function ChartCard({ title, sublabel, children }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: S.textLight }}>{title}</div>
        {sublabel && (
          <div style={{ fontSize: 11, color: S.amberText, background: S.amberBg, padding: "2px 8px", borderRadius: 4 }}>
            {sublabel}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Small inline legend so the stacked bar reads without hovering.
function RiskLegend({ metrics }) {
  const items = [
    { label: "HIGH", count: metrics.high, color: S.red },
    { label: "MEDIUM", count: metrics.mod, color: S.amber },
    { label: "LOW", count: metrics.low, color: S.green },
  ];
  return (
    <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, color: S.textMed, flexWrap: "wrap" }}>
      {items.map(i => (
        <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: i.color, display: "inline-block" }} />
          <span style={{ fontWeight: 600, color: S.text }}>{i.count}</span>
          <span>{i.label}</span>
        </span>
      ))}
    </div>
  );
}

// ── About these metrics ──
function AboutMetrics() {
  const items = [
    ["Patients enrolled", "Count of distinct FHIR Patient resources visible to this account: local demo fixtures plus Medplum-seeded patients, minus suppressed CHF-era names."],
    ["At HIGH risk", "Patients whose latest BP reading is ≥155/95 — the same threshold used by the patient detail header. Tier read from inferRiskLevel(), no separate scoring."],
    ["Sessions · last 7 days", "Completed Vardana voice and chat check-ins, identified by FHIR Encounter type vardana.ai/sessions and dated within the past seven calendar days."],
    ["Escalations · last 7 days", "P1 (immediate clinical review) and P2 (same-day care team review) alerts raised by Vardana's deterministic rule set against AHA/ACC HTN and ADA Standards of Care guidelines. Mapping: P1 = alertGenerated + critical/immediate risk; P2 = alertGenerated + non-critical, or sustained high-risk without alert."],
    ["Sessions and escalations · last 30 days", "Per-day bucketed counts. Days with no activity render as zero rather than gap-filling. If fewer than seven days have any data the chart is labeled honestly so the sparseness is visible."],
  ];
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginTop: 16 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, color: S.textLight, marginBottom: 10 }}>About these metrics</div>
      <dl style={{ margin: 0, display: "grid", gap: 10 }}>
        {items.map(([k, v]) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 200px) 1fr", gap: 12, fontSize: 13, color: S.textMed }}>
            <dt style={{ color: S.text, fontWeight: 600 }}>{k}</dt>
            <dd style={{ margin: 0, lineHeight: 1.55 }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div style={{ fontSize: 12, color: S.textLight, marginTop: 12, lineHeight: 1.55 }}>
        This dashboard intentionally omits outcome metrics (BP reduction, A1c delta, weight loss),
        cost or savings projections, and predicted-ROI tiles — those are not currently computed
        from real session data.
      </div>
    </div>
  );
}
