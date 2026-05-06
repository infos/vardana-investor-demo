import { DS } from "../../design-system.js";

// ─────────────────────────────────────────────────────────────────────────────
// PendingReconciliationBadge
//
// Surfaced on assessment cards (Current clinical state, Latest BP trend
// line, ASCVD tile, in-call escalation rationale, cross-session pattern
// card) when a new vital has been captured during the current voice
// session but the surface has not yet folded it in. The badge tells the
// coordinator "this card has not seen the new reading yet, do not draw
// conclusions until reconciliation completes."
//
// Two reasons we badge instead of recompute live:
//   1. Some computations are clinically inappropriate to recompute on
//      a single home reading (ASCVD takes trended clinic BP).
//   2. Surfaces updating independently produce visual contradictions
//      (a tile says 135/91, the trend below ends at 158/98).
//
// Reconciliation happens on session close. During the call, badges
// signal new-data-pending without changing the underlying surface.
//
// Props:
//   timestamp — ISO string of when the new reading was captured. Shown
//               formatted as HH:MM in the badge label.
//   note     — optional short string for surfaces that need extra
//               context (e.g. "Live home BP does not update ASCVD").
// ─────────────────────────────────────────────────────────────────────────────

const SLATE = DS.color.slate;
const AMBER = DS.color.amber;

function formatHHMM(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  const hh12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hh12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function PendingReconciliationBadge({ timestamp, note }) {
  const time = formatHHMM(timestamp);
  return (
    <div
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: AMBER[50],
        border: `1px solid ${AMBER[300]}`,
        borderRadius: 4,
        padding: "4px 8px",
        marginTop: 6,
        fontFamily: DS.fontSans,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: AMBER[500],
          flexShrink: 0,
          animation: "pendingDot 1.4s ease-in-out infinite",
        }}
      />
      <span style={{ ...DS.text.xs, color: AMBER[700], fontWeight: 600 }}>
        Pending reconciliation
      </span>
      {time && (
        <span style={{ ...DS.text.xs, color: SLATE[600] }}>
          new reading captured at {time}
        </span>
      )}
      {note && (
        <span style={{ ...DS.text.xs, color: SLATE[600], fontStyle: "italic" }}>
          {note}
        </span>
      )}
    </div>
  );
}

if (typeof document !== "undefined" && !document.getElementById("pending-recon-anim")) {
  const styleEl = document.createElement("style");
  styleEl.id = "pending-recon-anim";
  styleEl.textContent = `
    @keyframes pendingDot {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.3; }
    }
  `;
  document.head.appendChild(styleEl);
}
