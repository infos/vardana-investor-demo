import React, { useState, useEffect, useRef } from 'react';
import { DT } from './tokens';
import { DemoShell, BackButton, VardanaLogo, FhirFootnote } from './DemoShell';
import { useIsMobile } from './useIsMobile';
import { DEMO_BASE } from '../demoPath';
import VoiceCallWidget from '../components/VoiceCallWidget';

const STEPS = [
  { num: 1, title: 'Enrollment SMS', subtitle: 'Patient receives program invitation' },
  { num: 2, title: 'Welcome Email', subtitle: 'Onboarding and portal access' },
  { num: 3, title: 'Patient Portal', subtitle: 'Day 22 — vitals and progress' },
  { num: 4, title: 'Voice Check-in', subtitle: 'AI-guided clinical conversation' },
  { num: 5, title: 'Escalation', subtitle: 'Alert fires to care team' },
  { num: 6, title: 'Care Team Response', subtitle: 'Coordinator follow-up' },
];

function StepIndicator({ current, total, onStepClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div
            onClick={() => onStepClick(i)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i === current ? DT.accent : i < current ? DT.accentLight : DT.bg.well,
              color: i === current ? 'white' : i < current ? DT.accent : DT.text.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, fontFamily: DT.font.body,
              cursor: 'pointer', transition: DT.transition,
              border: i === current ? 'none' : `1px solid ${i < current ? DT.accent + '40' : DT.border.subtle}`,
            }}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ width: 24, height: 2, background: i < current ? DT.accent + '40' : DT.border.subtle, borderRadius: 1 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: DT.bg.card, border: `1px solid ${DT.border.subtle}`,
      borderRadius: DT.radius.lg, padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ children, color = DT.jade.default }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
      color, background: color + '15', border: `1px solid ${color}30`,
      borderRadius: 4, padding: '2px 8px', fontFamily: DT.font.body,
    }}>
      {children}
    </span>
  );
}

function SplitView({ left, right, leftLabel = 'Patient View', rightLabel = 'System View' }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('patient');

  if (isMobile) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: DT.radius.md, overflow: 'hidden', border: `1px solid ${DT.border.subtle}` }}>
          {[['patient', leftLabel], ['system', rightLabel]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 0', border: 'none', fontSize: 12, fontWeight: 700,
              background: tab === key ? DT.accent : DT.bg.card,
              color: tab === key ? 'white' : DT.text.secondary,
              cursor: 'pointer', fontFamily: DT.font.body,
            }}>{label}</button>
          ))}
        </div>
        {tab === 'patient' ? left : right}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{leftLabel}</div>
        {left}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{rightLabel}</div>
        {right}
      </div>
    </div>
  );
}

function SMSBubble({ from, text, align = 'left', color }) {
  return (
    <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '80%', padding: '10px 14px',
        borderRadius: align === 'right' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: align === 'right' ? DT.accent : DT.bg.well,
        color: align === 'right' ? 'white' : DT.text.primary,
        fontSize: 13, lineHeight: 1.5,
      }}>
        {from && <div style={{ fontSize: 10, fontWeight: 700, color: align === 'right' ? 'rgba(255,255,255,0.7)' : DT.text.muted, marginBottom: 4 }}>{from}</div>}
        {text}
      </div>
    </div>
  );
}

