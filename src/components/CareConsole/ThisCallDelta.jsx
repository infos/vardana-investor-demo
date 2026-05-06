import { useEffect, useMemo, useRef, useState } from "react";
import { DS } from "../../design-system.js";

// ─────────────────────────────────────────────────────────────────────────────
// ThisCallDelta
//
// Replaces the duplicate "Patient chart" sidebar that used to live on the
// right side of the in-call shell. The chart panel showed the same
// information already visible in the patient overview tab; during a live
// call, what the coordinator actually needs is "what has the patient said
// or reported in THIS call so far."
//
// Data sources (strictly traced):
//   * `liveObservations` — keyed map of { kind -> { value, summary,
//     occurredAt, observationId } } produced by the LiveKitVoiceOverlay
//     useDataChannel subscriber from the bot's `record_observation` tool
//     fan-out (vardana-voice/bot.py emits a JSON `observation` message).
//
// Data sources NOT shown (bot does not emit structured events for these):
//   * Symptoms (positive or denied)
//   * Adherence statements
//   * Red flag detections
//
// Per the spec for this surface, we omit those rows entirely rather than
// stub or fake them. When the bot grows structured events, add a row in
// `EVENT_RENDERERS` keyed on the new event type and pipe it through
// `events`.
// ─────────────────────────────────────────────────────────────────────────────

const SLATE = DS.color.slate;
const AMBER = DS.color.amber;
const JADE = DS.color.jade;

// Format epoch-ms delta as "0:47" / "12:03". Floors to whole seconds so the
// label doesn't tick at sub-second resolution.
function formatRelative(occurredAtIso, sessionStartedAt) {
  if (!occurredAtIso || !sessionStartedAt) return "";
  const occurred = new Date(occurredAtIso).getTime();
  if (Number.isNaN(occurred)) return "";
  const deltaSec = Math.max(0, Math.floor((occurred - sessionStartedAt) / 1000));
  const m = Math.floor(deltaSec / 60);
  const s = deltaSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Format the spoken value for an observation row. Distinct from
// observation.summary (which targets the chart) so we can render compact
// "138/95 mmHg" / "118 mg/dL fasting" / "187 lb" lines.
function formatObservation(kind, value, summary) {
  if (summary) return summary;
  if (!value) return "";
  if (kind === "blood_pressure" && value.systolic != null && value.diastolic != null) {
    return `${value.systolic}/${value.diastolic} mmHg`;
  }
  if (kind === "glucose" && value.value != null) {
    const unit = value.unit || "mg/dL";
    const ctx = value.context ? ` ${value.context}` : "";
    return `${value.value} ${unit}${ctx}`;
  }
  if (kind === "weight" && value.value != null) {
    return `${value.value} ${value.unit || "lb"}`;
  }
  return "";
}

function labelForKind(kind) {
  if (kind === "blood_pressure") return "Blood pressure";
  if (kind === "glucose") return "Glucose";
  if (kind === "weight") return "Weight";
  return kind || "Reading";
}

export function ThisCallDelta({
  sessionStartedAt,
  liveObservations = {},
  triggeringObservationId = null,
}) {
  // Flatten the keyed map into a chronological list. The bot emits one
  // observation per record_observation call, and the consumer indexes by
  // `kind` so a corrected reading overwrites the previous value of the
  // same kind. That matches what the chart wants but loses the BP1→BP2
  // history we want here. Persist arrival order with a local ref.
  const arrivalOrder = useRef([]);
  useEffect(() => {
    const seen = new Set(arrivalOrder.current.map(o => o.observationId));
    Object.values(liveObservations || {}).forEach(obs => {
      if (obs && obs.observationId && !seen.has(obs.observationId)) {
        arrivalOrder.current.push({
          kind: obs.kind,
          value: obs.value,
          summary: obs.summary,
          occurredAt: obs.occurredAt,
          observationId: obs.observationId,
        });
      }
    });
  }, [liveObservations]);

  const events = useMemo(() => {
    return arrivalOrder.current
      .slice()
      .sort((a, b) => new Date(a.occurredAt || 0) - new Date(b.occurredAt || 0));
  }, [liveObservations]);

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: SLATE[500],
          marginBottom: 8,
        }}
      >
        This call
      </div>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map(ev => (
            <DeltaRow
              key={ev.observationId}
              ev={ev}
              relative={formatRelative(ev.occurredAt, sessionStartedAt)}
              isTrigger={triggeringObservationId === ev.observationId}
            />
          ))}
        </div>
      )}

      <NotEmittedFooter />
    </div>
  );
}

function DeltaRow({ ev, relative, isTrigger }) {
  // Brief amber pulse when this row is the input that triggered the most
  // recent escalation tier change. Auto-clears after 3s via parent state.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "8px 10px",
        background: isTrigger ? AMBER[50] : SLATE[50],
        borderLeft: `3px solid ${isTrigger ? AMBER[500] : JADE[500]}`,
        borderRadius: 4,
        animation: isTrigger ? "thisCallPulse 1.6s ease-out" : "none",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          color: SLATE[500],
          minWidth: 38,
        }}
      >
        {relative}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: SLATE[500], fontWeight: 600 }}>
          {labelForKind(ev.kind)}
        </div>
        <div style={{ fontSize: 14, color: SLATE[900], fontWeight: 600 }}>
          {formatObservation(ev.kind, ev.value, ev.summary)}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        fontSize: 13,
        color: SLATE[500],
        fontStyle: "italic",
        padding: "12px 0",
      }}
    >
      Waiting for the first reading.
    </div>
  );
}

// Honest disclosure of what this surface does NOT yet show. The bot only
// emits structured `observation` events today. Symptom mentions, adherence
// statements, and red-flag detections are not extracted bot-side, so we do
// not render rows for them. Listing the gaps explicitly beats letting the
// coordinator wonder why the panel is empty.
function NotEmittedFooter() {
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 10,
        borderTop: `1px dashed ${SLATE[200]}`,
        fontSize: 11,
        color: SLATE[500],
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        Not yet captured live:
      </div>
      <div>
        Symptom mentions, adherence statements, and red flag detections.
        These will appear here once bot-side extraction emits structured
        events.
      </div>
    </div>
  );
}

// Animation keyframes for the trigger pulse. Mounted once at module load
// to avoid duplicate &lt;style&gt; tags if multiple panels render.
if (typeof document !== "undefined" && !document.getElementById("this-call-delta-anim")) {
  const styleEl = document.createElement("style");
  styleEl.id = "this-call-delta-anim";
  styleEl.textContent = `
    @keyframes thisCallPulse {
      0%   { background: ${AMBER[100]}; box-shadow: 0 0 0 0 ${AMBER[300]}; }
      40%  { background: ${AMBER[50]};  box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); }
      100% { background: ${AMBER[50]};  box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
    }
    @keyframes thisCallTierFlash {
      0%   { background: ${AMBER[100]}; }
      60%  { background: ${AMBER[50]}; }
      100% { background: transparent; }
    }
  `;
  document.head.appendChild(styleEl);
}
