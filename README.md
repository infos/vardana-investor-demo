# Vardana · Care Coordinator Demo

Investor demo app — AI concierge voice + chat check-in for cardiometabolic (HTN + T2DM) patients, backed by a deterministic guideline-cited escalation rule set.

## Quick Start

```bash
npm install
npm run dev
```

Opens at http://localhost:3000

## Voice Demo Setup

The voice demo uses **Cartesia Sonic** for natural TTS.

1. Sign up at https://cartesia.ai and create an API key
2. Set `CARTESIA_API_KEY` in your environment (Vercel → Settings → Environment Variables, or `.env.local`)
3. The streaming endpoint (`/api/cartesia-tts`) and blob endpoint (`/api/tts`) both call Cartesia

## Demo Flow

1. **Roster** → Click Marcus Williams (flagged high-risk)
2. **Patient Detail** → Review AI clinical assessment
3. **Initiate Outreach** → Select Voice → Immediately
4. **Start Demo** → voice call begins, audio streams from Cartesia
5. Watch: transcript builds, FHIR queries fire, risk score climbs, P2 alert generates
6. Return to dashboard

## Tech

- React 18 + Vite
- Recharts (vitals charts)
- Cartesia Sonic TTS (streaming via MediaSource, blob fallback for Safari/iOS)
- Web Speech API for patient-side speech recognition
- Claude (via AWS Bedrock) for clinical conversation
