import React, { useState } from 'react';
import { DT } from './tokens';
import { ProgressDots, PrimaryButton, GhostButton, FhirFootnote } from './DemoShell';
import { AlertIcon, CheckIcon } from './icons';
import { useIsMobile } from './useIsMobile';

const SCENARIOS = {
  marcus: {
    header: 'Scenario 1',
    badge: 'Hypertension + Type 2 Diabetes',
    badgeColor: DT.jade.hover,
    accentColor: DT.jade.hover,
    name: 'Marcus Williams',
    demo: '58M',
    journey: 'Day 22 · Continuous Care',
    condition: 'HTN + T2DM \u00b7 Missed medication',
    warnings: [
      { color: DT.jade.hover, text: 'BP 158/98, 4-day worsening trend (was 142/88)' },
      { color: DT.jade.hover, text: 'Missed Lisinopril refill for a few days' },
      { color: DT.crimson, text: 'Patient reports morning headache' },
    ],
    riskLabel: 'BP Crisis Risk',
    riskArc: '53 \u2192 73',
    riskStart: 53,
    param: 'marcus',
  },
};

function ScenarioCard({ scenario, selected, onSelect, onStart, isMobile }) {
  const s = SCENARIOS[scenario];
  const [hovered, setHovered] = useState(false);
  const borderColor = hovered ? DT.accent : selected ? s.accentColor : DT.border.default;

  return (
    <div
      onClick={() => { onSelect(); onStart(scenario); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? DT.bg.well : DT.bg.card,
        border: `2px solid ${borderColor}`,
        borderRadius: DT.radius.lg,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: DT.transition,
        flex: 1,
        minWidth: isMobile ? 'auto' : 240,
        boxShadow: selected ? `0 0 0 1px ${s.accentColor}30` : 'none',
        position: 'relative',
      }}
    >
      {/* Header badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: s.accentColor, fontFamily: DT.font.body,
        }}>
          {s.header}
        </span>
        {selected && (
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon size={11} color={DT.bg.page} />
          </div>
        )}
      </div>

      {/* Condition badge */}
      <div style={{
        display: 'inline-block', fontSize: 10, fontWeight: 700,
        color: s.badgeColor, background: `${s.badgeColor}15`,
        border: `1px solid ${s.badgeColor}30`,
        borderRadius: DT.radius.sm, padding: '2px 8px', marginBottom: 10,
        fontFamily: DT.font.body,
      }}>
        {s.badge}
      </div>

      {/* Patient name */}
      <div style={{ fontSize: 15, fontWeight: 700, color: DT.text.primary, fontFamily: DT.font.body }}>
        {s.name} <span style={{ fontWeight: 400, color: DT.text.secondary }}>{s.demo}</span>
      </div>
      <div style={{ fontSize: 12, color: DT.text.muted, marginTop: 2, fontFamily: DT.font.body }}>
        {s.journey} &middot; {s.condition}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: DT.bg.hover, margin: '12px 0' }} />

      {/* Warning signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.warnings.map((w, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <AlertIcon size={12} color={w.color} />
            </div>
            <span style={{ fontSize: 12, color: DT.text.secondary, lineHeight: 1.5 }}>{w.text}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: DT.bg.hover, margin: '12px 0' }} />

      {/* Risk score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: DT.text.muted, marginBottom: 2, fontFamily: DT.font.body }}>
            {s.riskLabel}
          </div>
          <span style={{ fontFamily: DT.font.display, fontSize: 24, color: s.accentColor, fontWeight: 400 }}>
            {s.riskStart}
          </span>
          <span style={{ fontSize: 14, color: DT.text.muted, fontFamily: DT.font.display }}> / 100</span>
        </div>
        <div style={{ fontSize: 12, color: DT.text.muted, fontFamily: DT.font.body }}>
          {s.riskArc}
        </div>
      </div>

      {/* Start demo button */}
      <button
        style={{
          marginTop: 12,
          width: '100%',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: 'white',
          background: hovered ? '#2A9E84' : '#3DBFA0',
          fontFamily: DT.font.body,
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          transition: DT.transition,
        }}
      >
        Start demo &rarr;
      </button>
    </div>
  );
}

export default function ScenarioSlide({ onBack, onEnter, enterLabel = 'Enter Demo', ctaSlot, onPatientSelect, defaultPatient = 'marcus' }) {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState(defaultPatient);

  const handleSelect = (scenario) => {
    setSelected(scenario);
    if (onPatientSelect) onPatientSelect(scenario);
  };

  const handleEnter = () => {
    if (onEnter) onEnter(selected);
  };

  const bullets = [
    'AI concierge calls the patient and detects a clinical warning pattern',
    'Risk score escalates in real time as the conversation unfolds',
    'Priority alert fires to the care coordinator with full clinical context',
    'The same platform extends across other cardiometabolic patients',
  ];

  return (
    <>
      {/* Main content — grows to fill space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{
        fontFamily: DT.font.display,
        fontSize: 28,
        fontWeight: 400,
        color: DT.text.primary,
        textAlign: 'center',
        margin: '0 0 16px',
        letterSpacing: '-0.02em',
      }}>
        Choose Your Demo Scenario
      </h1>

      <p style={{
        fontSize: 15,
        lineHeight: 1.7,
        color: DT.text.secondary,
        textAlign: 'center',
        margin: '0 0 20px',
      }}>
        Select a patient scenario, then see how Vardana detects and escalates clinical risk in real time.
      </p>

      {/* Patient selector: two cards side by side (stacked on mobile) */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 12,
        marginBottom: 20,
      }}>
        <ScenarioCard scenario="marcus" selected={selected === 'marcus'} onSelect={() => handleSelect('marcus')} onStart={(p) => onEnter && onEnter(p)} isMobile={isMobile} />
      </div>

      {/* What you'll see */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: DT.text.faint, marginBottom: 12 }}>
          What you'll see
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <CheckIcon size={14} color={SCENARIOS[selected].accentColor} />
              </div>
              <span style={{ fontSize: 13, color: DT.text.secondary, lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Bottom row — anchored at bottom */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: isMobile ? 12 : 0,
        paddingTop: 24,
      }}>
        <ProgressDots steps={2} current={1} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {ctaSlot ? (
            ctaSlot
          ) : (
            <GhostButton onClick={onBack}>&larr; Back</GhostButton>
          )}
        </div>
      </div>

      <FhirFootnote />
    </>
  );
}
