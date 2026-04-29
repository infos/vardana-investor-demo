import { useIsMobile } from "../demo/useIsMobile";

// Tokens shared with CoordinatorPanel and PracticeDashboard. Mirror the
// existing dashboard's S object so the new views read as the same surface.
export const topNavTokens = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  accent: "#E2D5B8", chip: "#EEEBD8",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};

const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

const TABS = [
  { id: "patients", label: "Patients", path: "/coordinator" },
  { id: "practice", label: "Practice", path: "/practice" },
];

// Chrome shared by /coordinator (grid) and /practice. The per-patient
// detail at /coordinator?patient=<id> still uses its own sidebar layout —
// this nav only renders on the cohort-level views.
export default function CoordinatorTopNav({ active, navigate }) {
  const isMobile = useIsMobile(768);
  const S = topNavTokens;

  const goTo = (path) => {
    // Carry the demo token through so the gated route stays authorized
    // after navigation. Mirrors the same pattern used by Open buttons in
    // the panel rows.
    const token = new URLSearchParams(window.location.search).get("token");
    const dest = token ? `${path}?token=${encodeURIComponent(token)}` : path;
    navigate(dest);
  };

  return (
    <nav
      style={{
        background: S.navy,
        color: S.navyText,
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        padding: isMobile ? "12px 16px" : "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 12 : 24,
        ...css.sans,
      }}
    >
      <div
        onClick={() => goTo("/coordinator")}
        style={{ cursor: "pointer", display: "flex", flexDirection: "column", lineHeight: 1.1, flexShrink: 0 }}
      >
        <span style={{ fontSize: 17, ...css.serif, color: S.navyText }}>Vardana</span>
        <span style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "1.4px", textTransform: "uppercase", marginTop: 2 }}>
          Care Console
        </span>
      </div>
      <div style={{ display: "flex", gap: isMobile ? 4 : 8, marginLeft: isMobile ? 8 : 18 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => goTo(t.path)}
            aria-current={active === t.id ? "page" : undefined}
            style={{
              padding: isMobile ? "7px 12px" : "8px 16px",
              fontSize: 14,
              fontWeight: active === t.id ? 600 : 500,
              background: active === t.id ? "rgba(226, 213, 184, 0.12)" : "transparent",
              color: active === t.id ? S.navyText : "#94A3B8",
              border: `1px solid ${active === t.id ? "rgba(226, 213, 184, 0.3)" : "transparent"}`,
              borderRadius: 6,
              cursor: "pointer",
              ...css.sans,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
