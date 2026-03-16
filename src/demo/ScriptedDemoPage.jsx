import React, { useState } from 'react';
import { DemoShell, BackButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';

export default function ScriptedDemoPage({ navigate }) {
  const [step, setStep] = useState('about');

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate('/demo') : setStep('about')} />
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%', maxWidth: 900 }}>
        <iframe
          src="https://www.loom.com/embed/ab1c85d821684a919d8d7574b5ba2055"
          frameBorder="0"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 12 }}
        />
      </div>
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
