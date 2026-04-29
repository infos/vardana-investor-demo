import { useEffect, useMemo, useState } from "react";
import {
  inferRiskLevel,
  inferConditionsSummary,
  initialsFromName,
  ageFromBirthDate,
  LOCAL_PATIENTS,
  LOCAL_PATIENT_NAMES,
  SUPPRESSED_PATIENT_NAMES,
  getSessionsFor,
} from "./CoordinatorDashboard.jsx";
import { useIsMobile } from "./demo/useIsMobile";
import CoordinatorSidebar, { sidebarTokens as S } from "./components/CoordinatorSidebar.jsx";

const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

// Risk tier ordering for sort: HIGH first, then MEDIUM, then LOW.
const RISK_RANK = { high: 0, mod: 1, low: 2 };
const RISK_LABEL = { high: "HIGH", mod: "MEDIUM", low: "LOW" };
const RISK_COLORS = {
  high: { bg: S.redBg, text: S.redText, dot: S.red },
  mod: { bg: S.amberBg, text: S.amberText, dot: S.amber },
  low: { bg: S.greenBg, text: S.greenText, dot: S.green },
};

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// Most recent session date wins. Sessions come from Medplum (Encounter
// period.start ISO) or SESSION_FIXTURES (YYYY-MM-DD). Both parse with Date.
function pickLastSession(sessions) {
  if (!sessions || !sessions.length) return null;
  return [...sessions].sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return tb - ta;
  })[0];
}

// Relative-time formatter. The spec asks for human-friendly strings ("this
// morning", "2 days ago") rather than absolute dates. Falls through to an
// absolute "Mon DD" once we're past 30 days — beyond a month, recency loses
// meaning and a date is more readable.
export function formatRelative(iso, now = new Date()) {
  if (!iso) return null;
  const then = new Date(iso);
  if (isNaN(then.getTime())) return null;
  const ms = now.getTime() - then.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) {
    const hour = then.getHours();
    if (hour < 12) return "this morning";
    if (hour < 17) return "this afternoon";
    return "this evening";
  }
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return "yesterday";
  const days = Math.floor(ms / 86400000);
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Pull a "next action" string out of a CarePlan resource. Returns null if
// the plan has no activity[] (which is the case for Linda's and David's
// minimal demo bundles). Marcus's bundle has 10 in-progress activities;
// we surface the first non-completed one's display name. Per the spec:
// "read from existing care plan if present, otherwise blank, do not
// synthesize" — so a missing or empty plan must yield null, not a fallback.
export function nextActionFromCarePlan(carePlan) {
  if (!carePlan || !Array.isArray(carePlan.activity) || !carePlan.activity.length) return null;
  for (const act of carePlan.activity) {
    const detail = act.detail || {};
    const status = detail.status || "in-progress";
    if (status === "completed" || status === "cancelled" || status === "stopped") continue;
    const name = detail.code?.text || detail.description;
    if (name) return name;
  }
  return null;
}

