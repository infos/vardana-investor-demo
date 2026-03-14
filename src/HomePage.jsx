import { useState, useEffect } from 'react';

// ─── Mini coordinator widget shown in hero ───────────────────────────────────
function HeroWidget() {
  const [riskScore, setRiskScore] = useState(68);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t2 = setTimeout(() => setPhase(2), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const targets = [68, 72, 84];
    const target = targets[phase];
    if (riskScore === target) return;
    const step = riskScore < target ? 1 : -1;
    const timer = setInterval(() => {
      setRiskScore(prev => {
        if (prev === target) { clearInterval(timer); return prev; }
        return prev + step;
      });
    }, 35);
    return () => clearInterval(timer);
  }, [phase]);

  const riskColor =
    riskScore >= 80 ? '#ef4444' :
    riskScore >= 70 ? '#f59e0b' : '#10b981';

  const signals = [
    { label: 'Weight +2.3 lbs / 48 hr', active: phase >= 1, color: '#f59e0b' },
    { label: 'BP 136/86 — reversed trend', active: phase >= 1, color: '#f59e0b' },
    { label: 'Patient: fatigue + ankle swelling', active: phase >= 2, color: '#ef4444' },
    { label: '3-day trajectory reversal', active: phase >= 2, color: '#ef4444' },
  ];

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 16,
      padding: 20,
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 12,
      color: '#94a3b8',
      width: '100%',
      maxWidth: 460,
      boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em' }}>
            VARDANA — CARE COORDINATOR
          </span>
        </div>
        <span style={{
          background: 'rgba(239,68,68,0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}>
          {phase >= 2 ? 'P2 — URGENT' : phase >= 1 ? 'MONITORING' : 'LIVE'}
        </span>
      </div>

      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
            Sarah Chen · 67F
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11 }}>
            CHF HFrEF · Day 15 of 90 · Stabilize→Optimize
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 26,
            fontWeight: 900,
            color: riskColor,
            transition: 'color 0.3s',
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
          }}>
            {riskScore}
          </div>
          <div style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.06em', marginTop: 2 }}>
            DECOMP RISK
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#475569', marginBottom: 8 }}>
          EVIDENCE CHAIN
        </div>
        {signals.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 5,
            opacity: s.active ? 1 : 0.25,
            transition: 'opacity 0.5s',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: s.active ? s.color : '#334155',
              flexShrink: 0,
              transition: 'background 0.4s',
            }} />
            <span style={{ color: s.active ? '#e2e8f0' : '#475569', transition: 'color 0.4s' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(56,189,248,0.05)',
        border: '1px solid rgba(56,189,248,0.12)',
        borderRadius: 8,
        padding: '8px 12px',
      }}>
        <div style={{ fontSize: 10, color: '#38bdf8', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700 }}>
          FHIR R4 · LIVE QUERIES
        </div>
        {[
          'GET /Observation?subject=sarah-chen&code=29463-7&_count=14',
          'GET /Condition?subject=sarah-chen&clinical-status=active',
          'POST /Flag (decompensation-risk · severity=high)',
        ].map((line, i) => (
          <div key={i} style={{
            fontSize: 10,
            color: '#475569',
            marginBottom: 3,
            opacity: phase > i / 2 ? 1 : 0.3,
            transition: 'opacity 0.6s',
          }}>
            <span style={{ color: '#38bdf8' }}>{line.split(' ')[0]}</span>{' '}
            <span style={{ color: '#64748b' }}>{line.split(' ').slice(1).join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: scrolled ? 'rgba(15,23,42,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'background 0.3s, border 0.3s, backdrop-filter 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}>
          ♥
        </div>
        <span style={{
          fontFamily: "'Georgia', serif",
          fontSize: 20,
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}>
          Vardana<span style={{ color: '#38bdf8' }}> Health</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, color: 'rgba(248,250,252,0.65)' }}>
        <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</a>
        <a href="mailto:atma@vardana.ai" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a
          href="mailto:atma@vardana.ai?subject=Pilot Inquiry — Vardana Health"
          style={{
            fontSize: 13,
            color: 'rgba(248,250,252,0.65)',
            textDecoration: 'none',
            padding: '6px 16px',
          }}
        >
          Request Pilot
        </a>
        <a href="/demo" onClick={e => { e.preventDefault(); navigate('/demo'); }} style={{
          background: '#0ea5e9',
          color: 'white',
          padding: '8px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}>
          Launch Demo
        </a>
      </div>
    </nav>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage({ navigate }) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', background: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <Nav navigate={navigate} />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '100px 32px 60px',
        maxWidth: 1200,
        margin: '0 auto',
        gap: 60,
      }}>
        <div style={{ flex: 1, maxWidth: 540 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(14,165,233,0.12)',
            border: '1px solid rgba(14,165,233,0.25)',
            borderRadius: 100,
            padding: '4px 14px',
            fontSize: 12,
            color: '#38bdf8',
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
            CHF POST-DISCHARGE · PRE-SEED
          </div>
          <h1 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: 'clamp(36px, 4.5vw, 58px)',
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            marginBottom: 24,
            color: '#f8fafc',
          }}>
            AI that catches CHF<br />
            decompensation<br />
            <span style={{ color: '#38bdf8' }}>3–5 days early.</span>
          </h1>
          <p style={{
            fontSize: 18,
            lineHeight: 1.65,
            color: '#94a3b8',
            marginBottom: 40,
            maxWidth: 460,
          }}>
            Vardana is a voice-first AI care concierge for congestive heart failure patients
            in the 90 days after discharge — the highest-cost window in chronic disease management.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href="/demo" onClick={e => { e.preventDefault(); navigate('/demo'); }} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0ea5e9',
              color: 'white',
              padding: '14px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              boxShadow: '0 0 30px rgba(14,165,233,0.35)',
            }}>
              Launch Interactive Demo
              <span style={{ fontSize: 18 }}>→</span>
            </a>
            <a
              href="mailto:atma@vardana.ai?subject=Pilot Inquiry — Vardana Health"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f8fafc',
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Request a Pilot
            </a>
          </div>
          <div style={{
            display: 'flex',
            gap: 32,
            marginTop: 48,
            paddingTop: 40,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { value: '~25%', label: '30-day CHF readmission rate' },
              { value: '$14K', label: 'avg readmission cost' },
              { value: '90d', label: 'structured recovery journey' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <HeroWidget />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{
        padding: '100px 32px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.12em', color: '#38bdf8', fontWeight: 700, marginBottom: 12 }}>
              HOW IT WORKS
            </div>
            <h2 style={{
              fontFamily: "'Georgia', serif",
              fontSize: 'clamp(28px, 3vw, 42px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#f8fafc',
              marginBottom: 16,
            }}>
              The 90-day structured journey
            </h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 520, margin: '0 auto' }}>
              Three phases, each with protocol-driven AI check-ins and escalation thresholds calibrated to clinical evidence.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                phase: 'Phase 1 · Days 1–14', name: 'Stabilize', color: '#10b981', icon: '⚡',
                points: [
                  'Daily AI voice check-in (no app required)',
                  'Weight, BP, and symptom tracking via FHIR',
                  'Decompensation early warning: multi-signal scoring',
                  'Immediate coordinator escalation if threshold crossed',
                ],
              },
              {
                phase: 'Phase 2 · Days 15–60', name: 'Optimize', color: '#0ea5e9', icon: '📈',
                points: [
                  'Titration monitoring (medication response tracking)',
                  'Activity tolerance and NYHA class progression',
                  'Lab value surveillance (BNP, creatinine, electrolytes)',
                  'Structured goal-setting with cardiologist alignment',
                ],
              },
              {
                phase: 'Phase 3 · Days 61–90', name: 'Maintain', color: '#8b5cf6', icon: '🛡',
                points: [
                  'Self-management skill building',
                  'Trigger recognition: fluid, diet, activity',
                  'Transition to primary care coordination',
                  'Outcomes reporting: readmission, quality of life',
                ],
              },
            ].map(p => (
              <div key={p.name} style={{
                background: '#1e293b',
                border: `1px solid ${p.color}30`,
                borderTop: `3px solid ${p.color}`,
                borderRadius: 14,
                padding: 28,
              }}>
                <div style={{ fontSize: 11, color: p.color, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                  {p.phase}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 20, letterSpacing: '-0.02em' }}>
                  {p.icon} {p.name}
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {p.points.map((pt, i) => (
                    <li key={i} style={{
                      display: 'flex', gap: 10, fontSize: 13, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5,
                    }}>
                      <span style={{ color: p.color, flexShrink: 0, marginTop: 1 }}>→</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{
        padding: '120px 32px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0f172a 0%, #0c1a2e 100%)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.12em', color: '#38bdf8', fontWeight: 700, marginBottom: 20 }}>
            REQUEST A PILOT
          </div>
          <h2 style={{
            fontFamily: "'Georgia', serif",
            fontSize: 'clamp(32px, 3.5vw, 50px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#f8fafc',
            marginBottom: 20,
            lineHeight: 1.15,
          }}>
            See what Vardana does<br />for your CHF patients.
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 44, lineHeight: 1.6 }}>
            Coordinator + patient demo available now.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/demo" onClick={e => { e.preventDefault(); navigate('/demo'); }} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0ea5e9',
              color: 'white',
              padding: '14px 32px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              boxShadow: '0 0 40px rgba(14,165,233,0.3)',
            }}>
              Launch Interactive Demo →
            </a>
            <a
              href="mailto:atma@vardana.ai?subject=Pilot Inquiry — Vardana Health"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f8fafc',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '32px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 14, fontFamily: "'Georgia', serif", fontWeight: 700, color: '#475569' }}>
          Vardana Health, Inc.
        </div>
        <div style={{ fontSize: 12, color: '#334155' }}>
          Pre-seed · Seattle, WA · FHIR R4 · HIPAA-compliant architecture
        </div>
        <a href="mailto:atma@vardana.ai" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>
          atma@vardana.ai
        </a>
      </footer>
    </div>
  );
}
