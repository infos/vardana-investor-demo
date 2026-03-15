import React from 'react';
import { DT } from './tokens';

export function DemoShell({ children, maxWidth = 560 }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: DT.bg.page,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      fontFamily: DT.font.body,
    }}>
      <div style={{ width: '100%', maxWidth }}>
        {children}
      </div>
    </div>
  );
}

export function BackButton({ onClick, label = '\u2190 Back' }) {
  return (
    <button onClick={onClick} style={{
      background: 'none',
      border: 'none',
      color: DT.text.muted,
      fontSize: 13,
      cursor: 'pointer',
      padding: '4px 0',
      fontFamily: DT.font.body,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      marginBottom: 24,
    }}>
      {label}
    </button>
  );
}

export function ProgressDots({ steps, current }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: steps }, (_, i) => (
        <div key={i} style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: i === current ? DT.amber.default : DT.bg.well,
          transition: DT.transition,
        }} />
      ))}
    </div>
  );
}

export function PrimaryButton({ onClick, children, color = DT.amber.default, textColor = DT.bg.page }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      style={{
        background: color,
        color: textColor,
        border: 'none',
        borderRadius: DT.radius.md,
        padding: '12px 24px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: DT.font.body,
        transition: DT.transition,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.color = DT.text.secondary; }}
      onMouseLeave={e => { e.currentTarget.style.color = DT.text.muted; }}
      style={{
        background: 'none',
        border: 'none',
        color: DT.text.muted,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        padding: '12px 16px',
        fontFamily: DT.font.body,
        transition: DT.transition,
      }}
    >
      {children}
    </button>
  );
}

export function VardanaLogo({ centered = true }) {
  return (
    <div style={{ textAlign: centered ? 'center' : 'left', marginBottom: 20 }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
          <rect width="32" height="32" rx="8" fill="#D97706" />
          <path d="M16 7C11 7 7 11 7 16s4 9 9 9 9-4 9-9-4-9-9-9zm0 14.5c-1.5 0-3-0.8-3.8-2.2l1.3-0.8c0.5 0.9 1.4 1.5 2.5 1.5s2-0.6 2.5-1.5l1.3 0.8c-0.8 1.4-2.3 2.2-3.8 2.2zm4.5-5h-9v-1.5h9v1.5z" fill="white"/>
        </svg>
        <span style={{
          fontFamily: DT.font.display,
          fontSize: 22,
          fontWeight: 400,
          color: DT.text.primary,
          letterSpacing: '-0.02em',
        }}>
          Vardana
        </span>
      </div>
    </div>
  );
}

export function FhirFootnote() {
  return (
    <div style={{
      fontSize: 11,
      color: DT.border.default,
      textAlign: 'center',
      marginTop: 32,
      lineHeight: 1.5,
    }}>
      FHIR R4 / Medplum &middot; All patient data is synthetic
    </div>
  );
}