// ── Main ──
export default function CoordinatorPanel() {
  const [rows, setRows] = useState([]);
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

      // Build the unified roster: local fixtures first, then Medplum entries.
      // Risk tier is computed via the same inferRiskLevel the dashboard uses,
      // so the grid and the per-patient header agree on a HIGH/MEDIUM/LOW.
      const localRows = LOCAL_PATIENTS.map(p => ({
        id: p.id,
        name: p.name,
        condition: p.meta || "—",
        risk: p.risk || "low",
        birthDate: p.birthDate || null,
        gender: p.gender || null,
        bundlePath: p.bundlePath || null,
        local: true,
        carePlan: null,
      }));
      const medplumRows = medplumPatients.map(p => ({
        id: p.id,
        name: p.name || "Unknown",
        condition: inferConditionsSummary(p.conditions),
        risk: inferRiskLevel(p),
        birthDate: p.birthDate || null,
        gender: p.gender || null,
        bundlePath: null,
        local: false,
        carePlan: p.carePlan || null,
      }));
      const baseRows = [...localRows, ...medplumRows];

      // Per-row enrichment: sessions list (count + most-recent date) and
      // — for local fixtures only — the patient bundle so we can read the
      // CarePlan activity feed. Medplum patients carry carePlan inline on
      // the roster entry, so no second fetch there.
      const enriched = await Promise.all(baseRows.map(async (row) => {
        let sessions = [];
        if (row.local) {
          sessions = getSessionsFor(row.name) || [];
        } else {
          try {
            const r = await fetch(`/api/medplum-fhir?action=sessions&patientId=${encodeURIComponent(row.id)}`);
            if (r.ok) {
              const data = await r.json();
              sessions = data.sessions || [];
            }
          } catch { /* leave sessions empty */ }
          if (!sessions.length) sessions = getSessionsFor(row.name) || [];
        }
        const last = pickLastSession(sessions);

        let carePlan = row.carePlan;
        if (row.local && row.bundlePath) {
          try {
            const r = await fetch(row.bundlePath);
            if (r.ok) {
              const bundle = await r.json();
              const cp = (bundle.entry || []).map(e => e.resource).find(r => r?.resourceType === "CarePlan");
              if (cp) carePlan = cp;
            }
          } catch { /* leave carePlan as-is */ }
        }

        return {
          ...row,
          sessionCount: sessions.length,
          lastContactDate: last?.date || null,
          nextAction: nextActionFromCarePlan(carePlan),
        };
      }));

      if (cancelled) return;
      setRows(enriched);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Default sort only — risk DESC, then last contact ASC (oldest first
  // within tier; never-contacted floats to the top of its tier).
  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    return [...rows].sort((a, b) => {
      const r = RISK_RANK[a.risk] - RISK_RANK[b.risk];
      if (r !== 0) return r;
      const ta = a.lastContactDate ? new Date(a.lastContactDate).getTime() : -Infinity;
      const tb = b.lastContactDate ? new Date(b.lastContactDate).getTime() : -Infinity;
      return ta - tb;
    });
  }, [rows]);

  const handleOpen = (id) => {
    // Append the existing token query (if present) so the gated /coordinator
    // route still considers the session authorized post-navigation.
    const token = new URLSearchParams(window.location.search).get("token");
    const qs = new URLSearchParams();
    qs.set("patient", id);
    if (token) qs.set("token", token);
    navigate(`/coordinator?${qs.toString()}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh", background: S.bg, ...css.sans }}>
      <CoordinatorSidebar active="patients" navigate={navigate} />
      <div style={{ flex: 1, padding: isMobile ? "20px 16px" : "32px 28px", overflowY: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 style={{ ...css.serif, fontSize: isMobile ? 24 : 28, color: S.text, margin: 0 }}>Patients</h1>
            <span style={{ fontSize: 14, color: S.textLight }}>
              {loading ? "Loading…" : `${sortedRows.length} patient${sortedRows.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div style={{ fontSize: 14, color: S.textMed, marginBottom: 20 }}>
            Sorted by risk tier, then oldest contact first within tier.
          </div>

          {error && (
            <div style={{ background: S.amberBg, color: S.amberText, border: `1px solid #FCD34D`, borderRadius: 6, padding: "10px 14px", fontSize: 14, marginBottom: 16 }}>
              Roster source warning: {error}. Showing local fixtures only.
            </div>
          )}

          {loading && (
            <div style={{ padding: 24, textAlign: "center", color: S.textLight }}>Loading roster…</div>
          )}

          {!loading && sortedRows.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: S.textLight, background: S.card, border: `1px solid ${S.border}`, borderRadius: 8 }}>
              No patients enrolled yet.
            </div>
          )}

          {!loading && sortedRows.length > 0 && (
            isMobile
              ? <MobileList rows={sortedRows} onOpen={handleOpen} />
              : <DesktopTable rows={sortedRows} onOpen={handleOpen} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Desktop: 6-column grid (Patient, Condition, Risk, Sessions, Last contact, Next action, Open) ──
function DesktopTable({ rows, onOpen }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#F5F3ED", borderBottom: `1px solid ${S.border}` }}>
            <Th>Patient</Th>
            <Th>Primary condition</Th>
            <Th>Risk tier</Th>
            <Th>Sessions</Th>
            <Th>Last contact</Th>
            <Th>Next action</Th>
            <Th align="right">{null}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const riskColor = RISK_COLORS[row.risk] || RISK_COLORS.low;
            const age = ageFromBirthDate(row.birthDate);
            const sex = row.gender ? row.gender[0].toUpperCase() : null;
            return (
              <tr key={row.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={cellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: S.navy, color: S.navyText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {initialsFromName(row.name)}
                    </span>
                    <div>
                      <div style={{ color: S.text, fontWeight: 500 }}>{row.name}</div>
                      <div style={{ color: S.textLight, fontSize: 12, marginTop: 1 }}>
                        {[age != null ? `${age} yo` : null, sex].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ ...cellStyle, color: S.textMed }}>{row.condition}</td>
                <td style={cellStyle}>
                  <RiskChip riskColor={riskColor} risk={row.risk} />
                </td>
                <td style={{ ...cellStyle, color: S.textMed }}>{row.sessionCount ?? "—"}</td>
                <td style={{ ...cellStyle, color: S.textMed }}>
                  {formatRelative(row.lastContactDate) || <span style={{ color: S.textLight }}>—</span>}
                </td>
                <td style={{ ...cellStyle, color: S.textMed, maxWidth: 220 }}>
                  {row.nextAction || <span style={{ color: S.textLight }}>—</span>}
                </td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <button
                    onClick={() => onOpen(row.id)}
                    style={{ padding: "6px 14px", fontSize: 13, ...css.sans, background: S.navy, color: S.navyText, border: "none", borderRadius: 5, cursor: "pointer" }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile: stacked cards (one card per patient) ──
function MobileList({ rows, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map(row => {
        const riskColor = RISK_COLORS[row.risk] || RISK_COLORS.low;
        const age = ageFromBirthDate(row.birthDate);
        const sex = row.gender ? row.gender[0].toUpperCase() : null;
        return (
          <div
            key={row.id}
            style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: S.navy, color: S.navyText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {initialsFromName(row.name)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: S.text, fontWeight: 600, fontSize: 15 }}>{row.name}</div>
                <div style={{ color: S.textLight, fontSize: 12 }}>
                  {[age != null ? `${age} yo` : null, sex, row.condition].filter(Boolean).join(" · ")}
                </div>
              </div>
              <RiskChip riskColor={riskColor} risk={row.risk} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 13, color: S.textMed, marginBottom: 10 }}>
              <Field label="Sessions">{row.sessionCount ?? "—"}</Field>
              <Field label="Last contact">{formatRelative(row.lastContactDate) || "—"}</Field>
              <Field label="Next action" wide>{row.nextAction || "—"}</Field>
            </div>
            <button
              onClick={() => onOpen(row.id)}
              style={{ width: "100%", padding: "9px 14px", fontSize: 14, ...css.sans, background: S.navy, color: S.navyText, border: "none", borderRadius: 5, cursor: "pointer" }}
            >
              Open patient
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: S.textLight, marginBottom: 2 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function RiskChip({ riskColor, risk }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 4, background: riskColor.bg, color: riskColor.text, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor.dot, display: "inline-block" }} />
      {RISK_LABEL[risk]}
    </span>
  );
}

const cellStyle = { padding: "12px 14px", verticalAlign: "middle" };

function Th({ children, align = "left" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 14px",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: S.textLight,
        userSelect: "none",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}
