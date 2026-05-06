import { DS } from "../../design-system.js";
import { PendingReconciliationBadge } from "./PendingReconciliationBadge.jsx";

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

export function CrossSessionInsight({
  severity = "watch",
  title,
  body,
  flaggedAt,
  onViewEvidence,
  evidenceLabel = "View supporting sessions",
  pendingBP = null,
}) {
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
      {pendingBP && (
        <PendingReconciliationBadge
          timestamp={pendingBP.occurredAt}
          note="new reading may revise this pattern"
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12 }}>
        {flaggedAt ? (
          <div style={{ ...DS.text.xs, color: DS.color.slate[500] }}>
            Flagged {flaggedAt}
          </div>
        ) : <span />}
        {onViewEvidence && (
          <button
            onClick={onViewEvidence}
            type="button"
            style={{
              ...DS.text.sm,
              background: "transparent",
              border: "none",
              color: tone.label,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              whiteSpace: "nowrap",
            }}
          >
            {evidenceLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
