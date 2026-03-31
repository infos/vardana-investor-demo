import React, { useState } from 'react';
import { DemoShell, BackButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';
import { DEMO_BASE } from '../demoPath';

export default function RecordedDemoPage({ navigate }) {
  const searchParams = new URLSearchParams(window.location.search);
  const patientParam = searchParams.get('patient');
  const conditionParam = searchParams.get('condition') || '';
  // patient param takes priority, then condition, then default sarah
  const defaultPatient = patientParam === 'marcus' ? 'marcus'
    : patientParam === 'sarah' ? 'sarah'
    : conditionParam.toLowerCase().startsWith('hyp') ? 'marcus'
    : 'sarah';
  const [step, setStep] = useState('about');
  const [selectedPatient, setSelectedPatient] = useState(defaultPatient);

  const isMarcus = selectedPatient === 'marcus';
  const coordinatorHref = isMarcus
    ? '/coordinator?demo=scripted&patient=marcus'
    : '/coordinator?demo=scripted';
  const patientHref = isMarcus ? '/patient?patient=marcus' : '/patient';

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate(DEMO_BASE) : setStep('about')} />
      {step === 'about' ? (
        <AboutSlide
          onBack={() => navigate(DEMO_BASE)}
          onSkip={() => navigate(coordinatorHref)}
          onNext={() => setStep('scenario')}
        />
      ) : (
        <ScenarioSlide
          onBack={() => setStep('about')}
          onEnter={(patient) => navigate(patient === 'marcus'
            ? '/coordinator?demo=scripted&patient=marcus'
            : '/coordinator?demo=scripted'
          )}
          onPatientSelect={(patient) => setSelectedPatient(patient)}
          enterLabel="Enter Demo &#8594;"
          defaultPatient={defaultPatient}
        />
      )}
    </DemoShell>
  );
}
