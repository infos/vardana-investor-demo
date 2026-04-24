import { DS } from "../../design-system.js";

const tileStyle = {
  background: DS.color.canvas.cream,
  border: `1px solid ${DS.color.border.subtle}`,
  borderRadius: DS.radius.sm,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  fontFamily: DS.fontSans,
};

const labelStyle = {
  ...DS.text.sm,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: DS.color.slate[500],
  marginBottom: 6,
};

const trendStyle = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: `1px solid ${DS.color.border.subtle}`,
};

export function MetricTile({ label, value, unit, date, trend, status = "neutral" }) {
  const statusColor = {
    alert: DS.color.amber[600],
    danger: DS.color.crimson[600],
    ok: DS.color.jade[700],
    neutral: DS.color.slate[600],
  }[status];

  return (
    <div style={tileStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ ...DS.text.xl, fontFamily: DS.fontDisplay, color: DS.color.slate[900] }}>{value}</span>
        {unit && <span style={{ ...DS.text.sm, color: DS.color.slate[500] }}>{unit}</span>}
      </div>
      <div style={{ ...DS.text.sm, color: statusColor, marginTop: 4 }}>{date}</div>

      {trend && (
        <div style={trendStyle}>
          <span style={{ fontFamily: DS.fontMono, ...DS.text.sm, color: DS.color.slate[700] }}>
            {trend.arrow} {trend.series}
          </span>
          <div style={{ ...DS.text.xs, color: DS.color.slate[500], marginTop: 3 }}>
            {trend.window}
            {trend.target ? ` · target ${trend.target}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
