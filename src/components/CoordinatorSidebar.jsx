import { useIsMobile } from "../demo/useIsMobile";

// Tokens shared with CoordinatorPanel, PracticeDashboard, and the per-patient
// dashboard so all three views render the same chrome. Mirrors the legacy
// S object inside CoordinatorDashboard.jsx.
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

// Two top-level destinations only. The per-patient detail used to be a third
// item ("Care Console") but it's a child of Patients, not a peer — clicking
// a row on the grid descends into it. Restored here would be a structural
// regression of the Apr 29 nav cleanup.
const NAV_ITEMS = [
  { id: "patients", label: "Patients", path: "/coordinator" },
  { id: "practice", label: "Practice", path: "/practice" },
];

// Compose a path that preserves the demo token (?token=...) so navigation
// stays inside the gated session.
function withToken(path) {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

// ── Main sidebar ──
//
// Layout switches with viewport:
//   ≥768px → 220px vertical navy left rail
//   <768px → horizontal top bar with the same two nav buttons
//
// No props for patient-list rendering — the cohort grid is canonical, and a
// duplicate persistent roster in the rail would create ambiguity about
// which list of patients is the source of truth. Per-patient navigation
// (prev/next) lives inside the detail view's header.
export default function CoordinatorSidebar({ active, navigate, showFooter = true }) {
  const isMobile = useIsMobile(768);
  const S = sidebarTokens;

  const goTo = (item) => navigate(withToken(item.path));

  if (isMobile) {
    return (
      <nav
        style={{
          background: S.navy, color: S.navyText,
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          padding: "10px 16px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
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

  // Desktop vertical rail. Slimmed to 220px (was 260px) since the persistent
  // roster is gone and the two nav items don't need the extra room.
  return (
    <aside
      style={{
        width: 220, background: S.navy, color: "#CBD5E1",
        display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
        height: "100vh", minHeight: 720,
        ...css.sans,
      }}
    >
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <BrandBlock S={S} />
      </div>

      <div style={{ padding: "14px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(item => (
          <NavBtn key={item.id} item={item} active={active === item.id} onClick={() => goTo(item)} S={S} />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {showFooter && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
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
          padding: "7px 14px",
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
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        background: active ? "rgba(226, 213, 184, 0.10)" : "transparent",
        border: `1px solid ${active ? "rgba(226, 213, 184, 0.22)" : "transparent"}`,
        borderRadius: 6,
        cursor: "pointer",
        color: active ? S.navyText : "#CBD5E1",
        ...css.sans,
      }}
    >
      {item.label}
    </button>
  );
}
