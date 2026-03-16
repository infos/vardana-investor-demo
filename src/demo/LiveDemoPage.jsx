import React, { useState } from 'react';
import { DT } from './tokens';
import { DemoShell, BackButton, PrimaryButton, GhostButton } from './DemoShell';
import AboutSlide from './AboutSlide';
import ScenarioSlide from './ScenarioSlide';
import { useIsMobile } from './useIsMobile';

export default function LiveDemoPage({ navigate }) {
  const [step, setStep] = useState('about');
  const isMobile = useIsMobile();

  const ctaSlot = (
    <div style={{
      display: 'flex',
      gap: 8,
      width: isMobile ? '100%' : 'auto',
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      <GhostButton onClick={() => setStep('about')}>&larr; Back</GhostButton>
      <PrimaryButton onClick={() => navigate('/coordinator?demo=live')} color={DT.amber.default} textColor={DT.bg.page}>
        Open Coordinator View &rarr;
      </PrimaryButton>
      <PrimaryButton onClick={() => navigate('/patient')} color={DT.jade.default} textColor="white">
        Open Patient Portal &rarr;
      </PrimaryButton>
    </div>
  );

  return (
    <DemoShell>
      <BackButton onClick={() => step === 'about' ? navigate('/demo') : setStep('about')} />
      {step === 'about' ? (
        <AboutSlide
          onBack={() => navigate('/demo')}
          onSkip={() => navigate('/coordinator?demo=live')}
          onNext={() => setStep('scenario')}
        />
      ) : (
        <ScenarioSlide
          onBack={() => setStep('about')}
          ctaSlot={ctaSlot}
        />
      )}
    </DemoShell>
  );
}
