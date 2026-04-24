import { useState } from "react";
import { DS } from "../../design-system.js";
import { OutcomeBadge } from "./OutcomeBadge.jsx";

const cardStyle = {
  background: DS.color.canvas.cream,
  border: `1px solid ${DS.color.border.subtle}`,
  borderRadius: DS.radius.sm,
  padding: 14,
  marginBottom: 10,
  fontFamily: DS.fontSans,
};

const transcriptButtonStyle = {
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  ...DS.text.sm,
  color: DS.color.slate[800],
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const transcriptStyle = {
  marginTop: 10,
  padding: 10,
  background: DS.color.canvas.warm,
  border: `1px solid ${DS.color.border.subtle}`,
  borderRadius: 4,
  ...DS.text.sm,
  fontFamily: DS.fontMono,
  color: DS.color.slate[800],
  whiteSpace: "pre-wrap",
  lineHeight: 1.55,
  maxHeight: 320,
  overflowY: "auto",
};

export function SessionCard({ date, durationSec, synthesis, outcome, transcript, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const mins = Math.floor((durationSec || 0) / 60);
  const secs = (durationSec || 0) % 60;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ ...DS.text.base, color: DS.color.slate[900], fontWeight: 600 }}>{date}</div>
        <div
          style={{
            ...DS.text.xs,
            color: DS.color.slate[500],
            fontFamily: DS.fontMono,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {durationSec != null ? `${mins}:${String(secs).padStart(2, "0")}` : ""}
        </div>
      </div>

      <div style={{ ...DS.text.base, color: DS.color.slate[700], marginTop: 8, lineHeight: 1.55 }}>
        {synthesis}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        {outcome && <OutcomeBadge state={outcome.state} reason={outcome.reason} />}
        {transcript && (
          <button type="button" onClick={() => setOpen(!open)} style={transcriptButtonStyle}>
            {open ? "Hide transcript" : "View transcript"}
          </button>
        )}
      </div>

      {open && transcript && <pre style={transcriptStyle}>{transcript}</pre>}
    </div>
  );
}
