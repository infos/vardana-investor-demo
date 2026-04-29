import { useEffect, useMemo, useState } from "react";
import {
  inferRiskLevel,
  inferConditionsSummary,
  initialsFromName,
  LOCAL_PATIENTS,
  LOCAL_PATIENT_BY_ID,
  LOCAL_PATIENT_NAMES,
  SUPPRESSED_PATIENT_NAMES,
  ROSTER_ORDER,
  getSessionsFor,
} from "./CoordinatorDashboard.jsx";

// Reuses the dashboard's tokens so the panel reads as the same surface.
const S = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  accent: "#E2D5B8",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
};
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

// Most recent session date wins. For Medplum sessions `date` is the
// Encounter.period.start ISO; for fixtures it's a YYYY-MM-DD. Both parse.
function pickLastSession(sessions) {
  if (!sessions || !sessions.length) return null;
  return [...sessions].sort((a, b) => {
    const ta = new Date(a.date).getTime() || 0;
    const tb = new Date(b.date).getTime() || 0;
    return tb - ta;
  })[0];
}

function fmtCallTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Map a session's risk metadata to a short outcome chip. Mirrors how the
// Sessions tab labels Medplum outcomes (inferOutcomeFromMedplum), so the
// panel and detail view agree on what "alert" means for a row. Returns
// null when the session lacks both alertGenerated and riskLevel — local
// SESSION_FIXTURES carry neither, and we'd rather show "—" than claim
// "STABLE" on a record that has no clinical metadata behind it.
function outcomeFromSession(session) {
  if (!session) return null;
  if (session.alertGenerated) return { label: "ALERT", color: "red" };
  const lvl = (session.riskLevel || "").toLowerCase();
  if (lvl === "high" || lvl === "critical") return { label: "HIGH", color: "red" };
  if (lvl === "moderate" || lvl === "mod") return { label: "WATCH", color: "amber" };
  if (lvl === "low" || lvl === "stable") return { label: "STABLE", color: "green" };
  return null;
}

const OUTCOME_COLORS = {
  red: { bg: S.redBg, text: S.redText },
  amber: { bg: S.amberBg, text: S.amberText },
  green: { bg: S.greenBg, text: S.greenText },
};

