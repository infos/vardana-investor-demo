import React, { useState } from 'react';
import { DemoShell, BackButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';

export default function ScriptedDemoPage({ navigate }) {
  const [step, setStep] = useState('about');

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate('/demo') : setStep('about')} />
      {step === 'about' ? (
        <AboutSlide
          onBack={() => navigate('/demo')}
          onSkip={() => navigate('/coordinator?demo=scripted')}
          onNext={() => setStep('scenario')}
        />
      ) : (
        <ScenarioSlide
          onBack={() => setStep('about')}
          onEnter={() => navigate('/coordinator?demo=scripted')}
          enterLabel="Enter Demo &#8594;"
        />
      )}
    </DemoShell>
  );
}
