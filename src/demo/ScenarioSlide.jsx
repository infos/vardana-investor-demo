import React, { useState } from 'react';
import { DT } from './tokens';
import { ProgressDots, PrimaryButton, GhostButton, FhirFootnote } from './DemoShell';
import { AlertIcon, CheckIcon } from './icons';
import { useIsMobile } from './useIsMobile';

const SCENARIOS = {
  sarah: {
    header: 'Scenario 1',
    badge: 'Congestive Heart Failure',
    badgeColor: DT.amber.hover,
    accentColor: DT.amber.hover,
    name: 'Sarah Chen',
    demo: '67F',
    journey: 'Day 15 of 90',
    condition: 'CHF HFrEF \u00b7 NYHA Class III',
    warnings: [
      { color: DT.amber.hover, text: 'Weight +2.3 lbs / 48hrs, exceeded 2 lb threshold' },
      { color: DT.amber.hover, text: 'BP reversed, 136/86 (best was 126/78)' },
      { color: DT.crimson, text: 'Patient reported fatigue + ankle swelling this morning' },
    ],
    riskLabel: 'Decompensation Risk',
    riskArc: '68 \u2192 84',
    riskStart: 72,
    param: 'sarah',
  },
  marcus: {
    header: 'Scenario 2',
    badge: 'Hypertension + Type 2 Diabetes',
    badgeColor: DT.jade.hover,
    accentColor: DT.jade.hover,
    name: 'Marcus Williams',
    demo: '58M',
    journey: 'Day 22 of 90',
    condition: 'HTN + T2DM \u00b7 Missed medication',
    warnings: [
      { color: DT.jade.hover, text: 'BP 158/98, 4-day worsening trend (was 129/80)' },
      { color: DT.jade.hover, text: 'Missed Lisinopril refill x3 days' },
      { color: DT.crimson, text: 'Patient reports morning headache' },
    ],
    riskLabel: 'BP Crisis Risk',
    riskArc: '53 \u2192 73',
    riskStart: 53,
    param: 'marcus',
  },
};

function ScenarioCard({ scenario, selected, onSelect, isMobile }) {
  const s = SCENARIOS[scenario];
  const borderColor = selected ? s.accentColor : DT.border.default;

  return (
    <div
      onClick={onSelect}
      style={{
        background: DT.bg.card,
        border: `2px solid ${borderColor}`,
        borderRadius: DT.radius.lg,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: DT.transition,
        flex: 1,
        minWidth: isMobile ? 'auto' : 240,
        boxShadow: selected ? `0 0 0 1px ${s.accentColor}30` : 'none',
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
    </div>
  );
}

export default function ScenarioSlide({ onBack, onEnter, enterLabel = 'Enter Demo', ctaSlot, onPatientSelect, defaultPatient = 'sarah' }) {
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
    'The same platform works across CHF, hypertension, diabetes, and beyond',
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
        <ScenarioCard scenario="sarah" selected={selected === 'sarah'} onSelect={() => handleSelect('sarah')} isMobile={isMobile} />
        <ScenarioCard scenario="marcus" selected={selected === 'marcus'} onSelect={() => handleSelect('marcus')} isMobile={isMobile} />
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
            <>
              <GhostButton onClick={onBack}>&larr; Back</GhostButton>
              <PrimaryButton onClick={handleEnter}>{enterLabel}</PrimaryButton>
            </>
          )}
        </div>
      </div>

      <FhirFootnote />
    </>
  );
}
