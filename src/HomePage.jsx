'use client';
import { useState, useEffect } from 'react';
// ─── Design tokens (from vardana-design-system.jsx) ──────────────────────────
const C = {
  // Slate
  s950: '#0C1420',
  s900: '#131E2E',
  s800: '#1C2B40',
  s700: '#253550',
  s600: '#3A4F6B',
  s500: '#556882',
  s400: '#7A90A8',
  s300: '#A8BAC8',
  s200: '#D1DCE6',
  s100: '#EBF0F5',
  s50:  '#F5F7FA',
  // Amber (signal / action)
  a400: '#F59E0B',
  a500: '#D97706',
  a600: '#B45309',
  a100: '#FEF3C7',
  // Jade (positive)
  j400: '#34D399',
  j500: '#059669',
  j600: '#047857',
  // Crimson (danger)
  cr500: '#EF4444',
  cr600: '#DC2626',
  cr100: '#FEE2E2',
};
const F = {
  display: "'DM Serif Display', 'Georgia', serif",
  sans:    "'DM Sans', 'system-ui', sans-serif",
  mono:    "'IBM Plex Mono', 'Courier New', monospace",
};
// ─── Animated coordinator widget ─────────────────────────────────────────────
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
  const riskColor = riskScore >= 80 ? C.cr500 : riskScore >= 70 ? C.a400 : C.j500;
  const signals = [
    { label: 'Weight +2.3 lbs / 48 hr',        active: phase >= 1, color: C.a400 },
    { label: 'BP 136/86, reversed trend',       active: phase >= 1, color: C.a400 },
    { label: 'Patient: fatigue + ankle swelling', active: phase >= 2, color: C.cr500 },
    { label: '3-day trajectory reversal',         active: phase >= 2, color: C.cr500 },
  ];
  return (
    <div style={{
      background: C.s900,
      borderRadius: 16,
      padding: 20,
      fontFamily: F.mono,
      fontSize: 12,
      color: C.s400,
      width: '100%',
      maxWidth: 460,
      boxShadow: '0 25px 60px rgba(12,20,32,0.6)',
      border: `1px solid ${C.s700}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.j500 }} />
          <span style={{ color: C.s100, fontWeight: 700, fontSize: 11, letterSpacing: '0.08em' }}>
            VARDANA — CARE COORDINATOR
          </span>
        </div>
        <span style={{
          background: `${C.cr600}22`,
          color: C.cr500,
          border: `1px solid ${C.cr600}44`,
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}>
          {phase >= 2 ? 'P2 — URGENT' : phase >= 1 ? 'MONITORING' : 'LIVE'}
        </span>
      </div>
      {/* Patient row */}
      <div style={{
        background: `${C.cr600}12`,
        border: `1px solid ${C.cr600}30`,
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: C.s50, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Sarah Chen · 67F</div>
          <div style={{ color: C.s400, fontSize: 11 }}>CHF HFrEF · Day 15 of 90 · Stabilize→Optimize</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 26, fontWeight: 900, color: riskColor,
            transition: 'color 0.3s', lineHeight: 1, fontFamily: F.sans,
          }}>
            {riskScore}
          </div>
          <div style={{ fontSize: 9, color: C.s500, letterSpacing: '0.06em', marginTop: 2 }}>DECOMP RISK</div>
        </div>
      </div>
      {/* Evidence chain */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', color: C.s600, marginBottom: 8 }}>EVIDENCE CHAIN</div>
        {signals.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5,
            opacity: s.active ? 1 : 0.2, transition: 'opacity 0.5s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: s.active ? s.color : C.s700,
              transition: 'background 0.4s',
            }} />
            <span style={{ color: s.active ? C.s100 : C.s600, transition: 'color 0.4s' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* FHIR trace */}
      <div style={{
        background: `${C.j500}0a`,
        border: `1px solid ${C.j600}25`,
        borderRadius: 8,
        padding: '8px 12px',
      }}>
        <div style={{ fontSize: 10, color: C.j400, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 700 }}>
          FHIR R4 · LIVE QUERIES
        </div>
        {[
          'GET /Observation?subject=sarah-chen&code=29463-7&_count=14',
          'GET /Condition?subject=sarah-chen&clinical-status=active',
          'POST /Flag (decompensation-risk · severity=high)',
        ].map((line, i) => (
          <div key={i} style={{
            fontSize: 10, color: C.s500, marginBottom: 3,
            opacity: phase > i / 2 ? 1 : 0.25, transition: 'opacity 0.6s',
          }}>
            <span style={{ color: C.j400 }}>{line.split(' ')[0]}</span>{' '}
            <span style={{ color: C.s600 }}>{line.split(' ').slice(1).join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 32px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? `${C.s950}f2` : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${C.s800}` : 'none',
      transition: 'background 0.3s, border 0.3s',
      fontFamily: F.sans,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: F.display, fontSize: 20, fontWeight: 400, color: C.s50, letterSpacing: '-0.01em' }}>
          Vardana<span style={{ color: C.a400 }}> Health</span>
        </span>
      </div>
      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, color: C.s400 }}>
        <a href="#approach" style={{ color: 'inherit', textDecoration: 'none' }}>Approach</a>
        <a href="#pilot" style={{ color: 'inherit', textDecoration: 'none' }}>Pilot</a>
        <a href="mailto:hello@vardana.ai" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
      </div>
      {/* CTA */}
      <a href="mailto:hello@vardana.ai?subject=Demo Request: Vardana Health" style={{
        background: C.a500,
        color: C.s950,
        padding: '8px 20px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
        letterSpacing: '-0.01em',
        fontFamily: F.sans,
      }}>
        Request a Demo
      </a>
    </nav>
  );
}
// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ fontFamily: F.sans, background: C.s950, color: C.s50, minHeight: '100vh' }}>
      <Nav />
      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '100px 32px 60px', maxWidth: 1200, margin: '0 auto', gap: 60,
      }}>
        <div style={{ flex: 1, maxWidth: 540 }}>
          {/* Label pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${C.a400}14`, border: `1px solid ${C.a400}30`,
            borderRadius: 100, padding: '4px 14px',
            fontSize: 11, color: C.a400, fontWeight: 600,
            letterSpacing: '0.08em', marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.a400 }} />
            CHF POST-DISCHARGE · PRE-SEED
          </div>
          <h1 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 4.5vw, 58px)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 24,
            color: C.s50,
          }}>
            AI that catches CHF<br />
            decompensation<br />
            <span style={{ color: C.a400 }}>3–5 days early.</span>
          </h1>
          <p style={{
            fontSize: 17, lineHeight: 1.65, color: C.s400,
            marginBottom: 40, maxWidth: 460,
          }}>
            CHF patients face their highest risk in the 90 days after leaving the hospital.
            Vardana checks in with them daily by phone, catches warning signs early,
            and keeps their care team in the loop.
          </p>
          <a href="mailto:hello@vardana.ai?subject=Demo Request: Vardana Health" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.a500,
            color: C.s950,
            padding: '14px 32px',
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '-0.01em',
            boxShadow: `0 0 32px ${C.a500}40`,
          }}>
            Request a Demo →
          </a>
          {/* Market context stats */}
          <div style={{
            display: 'flex', gap: 36, marginTop: 48, paddingTop: 40,
            borderTop: `1px solid ${C.s800}`,
          }}>
            {[
              { value: '~25%', label: '30-day CHF readmission rate' },
              { value: '$14K', label: 'avg readmission cost' },
              { value: '90d',  label: 'structured recovery journey' },
            ].map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: F.display, fontSize: 26, fontWeight: 400,
                  color: C.s50, letterSpacing: '-0.02em',
                }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.s500, marginTop: 3, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <HeroWidget />
        </div>
      </section>
      {/* ── NVIDIA TRUST STRIP ── */}
      <section style={{
        padding: '24px 32px',
        borderTop: `1px solid ${C.s800}`,
        borderBottom: `1px solid ${C.s800}`,
        background: C.s900,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: C.s600, fontWeight: 700 }}>MEMBER</span>
          <div style={{ width: 1, height: 14, background: C.s700 }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#76b900', letterSpacing: '-0.01em', fontFamily: F.sans }}>NVIDIA</span>
          <span style={{ fontSize: 13, color: C.s500, fontWeight: 500 }}>Inception Program</span>
        </div>
      </section>
      {/* ── APPROACH ── */}
      <section id="approach" style={{ padding: '100px 32px', background: C.s900 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.12em', color: C.a400,
              fontWeight: 700, marginBottom: 12,
            }}>
              APPROACH
            </div>
            <h2 style={{
              fontFamily: F.display,
              fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 400,
              letterSpacing: '-0.02em', color: C.s50, marginBottom: 16,
            }}>
              A 90-day structured recovery journey
            </h2>
            <p style={{ fontSize: 16, color: C.s500, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              Most remote monitoring tools collect data and flag it for someone to review later.
              Vardana reads a patient's latest readings during the call itself and responds
              to what it finds, right then.
            </p>
          </div>
          {/* Phase cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              {
                phase: 'Phase 1 · Days 1–14',
                name: 'Stabilize',
                color: C.j500,
                borderColor: C.j600,
                description: 'A daily phone call, no app needed. If something looks off with weight or blood pressure, the care team hears about it the same day.',
              },
              {
                phase: 'Phase 2 · Days 15–60',
                name: 'Optimize',
                color: C.a400,
                borderColor: C.a500,
                description: 'As the patient settles in, Vardana tracks how they\'re responding to their medications and activity, and keeps goals in line with what the cardiologist has planned.',
              },
              {
                phase: 'Phase 3 · Days 61–90',
                name: 'Maintain',
                color: C.s300,
                borderColor: C.s400,
                description: 'By the end, patients know their warning signs and what to do about them. Vardana helps hand care off smoothly to their primary doctor.',
              },
            ].map(p => (
              <div key={p.name} style={{
                background: C.s800,
                border: `1px solid ${C.s700}`,
                borderTop: `3px solid ${p.borderColor}`,
                borderRadius: 14,
                padding: 28,
              }}>
                <div style={{
                  fontSize: 11, color: p.color, fontWeight: 700,
                  letterSpacing: '0.08em', marginBottom: 10,
                }}>
                  {p.phase}
                </div>
                <div style={{
                  fontFamily: F.display, fontSize: 22, fontWeight: 400,
                  color: C.s50, marginBottom: 14, letterSpacing: '-0.01em',
                }}>
                  {p.name}
                </div>
                <p style={{ fontSize: 14, color: C.s500, lineHeight: 1.65, margin: 0 }}>
                  {p.description}
                </p>
              </div>
            ))}
          </div>
          {/* Differentiator bar */}
          <div style={{
            marginTop: 32,
            background: C.s800,
            border: `1px solid ${C.j600}30`,
            borderRadius: 12,
            padding: '22px 28px',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              background: `${C.j500}14`,
              border: `1px solid ${C.j600}30`,
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.j400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.s100, marginBottom: 3 }}>
                FHIR-native. Reasoning during the call.
              </div>
              <p style={{ fontSize: 13, color: C.s500, margin: 0, lineHeight: 1.6 }}>
                The voice agent pulls a patient's latest readings from their health record while they're on the call. It responds to what it finds, not to a snapshot from yesterday.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ── PILOT DESIGN ── */}
      <section id="pilot" style={{ padding: '100px 32px', background: C.s950 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', color: C.a400, fontWeight: 700, marginBottom: 12 }}>
              PILOT DESIGN
            </div>
            <h2 style={{
              fontFamily: F.display,
              fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 400,
              letterSpacing: '-0.02em', color: C.s50, marginBottom: 16,
            }}>
              What we will measure
            </h2>
            <p style={{ fontSize: 16, color: C.s500, maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>
              We're running our pilot against matched controls. The main thing we're
              measuring is whether fewer patients end up back in the hospital within 30 days.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              {
                metric: '30-day readmissions',
                description: 'Primary endpoint vs matched controls',
                source: 'Pilot target',
              },
              {
                metric: 'Per-patient cost avoidance',
                description: 'Calculated from readmission delta',
                source: 'Benchmark: ~$14K avg CHF readmit (AHRQ)',
              },
              {
                metric: 'Engagement at 90 days',
                description: 'Completion rate across all three journey phases',
                source: 'Reported at day 30, 60, 90',
              },
              {
                metric: 'Days to first detection',
                description: 'vs symptom-triggered ER presentation',
                source: 'CHF remote monitoring literature',
              },
            ].map(m => (
              <div key={m.metric} style={{
                background: C.s900,
                border: `1px solid ${C.s800}`,
                borderRadius: 14,
                padding: 22,
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: C.s100,
                  marginBottom: 10, lineHeight: 1.4,
                }}>
                  {m.metric}
                </div>
                <div style={{ fontSize: 13, color: C.s500, marginBottom: 14, lineHeight: 1.5 }}>
                  {m.description}
                </div>
                <div style={{
                  fontSize: 11, color: C.a400, fontWeight: 600,
                  background: `${C.a400}0f`,
                  border: `1px solid ${C.a400}22`,
                  borderRadius: 6, padding: '4px 10px',
                  display: 'inline-block', lineHeight: 1.4,
                }}>
                  {m.source}
                </div>
              </div>
            ))}
          </div>
          {/* FHIR strip */}
          <div style={{
            marginTop: 32,
            background: C.s900,
            border: `1px solid ${C.s800}`,
            borderRadius: 12,
            padding: '22px 28px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: C.s600, fontWeight: 700 }}>
              FHIR INFRASTRUCTURE
            </div>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { name: 'Medplum', badge: 'FHIR R4 · Demo', color: C.j500 },
                { name: 'Epic',    badge: 'Sandbox · Pilot scope', color: C.a400 },
              ].map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.s300, fontFamily: F.sans }}>{e.name}</span>
                  <span style={{
                    fontSize: 10, letterSpacing: '0.05em', color: e.color, fontWeight: 700,
                    background: `${e.color}12`, border: `1px solid ${e.color}28`,
                    borderRadius: 4, padding: '2px 8px',
                  }}>{e.badge}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.s700 }}>
              HIPAA-compliant · FHIR R4
            </div>
          </div>
        </div>
      </section>
      {/* ── BOTTOM CTA ── */}
      <section style={{
        padding: '120px 32px', textAlign: 'center',
        background: C.s900,
        borderTop: `1px solid ${C.s800}`,
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.12em', color: C.a400,
            fontWeight: 700, marginBottom: 20,
          }}>
            REQUEST A PILOT
          </div>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(32px, 3.5vw, 50px)', fontWeight: 400,
            letterSpacing: '-0.02em', color: C.s50,
            marginBottom: 20, lineHeight: 1.15,
          }}>
            See what Vardana does<br />for your CHF patients.
          </h2>
          <p style={{ fontSize: 16, color: C.s500, marginBottom: 44, lineHeight: 1.65 }}>
            We're working with self-insured employers and health systems this year.
            If you want to see it in action, reach out and we'll walk you through it.
          </p>
          <a href="mailto:hello@vardana.ai?subject=Demo Request: Vardana Health" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.a500, color: C.s950,
            padding: '15px 36px', borderRadius: 10,
            fontSize: 15, fontWeight: 700, textDecoration: 'none',
            boxShadow: `0 0 40px ${C.a500}35`,
          }}>
            Request a Demo →
          </a>
        </div>
      </section>
      {/* ── FOOTER ── */}
      <footer style={{
        padding: '28px 32px',
        borderTop: `1px solid ${C.s800}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '0 auto', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 400, color: C.s500 }}>
          Vardana Health, Inc.
        </div>
        <div style={{ fontSize: 12, color: C.s700, textAlign: 'center' }}>
          Pre-seed · Seattle, WA · FHIR R4 · HIPAA-compliant architecture
        </div>
        <a href="mailto:hello@vardana.ai" style={{ fontSize: 12, color: C.s500, textDecoration: 'none' }}>
          hello@vardana.ai
        </a>
      </footer>
    </div>
  );
}