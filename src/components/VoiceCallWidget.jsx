import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DT } from '../demo/tokens';

// ── Demo transcript timeline (Apr 8 Marcus Williams session) ──
const DEMO_TIMELINE = [
  { t: 0,    speaker: 'Vardana', text: 'Hi Marcus, this is Vardana. Is this a good time to talk?' },
  { t: 6,    speaker: 'Marcus',  text: 'Yes, this is fine.' },
  { t: 8,    speaker: 'Vardana', text: "You're on day 22 of your 90-day program. How are you feeling today?" },
  { t: 14,   speaker: 'Marcus',  text: 'Feel a little tired today.' },
  { t: 18,   speaker: 'Vardana', text: "I'm sorry to hear that. Is this lower than your usual energy level?" },
  { t: 26,   speaker: 'Marcus',  text: 'A bit lower than my usual energy level.' },
  { t: 70,   speaker: 'Marcus',  text: "I had some chest pain earlier, but I think it's better now." },
  { t: 74,   speaker: 'Vardana', text: 'Marcus, I want to make sure we take that seriously...' },
  { t: 90,   type: 'alert', payload: { patient_name: 'Marcus Williams', risk_level: 'HIGH', reason: 'Chest pain reported — upper chest, few seconds, resolved', flag_id: 'f091fbb0' } },
  { t: 105,  speaker: 'Vardana', text: "I'm letting your care coordinator know right now. If that pain returns, please call nine-one-one immediately." },
  { t: 130,  speaker: 'Marcus',  text: "I'm okay right now." },
  { t: 140,  speaker: 'Vardana', text: 'Your coordinator will be in touch soon. You did the right thing by mentioning it.' },
  { t: 150,  type: 'end' },
];

const EC2_BASE = 'http://3.89.228.45:8765';

function playAlertPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 200);
  } catch {}
}

