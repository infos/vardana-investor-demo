import { DS } from "../../design-system.js";

const OUTCOME_STATES = {
  stable:    { label: "STABLE",    color: DS.color.jade[700],    bg: DS.color.jade[50] },
  watch:     { label: "WATCH",     color: DS.color.amber[700],   bg: DS.color.amber[50] },
  sameDay:   { label: "SAME-DAY",  color: DS.color.crimson[700], bg: DS.color.crimson[50] },
  emergency: { label: "EMERGENCY", color: DS.color.canvas.white, bg: DS.color.crimson[600] },
};

export function OutcomeBadge({ state, reason }) {
  const s = OUTCOME_STATES[state] || OUTCOME_STATES.stable;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: DS.fontSans }}>
      <span
        style={{
          ...DS.text.xs,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: s.color,
          background: s.bg,
          padding: "3px 7px",
          borderRadius: 3,
        }}
      >
        {s.label}
      </span>
      {reason && (
        <span style={{ ...DS.text.xs, color: DS.color.slate[600] }}>{reason}</span>
      )}
    </div>
  );
}
