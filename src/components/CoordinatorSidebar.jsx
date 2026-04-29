import { useIsMobile } from "../demo/useIsMobile";

// Tokens shared with CoordinatorPanel, PracticeDashboard, and the per-patient
// dashboard so all three views render the same chrome. Mirrors the legacy
// S object inside CoordinatorDashboard.jsx — kept here so cohort views can
// pull it without importing the dashboard's whole module surface.
export const sidebarTokens = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  sidebarMuted: "#94A3B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  accent: "#E2D5B8", chip: "#EEEBD8",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};

const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

const LAST_PATIENT_KEY = "vd_last_patient";
const DEFAULT_PATIENT_ID = "local-marcus";

// Read the most recently visited patient from sessionStorage so clicking
// "Care Console" from another view returns the coordinator to whoever they
// were last looking at. Falls back to the headline persona (Marcus) when
// nothing is remembered — matches the dashboard's bare-/coordinator default.
export function rememberPatient(id) {
  try { sessionStorage.setItem(LAST_PATIENT_KEY, id); } catch { /* sessionStorage may be blocked */ }
}

function lastPatientId() {
  try { return sessionStorage.getItem(LAST_PATIENT_KEY) || DEFAULT_PATIENT_ID; }
  catch { return DEFAULT_PATIENT_ID; }
}

const NAV_ITEMS = [
  { id: "patients", label: "Patients", path: "/coordinator", subtitle: "Cohort grid" },
  { id: "careConsole", label: "Care Console", path: null, subtitle: "Per-patient detail" },
  { id: "practice", label: "Practice", path: "/practice", subtitle: "Cohort metrics" },
];

// Compose a path that preserves the demo token (?token=...) so navigation
// stays inside the gated session.
function withToken(path) {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

// Care Console nav resolves at click time so the latest sessionStorage
// value wins — even if the panel was loaded before the user picked a
// patient on a previous visit.
function careConsolePath() {
  return withToken(`/coordinator?patient=${encodeURIComponent(lastPatientId())}`);
}

// ── Main sidebar ──
//
// Layout switches with viewport:
//   ≥768px → 260px vertical navy left rail
//   <768px → horizontal top bar with the same three nav buttons
//
// Optional `roster` props enable the per-patient dashboard's sidebar to
// continue showing its inline patient list under the global nav (so
// switching patients without leaving the detail view still works).
export default function CoordinatorSidebar({
  active,
  navigate,
  roster,
  rosterLoading,
  rosterError,
  selectedPatientId,
  onPatientSelect,
  showFooter = true,
}) {
  const isMobile = useIsMobile(768);
  const S = sidebarTokens;

  const goTo = (item) => {
    const path = item.id === "careConsole" ? careConsolePath() : withToken(item.path);
    navigate(path);
  };

  if (isMobile) {
    // Top-bar variant. Brand stacks above the three nav buttons so neither
    // row fights the other for horizontal space at 375px.
    // Roster is intentionally not rendered on mobile — the per-patient
    // dashboard's existing layout doesn't fit a stacked patient list on
    // narrow screens (out of scope for this work to refactor).
    return (
      <nav
        style={{
          background: S.navy, color: S.navyText,
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          padding: "10px 16px 12px",
          display: "flex", flexDirection: "column", gap: 8,
          ...css.sans,
        }}
      >
        <BrandBlock S={S} compact />
        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
          {NAV_ITEMS.map(item => (
            <NavBtn key={item.id} item={item} active={active === item.id} onClick={() => goTo(item)} compact S={S} />
          ))}
        </div>
      </nav>
    );
  }

  // Desktop vertical rail. Same dimensions as the legacy dashboard sidebar
  // (260px wide, navy fill) so the per-patient detail's main content area
  // doesn't shift when this swap lands.
  return (
    <aside
      style={{
        width: 260, background: S.navy, color: "#CBD5E1",
        display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
        height: "100vh", minHeight: 720,
        ...css.sans,
      }}
    >
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <BrandBlock S={S} />
      </div>

      <div style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <NavBtn key={item.id} item={item} active={active === item.id} onClick={() => goTo(item)} S={S} />
        ))}
      </div>

      {Array.isArray(roster) && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          {rosterLoading && (
            <div style={{ padding: 16, fontSize: 14, color: S.sidebarMuted }}>Loading roster from Medplum…</div>
          )}
          {rosterError && (
            <div style={{ padding: 16, fontSize: 14, color: S.red }}>Roster error: {rosterError}</div>
          )}
          {roster.length > 0 && (
            <div style={{ padding: "10px 10px 4px", fontSize: 12, letterSpacing: "1.2px", textTransform: "uppercase", color: S.sidebarMuted }}>
              Patients
            </div>
          )}
          {roster.map((p) => (
            <div
              key={p.id}
              onClick={() => onPatientSelect && onPatientSelect(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px",
                borderLeft: `3px solid ${selectedPatientId === p.id ? S.navyText : "transparent"}`,
                background: selectedPatientId === p.id ? "rgba(226,213,184,0.08)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: p.bg, color: p.fg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>{p.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#CBD5E1" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: S.sidebarMuted }}>{p.meta}</div>
              </div>
              <RiskDot risk={p.risk} S={S} />
            </div>
          ))}
        </>
      )}

      {showFooter && (
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
          <div style={{ padding: "7px 10px", color: S.sidebarMuted, fontSize: 13, ...css.mono }}>
            Source: Medplum FHIR R4
          </div>
        </div>
      )}
    </aside>
  );
}

function BrandBlock({ S, compact }) {
  if (compact) {
    // Mobile: single horizontal line so it doesn't steal vertical space
    // from the patient grid below the nav.
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 15, ...css.serif, color: S.navyText }}>Vardana</span>
        <span style={{ fontSize: 10, color: S.sidebarMuted, letterSpacing: "1.2px", textTransform: "uppercase", ...css.sans }}>
          Care Console
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span style={{ fontSize: 17, ...css.serif, color: S.navyText }}>Vardana</span>
      <span style={{ fontSize: 13, color: S.sidebarMuted, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2, ...css.sans }}>
        Care Console
      </span>
    </div>
  );
}

function NavBtn({ item, active, onClick, compact, S }) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        style={{
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          background: active ? "rgba(226, 213, 184, 0.12)" : "transparent",
          color: active ? S.navyText : "#94A3B8",
          border: `1px solid ${active ? "rgba(226, 213, 184, 0.3)" : "transparent"}`,
          borderRadius: 6,
          cursor: "pointer",
          ...css.sans,
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        background: active ? "rgba(226, 213, 184, 0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(226, 213, 184, 0.22)" : "transparent"}`,
        borderRadius: 6,
        cursor: "pointer",
        color: active ? S.navyText : "#CBD5E1",
        ...css.sans,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}>{item.label}</div>
      <div style={{ fontSize: 12, color: active ? "rgba(226,213,184,0.7)" : S.sidebarMuted, marginTop: 2 }}>
        {item.subtitle}
      </div>
    </button>
  );
}

function RiskDot({ risk, S }) {
  const color = risk === "high" ? S.red : risk === "mod" ? S.amber : S.green;
  return (
    <div style={{
      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
      background: color,
      boxShadow: risk === "high" ? "0 0 5px rgba(239,68,68,0.5)" : "none",
    }} />
  );
}
