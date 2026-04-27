/**
 * ChatCheckinDemo
 *
 * Two-pane chat surface used inside the Care Console — same brain as voice,
 * different transport. Live mode talks to the EC2 voice service via:
 *   POST /session/start { patient_id, mode: "chat" } -> { session_id }
 *   POST /chat/turn     { session_id, patient_id, message }
 *   POST /session/end   { session_id }   (skipped in replay mode)
 *
 * Replay mode plays back a static JSON scenario at recorded delays — no
 * backend traffic, no Encounter persistence.
 *
 * Design system: reuses the CoordinatorDashboard palette (S object). No new
 * tokens introduced.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

// Same tokens as CoordinatorDashboard. Inlined here so this component is
// self-contained and can be used outside the dashboard if needed.
const S = {
  bg: "#F0EEE8", card: "#FAFAF8", border: "#E5E1D8",
  navy: "#0D1B2A", navyText: "#E2D5B8",
  text: "#1A1A1A", textMed: "#5C5C4A", textLight: "#5C5C4A",
  amber: "#D97706", amberBg: "#FFFBEB", amberText: "#78350F",
  green: "#059669", greenBg: "#DCFCE7", greenText: "#14532D",
  red: "#EF4444", redBg: "#FEE2E2", redText: "#7F1D1D",
  blue: "#1E3A8A", blueBg: "#EFF6FF",
};
const css = {
  sans: { fontFamily: "'DM Sans', Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" },
  serif: { fontFamily: "'DM Serif Display', Georgia, serif" },
};

const VOICE_BASE_URL = (import.meta.env.VITE_VOICE_BASE_URL || "https://voice.vardana.ai").replace(/\/+$/, "");
const VOICE_SESSION_TOKEN = import.meta.env.VITE_VOICE_SESSION_TOKEN || "";

function authHeaders() {
  const h = { "Content-Type": "application/json" };
  if (VOICE_SESSION_TOKEN) h["Authorization"] = `Bearer ${VOICE_SESSION_TOKEN}`;
  return h;
}

const ESCALATION_BADGE_COLORS = {
  STABLE: { bg: S.greenBg, text: S.greenText, border: "#BBF7D0" },
  WATCH: { bg: S.amberBg, text: S.amberText, border: "#FDE68A" },
  "SAME-DAY": { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
  IMMEDIATE: { bg: S.redBg, text: S.redText, border: "#FECACA" },
};

// Patient bubbles use the warm amber-on-cream palette already in the dashboard;
// AI bubbles use the dark navy slate for the same look as the rest of the
// console. No new tokens.
function Bubble({ role, text }) {
  const isAI = role === "ai";
  return (
    <div style={{
      display: "flex",
      justifyContent: isAI ? "flex-start" : "flex-end",
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: "75%",
        background: isAI ? S.navy : S.amberBg,
        color: isAI ? S.navyText : S.amberText,
        padding: "10px 14px",
        borderRadius: 14,
        borderTopLeftRadius: isAI ? 4 : 14,
        borderTopRightRadius: isAI ? 14 : 4,
        fontSize: 15,
        ...css.sans,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        border: isAI ? "none" : `1px solid #FDE68A`,
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
      <div style={{
        background: S.navy, color: S.navyText, padding: "10px 14px",
        borderRadius: 14, borderTopLeftRadius: 4,
        display: "inline-flex", gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: S.navyText, opacity: 0.5,
            animation: `chatBubblePulse 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function EscalationBadge({ state }) {
  const c = ESCALATION_BADGE_COLORS[state] || ESCALATION_BADGE_COLORS.STABLE;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 13, ...css.sans, fontWeight: 700,
      background: c.bg, color: c.text,
      padding: "3px 8px", borderRadius: 4,
      border: `1px solid ${c.border}`,
      letterSpacing: "0.04em",
    }}>{state}</span>
  );
}

function FhirCallRow({ method, path, result }) {
  const isPost = method === "POST";
  return (
    <div style={{
      background: "#FAFAF8", borderRadius: 6, padding: "7px 10px",
      border: `1px solid ${isPost ? "#FDE68A" : S.border}`,
      animation: "chatFhirIn 0.3s ease",
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: isPost ? S.amberBg : "#ECFDF5",
          color: isPost ? S.amberText : S.greenText,
          padding: "1px 5px", borderRadius: 3,
        }}>{method}</span>
        <span style={{
          fontSize: 11, ...css.mono, color: S.textMed,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>{path}</span>
      </div>
      <div style={{ fontSize: 12, ...css.sans, color: S.textMed }}>→ {result}</div>
    </div>
  );
}

const KICKOFF_PATIENT_MESSAGE = "Hi, I just opened the chat for my check-in.";

export default function ChatCheckinDemo({
  patient,             // { id, name } — id is the FHIR Patient.id
  mode = "live",       // "live" | "replay"
  scenario = null,     // required for mode="replay"; the parsed scenario JSON
  onClose,
}) {
  const isReplay = mode === "replay";

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);            // [{ role, text }]
  const [fhirActivity, setFhirActivity] = useState([]);    // [{ method, path, result }]
  const [escalationState, setEscalationState] = useState("STABLE");
  const [synthesis, setSynthesis] = useState("Conversation starting.");
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [replayDone, setReplayDone] = useState(false);
  const [sessionStartedAt] = useState(() => new Date());

  const threadRef = useRef(null);
  const cancelledRef = useRef(false);
  const sessionIdRef = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isTyping]);

  // Track sessionId in a ref so async cleanup can reach it
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── LIVE MODE: open session on mount, send kickoff to elicit greeting ──
  useEffect(() => {
    if (isReplay) return;
    cancelledRef.current = false;

    (async () => {
      try {
        const startRes = await fetch(`${VOICE_BASE_URL}/session/start`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ patient_id: patient.id, mode: "chat" }),
        });
        if (!startRes.ok) throw new Error(`/session/start failed: ${startRes.status}`);
        const { session_id } = await startRes.json();
        if (cancelledRef.current) return;
        setSessionId(session_id);
        await sendTurnLive(session_id, KICKOFF_PATIENT_MESSAGE, /*hideUserBubble=*/ true);
      } catch (e) {
        if (!cancelledRef.current) setError(`Could not start chat: ${e.message}`);
      }
    })();

    return () => {
      cancelledRef.current = true;
      const sid = sessionIdRef.current;
      if (sid) {
        // Fire-and-forget /session/end — best-effort Encounter persistence
        fetch(`${VOICE_BASE_URL}/session/end`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ session_id: sid }),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplay, patient.id]);

  async function sendTurnLive(sid, text, hideUserBubble = false) {
    if (!sid) return;
    if (!hideUserBubble) {
      setMessages(prev => [...prev, { role: "patient", text }]);
    }
    setIsTyping(true);
    try {
      const res = await fetch(`${VOICE_BASE_URL}/chat/turn`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: sid,
          patient_id: patient.id,
          message: text,
        }),
      });
      if (!res.ok) throw new Error(`/chat/turn failed: ${res.status}`);
      const data = await res.json();
      if (cancelledRef.current) return;
      setIsTyping(false);
      if (data.fhir_calls?.length) {
        setFhirActivity(prev => [...prev, ...data.fhir_calls]);
      }
      if (data.escalation_state) setEscalationState(data.escalation_state);
      if (data.synthesis) setSynthesis(data.synthesis);
      if (data.reply) {
        setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setIsTyping(false);
        setError(e.message);
      }
    }
  }

  function handleSendLive() {
    const text = input.trim();
    if (!text || isTyping || !sessionId) return;
    setInput("");
    sendTurnLive(sessionId, text);
  }

  // ── REPLAY MODE: iterate scenario.turns at recorded pacing ──
  // Driver state machine: idx points to the next turn to play. paused gates the
  // tick. Skip-to-end flushes everything synchronously. Replay resets state.
  const [replayIdx, setReplayIdx] = useState(0);
  const replayTimerRef = useRef(null);

  function resetReplay() {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setMessages([]);
    setFhirActivity([]);
    setEscalationState("STABLE");
    setSynthesis(scenario?.synthesis_initial || "Conversation starting.");
    setIsTyping(false);
    setReplayIdx(0);
    setReplayDone(false);
    setPaused(false);
  }

  function skipReplayToEnd() {
    if (!isReplay || !scenario) return;
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsTyping(false);
    const remaining = scenario.turns.slice(replayIdx);
    const allMessages = [
      ...messages,
      ...remaining.map(t => ({ role: t.role, text: t.content })),
    ];
    const allFhir = [
      ...fhirActivity,
      ...remaining.flatMap(t => t.fhir_calls || []),
    ];
    setMessages(allMessages);
    setFhirActivity(allFhir);
    if (scenario.escalation_state) setEscalationState(scenario.escalation_state);
    if (scenario.synthesis) setSynthesis(scenario.synthesis);
    setReplayIdx(scenario.turns.length);
    setReplayDone(true);
  }

  useEffect(() => {
    if (!isReplay || !scenario) return;
    if (paused || replayDone) return;
    if (replayIdx >= scenario.turns.length) {
      setReplayDone(true);
      if (scenario.synthesis) setSynthesis(scenario.synthesis);
      if (scenario.escalation_state) setEscalationState(scenario.escalation_state);
      return;
    }

    const turn = scenario.turns[replayIdx];
    const delay = Math.max(200, turn.delay_ms || 1200);

    if (turn.role === "ai") setIsTyping(true);

    replayTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: turn.role, text: turn.content }]);
      if (turn.fhir_calls?.length) {
        setFhirActivity(prev => [...prev, ...turn.fhir_calls]);
      }
      if (turn.escalation_state) setEscalationState(turn.escalation_state);
      if (turn.synthesis_snapshot) setSynthesis(turn.synthesis_snapshot);
      setReplayIdx(i => i + 1);
    }, delay);

    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [isReplay, scenario, replayIdx, paused, replayDone]);

  // Reset state when scenario changes (different recorded conversation picked)
  useEffect(() => {
    if (!isReplay) return;
    resetReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.scenario_id, isReplay]);

  const sessionTimestamp = useMemo(() =>
    sessionStartedAt.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }), [sessionStartedAt]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 1000, display: "flex", alignItems: "stretch", justifyContent: "center",
    }}>
      <div style={{
        flex: 1, background: S.bg, display: "flex", flexDirection: "column",
        ...css.sans,
      }}>
        {/* Header */}
        <div style={{
          background: S.card, borderBottom: `1px solid ${S.border}`,
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
          height: 56, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, ...css.serif, color: S.text }}>
              {patient.name} — Chat check-in
            </div>
            <div style={{ fontSize: 12, color: S.textLight, ...css.sans }}>
              Session opened {sessionTimestamp}
            </div>
          </div>

          {/* Voice / Chat toggle — visual only, chat default */}
          <div style={{
            marginLeft: 14,
            display: "inline-flex", border: `1px solid ${S.border}`,
            borderRadius: 6, overflow: "hidden",
          }}>
            <span style={{ padding: "5px 10px", fontSize: 12, color: S.textMed, background: "transparent" }}>Voice</span>
            <span style={{ padding: "5px 10px", fontSize: 12, color: "#FFFFFF", background: S.navy, fontWeight: 700 }}>Chat</span>
          </div>

          {isReplay && (
            <span style={{
              marginLeft: 8,
              fontSize: 12, ...css.sans, fontWeight: 700,
              background: S.amberBg, color: S.amberText,
              padding: "3px 9px", borderRadius: 4,
              border: `1px solid #FDE68A`, letterSpacing: "0.04em",
            }}>
              ● Recorded — playing back
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={onClose} style={{
            fontSize: 13, ...css.sans, background: "transparent",
            color: S.textMed, border: `1px solid ${S.border}`,
            padding: "6px 12px", borderRadius: 4, cursor: "pointer",
          }}>Close</button>
        </div>

        {error && (
          <div style={{ background: S.redBg, borderBottom: `1px solid #FECACA`, padding: "8px 16px", display: "flex", gap: 10 }}>
            <span style={{ fontSize: 14, color: S.redText, flex: 1 }}>{error}</span>
            <button onClick={() => setError("")} style={{ fontSize: 12, background: "transparent", color: S.redText, border: `1px solid #FECACA`, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {/* Two-pane body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left pane: chat thread */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${S.border}` }}>
            <div ref={threadRef} style={{
              flex: 1, overflowY: "auto",
              padding: "20px 24px",
              background: S.bg,
            }}>
              {messages.length === 0 && !isTyping && (
                <div style={{
                  textAlign: "center", color: S.textLight, fontSize: 14,
                  marginTop: 60, lineHeight: 1.6,
                }}>
                  {isReplay
                    ? `Recorded scenario: ${scenario?.scenario_id || "—"}`
                    : "Connecting to AI care concierge…"}
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} text={m.text} />
              ))}
              {isTyping && <TypingDots />}
            </div>

            {/* Footer: input (live) or replay controls */}
            {isReplay ? (
              <div style={{
                background: S.card, borderTop: `1px solid ${S.border}`,
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, color: S.textMed, flex: 1 }}>
                  {replayDone
                    ? "Recording complete."
                    : paused
                      ? "Paused."
                      : "Playing recorded conversation…"}
                </span>
                {!replayDone && (
                  <>
                    <button onClick={() => setPaused(p => !p)} style={replayBtnStyle()}>
                      {paused ? "Play" : "Pause"}
                    </button>
                    <button onClick={skipReplayToEnd} style={replayBtnStyle()}>
                      Skip to end
                    </button>
                  </>
                )}
                {replayDone && (
                  <button onClick={resetReplay} style={replayBtnStyle("primary")}>
                    Replay
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                background: S.card, borderTop: `1px solid ${S.border}`,
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <input
                  type="text"
                  value={input}
                  placeholder={sessionId ? "Type a message…" : "Connecting…"}
                  disabled={!sessionId || isTyping}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSendLive(); }}
                  style={{
                    flex: 1, fontSize: 14, ...css.sans,
                    padding: "8px 12px", borderRadius: 6,
                    border: `1px solid ${S.border}`, background: "#FFFFFF",
                    color: S.text, outline: "none",
                  }}
                />
                <button
                  onClick={handleSendLive}
                  disabled={!sessionId || isTyping || !input.trim()}
                  style={{
                    padding: "8px 16px", borderRadius: 6,
                    background: (!sessionId || isTyping || !input.trim()) ? "#CBD5E1" : S.navy,
                    color: "#FFFFFF", fontWeight: 700, fontSize: 13,
                    border: "none", cursor: "pointer",
                    ...css.sans,
                  }}
                >Send</button>
              </div>
            )}
          </div>

          {/* Right pane: clinical context */}
          <div style={{
            width: 340, flexShrink: 0, display: "flex", flexDirection: "column",
            background: S.card, overflowY: "auto",
          }}>
            <div style={{ padding: "16px 18px 8px" }}>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: S.textLight, marginBottom: 8 }}>
                Escalation state
              </div>
              <EscalationBadge state={escalationState} />
            </div>

            <div style={{ padding: "8px 18px 14px" }}>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: S.textLight, marginBottom: 8 }}>
                Synthesis
              </div>
              <div style={{
                fontSize: 13, color: S.text, lineHeight: 1.55,
                background: S.bg, padding: "9px 11px",
                borderRadius: 6, border: `1px solid ${S.border}`,
              }}>
                {synthesis}
              </div>
            </div>

            <div style={{
              padding: "10px 18px 6px",
              borderTop: `1px solid ${S.border}`,
            }}>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: S.textLight }}>
                FHIR Activity
              </div>
            </div>
            <div style={{ padding: "4px 14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              {fhirActivity.length === 0 ? (
                <div style={{ fontSize: 13, color: S.textLight, textAlign: "center", padding: "16px 0", lineHeight: 1.5 }}>
                  No FHIR calls yet.
                </div>
              ) : (
                fhirActivity.slice().reverse().map((q, i) => (
                  <FhirCallRow key={fhirActivity.length - 1 - i} {...q} />
                ))
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes chatBubblePulse {
            0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-2px); }
          }
          @keyframes chatFhirIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

function replayBtnStyle(variant) {
  const base = {
    fontSize: 13, ...css.sans,
    padding: "6px 12px", borderRadius: 4, cursor: "pointer",
    border: `1px solid ${S.border}`,
  };
  if (variant === "primary") {
    return { ...base, background: S.navy, color: "#FFFFFF", border: "none", fontWeight: 700 };
  }
  return { ...base, background: "transparent", color: S.textMed };
}