// ── Main ──
export default function CoordinatorPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState("default"); // "default" | "name" | "condition" | "risk" | "lastCall" | "outcome"
  const [sortDir, setSortDir] = useState("asc"); // applies only when sortKey !== "default"

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
      // Local fixtures already carry { id, name, risk, meta }. For Medplum
      // entries we compute risk + condition summary the same way the
      // dashboard does (rule 10: do NOT recompute differently).
      const localRows = LOCAL_PATIENTS.map(p => ({
        id: p.id,
        name: p.name,
        condition: p.meta || "—",
        risk: p.risk || "low",
        summary: null,
        local: true,
      }));
      const medplumRows = medplumPatients.map(p => ({
        id: p.id,
        name: p.name || "Unknown",
        condition: inferConditionsSummary(p.conditions),
        risk: inferRiskLevel(p),
        summary: p,
        local: false,
      }));
      const baseRows = [...localRows, ...medplumRows];

      // Fetch last-session for each patient. Local patients short-circuit
      // to SESSION_FIXTURES (same path as the dashboard's session view —
      // local Marcus has no Medplum Patient resource yet). Remote patients
      // hit /api/medplum-fhir?action=sessions; if that fails or returns
      // empty, fall back to fixtures keyed by patient name.
      const enriched = await Promise.all(baseRows.map(async (row) => {
        let session = null;
        if (row.local) {
          session = pickLastSession(getSessionsFor(row.name));
        } else {
          try {
            const r = await fetch(`/api/medplum-fhir?action=sessions&patientId=${encodeURIComponent(row.id)}`);
            if (r.ok) {
              const data = await r.json();
              session = pickLastSession(data.sessions);
            }
          } catch { /* fall through to fixture */ }
          if (!session) session = pickLastSession(getSessionsFor(row.name));
        }
        return {
          ...row,
          lastCallDate: session?.date || null,
          lastCallOutcome: outcomeFromSession(session),
        };
      }));

      if (cancelled) return;
      setRows(enriched);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    const copy = [...rows];
    if (sortKey === "default") {
      // Risk DESC (high > mod > low), then last-call ASC (oldest contact
      // first within tier — matches the "who needs attention now" model).
      // No call → sorts to the top within its tier (longest neglected).
      copy.sort((a, b) => {
        const r = RISK_RANK[a.risk] - RISK_RANK[b.risk];
        if (r !== 0) return r;
        const ta = a.lastCallDate ? new Date(a.lastCallDate).getTime() : -Infinity;
        const tb = b.lastCallDate ? new Date(b.lastCallDate).getTime() : -Infinity;
        return ta - tb;
      });
      return copy;
    }
    const dir = sortDir === "desc" ? -1 : 1;
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "condition") cmp = (a.condition || "").localeCompare(b.condition || "");
      else if (sortKey === "risk") cmp = RISK_RANK[a.risk] - RISK_RANK[b.risk];
      else if (sortKey === "lastCall") {
        const ta = a.lastCallDate ? new Date(a.lastCallDate).getTime() : -Infinity;
        const tb = b.lastCallDate ? new Date(b.lastCallDate).getTime() : -Infinity;
        cmp = ta - tb;
      } else if (sortKey === "outcome") {
        cmp = (a.lastCallOutcome?.label || "").localeCompare(b.lastCallOutcome?.label || "");
      }
      return cmp * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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
    <div style={{ minHeight: "100vh", background: S.bg, padding: "32px 28px", ...css.sans }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
          <h1 style={{ ...css.serif, fontSize: 28, color: S.text, margin: 0 }}>Patient panel</h1>
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

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F5F3ED", borderBottom: `1px solid ${S.border}` }}>
                <Th onClick={() => handleSort("name")} active={sortKey === "name"} dir={sortDir}>Patient</Th>
                <Th onClick={() => handleSort("condition")} active={sortKey === "condition"} dir={sortDir}>Primary condition</Th>
                <Th onClick={() => handleSort("risk")} active={sortKey === "risk"} dir={sortDir}>Risk tier</Th>
                <Th onClick={() => handleSort("lastCall")} active={sortKey === "lastCall"} dir={sortDir}>Last call</Th>
                <Th onClick={() => handleSort("outcome")} active={sortKey === "outcome"} dir={sortDir}>Outcome</Th>
                <Th>Next action</Th>
                <Th align="right">{null}</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: S.textLight }}>Loading roster…</td></tr>
              )}
              {!loading && sortedRows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: S.textLight }}>No patients found.</td></tr>
              )}
              {!loading && sortedRows.map(row => {
                const riskColor = RISK_COLORS[row.risk] || RISK_COLORS.low;
                const outcome = row.lastCallOutcome;
                const outcomeColor = outcome ? OUTCOME_COLORS[outcome.color] : null;
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: S.navy, color: S.navyText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                          {initialsFromName(row.name)}
                        </span>
                        <span style={{ color: S.text, fontWeight: 500 }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ ...cellStyle, color: S.textMed }}>{row.condition}</td>
                    <td style={cellStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 4, background: riskColor.bg, color: riskColor.text, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: riskColor.dot, display: "inline-block" }} />
                        {RISK_LABEL[row.risk]}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, color: S.textMed }}>
                      {fmtCallTimestamp(row.lastCallDate) || <span style={{ color: S.textLight }}>—</span>}
                    </td>
                    <td style={cellStyle}>
                      {outcome
                        ? <span style={{ padding: "2px 8px", borderRadius: 4, background: outcomeColor.bg, color: outcomeColor.text, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{outcome.label}</span>
                        : <span style={{ color: S.textLight }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, color: S.textLight }}>—</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      <button
                        onClick={() => handleOpen(row.id)}
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

        <div style={{ fontSize: 13, color: S.textLight, marginTop: 12 }}>
          Risk tier read from the same logic as the patient detail view. "Next action" is not yet wired to a scheduling source.
        </div>
      </div>
    </div>
  );
}

const cellStyle = { padding: "12px 14px", verticalAlign: "middle" };

function Th({ children, onClick, active, dir, align = "left" }) {
  const sortable = !!onClick;
  const arrow = active ? (dir === "desc" ? " ↓" : " ↑") : "";
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: align,
        padding: "10px 14px",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: active ? S.navy : S.textLight,
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        fontWeight: 600,
      }}
    >
      {children}{sortable && arrow}
    </th>
  );
}