function TimelineItem({ label, done = true, icon }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: done ? DT.jade.light : DT.bg.well,
        border: `1.5px solid ${done ? DT.jade.default : DT.border.default}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DT.jade.default} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </div>
      <span style={{ fontSize: 12, color: done ? DT.text.primary : DT.text.muted, fontWeight: done ? 600 : 400, lineHeight: 1.5 }}>{label}</span>
    </div>
  );
}

// ── Step 1: Enrollment SMS ──
function Step1() {
  return (
    <SplitView
      left={
        <Card style={{ background: '#0F172A', border: 'none', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 12 }}>Messages</div>
          <SMSBubble from="Vardana Health" text="Hi Marcus, Dr. Torres has enrolled you in a 90-day cardiometabolic management program. Vardana will help you track your blood pressure, glucose, and medications between visits. Reply YES to get started." />
          <SMSBubble text="YES" align="right" />
          <SMSBubble from="Vardana Health" text="Welcome! You'll receive a link to your secure patient portal shortly. We'll also schedule your first check-in call." />
        </Card>
      }
      right={
        <Card>
          <Badge color={DT.jade.default}>Patient Enrolled</Badge>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: DT.text.primary, fontFamily: DT.font.display }}>Marcus Williams, 58M</div>
            <div style={{ fontSize: 12, color: DT.text.secondary, marginTop: 4 }}>MRN: MW-2026-0422</div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Conditions', 'HTN (I10), T2DM (E11.9), Hyperlipidemia (E78.5)'],
              ['Provider', 'Dr. Angela Torres'],
              ['Program', '90-Day Cardiometabolic Management'],
              ['Care Team', 'David Park, RN (Coordinator)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: DT.text.muted, minWidth: 75, fontWeight: 600 }}>{k}</span>
                <span style={{ color: DT.text.primary }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '8px 12px', background: DT.accentLight, borderRadius: DT.radius.sm, fontSize: 11, color: DT.accentText, fontWeight: 600 }}>
            FHIR CarePlan created
          </div>
        </Card>
      }
    />
  );
}

// ── Step 2: Welcome Email ──
function Step2() {
  return (
    <SplitView
      left={
        <Card>
          <div style={{ fontSize: 10, color: DT.text.muted, marginBottom: 4 }}>From: Vardana Health &lt;care@vardana.ai&gt;</div>
          <div style={{ fontSize: 10, color: DT.text.muted, marginBottom: 12 }}>Subject: <strong style={{ color: DT.text.primary }}>Welcome to your 90-Day Program, Marcus</strong></div>
          <div style={{ borderTop: `1px solid ${DT.border.subtle}`, paddingTop: 14 }}>
            <p style={{ fontSize: 13, color: DT.text.secondary, lineHeight: 1.7, margin: '0 0 12px' }}>Dear Marcus,</p>
            <p style={{ fontSize: 13, color: DT.text.secondary, lineHeight: 1.7, margin: '0 0 12px' }}>
              Welcome to your cardiometabolic management program. Here's what to expect:
            </p>
            <ul style={{ fontSize: 12, color: DT.text.secondary, lineHeight: 1.8, margin: '0 0 16px', paddingLeft: 18 }}>
              <li>Daily BP monitoring at home</li>
              <li>Twice-daily glucose checks</li>
              <li>Weekly AI-guided check-in calls</li>
              <li>Your care coordinator David Park is here to help</li>
            </ul>
            <div style={{
              display: 'inline-block', padding: '10px 24px', background: DT.accent,
              color: 'white', borderRadius: DT.radius.md, fontSize: 13, fontWeight: 700,
            }}>
              Access Your Portal
            </div>
          </div>
        </Card>
      }
      right={
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary, marginBottom: 14 }}>Automated Actions</div>
          <TimelineItem label="Welcome email sent" />
          <TimelineItem label="Patient portal provisioned" />
          <TimelineItem label="First check-in call scheduled: Day 3" />
          <TimelineItem label="Monitoring devices linked" />
          <div style={{ marginTop: 10, padding: '8px 12px', background: DT.accentLight, borderRadius: DT.radius.sm, fontSize: 11, color: DT.accentText, fontWeight: 600 }}>
            FHIR Encounter created
          </div>
        </Card>
      }
    />
  );
}

// ── Step 3: Patient Portal ──
function Step3() {
  const vitals = [
    { label: 'Blood Pressure', value: '138/84', unit: 'mmHg', status: 'warning' },
    { label: 'Glucose', value: '126', unit: 'mg/dL', status: 'warning' },
    { label: 'Weight', value: '96.8', unit: 'kg', status: 'good' },
  ];

  return (
    <SplitView
      left={
        <Card>
          <div style={{ fontSize: 18, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display, marginBottom: 4 }}>Day 22 of 90</div>
          <div style={{ fontSize: 12, color: DT.text.muted, marginBottom: 16 }}>Cardiometabolic Management Program</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vitals.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: DT.bg.well, borderRadius: DT.radius.sm }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase' }}>{v.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display, marginTop: 2 }}>
                    {v.value} <span style={{ fontSize: 11, color: DT.text.muted }}>{v.unit}</span>
                  </div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: v.status === 'good' ? DT.jade.default : DT.amber.default,
                }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, color: DT.text.muted, background: DT.bg.well, padding: '4px 10px', borderRadius: DT.radius.sm }}>Goal: BP &lt;130/80</span>
            <span style={{ fontSize: 11, color: DT.text.muted, background: DT.bg.well, padding: '4px 10px', borderRadius: DT.radius.sm }}>Goal: HbA1c &lt;7%</span>
          </div>
        </Card>
      }
      right={
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary, marginBottom: 12 }}>FHIR Data Panel</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>Active Conditions</div>
            {['Essential Hypertension (I10)', 'T2DM (E11.9)', 'Hyperlipidemia (E78.5)', 'Obesity (E66.01)'].map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: DT.text.secondary, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: DT.amber.default, flexShrink: 0 }} />{c}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>Current Medications (5)</div>
            {['Lisinopril 20mg', 'Amlodipine 5mg', 'Metformin 1000mg', 'Atorvastatin 40mg', 'Aspirin 81mg'].map((m, i) => (
              <div key={i} style={{ fontSize: 11, color: DT.text.secondary, padding: '2px 0' }}>{m}</div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>Risk Scores</div>
            {[
              ['ACC/AHA PCE', '17.3%', '10-year ASCVD'],
              ['AHA/ACC 2017 HTN', 'Stage 1', 'BP 130-139/80-89'],
              ['ADA 2026 CV Risk', 'High', 'T2DM+HTN+HLD'],
            ].map(([label, value, note], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0' }}>
                <span style={{ color: DT.text.muted, minWidth: 100 }}>{label}</span>
                <span style={{ color: DT.text.primary, fontWeight: 700 }}>{value}</span>
                <span style={{ color: DT.text.faint, fontSize: 10 }}>{note}</span>
              </div>
            ))}
          </div>
          <Badge color={DT.accent}>22 days of continuous monitoring</Badge>
        </Card>
      }
    />
  );
}

// ── Step 4: Voice Check-in (uses VoiceCallWidget) ──
function Step4({ onAlert }) {
  return (
    <VoiceCallWidget
      patientId="1de9768a-2459-4586-a888-d184a70479cc"
      sessionToken="demo"
      mode="demo"
      onAlert={(alertPayload) => { if (onAlert) onAlert(alertPayload); }}
    />
  );
}

// ── Step 5: Escalation ──
function Step5({ alert: liveAlert }) {
  const hasLiveAlert = liveAlert && liveAlert.patient_name;
  const alertTitle = hasLiveAlert ? liveAlert.reason : 'Medication Non-Adherence + BP Trend';
  const alertSeverity = hasLiveAlert ? liveAlert.risk_level : 'P2';
  const alertTrigger = hasLiveAlert ? liveAlert.reason : 'Missed Lisinopril doses, BP 138/84 trending up from 129/80';
  const alertRisk = hasLiveAlert ? '84 (High)' : '68 (Medium-High)';
  const alertColor = hasLiveAlert ? DT.crimson : DT.amber.default;
  const alertBgColor = hasLiveAlert ? DT.crimsonBg : undefined;

  return (
    <SplitView
      left={
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: DT.jade.light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={DT.jade.default} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display }}>Check-in Complete</div>
          </div>
          <div style={{ background: DT.bg.well, borderRadius: DT.radius.sm, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary, marginBottom: 6 }}>Summary</div>
            <p style={{ fontSize: 12, color: DT.text.secondary, lineHeight: 1.6, margin: 0 }}>
              {hasLiveAlert
                ? 'Marcus reported chest pain during check-in. Care coordinator David Park has been notified immediately. If pain returns, call 911.'
                : 'We discussed your blood pressure and medication. Your coordinator David will follow up with you about your Lisinopril schedule.'}
            </p>
          </div>
          <div style={{ fontSize: 12, color: DT.text.muted, marginBottom: 8 }}>
            Next check-in: <strong style={{ color: DT.text.primary }}>March 20, 2026 at 9:00 AM</strong>
          </div>
          <div style={{ fontSize: 12, color: DT.accent, fontWeight: 600, cursor: 'pointer' }}>View your portal &rarr;</div>
        </Card>
      }
      right={
        <Card style={{ borderLeft: `4px solid ${alertColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Badge color={alertColor}>{alertSeverity} Alert</Badge>
            <span style={{ fontSize: 11, color: DT.text.muted }}>Sent to David Park, RN at 9:47 AM</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DT.text.primary, marginBottom: 8, fontFamily: DT.font.display }}>{alertTitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {[
              ['Patient', 'Marcus Williams'],
              ['Trigger', alertTrigger],
              ['Risk', alertRisk],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: DT.text.muted, minWidth: 55, fontWeight: 600 }}>{k}</span>
                <span style={{ color: DT.text.primary }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: DT.text.muted, textTransform: 'uppercase', marginBottom: 8 }}>Recommended Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(hasLiveAlert
              ? ['Immediate coordinator callback', 'Rule out cardiac event — consider ER referral', 'Increase monitoring frequency']
              : ['Coordinator callback within 4 hours', 'Consider medication timing adjustment', 'Increase BP monitoring frequency']
            ).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: DT.text.secondary, alignItems: 'center' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: alertColor, flexShrink: 0 }} />
                {a}
              </div>
            ))}
          </div>
        </Card>
      }
    />
  );
}

