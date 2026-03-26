## Positioning Guardrails (Do Not Drift From These)
- CHF post-discharge is the beachhead. Do not generalize to "chronic conditions."
- Marcus Williams / HTN-DM demo exists for one specific prospect (Redesign Health).
  It is not a product pivot.
- Vardana augments care coordinators. It does not replace nurses or clinical staff.
- Never describe Vardana as an "AI nurse."

# Vardana Investor Demo

Investor-facing demo of Vardana's AI care concierge for CHF post-discharge patients.
Deployed on Vercel at **vardana.ai**.

## Stack

- **Frontend:** Vite + React 18 SPA (JavaScript/JSX, not TypeScript)
- **Routing:** Custom pushState router in `src/main.jsx` (no React Router)
- **Backend:** Vercel serverless functions (`api/*.js`)
- **AI:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via `api/voice-chat.js`
- **TTS:** ElevenLabs primary (`eleven_turbo_v2_5`), Cartesia Sonic fallback — routed through `api/tts.js`
- **Charts:** Recharts (weight, BP, glucose trend lines)
- **Analytics:** Custom `useAnalytics` hook + `api/analytics.js` + `api/track.js`

## File Tree

```
├── api/
│   ├── tts.js                # TTS proxy — ElevenLabs primary, Cartesia fallback
│   ├── elevenlabs-tts.js     # Legacy TTS endpoint (ElevenLabs + Cartesia)
│   ├── voice-chat.js         # Claude Haiku live-conversation endpoint
│   ├── epic-fhir.js          # Epic FHIR R4 sandbox proxy
│   ├── medplum-fhir.js       # Medplum FHIR proxy
│   ├── analytics.js           # Analytics aggregation
│   └── track.js               # Event tracking
├── src/
│   ├── main.jsx              # Router: /, /coordinator, /patient, /demo/*, /roi, /admin
│   ├── App.jsx               # Main monolith (~4330 lines): roster, patient detail, voice call, FHIR panel
│   ├── HomePage.jsx          # Marketing landing page (vardana.ai/)
│   ├── DemoPage.jsx          # Demo hub (/demo)
│   ├── ROICalculator.jsx     # ROI calculator (/roi)
│   ├── AdminAnalytics.jsx    # Admin dashboard (/admin)
│   ├── useAnalytics.js       # Page-view analytics hook
│   └── demo/
│       ├── LiveDemoPage.jsx       # Live demo onboarding (about → scenario → coordinator)
│       ├── ScriptedDemoPage.jsx   # Scripted demo — Loom video embed
│       ├── RecordedDemoPage.jsx   # Recorded demo page
│       ├── DemoShell.jsx          # Shared demo layout shell
│       ├── AboutSlide.jsx         # "What Vardana Does" intro slide
│       ├── ScenarioSlide.jsx      # Scenario picker (Sarah / Marcus) with Start buttons
│       ├── icons.jsx              # SVG icon components
│       ├── tokens.js              # Demo shell design tokens (DT.*)
│       └── useIsMobile.js         # Mobile detection hook (768px breakpoint)
├── evals/                    # Clinical reasoning eval suite (TypeScript)
│   ├── run-evals.ts          # Eval runner (decompensation, reasoning, safety)
│   └── runners/              # Individual eval test files
├── tests/                    # Playwright E2E + responsive + API tests
├── public/
│   ├── data/marcus-williams-bundle.json   # Marcus FHIR bundle
│   └── .well-known/jwks.json             # Epic JWKS
├── vercel.json               # SPA rewrites, Cache-Control no-cache, /api/* routing
├── vite.config.js
└── package.json
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `HomePage` | Marketing landing page |
| `/coordinator` | `App` (coordinator role) | Care coordinator dashboard + voice call |
| `/patient` | `App` (patient role) | Patient-facing view |
| `/demo` | `DemoPage` | Demo hub |
| `/demo/scripted` | `ScriptedDemoPage` | Loom video embed |
| `/demo/recorded` | `RecordedDemoPage` | Recorded demo |
| `/demo/live` | `LiveDemoPage` | Live demo onboarding slides → coordinator |
| `/roi` | `ROICalculator` | ROI calculator |
| `/admin` | `AdminAnalytics` | Analytics dashboard |

Key query params on `/coordinator`:
- `?demo=scripted` — auto-starts scripted voice call (preloads TTS, no user interaction needed)
- `?demo=live` — live AI conversation mode
- `?patient=marcus` — selects Marcus Williams scenario (default is Sarah Chen)

## Demo Scenarios

### Sarah Chen (default) — CHF Decompensation
- 67F, Day 15/90, HFpEF + HTN + T2DM + CKD3a
- Script: 9 lines. AI detects weight gain (+2.3 lbs/48hr), rising BP (136/86), patient confirms ankle swelling + orthopnea
- Risk score: 68 → 72 → 75 → 78 → 82 → 84
- Alert: P2 decompensation risk → escalated to coordinator Rachel Kim
- Coordinator: Nurse Rachel Kim, RN

### Marcus Williams — HTN + Diabetes BP Crisis
- 58M, Day 22/90, Essential HTN + T2DM + Hyperlipidemia + Obesity
- Script: 8 lines. AI flags BP 158/98 (4-day worsening from 129/80), patient reports headache, confirms missed Lisinopril
- Risk score: 53 → 68 → 73
- Alert: P2 BP crisis risk → escalated to coordinator David Park
- Coordinator: Nurse David Park, RN

## UI State Machine (App.jsx)

`uiState`: `setup` → `loading` → `dialing` → `connected` → `active` → `alert` → `done` → `closing`

When `?demo=scripted` is set, `autoStartScripted` is true and state starts at `loading` (skips setup).

## TTS Architecture

### Scripted Mode
1. TTS warm-up: sends minimal "." request to prime API connection
2. Sequential preload: fetches all lines one-by-one with 300ms gaps (avoids rate limits)
3. Progress bar shows `Math.max(loadProgress, preloadProgress)`
4. After preload completes, `launchCall()` starts playback from cached blob URLs

### Live Mode
- TTS fetched on-demand per AI response
- Voice input via Web Speech API (SpeechRecognition)

### Healthcare Pronunciation (`api/tts.js`)
Text normalizer applied only to Cartesia (ElevenLabs handles pronunciation natively):
- BP readings: `158/98` → `158 over 98`
- Units: `mg/dL` → `milligrams per deciliter`
- Abbreviations: `CHF`, `HTN`, `T2DM`, `BP`, `HFrEF`, `NYHA` → expanded
- Medications: `Lisinopril` → `ly-SIN-oh-pril`, `Metoprolol` → `meh-TOE-pro-lol`, etc.
- Emergency: `911` → `nine one one`

## Design Tokens

Two token systems coexist in `App.jsx`:

### `DS.*` — Primary design system
- Fonts: DM Serif Display (headings), DM Sans (body), IBM Plex Mono (code)
- Navy scale: `#1E3A5F` (950/900/800) → `#F6F7F9` (50)
- Amber: `#D97706` (warning)
- Jade: `#059669` (success/stable)
- Crimson: `#C0392B` (critical/alert)

