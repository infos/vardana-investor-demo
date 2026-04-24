import { DS } from "../../design-system.js";

function Stat({ value, label, mono }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div
        style={{
          ...DS.text.lg,
          fontFamily: mono ? DS.fontMono : DS.fontDisplay,
          color: DS.color.slate[900],
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...DS.text.xs,
          color: DS.color.slate[500],
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function SessionsCadence({
  totalSessions,
  windowDays = 7,
  avgDurationSec,
  completionRate,
  lastSession,
}) {
  const mins = Math.floor((avgDurationSec || 0) / 60);
  const secs = (avgDurationSec || 0) % 60;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        padding: "14px 16px",
        background: DS.color.canvas.cream,
        border: `1px solid ${DS.color.border.subtle}`,
        borderRadius: DS.radius.sm,
        fontFamily: DS.fontSans,
        marginBottom: 14,
      }}
    >
      <Stat value={totalSessions ?? "—"} label={`sessions (${windowDays}d)`} />
      <Stat
        value={avgDurationSec != null ? `${mins}:${String(secs).padStart(2, "0")}` : "—"}
        label="avg duration"
      />
      <Stat
        value={completionRate != null ? `${Math.round(completionRate * 100)}%` : "—"}
        label="completion"
      />
      <Stat value={lastSession || "—"} label="last session" mono />
    </div>
  );
}
