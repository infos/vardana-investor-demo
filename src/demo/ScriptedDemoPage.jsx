import React, { useState } from 'react';
import { DemoShell, BackButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';

export default function ScriptedDemoPage({ navigate }) {
  const [step, setStep] = useState('about');

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate('/demo') : setStep('about')} />
      <div style={{ width: '100%', background: '#000' }}>
        <div style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          width: '100%',
        }}>
          <iframe
            src="https://share.descript.com/embed/yYuz1hZqXOF"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
          />
        </div>
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
