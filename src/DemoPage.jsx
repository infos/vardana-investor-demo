import React from 'react';
import { DT } from './demo/tokens';
import { DemoShell, VardanaLogo, FhirFootnote } from './demo/DemoShell';
import { useIsMobile } from './demo/useIsMobile';
import { DEMO_BASE } from './demoPath';

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
          Multi-condition demo: CHF, hypertension, diabetes, and beyond
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
            'Coordinator dashboard: Sarah flagged red',
            'Evidence chain + AI clinical reasoning',
            'Patient portal, recovery journey view',
            'Initiate voice or SMS outreach',
          ]}
          bulletColor={DT.jade.default}
          ctaLabel="Start Live Demo"
          ctaBackground={DT.jade.default}
          ctaColor="white"
          onClick={() => navigate(`${DEMO_BASE}/live`)}
        />
        <DemoCard
          badge="~90 SECONDS / NO MIC"
          badgeColor={DT.amber.default}
          title="Recorded Demo"
          description="Watch a pre-rendered AI voice call with Sarah Chen. Decompensation detected mid-call. FHIR alert fires in real time."
          bullets={[
            'Guided walkthrough: About Vardana + scenario',
            'Coordinator roster: Sarah flagged',
            'Live AI voice call, automated, no mic needed',
            'Risk score escalates 68 > 84, P1 alert fires',
          ]}
          bulletColor={DT.amber.default}
          ctaLabel="Watch Recorded Demo"
          ctaBackground={DT.amber.default}
          ctaColor={DT.bg.page}
          onClick={() => navigate(`${DEMO_BASE}/recorded`)}
        />
      </div>

      {/* Clinical Demo Card — full width */}
      <div style={{ marginBottom: 24 }}>
        <DemoCard
          badge="CLINICAL OPS / HTN + T2DM"
          badgeColor={DT.accent}
          title="Clinical Demo (Christine/Troy)"
          description="End-to-end 90-day cardiometabolic management program walkthrough. Follow Marcus Williams from enrollment SMS through voice check-in, AI escalation, and care team response."
          bullets={[
            'Patient: Marcus Williams, 58M — HTN + T2DM + Hyperlipidemia',
            'Enrollment → Portal → AI Voice Check-in → Escalation',
            'Real-time clinical reasoning with ACC/AHA risk scoring',
            'Coordinator dashboard with live WebSocket alerts',
          ]}
          bulletColor={DT.accent}
          ctaLabel="Start Clinical Demo"
          ctaBackground={DT.accent}
          ctaColor="white"
          onClick={() => navigate(`${DEMO_BASE}/clinical`)}
        />
      </div>

      <FhirFootnote />
    </DemoShell>
  );
}
