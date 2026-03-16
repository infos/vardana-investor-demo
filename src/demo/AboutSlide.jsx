import React from 'react';
import { DT } from './tokens';
import { VardanaLogo, ProgressDots, PrimaryButton, GhostButton } from './DemoShell';
import { PhoneIcon, ActivityIcon, AlertIcon } from './icons';
import { useIsMobile } from './useIsMobile';

export default function AboutSlide({ onBack, onSkip, onNext }) {
  const isMobile = useIsMobile();

  const stats = [
    {
      icon: <PhoneIcon size={18} color={DT.amber.hover} />,
      title: 'Voice-first AI',
      body: 'Proactive daily outreach by phone -- no app required',
    },
    {
      icon: <ActivityIcon size={18} color={DT.amber.hover} />,
      title: 'FHIR-native',
      body: 'Pulls live vitals and labs from Epic / Medplum',
    },
    {
      icon: <AlertIcon size={18} color={DT.amber.hover} />,
      title: 'Real-time alerts',
      body: 'Risk score updates as the AI talks to the patient',
    },
  ];

  return (
    <div>
      <VardanaLogo />

      <h1 style={{
        fontFamily: DT.font.display,
        fontSize: 32,
        fontWeight: 400,
        color: DT.text.primary,
        textAlign: 'center',
        margin: '0 0 24px',
        letterSpacing: '-0.02em',
      }}>
        What Vardana Does
      </h1>

      <p style={{
        fontSize: 15,
        lineHeight: 1.7,
        color: DT.text.secondary,
        textAlign: 'center',
        margin: '0 0 32px',
      }}>
        Vardana's AI care concierge calls patients daily, detects early warning signs
        of decompensation, and alerts their care team before a crisis &mdash; not after.
      </p>

      {/* 3-column stat block */}
      <div style={{
        background: DT.bg.card,
        borderRadius: DT.radius.lg,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
        overflow: 'hidden',
        marginBottom: 32,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '20px 16px',
            textAlign: 'center',
            borderRight: !isMobile && i < 2 ? `1px solid ${DT.bg.hover}` : 'none',
            borderBottom: isMobile && i < 2 ? `1px solid ${DT.bg.hover}` : 'none',
          }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DT.text.primary, marginBottom: 4, fontFamily: DT.font.body }}>{s.title}</div>
            <div style={{ fontSize: 12, color: DT.text.muted, lineHeight: 1.5, fontFamily: DT.font.body }}>{s.body}</div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <ProgressDots steps={2} current={0} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GhostButton onClick={onSkip}>Skip &rarr;</GhostButton>
          <PrimaryButton onClick={onNext}>Next &rarr;</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
