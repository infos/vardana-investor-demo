# Vardana · Care Coordinator Demo

Investor demo app — AI concierge voice call with live FHIR activity and decompensation scoring.

## Quick Start

```bash
npm install
npm run dev
```

Opens at http://localhost:3000

## Voice Demo Setup

The voice demo uses **ElevenLabs** for natural TTS.

1. Sign up free at https://elevenlabs.io (10,000 chars/month free)
2. Go to: Profile icon → API Keys → Create API Key
3. Paste the key into the setup screen when you click "Voice Call" in the demo

### Character usage
- Full demo run: ~800 characters
- Free tier supports ~12 full runs per month
- Paid: $0.30/1,000 chars = ~$0.24/run

## Demo Flow

1. **Roster** → Click Sarah Chen (flagged high-risk)
2. **Patient Detail** → Review AI clinical assessment
3. **Initiate Outreach** → Select Voice → Immediately
4. **Paste ElevenLabs key** → Test Key → Generate Audio & Start Demo
5. Watch: transcript builds, FHIR queries fire, risk score climbs 72→84, P1 alert generates
6. Return to dashboard → Try SMS path to see app onboarding flow

## Tech

- React 18 + Vite
- Recharts (vitals charts)
- ElevenLabs API (Rachel voice for AI, Charlotte for patient)
- Web Speech API fallback (no key required, lower quality)
