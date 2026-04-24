// Shared design tokens for Care Console components.
// Mirrors the DS object declared inline in App.jsx; kept as its own
// module so components under src/components/* can import without
// pulling App.jsx's large side-effect imports.
export const DS = {
  fontDisplay: "'DM Serif Display', 'Georgia', serif",
  fontSans: "'DM Sans', 'system-ui', sans-serif",
  fontMono: "'IBM Plex Mono', 'Courier New', monospace",
  space: (n) => `${n * 4}px`,
  text: {
    xs:   { fontSize: 11, lineHeight: 1.4, letterSpacing: "0.02em" },
    sm:   { fontSize: 13, lineHeight: 1.5, letterSpacing: "0.01em" },
    base: { fontSize: 15, lineHeight: 1.55, letterSpacing: 0 },
    md:   { fontSize: 17, lineHeight: 1.45, letterSpacing: "-0.01em" },
    lg:   { fontSize: 20, lineHeight: 1.35, letterSpacing: "-0.015em" },
    xl:   { fontSize: 24, lineHeight: 1.25, letterSpacing: "-0.02em" },
    "2xl":{ fontSize: 32, lineHeight: 1.2,  letterSpacing: "-0.025em" },
    "3xl":{ fontSize: 42, lineHeight: 1.1,  letterSpacing: "-0.03em" },
  },
  color: {
    slate: {
      950: "#0D1B2A", 900: "#1E3A5F", 800: "#2A4E7A", 700: "#3A5F8F",
      600: "#4A6380", 500: "#7A96B0", 400: "#A8BAC8", 300: "#D1D9E0",
      200: "#E8EDF3", 100: "#EEF1F5", 50: "#F6F7F9",
    },
    amber: {
      700: "#78350F", 600: "#B45309", 500: "#D97706", 400: "#F59E0B",
      300: "#FCD34D", 100: "#FEF3C7", 50: "#FFFBEB",
    },
    jade: {
      700: "#065F46", 600: "#047857", 500: "#059669", 400: "#34D399",
      100: "#D1FAE5", 50: "#ECFDF5",
    },
    crimson: {
      700: "#7F1D1D", 600: "#A93226", 500: "#C0392B", 400: "#EF4444", 100: "#FEE2E2", 50: "#FEF2F2",
    },
    canvas: { warm: "#F6F4F0", cream: "#FAFAF8", cool: "#F1F4F8", white: "#FFFFFF" },
    border: { subtle: "#E4E9EF", default: "#D1D9E0", strong: "#A8BAC8" },
  },
  shadow: {
    xs: "0 1px 2px rgba(12,20,32,0.06)",
    sm: "0 2px 6px rgba(12,20,32,0.07), 0 1px 2px rgba(12,20,32,0.04)",
  },
  radius: { sm: 6, md: 10, lg: 16, full: 9999 },
};
