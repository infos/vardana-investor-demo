import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useConnectionState,
  useDataChannel,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import "@livekit/components-styles";

// Shared LiveKit voice surface used by both /voice-test (engineering QA)
// and /coordinator?patient=<id> (clinical demo). Owns the full session
// lifecycle: POST /api/session-start on mount, render <LiveKitRoom>, POST
// /api/session-end on unmount + beforeunload, fire onCallComplete with
// duration so the parent can populate a post-call summary card.
//
// Props:
//   patient: { slug: string, name?: string }
//     `slug` MUST match a key in vardana-voice's DEMO_PATIENTS (see EC2
//     backend). The proxy passes this verbatim to the bot which resolves
//     it server-side to a FHIR Patient.id and pre-fetches the chart.
//   onCallComplete?: (payload) => void
//     Fired exactly once when the session ends, with
//       { sessionId, duration: 'Nm Ms', timestamp, riskLevel: null,
//         alertGenerated: false, transcript: '', summary: '' }
//     The minimal payload is intentional — the EC2 backend already
//     persists the FHIR Encounter via persist_voice_encounter, and the
//     escalation taxonomy is server-side. The frontend doesn't need to
//     reconstruct what the bot already wrote.
//   sessionMode: 'voice-test' | 'coordinator' | 'embedded'
//     'voice-test' renders standalone page chrome (h1, subtitle, cream
//     bg). 'coordinator' renders compact for embedding in a modal — the
//     parent supplies its own outer chrome. 'embedded' is the most
//     compact form — a single status + mute control strip with no
//     surrounding chrome at all, intended for placement inside a
//     parent-owned three-panel layout.
//   onConnectionStateChange?: (state: ConnectionState) => void
//     Fired whenever the LiveKit room's connection state transitions
//     (Connecting / Connected / Reconnecting / Disconnected). The parent
//     uses this to drive its own speaking / listening indicators when
//     it owns the in-call chrome.
//   onTranscript?: ({ role, text, timestamp, raw }) => void
//     Fired once per finalized conversation turn while the call is
//     active. role is 'user' or 'assistant' (matching the bot's
//     UserTranscriptProcessor / AssistantTranscriptProcessor emits).
//     text is the full utterance. timestamp is the bot's ISO 8601
//     wall-clock string. raw is the original parsed JSON in case the
//     parent wants additional fields the bot adds later.
//     Backend contract is owned by vardana-voice's bot.py
//     _on_transcript_update — keep this hook in sync with that JSON
//     shape.
//   onObservation?: ({ kind, summary, value, occurredAt, observationId, raw }) => void
//     Fired when the bot's record_observation tool successfully writes
//     a patient-reported vital (BP / glucose / weight). Parent uses
//     this to update the in-call chart panel in real time. Backend
//     contract is owned by vardana-voice's bot.py handle_tool fan-out
//     and vardana_tools.record_observation — keep this hook in sync.

const TOKENS = {
  bg: "#F0EEE8",
  card: "#FAFAF8",
  border: "#E5E1D8",
  navy: "#0D1B2A",
  navyText: "#E2D5B8",
  text: "#1A1A1A",
  textMed: "#5C5C4A",
  textLight: "#8C8C7A",
  green: "#059669",
  amber: "#D97706",
  red: "#EF4444",
};

const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" },
};