// ── Step 6: Care Team Response ──
function Step6() {
  return (
    <SplitView
      left={
        <Card style={{ background: '#0F172A', border: 'none' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 12 }}>Messages</div>
          <SMSBubble
            from="David Park, RN — Vardana"
            text="Hi Marcus, I saw from your check-in that you've been missing some Lisinopril doses. That's likely why your BP has gone up. Would it help to move your dose to bedtime instead of morning? Some patients find that easier. I've also bumped up your BP monitoring to twice daily for the next week. Call me if you have questions — 206-555-0143."
          />
          <SMSBubble text="Yeah bedtime would be easier actually. Thanks David" align="right" />
        </Card>
      }
      right={
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Badge color={DT.jade.default}>Alert Resolved</Badge>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: DT.text.primary, marginBottom: 12 }}>Actions Taken</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Medication timing adjusted: Lisinopril AM → PM', done: true },
              { label: 'BP monitoring frequency: 1x → 2x daily for 7 days', done: true },
              { label: 'Patient education: Lisinopril adherence importance', done: true },
              { label: 'Follow-up call scheduled: March 22', done: false },
            ].map((a, i) => (
              <TimelineItem key={i} label={a.label} done={a.done} />
            ))}
          </div>
          <div style={{ padding: '8px 12px', background: DT.accentLight, borderRadius: DT.radius.sm, fontSize: 11, color: DT.accentText, fontWeight: 600, marginBottom: 8 }}>
            Care plan updated
          </div>
          <div style={{ fontSize: 11, color: DT.text.muted, fontStyle: 'italic' }}>
            Average coordinator time: 4 minutes
          </div>
        </Card>
      }
    />
  );
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6];