### `c.*` — Compat layer mapping old tokens to DS values

### `DT.*` — Demo shell tokens (`src/demo/tokens.js`)
- `DT.navy`: `#1E3A5F`, `DT.accent`: `#3DBFA0` (teal)
- Used in demo slides, onboarding, and shell chrome

## iOS Audio

Web Audio API (`AudioContext` + `GainNode`) bypasses Safari autoplay restrictions.
`unlockAudio()` must be called within user gesture context (button click handlers).
Mute toggle controls `gainRef.current.gain.value` (not `audio.muted`).

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `TTS_API_KEY` / `ELEVENLABS_API_KEY` | ElevenLabs TTS (primary) |
| `CARTESIA_API_KEY` | Cartesia Sonic TTS (fallback) |
| `ANTHROPIC_API_KEY` | Claude Haiku for live voice-chat |
| `MARCUS_VOICE_ID` | Optional ElevenLabs voice override for Marcus |
| `EPIC_CLIENT_ID` | Epic FHIR sandbox client ID |

## Build & Deploy

```bash
npm run dev          # Local dev server (Vite)
npm run build        # Production build (~733 kB gzip ~198 kB)
npx vercel --prod    # Manual deploy (fallback if GitHub auto-deploy stalls)
git push origin master   # Triggers Vercel auto-deploy
```

## Testing

```bash
npm run test:e2e          # Playwright chromium
npm run test:responsive   # iPad, iPhone, Pixel device tests
npm run test:api          # API endpoint tests
npm run eval              # Clinical reasoning evals
npm run qa                # QA runner
```

## Common Patterns

- **Navigation:** Use `navigate('/path')` (custom pushState), never `window.location`
- **Timers:** All setTimeout/setInterval go through `addTimer()` for cleanup on cancel
- **Cancel:** `cancelRef.current` checked before every async continuation
- **FHIR log:** `setFhirLog(p => [...p, entry])` — append-only during call
- **Risk score:** `setRiskScore(n)` — stepped up at specific transcript indices via `triggerEffects`
- **Mobile:** `useIsMobile(768)` hook used throughout; demo shell has its own copy in `src/demo/useIsMobile.js`
