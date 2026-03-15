import React from 'react';
import { DT } from './demo/tokens';
import { DemoShell, VardanaLogo, FhirFootnote } from './demo/DemoShell';
import { useIsMobile } from './demo/useIsMobile';

function DemoCard({ badge, badgeColor, title, description, bullets, bulletColor, ctaLabel, ctaBackground, ctaColor, onClick }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = DT.bg.hover;
        e.currentTarget.style.borderColor = DT.border.default;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = DT.bg.card;
        e.currentTarget.style.borderColor = DT.border.subtle;
      }}
      style={{
        background: DT.bg.card,
        border: `1px solid ${DT.border.subtle}`,
        borderRadius: DT.radius.lg,
        padding: 28,
        cursor: 'pointer',
        transition: DT.transition,
      }}
    >
      {/* Badge */}
      <div style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: badgeColor,
        background: `${badgeColor}15`,
        border: `1px solid ${badgeColor}30`,
        borderRadius: DT.radius.sm,
        padding: '3px 8px',
        marginBottom: 14,
        fontFamily: DT.font.body,
      }}>
        {badge}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: DT.font.display,
        fontSize: 22,
        fontWeight: 400,
        color: DT.text.primary,
        margin: '0 0 8px',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: DT.text.secondary,
        lineHeight: 1.6,
        margin: '0 0 16px',
        fontFamily: DT.font.body,
      }}>
        {description}
      </p>

      {/* Bullets */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
        {bullets.map((b, i) => (
          <li key={i} style={{
            fontSize: 12,
            color: DT.text.secondary,
            marginBottom: 6,
            display: 'flex',
            gap: 8,
            lineHeight: 1.5,
            fontFamily: DT.font.body,
          }}>
            <span style={{ color: bulletColor, flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
            {b}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div style={{
        background: ctaBackground,
        color: ctaColor,
        borderRadius: DT.radius.md,
        padding: '11px 0',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: DT.font.body,
      }}>
        {ctaLabel}
      </div>
    </div>
  );
}

export default function DemoPage({ navigate }) {
  const isMobile = useIsMobile();

  return (
    <DemoShell maxWidth={680}>
      {/* Back link */}
      <div style={{ position: 'fixed', top: 24, left: 32 }}>
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{
          fontSize: 13,
          color: DT.text.muted,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: DT.font.body,
        }}>
          &larr; Vardana Health
        </a>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <VardanaLogo />
        <h1 style={{
          fontFamily: DT.font.display,
          fontSize: 28,
          fontWeight: 400,
          color: DT.text.primary,
          margin: '0 0 10px',
          letterSpacing: '-0.02em',
        }}>
          Choose Your Demo Experience
        </h1>
        <p style={{ fontSize: 14, color: DT.text.muted, margin: 0, fontFamily: DT.font.body }}>
          Sarah Chen &middot; 67F &middot; CHF Day 15 of 90 &middot; Decompensation risk scenario
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16,
        marginBottom: 24,
      }}>
        <DemoCard
          badge="INTERACTIVE"
          badgeColor={DT.jade.default}
          title="Live Demo"
          description="Explore the platform yourself. Navigate the coordinator view, patient portal, and AI reasoning at your own pace."
          bullets={[
            'Coordinator dashboard \u2014 Sarah flagged red',
            'Evidence chain + AI clinical reasoning',
            'Patient portal \u2014 recovery journey view',
            'Initiate voice or SMS outreach',
          ]}
          bulletColor={DT.jade.default}
          ctaLabel="Start Live Demo \u2192"
          ctaBackground={DT.jade.default}
          ctaColor="white"
          onClick={() => navigate('/demo/live')}
        />
        <DemoCard
          badge="~90 SECONDS \u00B7 NO MIC"
          badgeColor={DT.amber.default}
          title="Scripted Demo"
          description="Watch a pre-rendered AI voice call with Sarah Chen. Decompensation detected mid-call. FHIR alert fires in real time."
          bullets={[
            'Guided walkthrough \u2014 About Vardana + scenario',
            'Coordinator roster \u2014 Sarah flagged',
            'Live AI voice call via ElevenLabs',
            'Risk score escalates 68 \u2192 84 \u00B7 P1 alert fires',
          ]}
          bulletColor={DT.amber.default}
          ctaLabel="Watch Scripted Demo \u2192"
          ctaBackground={DT.amber.default}
          ctaColor={DT.bg.page}
          onClick={() => navigate('/demo/scripted')}
        />
      </div>

      <FhirFootnote />
    </DemoShell>
  );
}
