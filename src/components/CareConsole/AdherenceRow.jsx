import { DS } from "../../design-system.js";

export function AdherenceRow({ label, pct, source, detail, confidence, status }) {
  const statusColor = {
    ok: DS.color.jade[700],
    warn: DS.color.amber[600],
    missing: DS.color.slate[400],
  }[status] || DS.color.slate[600];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: `1px solid ${DS.color.border.subtle}`,
        fontFamily: DS.fontSans,
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...DS.text.base, color: DS.color.slate[900] }}>{label}</div>
        <div style={{ ...DS.text.xs, color: DS.color.slate[500], marginTop: 2 }}>
          {source}
          {detail ? ` · ${detail}` : ""}
          {confidence === "low" && (
            <span style={{ color: DS.color.amber[600], marginLeft: 6 }}>· low confidence</span>
          )}
        </div>
      </div>
      <div
        style={{
          ...DS.text.base,
          color: statusColor,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          minWidth: 52,
          textAlign: "right",
          paddingTop: 1,
        }}
      >
        {pct == null ? "—" : `${pct}%`}
      </div>
    </div>
  );
}
