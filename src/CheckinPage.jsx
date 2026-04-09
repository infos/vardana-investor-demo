import React, { useState, useEffect } from 'react';
import { DT } from './demo/tokens';
import VoiceCallWidget from './components/VoiceCallWidget';

const MOCK_DATA = {
  firstName: 'Marcus',
  programDay: 22,
  totalDays: 90,
  program: '90-Day Cardiometabolic Management Program',
  vitals: [
    { label: 'Blood Pressure', value: '138/84', unit: 'mmHg', goal: '<130/80', status: 'above-goal' },
    { label: 'Fasting Glucose', value: '126', unit: 'mg/dL', goal: '<100', status: 'above-goal' },
    { label: 'Weight', value: '96.8', unit: 'kg', goal: 'Stable', status: 'on-track' },
  ],
  sessions: [
    { date: 'Mar 15', summary: 'Discussed medication adherence', status: 'completed' },
    { date: 'Mar 12', summary: 'BP trending review', status: 'completed' },
    { date: 'Mar 8', summary: 'Glucose management check-in', status: 'completed' },
  ],
};


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch { return null; }
}

function ProgressPhases({ day, total }) {
  const pct = (day / total) * 100;
  const phases = [
    { label: 'Stabilize', range: '1-30', end: 33.3 },
    { label: 'Optimize', range: '31-60', end: 66.6 },
    { label: 'Maintain', range: '61-90', end: 100 },
  ];
  return (
    <div>
      <div style={{ position: 'relative', height: 8, background: DT.bg.well, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${DT.jade.default}, ${DT.accent})`, borderRadius: 4, transition: 'width 1s ease' }} />
        {/* Phase dividers */}
        <div style={{ position: 'absolute', left: '33.3%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.8)' }} />
        <div style={{ position: 'absolute', left: '66.6%', top: 0, width: 1, height: '100%', background: 'rgba(255,255,255,0.8)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {phases.map((p, i) => (
          <span key={i} style={{ fontSize: 10, color: pct >= (i === 0 ? 0 : phases[i - 1].end) ? DT.accent : DT.text.muted, fontWeight: 600, fontFamily: DT.font.body }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function VitalCard({ vital }) {
  const isOnTrack = vital.status === 'on-track';
  return (
    <div style={{
      background: DT.bg.card,
      border: `1px solid ${DT.border.subtle}`,
      borderRadius: DT.radius.md,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: DT.font.body }}>{vital.label}</span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: isOnTrack ? DT.jade.default : DT.amber.default,
          background: isOnTrack ? DT.jade.light : DT.amber.light,
          padding: '2px 6px', borderRadius: 4,
        }}>
          {isOnTrack ? 'On Track' : 'Above Goal'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display }}>{vital.value}</span>
        <span style={{ fontSize: 12, color: DT.text.muted }}>{vital.unit}</span>
      </div>
      <div style={{ fontSize: 11, color: DT.text.muted, marginTop: 4 }}>Goal: {vital.goal}</div>
    </div>
  );
}

function SchedulePicker({ onSchedule, onCancel }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [scheduled, setScheduled] = useState(false);

  if (scheduled) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: DT.jade.light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={DT.jade.default} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: DT.text.primary, fontFamily: DT.font.display }}>Scheduled!</div>
        <div style={{ fontSize: 13, color: DT.text.secondary, marginTop: 4 }}>We'll call you on {date} at {time}</div>
        <button onClick={onCancel} style={{ marginTop: 16, background: 'none', border: 'none', color: DT.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: DT.font.body }}>Done</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DT.text.primary, marginBottom: 12, fontFamily: DT.font.body }}>Schedule your check-in</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ flex: 1, padding: '10px 12px', borderRadius: DT.radius.sm, border: `1px solid ${DT.border.default}`, fontSize: 14, fontFamily: DT.font.body, color: DT.text.primary }}
        />
        <select
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: DT.radius.sm, border: `1px solid ${DT.border.default}`, fontSize: 14, fontFamily: DT.font.body, color: DT.text.primary, background: DT.bg.card }}
        >
          {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: DT.radius.md, border: `1px solid ${DT.border.default}`, background: DT.bg.card, color: DT.text.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: DT.font.body }}>Cancel</button>
        <button
          onClick={() => {
            if (!date) return;
            setScheduled(true);
            onSchedule({ date, time });
          }}
          style={{ flex: 1, padding: '10px', borderRadius: DT.radius.md, border: 'none', background: DT.accent, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: DT.font.body, opacity: date ? 1 : 0.5 }}
        >Confirm</button>
      </div>
    </div>
  );
}

export default function CheckinPage({ navigate }) {
  const [state, setState] = useState('idle'); // idle | connecting | active | complete
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const isDemo = new URLSearchParams(window.location.search).get('token') === 'demo';

  // Load patient data
  useEffect(() => {
    if (isDemo) {
      setTimeout(() => { setData(MOCK_DATA); setLoading(false); }, 500);
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setLoading(false); return; }
    const payload = decodeJWT(token);
    if (!payload?.patient_id) { setLoading(false); return; }
    fetch(`https://3.89.228.45:8765/api/patient/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(MOCK_DATA); setLoading(false); });
  }, []);

  const startCall = () => {
    setState('connecting');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: DT.bg.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DT.font.body }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${DT.border.subtle}`, borderTopColor: DT.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 14, color: DT.text.muted }}>Loading your check-in...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: DT.bg.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DT.font.body, padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: DT.text.primary, marginBottom: 8, fontFamily: DT.font.display }}>Invalid or missing token</div>
          <div style={{ fontSize: 14, color: DT.text.secondary }}>Please use the link from your SMS or email to access your check-in.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: DT.bg.page, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: DT.font.body }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease-out' }}>
        {/* Logo + Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: DT.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M16 7C11 7 7 11 7 16s4 9 9 9 9-4 9-9-4-9-9-9zm0 14.5c-1.5 0-3-0.8-3.8-2.2l1.3-0.8c0.5 0.9 1.4 1.5 2.5 1.5s2-0.6 2.5-1.5l1.3 0.8c-0.8 1.4-2.3 2.2-3.8 2.2zm4.5-5h-9v-1.5h9v1.5z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontFamily: DT.font.display, fontSize: 18, color: DT.text.primary }}>Vardana</span>
          </div>
          <h1 style={{ fontFamily: DT.font.display, fontSize: 24, fontWeight: 400, color: DT.text.primary, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            {getGreeting()}, {data.firstName}
          </h1>
          <p style={{ fontSize: 13, color: DT.text.muted, margin: 0 }}>
            Day {data.programDay} of {data.totalDays} — {data.program}
          </p>
        </div>

        {/* Program Progress */}
        <div style={{ background: DT.bg.card, border: `1px solid ${DT.border.subtle}`, borderRadius: DT.radius.lg, padding: '18px 20px', marginBottom: 16 }}>
          <ProgressPhases day={data.programDay} total={data.totalDays} />
        </div>

        {/* Vitals */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: DT.font.body }}>Latest Vitals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.vitals.map((v, i) => <VitalCard key={i} vital={v} />)}
          </div>
        </div>

        {/* Recent Sessions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: DT.font.body }}>Recent Sessions</div>
          <div style={{ background: DT.bg.card, border: `1px solid ${DT.border.subtle}`, borderRadius: DT.radius.lg, overflow: 'hidden' }}>
            {data.sessions.map((s, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < data.sessions.length - 1 ? `1px solid ${DT.border.subtle}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DT.text.primary }}>{s.summary}</div>
                  <div style={{ fontSize: 11, color: DT.text.muted, marginTop: 2 }}>{s.date}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.jade.default, background: DT.jade.light, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STATE: Idle — CTA */}
        {state === 'idle' && (
          <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <button
              onClick={startCall}
              style={{
                width: '100%', padding: '16px', borderRadius: DT.radius.md,
                background: DT.accent, color: 'white', border: 'none',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: DT.font.body, transition: DT.transition,
                boxShadow: `0 4px 16px ${DT.accent}40`,
              }}
            >
              Start my check-in call
            </button>
            {!showScheduler && (
              <button
                onClick={() => setShowScheduler(true)}
                style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: DT.text.muted, fontSize: 13, cursor: 'pointer', fontFamily: DT.font.body, padding: '8px 0' }}
              >
                Not a good time? Schedule later
              </button>
            )}
            {showScheduler && (
              <SchedulePicker
                onSchedule={(dt) => {
                  if (!isDemo) {
                    const token = new URLSearchParams(window.location.search).get('token');
                    fetch('https://3.89.228.45:8765/session/schedule', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify(dt),
                    }).catch(() => {});
                  }
                }}
                onCancel={() => setShowScheduler(false)}
              />
            )}
          </div>
        )}

        {/* STATE: Connecting + Active (VoiceCallWidget) */}
        {(state === 'connecting' || state === 'active') && (
          <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <VoiceCallWidget
              patientId={isDemo ? '1de9768a-2459-4586-a888-d184a70479cc' : new URLSearchParams(window.location.search).get('patient_id') || ''}
              sessionToken={new URLSearchParams(window.location.search).get('token') || 'demo'}
              mode="patient"
              onComplete={() => setState('complete')}
            />
          </div>
        )}

        {/* STATE: Complete */}
        {state === 'complete' && (
          <div style={{ background: DT.bg.card, border: `1px solid ${DT.border.subtle}`, borderRadius: DT.radius.lg, padding: '32px 24px', textAlign: 'center', animation: 'fadeUp 0.3s ease-out' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: DT.jade.light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={DT.jade.default} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display, marginBottom: 8 }}>Check-in complete</div>
            <div style={{ fontSize: 14, color: DT.text.secondary, lineHeight: 1.6, marginBottom: 4 }}>
              Your responses have been shared with your care team.
            </div>
            <div style={{ fontSize: 13, color: DT.text.muted, marginBottom: 24 }}>
              Your next check-in is scheduled for <strong style={{ color: DT.text.primary }}>March 20, 2026 at 9:00 AM</strong>
            </div>
            <button
              onClick={() => navigate ? navigate('/') : window.location.href = '/'}
              style={{
                padding: '12px 32px', borderRadius: DT.radius.md,
                background: DT.accent, color: 'white', border: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: DT.font.body,
              }}
            >
              Return to portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
