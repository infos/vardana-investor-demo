import React, { useState } from 'react';
import { DT } from './tokens';
import { DemoShell, BackButton, PrimaryButton, GhostButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';
import { DEMO_BASE } from '../demoPath';
import { useIsMobile } from './useIsMobile';

export default function LiveDemoPage({ navigate }) {
  // Sole cardiometabolic patient post CHF decommission. Patient picker / Sarah
  // path collapsed; query param retained for back-compat.
  const [step, setStep] = useState('about');
  const [selectedPatient, setSelectedPatient] = useState('marcus');
  const isMobile = useIsMobile();

  const ctaSlot = (
    <div style={{
      display: 'flex',
      gap: 8,
      width: isMobile ? '100%' : 'auto',
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      <GhostButton onClick={() => setStep('about')}>&larr; Back</GhostButton>
      <PrimaryButton onClick={() => navigate(`/coordinator?demo=live&patient=marcus`)} color={DT.amber.default} textColor={DT.bg.page}>
        Open Coordinator View &rarr;
      </PrimaryButton>
    </div>
  );

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate(DEMO_BASE) : setStep('about')} />
      {step === 'about' ? (
        <AboutSlide
          onBack={() => navigate(DEMO_BASE)}
          onSkip={() => navigate(`/coordinator?demo=live${patientParam}`)}
          onNext={() => setStep('scenario')}
        />
      ) : (
        <ScenarioSlide
          onBack={() => setStep('about')}
          onEnter={(patient) => navigate(`/coordinator?demo=live${patient === 'marcus' ? '&patient=marcus' : ''}`)}
          onPatientSelect={(patient) => setSelectedPatient(patient)}
          defaultPatient={defaultPatient}
          ctaSlot={ctaSlot}
        />
      )}
    </DemoShell>
  );
}
