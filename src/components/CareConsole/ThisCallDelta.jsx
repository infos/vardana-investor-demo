import { useMemo } from "react";
import { DS } from "../../design-system.js";

// ─────────────────────────────────────────────────────────────────────────────
// ThisCallDelta
//
// Right panel of the in-call shell. Two stacked sections:
//
//   1. PATIENT BASELINE — static during the call. Pulled from
//      `patientData` (the bundle the bot pre-fetched at session start).
//      Shows allergies, active conditions, active medications. Gives
//      the coordinator something to read while waiting for the call
//      to produce live signal.
//
//   2. THIS CALL — live, updates as the patient reports vitals during
//      the session. Sourced strictly from `liveObservations` produced
//      by the LiveKitVoiceOverlay useDataChannel subscriber from the
//      bot's `record_observation` tool fan-out.
//
// Data sources NOT shown (bot does not emit structured events for these):
//   * Symptoms (positive or denied)
//   * Adherence statements
//   * Red flag detections
//
// Per the spec for this surface, we omit those rows entirely rather
// than fake them. When the bot grows structured events, add a row in
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

const SECTION_HEAD = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: SLATE[500],
  marginBottom: 8,
};

export function ThisCallDelta({
  sessionStartedAt,
  liveObservations = {},
  triggeringObservationId = null,
  patientData = null,
}) {
  // Derive events directly from liveObservations. Each kind has at
  // most one entry (handler in InCallShell overwrites on
  // self-corrections), so this is at most 3 rows for the current
  // BP/glucose/weight set. No arrival-order ref needed; sorting by
  // occurredAt gives a stable chronological order.
  const events = useMemo(() => {
    return Object.values(liveObservations || {})
      .filter(obs => obs && obs.observationId)
      .sort((a, b) => new Date(a.occurredAt || 0) - new Date(b.occurredAt || 0));
  }, [liveObservations]);

  return (
    <div>
      {patientData && <PatientBaseline patientData={patientData} />}

      <div style={{ ...SECTION_HEAD, marginTop: patientData ? 18 : 0 }}>This call</div>

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

// Static baseline pulled from the pre-fetched bundle. Shown so the
// coordinator can glance at allergies / conditions / meds during the
// call without leaving the in-call view.
function PatientBaseline({ patientData }) {
  const allergies = patientData?.allergies || [];
  const conditions = (patientData?.conditions || []).filter(
    c => !c.status || c.status === "active",
  );
  const meds = (patientData?.medications || []).filter(
    m => !m.status || m.status === "active",
  );
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={SECTION_HEAD}>Patient baseline</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <BaselineBlock label="Allergies">
          {allergies.length === 0 ? (
            <span style={{ fontSize: 12, color: JADE[600] }}>None known</span>
          ) : (
            allergies.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: AMBER[700], lineHeight: 1.45 }}>
                {a.substance}{a.reaction ? `, ${a.reaction}` : ""}
              </div>
            ))
          )}
        </BaselineBlock>

        <BaselineBlock label="Active conditions">
          {conditions.length === 0 ? (
            <span style={{ fontSize: 12, color: SLATE[500] }}>None on record</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {conditions.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: SLATE[700],
                    background: SLATE[100],
                    border: `1px solid ${SLATE[200]}`,
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  {c.text}
                </span>
              ))}
            </div>
          )}
        </BaselineBlock>

        <BaselineBlock label="Active medications">
          {meds.length === 0 ? (
            <span style={{ fontSize: 12, color: SLATE[500] }}>None on record</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {meds.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: SLATE[900], lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                  {m.dosage && (
                    <span style={{ color: SLATE[500] }}> · {m.dosage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </BaselineBlock>
      </div>
    </div>
  );
}

function BaselineBlock({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: SLATE[500], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function DeltaRow({ ev, relative, isTrigger }) {
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

// Honest disclosure of what this surface does NOT yet show. The bot
// only emits structured `observation` events today. Symptom mentions,
// adherence statements, and red-flag detections are not extracted bot-
// side, so we do not render rows for them. Listing the gaps explicitly
// beats letting the coordinator wonder why the panel is empty.
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

// Animation keyframes for the trigger pulse. Mounted once at module
// load to avoid duplicate style tags if multiple panels render.
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