function formatDuration(ms) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function LiveKitVoiceOverlay({
  patient,
  onCallComplete,
  onConnectionStateChange,
  onTranscript,
  onObservation,
  sessionMode = "voice-test",
}) {
  const [stage, setStage] = useState("init");
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(null);
  const sessionStartedAtRef = useRef(null);
  const endCalledRef = useRef(false);
  const completeCalledRef = useRef(false);

  const slug = patient?.slug;
  const patientName = patient?.name || slug || "Patient";

  // Fire onCallComplete exactly once with whatever metadata we have
  // captured by the time the session ends. Ref-guarded because both
  // unmount cleanup and beforeunload can race.
  const fireComplete = (extra = {}) => {
    if (completeCalledRef.current) return;
    completeCalledRef.current = true;
    if (typeof onCallComplete !== "function") return;
    const startMs = sessionStartedAtRef.current?.getTime() || Date.now();
    const duration = formatDuration(Date.now() - startMs);
    onCallComplete({
      sessionId: sessionIdRef.current,
      duration,
      timestamp: new Date().toLocaleString(),
      // Minimal payload — see component header comment for why these
      // are stubbed rather than reconstructed client-side.
      riskLevel: null,
      alertGenerated: false,
      transcript: "",
      summary: "Voice session completed. See the EC2 Encounter log for the clinical record.",
      ...extra,
    });
  };

  // ── Session start ──
  useEffect(() => {
    if (!slug) {
      setError("LiveKitVoiceOverlay: missing patient.slug");
      setStage("error");
      return;
    }
    let cancelled = false;
    (async () => {
      setStage("starting");
      sessionStartedAtRef.current = new Date();
      try {
        const res = await fetch("/api/session-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: slug, mode: "voice" }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`session-start ${res.status}: ${errBody.slice(0, 300)}`);
        }
        const data = await res.json();
        if (cancelled) return;
        if (!data.livekit_url || !data.patient_token) {
          throw new Error("session-start response missing livekit_url or patient_token");
        }
        sessionIdRef.current = data.session_id || null;
        setCreds({
          livekitUrl: data.livekit_url,
          token: data.patient_token,
          roomName: data.room_name || null,
          sessionId: data.session_id || null,
        });
        setStage("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        setStage("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Session end teardown — covers both unmount and tab close ──
  useEffect(() => {
    function endSession() {
      if (endCalledRef.current || !sessionIdRef.current) return;
      endCalledRef.current = true;
      try {
        fetch("/api/session-end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionIdRef.current }),
          keepalive: true,
        }).catch(() => {});
      } catch { /* ignore */ }
    }
    function onBeforeUnload() {
      endSession();
      fireComplete();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Only fire endSession + onCallComplete when a session has actually
      // been established. Without this guard, React 18 StrictMode's
      // dev-mode double-mount cleanup fires fireComplete() before
      // /api/session-start resolves, which in CoordinatorDashboard's
      // handleCallComplete flips callOpen=false and tears down the
      // in-call shell within milliseconds of the user clicking
      // "Initiate call".
      if (!sessionIdRef.current) return;
      endSession();
      fireComplete();
    };
    // We intentionally don't include onCallComplete in deps — fireComplete
    // closes over the latest via ref, and re-running this effect on every
    // parent render would tear the room down repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const compact = sessionMode === "coordinator";
  const embedded = sessionMode === "embedded";

  // Embedded mode skips the centered max-width container and the standalone
  // chrome — the parent (e.g. CoordinatorDashboard's three-panel call layout)
  // owns the outer wrapper. Everything below still mounts the LiveKitRoom
  // and audio renderer the same way; only the surrounding presentation
  // changes.
  if (embedded) {
    return (
      <div style={{ ...css.sans }}>
        {(stage === "init" || stage === "starting") && (
          <StatusCard tone="info">
            Starting voice session — backend is spawning the bot worker.
          </StatusCard>
        )}

        {stage === "error" && (
          <StatusCard tone="error">
            <strong style={{ display: "block", marginBottom: 6 }}>Could not start session</strong>
            <code style={{ ...css.mono, fontSize: 12, color: TOKENS.red, whiteSpace: "pre-wrap" }}>
              {error}
            </code>
          </StatusCard>
        )}

        {stage === "ready" && creds && (
          <LiveKitRoom
            token={creds.token}
            serverUrl={creds.livekitUrl}
            connect={true}
            audio={true}
            video={false}
            onError={(e) => {
              setError(`LiveKit error: ${e.message || String(e)}`);
              setStage("error");
            }}
            onDisconnected={() => {
              setStage((prev) => (prev === "ended" ? prev : "disconnected"));
              fireComplete();
            }}
          >
            <RoomBody
              roomName={creds.roomName}
              sessionId={creds.sessionId}
              patientName={patientName}
              compact={true}
              embedded={true}
              onConnectionStateChange={onConnectionStateChange}
              onTranscript={onTranscript}
              onObservation={onObservation}
            />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}

        {stage === "disconnected" && (
          <StatusCard tone="warn">
            Disconnected from the room. Reload the page to reconnect.
          </StatusCard>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: compact ? "auto" : "100vh",
        background: compact ? "transparent" : TOKENS.bg,
        ...css.sans,
        padding: compact ? "20px 24px" : "32px 28px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {!compact && (
          <>
            <h1 style={{ ...css.serif, fontSize: 28, color: TOKENS.text, margin: 0 }}>
              Voice pipeline test
            </h1>
            <div style={{ fontSize: 13, color: TOKENS.textLight, marginTop: 4, marginBottom: 24 }}>
              /voice-test · Pipecat bot via LiveKit Cloud · patient_id={slug}
            </div>
          </>
        )}
        {compact && (
          <div style={{ fontSize: 13, color: TOKENS.textLight, marginBottom: 12, ...css.mono }}>
            Live AI voice · {patientName} · session via voice.vardana.ai
          </div>
        )}

        {(stage === "init" || stage === "starting") && (
          <StatusCard tone="info">
            Starting voice session — backend is spawning the bot worker.
          </StatusCard>
        )}

        {stage === "error" && (
          <StatusCard tone="error">
            <strong style={{ display: "block", marginBottom: 6 }}>Could not start session</strong>
            <code style={{ ...css.mono, fontSize: 12, color: TOKENS.red, whiteSpace: "pre-wrap" }}>
              {error}
            </code>
          </StatusCard>
        )}

        {stage === "ready" && creds && (
          <LiveKitRoom
            token={creds.token}
            serverUrl={creds.livekitUrl}
            connect={true}
            audio={true}
            video={false}
            onError={(e) => {
              setError(`LiveKit error: ${e.message || String(e)}`);
              setStage("error");
            }}
            onDisconnected={() => {
              setStage((prev) => (prev === "ended" ? prev : "disconnected"));
              fireComplete();
            }}
          >
            <RoomBody
              roomName={creds.roomName}
              sessionId={creds.sessionId}
              patientName={patientName}
              compact={compact}
              onConnectionStateChange={onConnectionStateChange}
              onTranscript={onTranscript}
              onObservation={onObservation}
            />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}

        {stage === "disconnected" && (
          <StatusCard tone="warn">
            Disconnected from the room. Reload the page to reconnect.
          </StatusCard>
        )}
      </div>
    </div>
  );
}

// ── Body of the LiveKitRoom — uses the LiveKit React hooks (only valid
// inside the LiveKitRoom provider). Split out so it can call
// useConnectionState / useLocalParticipant. ──
function RoomBody({ roomName, sessionId, patientName, compact, embedded = false, onConnectionStateChange, onTranscript, onObservation }) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  // Surface connection state to the parent so it can drive its own
  // speaking / listening indicators when it owns the in-call chrome
  // (e.g. CoordinatorDashboard's three-panel layout).
  useEffect(() => {
    if (typeof onConnectionStateChange === "function") {
      onConnectionStateChange(connectionState);
    }
  }, [connectionState, onConnectionStateChange]);

  // ── Live transcript subscriber ──
  // Backend (vardana-voice/bot.py _on_transcript_update) publishes one
  // JSON message per finalized turn via transport.send_message, which
  // arrives here on RoomEvent.DataReceived. Shape (kept in lockstep
  // with the backend):
  //   { type: "transcript", role: "user"|"assistant", text, timestamp }
  // Empty topic — the backend doesn't tag, and the only data traffic
  // in this room is transcript today. If we add other message types
  // later (e.g. risk-state updates per Stage 5), gate by msg.type in
  // the handler below rather than splitting topics, since the bot's
  // transport.send_message() doesn't expose a topic argument.
  useDataChannel((msg) => {
    let parsed;
    try {
      // Pipecat's transport.send_message stringifies; payload arrives
      // here as Uint8Array. Decode UTF-8 then JSON.parse.
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(msg.payload);
      parsed = JSON.parse(text);
    } catch (e) {
      // A malformed message is non-fatal — the call audio is unaffected.
      // Surface to console for debugging without taking down the UI.
      console.warn("[LiveKitVoiceOverlay] data-channel decode failed:", e);
      return;
    }
    if (!parsed || typeof parsed.type !== "string") return;

    // Dispatch by message type. Today the bot publishes two kinds:
    //   - transcript: one JSON per finalized assistant/user turn
    //   - observation: one JSON per record_observation tool success
    // Future Stage 5 messages (risk-state updates etc.) will add new
    // types here without splitting the data-channel topic, since the
    // bot's transport.send_message() doesn't expose a topic argument.
    if (parsed.type === "transcript") {
      if (typeof onTranscript === "function") {
        onTranscript({
          role: parsed.role,
          text: parsed.text,
          timestamp: parsed.timestamp,
          raw: parsed,
        });
      }
      return;
    }

    if (parsed.type === "observation") {
      if (typeof onObservation === "function") {
        onObservation({
          kind: parsed.kind,
          summary: parsed.summary,
          value: parsed.value,
          occurredAt: parsed.occurred_at,
          observationId: parsed.observation_id,
          raw: parsed,
        });
      }
      return;
    }

    // Unknown type — log once for visibility, never throw.
    console.info("[LiveKitVoiceOverlay] unknown data-channel type:", parsed.type);
  });

  const isConnecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  const toggleMute = async () => {
    if (!localParticipant) return;
    const next = !muted;
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub?.track) {
      if (next) await pub.track.mute();
      else await pub.track.unmute();
      setMuted(next);
    } else {
      await localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    }
  };

  if (embedded) {
    // Slim single-row control strip — designed to drop into a parent-owned
    // layout (e.g. the bottom of CoordinatorDashboard's transcript panel).
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          background: TOKENS.card,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 8,
        }}
      >
        <ConnectionDot state={connectionState} />
        <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, ...css.sans }}>
          {labelForState(connectionState)}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleMute}
          disabled={!isConnected}
          style={{
            padding: "7px 14px",
            fontSize: 13,
            ...css.sans,
            background: muted ? TOKENS.red : TOKENS.navy,
            color: muted ? "white" : TOKENS.navyText,
            border: "none",
            borderRadius: 6,
            cursor: isConnected ? "pointer" : "not-allowed",
            opacity: isConnected ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          {muted ? "🔇 Muted" : "🎙 Mic on"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: TOKENS.card,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 8,
        padding: compact ? 14 : 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <ConnectionDot state={connectionState} />
        <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.text }}>
          {labelForState(connectionState)}
        </div>
        <div style={{ flex: 1 }} />
        {roomName && !compact && (
          <div style={{ ...css.mono, fontSize: 11, color: TOKENS.textLight }}>
            room: {roomName}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 14,
          color: TOKENS.textMed,
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        {isConnecting && <>Negotiating with LiveKit Cloud and joining the room.</>}
        {isConnected && (
          <>
            Connected to {patientName}'s voice session. Speak into your microphone — the bot's
            reply (Cartesia TTS) plays through your speakers automatically. If you don't hear
            anything, check the mute button below and your system output device.
          </>
        )}
        {connectionState === ConnectionState.Disconnected && <>Disconnected from the room.</>}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={toggleMute}
          disabled={!isConnected}
          style={{
            padding: "10px 18px",
            fontSize: 14,
            ...css.sans,
            background: muted ? TOKENS.red : TOKENS.navy,
            color: muted ? "white" : TOKENS.navyText,
            border: "none",
            borderRadius: 6,
            cursor: isConnected ? "pointer" : "not-allowed",
            opacity: isConnected ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          {muted ? "🔇 Microphone muted — click to unmute" : "🎙 Microphone live — click to mute"}
        </button>
      </div>

      {sessionId && !compact && (
        <div
          style={{
            ...css.mono,
            fontSize: 11,
            color: TOKENS.textLight,
            marginTop: 14,
          }}
        >
          session_id: {sessionId}
        </div>
      )}
    </div>
  );
}

function StatusCard({ tone, children }) {
  const colors =
    {
      info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A" },
      warn: { bg: "#FFFBEB", border: "#FCD34D", text: "#78350F" },
      error: { bg: "#FEE2E2", border: "#FECACA", text: "#7F1D1D" },
    }[tone] || { bg: TOKENS.card, border: TOKENS.border, text: TOKENS.text };
  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 8,
        padding: 18,
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function ConnectionDot({ state }) {
  const color =
    state === ConnectionState.Connected
      ? TOKENS.green
      : state === ConnectionState.Connecting || state === ConnectionState.Reconnecting
      ? TOKENS.amber
      : state === ConnectionState.Disconnected
      ? TOKENS.red
      : TOKENS.textLight;
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: state === ConnectionState.Connected ? `0 0 6px ${TOKENS.green}66` : "none",
      }}
    />
  );
}

function labelForState(state) {
  switch (state) {
    case ConnectionState.Connecting:
      return "Connecting to LiveKit room…";
    case ConnectionState.Connected:
      return "Connected";
    case ConnectionState.Reconnecting:
      return "Reconnecting…";
    case ConnectionState.Disconnected:
      return "Disconnected";
    default:
      return String(state);
  }
}
