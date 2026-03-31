import React, { useState } from 'react';
import { DT } from './tokens';
import { DemoShell, BackButton, PrimaryButton, GhostButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';
import { DEMO_BASE } from '../demoPath';
import { useIsMobile } from './useIsMobile';

export default function LiveDemoPage({ navigate }) {
  const conditionParam = new URLSearchParams(window.location.search).get('condition') || '';
  const defaultPatient = conditionParam.toLowerCase().startsWith('hyp') ? 'marcus' : 'sarah';

  const [step, setStep] = useState('about');
  const [selectedPatient, setSelectedPatient] = useState(defaultPatient);
  const isMobile = useIsMobile();

  const patientParam = selectedPatient === 'marcus' ? '&patient=marcus' : '';

  const ctaSlot = (
    <div style={{
      display: 'flex',
      gap: 8,
      width: isMobile ? '100%' : 'auto',
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      <GhostButton onClick={() => setStep('about')}>&larr; Back</GhostButton>
      <PrimaryButton onClick={() => navigate(`/coordinator?demo=live${patientParam}`)} color={DT.amber.default} textColor={DT.bg.page}>
        Open Coordinator View &rarr;
      </PrimaryButton>
      <PrimaryButton onClick={() => navigate(`/patient${selectedPatient === 'marcus' ? '?patient=marcus' : ''}`)} color={DT.jade.default} textColor="white">
        Open Patient Portal &rarr;
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
