import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import "@livekit/components-styles";

// Manual test surface for the EC2 voice pipeline (Pipecat bot in a LiveKit
// Cloud room). Lives at /voice-test, intentionally separate from the demo
// flow at /demo/{token} so investor demos don't see this surface.
//
// Flow on mount:
//   1. POST /api/session-start with patient_id "marcus-williams-test"
//   2. Receive { livekit_url, patient_token, session_id, room_name }
//   3. Render <LiveKitRoom> with that URL+token; the bot is already in
//      the room server-side, so subscribe-and-publish just works.
//   4. <RoomAudioRenderer /> attaches remote audio tracks to <audio>
//      elements so the bot's TTS plays without manual track wiring.
//
// On unmount: POST /api/session-end so the bot stops and the room closes.

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

export default function VoiceTestPage() {
  // ── Lifecycle: fetch session credentials, then render the room ──
  // Stages: "init" → "starting" → "ready" → "ended" | "error"
  const [stage, setStage] = useState("init");
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(null);
  const endCalledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStage("starting");
      try {
        const res = await fetch("/api/session-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: "marcus-williams-test", mode: "voice" }),
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
  }, []);

  // Tear down the backend session on unmount + on tab close. keepalive lets
  // the request survive even if the page is being torn down.
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
    window.addEventListener("beforeunload", endSession);
    return () => {
      window.removeEventListener("beforeunload", endSession);
      endSession();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: TOKENS.bg, ...css.sans, padding: "32px 28px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ ...css.serif, fontSize: 28, color: TOKENS.text, margin: 0 }}>Voice pipeline test</h1>
        <div style={{ fontSize: 13, color: TOKENS.textLight, marginTop: 4, marginBottom: 24 }}>
          /voice-test · Pipecat bot via LiveKit Cloud · patient_id=marcus-williams-test
        </div>

        {(stage === "init" || stage === "starting") && (
          <StatusCard tone="info">Starting voice session — backend is spawning the bot worker.</StatusCard>
        )}

        {stage === "error" && (
          <StatusCard tone="error">
            <strong style={{ display: "block", marginBottom: 6 }}>Could not start session</strong>
            <code style={{ ...css.mono, fontSize: 12, color: TOKENS.red, whiteSpace: "pre-wrap" }}>{error}</code>
          </StatusCard>
        )}

        {stage === "ready" && creds && (
          <LiveKitRoom
            token={creds.token}
            serverUrl={creds.livekitUrl}
            connect={true}
            audio={true}
            video={false}
            // onError surfaces low-level connection failures (auth, ICE) that
            // wouldn't otherwise reach the user.
            onError={(e) => {
              setError(`LiveKit error: ${e.message || String(e)}`);
              setStage("error");
            }}
            onDisconnected={() => setStage(prev => prev === "ended" ? prev : "disconnected")}
          >
            <RoomBody roomName={creds.roomName} sessionId={creds.sessionId} />
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

// Body of the LiveKitRoom — split out so it can use the LiveKit React hooks
// (which only work below the LiveKitRoom provider).
function RoomBody({ roomName, sessionId }) {
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  const isConnecting = connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  const toggleMute = async () => {
    if (!localParticipant) return;
    const next = !muted;
    // setMicrophoneEnabled(false) unpublishes the track entirely; we want to
    // keep it published so the bot keeps tracking us, just muted. Use the
    // track-level mute on the published mic track instead.
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub?.track) {
      if (next) await pub.track.mute();
      else await pub.track.unmute();
      setMuted(next);
    } else {
      // Fall back to enable/disable when no track is published yet.
      await localParticipant.setMicrophoneEnabled(!next);
      setMuted(next);
    }
  };

  return (
    <div style={{ background: TOKENS.card, border: `1px solid ${TOKENS.border}`, borderRadius: 8, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <ConnectionDot state={connectionState} />
        <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.text }}>
          {labelForState(connectionState)}
        </div>
        <div style={{ flex: 1 }} />
        {roomName && (
          <div style={{ ...css.mono, fontSize: 11, color: TOKENS.textLight }}>
            room: {roomName}
          </div>
        )}
      </div>

      <div style={{ fontSize: 14, color: TOKENS.textMed, lineHeight: 1.6, marginBottom: 14 }}>
        {isConnecting && <>Negotiating with LiveKit Cloud and joining the room.</>}
        {isConnected && (
          <>
            Connected. Speak into your microphone. The bot's reply (Cartesia TTS) plays
            through your speakers automatically. If you don't hear anything, check the
            mute button below and your system output device.
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

      {sessionId && (
        <div style={{ ...css.mono, fontSize: 11, color: TOKENS.textLight, marginTop: 14 }}>
          session_id: {sessionId}
        </div>
      )}
    </div>
  );
}

function StatusCard({ tone, children }) {
  const colors = {
    info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A" },
    warn: { bg: "#FFFBEB", border: "#FCD34D", text: "#78350F" },
    error: { bg: "#FEE2E2", border: "#FECACA", text: "#7F1D1D" },
  }[tone] || { bg: TOKENS.card, border: TOKENS.border, text: TOKENS.text };
  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
      borderRadius: 8, padding: 18, fontSize: 14, lineHeight: 1.55,
    }}>
      {children}
    </div>
  );
}

function ConnectionDot({ state }) {
  const color =
    state === ConnectionState.Connected ? TOKENS.green :
    state === ConnectionState.Connecting || state === ConnectionState.Reconnecting ? TOKENS.amber :
    state === ConnectionState.Disconnected ? TOKENS.red :
    TOKENS.textLight;
  return (
    <span style={{
      width: 9, height: 9, borderRadius: "50%", background: color,
      display: "inline-block", flexShrink: 0,
      boxShadow: state === ConnectionState.Connected ? `0 0 6px ${TOKENS.green}66` : "none",
    }} />
  );
}

function labelForState(state) {
  switch (state) {
    case ConnectionState.Connecting: return "Connecting to LiveKit room…";
    case ConnectionState.Connected: return "Connected";
    case ConnectionState.Reconnecting: return "Reconnecting…";
    case ConnectionState.Disconnected: return "Disconnected";
    default: return String(state);
  }
}
