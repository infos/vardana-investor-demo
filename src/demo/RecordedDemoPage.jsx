import React, { useState } from 'react';
import { DemoShell, BackButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';

export default function RecordedDemoPage({ navigate }) {
  const conditionParam = new URLSearchParams(window.location.search).get('condition') || '';
  const defaultPatient = conditionParam.toLowerCase().startsWith('hyp') ? 'marcus' : 'sarah';
  const [step, setStep] = useState('about');
  const [selectedPatient, setSelectedPatient] = useState(defaultPatient);

  const patientParam = selectedPatient === 'marcus' ? '&patient=marcus' : '';

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate('/demo') : setStep('about')} />
      {step === 'about' ? (
        <AboutSlide
          onBack={() => navigate('/demo')}
          onSkip={() => navigate(`/coordinator?demo=scripted${patientParam}`)}
          onNext={() => setStep('scenario')}
        />
      ) : (
        <ScenarioSlide
          onBack={() => setStep('about')}
          onEnter={(patient) => navigate(`/coordinator?demo=scripted${patient === 'marcus' ? '&patient=marcus' : ''}`)}
          onPatientSelect={(patient) => setSelectedPatient(patient)}
          enterLabel="Enter Demo &#8594;"
          defaultPatient={defaultPatient}
        />
      )}
    </DemoShell>
  );
}