export default function ClinicalDemoPage({ navigate }) {
  const [step, setStep] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [coordinatorAlert, setCoordinatorAlert] = useState(null);

  const goTo = (s) => {
    if (s >= 0 && s < STEPS.length) {
      setStep(s);
      setFadeKey(k => k + 1);
    }
  };

  const StepContent = STEP_COMPONENTS[step];

  return (
    <DemoShell maxWidth={960}>
      <style>{`@keyframes stepFade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Back link */}
      <div style={{ position: 'fixed', top: 24, left: 32, zIndex: 10 }}>
        <a href={DEMO_BASE} onClick={e => { e.preventDefault(); navigate(DEMO_BASE); }} style={{
          fontSize: 13, color: DT.text.muted, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: DT.font.body,
        }}>
          &larr; Back to demos
        </a>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <VardanaLogo />
        <h1 style={{ fontFamily: DT.font.display, fontSize: 24, fontWeight: 400, color: DT.text.primary, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Clinical Demo — Marcus Williams
        </h1>
        <p style={{ fontSize: 13, color: DT.text.muted, margin: '0 0 24px', fontFamily: DT.font.body }}>
          90-Day Cardiometabolic Management Program
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={STEPS.length} onStepClick={goTo} />

      {/* Step title */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 400, color: DT.text.primary, fontFamily: DT.font.display }}>{STEPS[step].title}</div>
        <div style={{ fontSize: 13, color: DT.text.muted, marginTop: 4 }}>{STEPS[step].subtitle}</div>
      </div>

      {/* Step content */}
      <div key={fadeKey} style={{ animation: 'stepFade 0.3s ease-out', marginBottom: 32 }}>
        {step === 3 ? (
          <StepContent onAlert={(a) => setCoordinatorAlert(a)} />
        ) : step === 4 ? (
          <StepContent alert={coordinatorAlert} />
        ) : (
          <StepContent />
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
        {step > 0 ? (
          <button onClick={() => goTo(step - 1)} style={{
            background: 'none', border: `1px solid ${DT.border.default}`,
            borderRadius: DT.radius.md, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, color: DT.text.secondary,
            cursor: 'pointer', fontFamily: DT.font.body,
          }}>
            &larr; Previous
          </button>
        ) : <div />}
        {step < STEPS.length - 1 ? (
          <button onClick={() => goTo(step + 1)} style={{
            background: DT.accent, border: 'none',
            borderRadius: DT.radius.md, padding: '10px 24px',
            fontSize: 13, fontWeight: 700, color: 'white',
            cursor: 'pointer', fontFamily: DT.font.body,
          }}>
            Next &rarr;
          </button>
        ) : (
          <button onClick={() => goTo(0)} style={{
            background: DT.navy, border: 'none',
            borderRadius: DT.radius.md, padding: '10px 24px',
            fontSize: 13, fontWeight: 700, color: 'white',
            cursor: 'pointer', fontFamily: DT.font.body,
          }}>
            Restart Demo
          </button>
        )}
      </div>

      <FhirFootnote />
    </DemoShell>
  );
}
