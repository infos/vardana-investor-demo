import { DS } from "../../design-system.js";

const TONES = {
  watch: {
    bg: DS.color.amber[50],
    border: DS.color.amber[400],
    label: DS.color.amber[700],
  },
  sameDay: {
    bg: DS.color.crimson[50],
    border: DS.color.crimson[500],
    label: DS.color.crimson[700],
  },
};

export function CrossSessionInsight({ severity = "watch", title, body, flaggedAt }) {
  const tone = TONES[severity] || TONES.watch;
  return (
    <div
      style={{
        background: tone.bg,
        borderLeft: `3px solid ${tone.border}`,
        padding: "14px 16px",
        borderRadius: 4,
        margin: "4px 0 16px",
        fontFamily: DS.fontSans,
      }}
    >
      <div
        style={{
          ...DS.text.xs,
          color: tone.label,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Cross-session pattern · {severity === "sameDay" ? "same-day" : severity}
      </div>
      <div style={{ ...DS.text.md, color: DS.color.slate[900], marginTop: 4, fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ ...DS.text.base, color: DS.color.slate[700], marginTop: 6 }}>{body}</div>
      {flaggedAt && (
        <div style={{ ...DS.text.xs, color: DS.color.slate[500], marginTop: 8 }}>
          Flagged {flaggedAt}
        </div>
      )}
    </div>
  );
}
