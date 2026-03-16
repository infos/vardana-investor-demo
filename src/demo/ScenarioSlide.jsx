import React from 'react';
import { DT } from './tokens';
import { ProgressDots, PrimaryButton, GhostButton, FhirFootnote } from './DemoShell';
import { AlertIcon, CheckIcon } from './icons';
import { useIsMobile } from './useIsMobile';

export default function ScenarioSlide({ onBack, onEnter, enterLabel = 'Enter Demo', ctaSlot }) {
  const isMobile = useIsMobile();

  const warnings = [
    { color: DT.amber.hover, text: 'Weight +2.3 lbs / 48hrs -- exceeded 2 lb threshold' },
    { color: DT.amber.hover, text: 'BP reversed -- 136/86 (best was 126/78)' },
    { color: DT.crimson, text: 'Patient reported fatigue + ankle swelling this morning' },
  ];

  const bullets = [
    "Nurse Rachel Kim's coordinator dashboard -- Sarah flagged red",
    'Vardana AI calls Sarah -- risk score escalates 68 > 84 in real time',
    'P1 alert fires -- FHIR flag posted to Epic mid-call',
  ];

  return (
    <div>
      <h1 style={{
        fontFamily: DT.font.display,
        fontSize: 28,
        fontWeight: 400,
        color: DT.text.primary,
        textAlign: 'center',
        margin: '0 0 16px',
        letterSpacing: '-0.02em',
      }}>
        Today's Demo Scenario
      </h1>

      <p style={{
        fontSize: 15,
        lineHeight: 1.7,
        color: DT.text.secondary,
        textAlign: 'center',
        margin: '0 0 24px',
      }}>
        Sarah Chen is 67 years old, 15 days post-discharge after a CHF exacerbation.
        This morning, Vardana detected early warning signs of decompensation.
      </p>

      {/* Patient summary card */}
      <div style={{
        background: DT.bg.card,
        border: `1px solid ${DT.border.default}`,
        borderRadius: DT.radius.lg,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 4 : 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: DT.text.primary, fontFamily: DT.font.body }}>
            Sarah Chen <span style={{ fontWeight: 400, color: DT.text.secondary }}>67F</span>
          </div>
          <div style={{ fontSize: 13, color: DT.text.muted, fontFamily: DT.font.body }}>
            Day 15 of 90 / Stabilize &rarr; Optimize
          </div>
        </div>
        <div style={{ fontSize: 12, color: DT.text.muted, marginTop: 4 }}>
          CHF HFrEF &middot; NYHA Class III
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: DT.bg.hover, margin: '14px 0' }} />

        {/* Warning signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <AlertIcon size={14} color={w.color} />
              </div>
              <span style={{ fontSize: 13, color: DT.text.secondary, lineHeight: 1.5 }}>{w.text}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: DT.bg.hover, margin: '14px 0' }} />

        {/* Risk score */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: DT.text.muted, marginBottom: 4 }}>
            Decompensation Risk
          </div>
          <span style={{ fontFamily: DT.font.display, fontSize: 28, color: DT.amber.hover, fontWeight: 400 }}>
            72
          </span>
          <span style={{ fontSize: 16, color: DT.text.muted, fontFamily: DT.font.display }}> / 100</span>
        </div>
      </div>

      {/* What you'll see */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: DT.text.faint, marginBottom: 12 }}>
          What you'll see
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <CheckIcon size={14} color={DT.amber.hover} />
              </div>
              <span style={{ fontSize: 13, color: DT.text.secondary, lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: isMobile ? 12 : 0,
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
              <PrimaryButton onClick={onEnter}>{enterLabel}</PrimaryButton>
            </>
          )}
        </div>
      </div>

      <FhirFootnote />
    </div>
  );
}