function WaveformBars({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
      {[0, 0.15, 0.3, 0.1, 0.25].map((delay, i) => (
        <div key={i} style={{
          width: 3,
          height: active ? [12, 18, 10, 16, 14][i] : 4,
          background: active ? DT.accent : 'rgba(255,255,255,0.2)',
          borderRadius: 2,
          transition: 'height 0.15s ease',
          animation: active ? `waveBar 0.8s ease-in-out ${delay}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

// ── Patient Mode UI (phone-style call screen) ──
function PatientCallUI({ transcript, elapsed, status, isSpeaking, onEnd, isDemo }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      background: '#0C1420',
      borderRadius: DT.radius.lg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 420,
      position: 'relative',
    }}>
      <style>{`
        @keyframes waveBar { from { height: 4px; } to { height: var(--bar-h, 16px); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* Demo mode label */}
      {isDemo && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4, padding: '2px 6px',
        }}>
          Demo mode &middot; pre-recorded session
        </div>
      )}

      {/* Call header */}
      <div style={{ padding: '20px 20px 16px', textAlign: 'center' }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${DT.accent}, ${DT.accentDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 22, fontWeight: 800, color: 'white',
        }}>
          V
        </div>
        <WaveformBars active={isSpeaking} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
          {status === 'connecting' ? 'Connecting...' : isSpeaking ? 'Vardana is speaking...' : status === 'active' ? 'Listening...' : 'Processing...'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {transcript.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: msg.speaker === 'Marcus' ? 'flex-end' : 'flex-start',
            animation: 'fadeSlideIn 0.3s ease-out',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3,
              color: msg.speaker === 'Marcus' ? 'rgba(52,211,153,0.6)' : `${DT.accent}99`,
            }}>
              {msg.speaker === 'Vardana' ? 'Vardana AI' : msg.speaker}
            </div>
            <div style={{
              padding: '9px 13px', maxWidth: '85%',
              borderRadius: msg.speaker === 'Marcus' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.speaker === 'Marcus' ? 'rgba(52,211,153,0.12)' : 'rgba(61,191,160,0.08)',
              border: `1px solid ${msg.speaker === 'Marcus' ? 'rgba(52,211,153,0.2)' : 'rgba(61,191,160,0.15)'}`,
              color: msg.speaker === 'Marcus' ? 'rgba(52,211,153,0.9)' : `${DT.accent}E6`,
              fontSize: 12, lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* End call */}
      {status === 'active' && (
        <div style={{ padding: '12px 16px 16px' }}>
          <button onClick={onEnd} style={{
            width: '100%', padding: '12px', borderRadius: DT.radius.md,
            background: DT.crimson, color: 'white', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: DT.font.body,
          }}>
            End call
          </button>
        </div>
      )}
    </div>
  );
}

// ── Demo Mode UI (split: patient phone + coordinator panel) ──
function DemoCallUI({ transcript, elapsed, status, isSpeaking, onEnd, alert, fhirCount, sessionId, isDemo }) {
  return (
    <div>
      {/* Session metadata bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, padding: '10px 16px',
        background: DT.bg.well, borderRadius: DT.radius.sm, marginBottom: 16,
        fontSize: 11, color: DT.text.muted, fontFamily: DT.font.body,
      }}>
        <span>Session: <strong style={{ color: DT.text.primary }}>{sessionId}</strong></span>
        <span>Duration: <strong style={{ color: DT.text.primary }}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</strong></span>
        <span>FHIR calls: <strong style={{ color: DT.text.primary }}>{fhirCount}</strong></span>
        <span>Escalation: <strong style={{ color: alert ? DT.crimson : DT.jade.default }}>{alert ? 'FIRED' : 'None'}</strong></span>
      </div>

      {/* Split view */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Patient phone frame */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Patient View</div>
          <PatientCallUI
            transcript={transcript}
            elapsed={elapsed}
            status={status}
            isSpeaking={isSpeaking}
            onEnd={onEnd}
            isDemo={isDemo}
          />
        </div>

        {/* Right: Coordinator alert panel */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Coordinator Alert Panel</div>
          <div style={{
            background: DT.bg.card, border: `1px solid ${DT.border.subtle}`,
            borderRadius: DT.radius.lg, padding: 20, minHeight: 420,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary, marginBottom: 14 }}>Real-time Alerts</div>

            {!alert ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: DT.jade.light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DT.jade.default} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div style={{ fontSize: 13, color: DT.text.muted }}>No alerts — session in progress</div>
                  <div style={{ fontSize: 11, color: DT.text.faint, marginTop: 4 }}>Alerts appear here when clinical events are detected</div>
                </div>
              </div>
            ) : (
              <div style={{ animation: 'alertSlideIn 0.4s ease-out' }}>
                <style>{`@keyframes alertSlideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
                <div style={{
                  background: DT.crimsonBg, border: `1px solid ${DT.crimsonLight}`,
                  borderLeft: `4px solid ${DT.crimson}`, borderRadius: DT.radius.sm,
                  padding: '14px 16px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: DT.crimson, background: DT.crimsonLight, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {alert.risk_level}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary }}>{alert.patient_name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: DT.text.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                    {alert.reason}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: DT.text.muted }}>
                    <span>Flag: {alert.flag_id}</span>
                    <span>Coordinator notified</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', marginBottom: 8 }}>Recommended</div>
                {[
                  'Immediate coordinator callback',
                  'Rule out cardiac event — consider ER referral',
                  'Increase monitoring frequency',
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: DT.text.secondary, marginBottom: 4, alignItems: 'center' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: DT.crimson, flexShrink: 0 }} />
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Widget ──
export default function VoiceCallWidget({
  patientId,
  sessionToken = 'demo',
  onComplete,
  onAlert,
  mode = 'patient',
}) {
  const [status, setStatus] = useState('connecting'); // connecting | active | complete
  const [transcript, setTranscript] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [alert, setAlert] = useState(null);
  const [fhirCount, setFhirCount] = useState(0);

  const roomRef = useRef(null);
  const wsRef = useRef(null);
  const timersRef = useRef([]);
  const elapsedRef = useRef(null);
  const startTimeRef = useRef(null);
  const cancelledRef = useRef(false);

  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  const useDemoMode = isProduction || sessionToken === 'demo';
  const sessionId = useRef(`sess-${Math.random().toString(36).slice(2, 10)}`).current;

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (roomRef.current) {
      try { roomRef.current.disconnect(); } catch {}
      roomRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (status !== 'active') return;
    startTimeRef.current = Date.now();
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [status]);

  // ── Demo fallback mode ──
  useEffect(() => {
    if (!useDemoMode) return;
    cancelledRef.current = false;

    // Brief connecting state
    const connectTimer = setTimeout(() => {
      if (cancelledRef.current) return;
      setStatus('active');

      // Schedule each timeline event
      DEMO_TIMELINE.forEach(event => {
        const timer = setTimeout(() => {
          if (cancelledRef.current) return;

          if (event.type === 'alert') {
            setAlert(event.payload);
            setFhirCount(c => c + 3);
            playAlertPing();
            if (onAlert) onAlert(event.payload);
          } else if (event.type === 'end') {
            setStatus('complete');
            if (onComplete) onComplete({
              session_id: sessionId,
              duration: 150,
              transcript_lines: DEMO_TIMELINE.filter(e => e.speaker).length,
              alert_fired: true,
            });
          } else {
            setTranscript(prev => [...prev, { speaker: event.speaker, text: event.text }]);
            setIsSpeaking(event.speaker === 'Vardana');
            setFhirCount(c => c + 1);
            // Clear speaking after short delay for Vardana lines
            if (event.speaker === 'Vardana') {
              const clearTimer = setTimeout(() => {
                if (!cancelledRef.current) setIsSpeaking(false);
              }, 3000);
              timersRef.current.push(clearTimer);
            }
          }
        }, event.t * 1000);
        timersRef.current.push(timer);
      });
    }, 1500);
    timersRef.current.push(connectTimer);

    return cleanup;
  }, [useDemoMode, onComplete, onAlert, cleanup, sessionId]);

  // ── Live mode (localhost only) ──
  useEffect(() => {
    if (useDemoMode) return;
    cancelledRef.current = false;

    const startLiveSession = async () => {
      try {
        const res = await fetch(`${EC2_BASE}/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: patientId }),
        });

        if (!res.ok) throw new Error('Session start failed');
        const data = await res.json();

        // Connect LiveKit
        const { Room, RoomEvent, Track } = await import('livekit-client');
        const room = new Room();
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            el.autoplay = true;
            document.body.appendChild(el);
          }
        });

        room.on(RoomEvent.ParticipantConnected, () => {
          setStatus('active');
        });

        await room.connect(data.livekit_url, data.patient_token);
        await room.localParticipant.setMicrophoneEnabled(true);
        setStatus('active');

        // WebSocket for alerts
        try {
          const ws = new WebSocket(`ws://3.89.228.45:8765/ws`);
          wsRef.current = ws;
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'coordinator_alert') {
                setAlert(msg.data);
                playAlertPing();
                if (onAlert) onAlert(msg.data);
              } else if (msg.type === 'transcript_update') {
                setTranscript(prev => [...prev, { speaker: msg.data.speaker, text: msg.data.text }]);
                setIsSpeaking(msg.data.speaker === 'Vardana');
              }
            } catch {}
          };
        } catch {}

      } catch {
        // Fallback to demo mode — re-mount will trigger demo useEffect
        // This is handled by the parent checking useDemoMode
        console.warn('Live session failed, falling back to demo mode');
      }
    };

    startLiveSession();
    return cleanup;
  }, [useDemoMode, patientId, onAlert, cleanup]);

  const handleEnd = () => {
    cleanup();
    setStatus('complete');
    if (onComplete) onComplete({
      session_id: sessionId,
      duration: elapsed,
      transcript_lines: transcript.length,
      alert_fired: !!alert,
    });
  };

  if (mode === 'demo') {
    return (
      <DemoCallUI
        transcript={transcript}
        elapsed={elapsed}
        status={status}
        isSpeaking={isSpeaking}
        onEnd={handleEnd}
        alert={alert}
        fhirCount={fhirCount}
        sessionId={sessionId}
        isDemo={useDemoMode}
      />
    );
  }

  return (
    <PatientCallUI
      transcript={transcript}
      elapsed={elapsed}
      status={status}
      isSpeaking={isSpeaking}
      onEnd={handleEnd}
      isDemo={useDemoMode}
    />
  );
}
