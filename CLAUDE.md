## Positioning Guardrails (Do Not Drift From These)
- **Cardiometabolic (HTN + T2DM) is the sole beachhead.** CHF post-discharge was decommissioned in April 2026. Do not reintroduce CHF logic, scoring, or persona files.
- **Marcus Williams is the headline demo patient, period.** Linda Patel and David Brooks are also seeded for cardiometabolic chat, voice, and chart surfaces. There is no Sarah Chen, no HFrEF demo, no NYHA-class persona. Do not generalize beyond cardiometabolic.
- Vardana augments care coordinators. It does not replace nurses or clinical staff.
- Never describe Vardana as an "AI nurse."

# Vardana Investor Demo

Investor-facing demo of Vardana's AI care concierge for cardiometabolic (hypertension + type 2 diabetes) patients. Deployed on Vercel at **vardana.ai**.

## Stack

- **Frontend:** Vite + React 18 SPA (JavaScript/JSX, not TypeScript). Deterministic clinical logic lives in TypeScript under `src/lib/clinical-skills/`.
- **Routing:** Custom pushState router in `src/main.jsx` (no React Router).
- **Backend:** Vercel serverless functions (`api/*.js`) plus the EC2 voice service (`vardana-voice` repo) for live chat and live voice calls.
- **Clinical brain:** Deterministic escalation rule set at `src/lib/clinical-skills/escalation.ts` (TS), `api/_lib/escalation.js` (CommonJS for Vercel functions), and `evals/eval-harness/rules.py` (Python reference + harness). All three implement the same 7-rule cardiometabolic taxonomy with byte-equal trigger/citation strings. Calibration covered by `src/lib/clinical-skills/escalation.test.ts` and `evals/eval-harness/harness.py`.
- **AI:** Claude via AWS Bedrock (default: `anthropic.claude-sonnet-4-6`), fallback to direct Anthropic API — `api/voice-chat.js`. The deterministic state is injected into the system prompt as a hard constraint; the LLM controls language only.
- **TTS:** Cartesia Sonic — `api/cartesia-tts.js` (streaming) and `api/tts.js` (blob).
- **Charts:** Recharts (BP, glucose trend lines).
- **Analytics:** Custom `useAnalytics` hook + `api/analytics.js` + `api/track.js`.

## File Tree

```
├── api/
│   ├── _lib/
│   │   ├── escalation.js                  # CommonJS port of the cardiometabolic rule set
│   │   └── build_scenario_from_fhir.js    # FHIR → ScenarioInput adapter
│   ├── tts.js                             # Cartesia TTS — blob (preload)
│   ├── cartesia-tts.js                    # Cartesia TTS — streaming (live)
│   ├── voice-chat.js                      # Vercel function: parse → assessEscalationState → Claude → reply
│   ├── epic-fhir.js                       # Epic FHIR R4 sandbox proxy
│   ├── medplum-fhir.js                    # Medplum FHIR proxy
│   ├── analytics.js                       # Analytics aggregation
│   └── track.js                           # Event tracking
├── src/
│   ├── main.jsx                  # Router: /, /coordinator, /demo/*, /roi, /admin, /checkin
│   ├── App.jsx                   # VoiceCallDemo + CareCoordinatorView (Marcus-only)
│   ├── HomePage.jsx              # Marketing landing page
│   ├── CoordinatorDashboard.jsx  # Care Console — voice + chat surfaces (Marcus, Linda, David)
│   ├── ChatCheckinDemo.jsx       # Two-pane chat surface (live + replay)
│   ├── chatScenarios.js          # Replay-mode scenario manifest
│   ├── DemoPage.jsx              # Demo hub (/demo/{token})
│   ├── ROICalculator.jsx         # Cardiometabolic ROI calculator (/roi)
│   ├── AdminAnalytics.jsx        # Admin dashboard (/admin)
│   ├── lib/clinical-skills/
│   │   ├── escalation.types.ts   # Canonical contract (snake_case, matches scenarios.json)
│   │   ├── escalation.ts         # 7-rule cardiometabolic rule set, pure functions
│   │   └── escalation.test.ts    # Calibration test (npx tsx)
│   └── demo/
│       ├── LiveDemoPage.jsx      # Live demo onboarding (about → scenario → coordinator)
│       ├── RecordedDemoPage.jsx  # Recorded demo page (Marcus voice call playback)
│       ├── DemoShell.jsx         # Shared demo layout shell
│       ├── AboutSlide.jsx        # "What Vardana Does" intro slide
│       ├── ScenarioSlide.jsx     # Marcus scenario card (single)
│       ├── icons.jsx             # SVG icon components
│       ├── tokens.js             # Demo shell design tokens (DT.*)
│       └── useIsMobile.js        # Mobile detection hook (768px breakpoint)
├── evals/
│   ├── eval-harness/             # Python harness — calibration + adversarial scenarios
│   │   ├── rules.py              # Python reference rule set (canonical clinical source)
│   │   ├── scenarios.json        # 8 calibration scenarios + patient registry
│   │   ├── scenarios_adversarial.json
│   │   └── harness.py            # CLI runner
│   └── PRODUCTION_RULE_SET_PORT.md  # Spec for the cardiometabolic port
├── public/
│   ├── data/
│   │   ├── marcus-williams-bundle.json   # Marcus FHIR bundle
│   │   ├── linda-patel-bundle.json       # Linda FHIR bundle
│   │   ├── david-brooks-bundle.json      # David FHIR bundle
│   │   ├── angela-ruiz-bundle.json
│   │   ├── marcus-chat-watch.json        # Recorded chat scenario (WATCH → SAME-DAY)
│   │   ├── marcus-chat-stable.json       # Recorded chat scenario (STABLE)
│   │   ├── linda-chat-stable.json        # Recorded chat scenario (STABLE)
│   │   └── david-chat-watch.json         # Recorded chat scenario (WATCH)
│   └── .well-known/jwks.json             # Epic JWKS
├── vercel.json
├── vite.config.js
└── package.json
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `HomePage` | Marketing landing page |
| `/coordinator` | `CoordinatorDashboard` | Care console (gated on token) |
| `/demo/{token}` | `DemoPage` | Demo hub (Recorded + Live cards) |
| `/demo/{token}/recorded` | `RecordedDemoPage` | Recorded Marcus voice demo |
| `/demo/{token}/live` | `LiveDemoPage` | Live demo onboarding |
| `/roi` | `ROICalculator` | Cardiometabolic ROI calculator |
| `/admin` | `AdminAnalytics` | Analytics dashboard |
| `/checkin` | `CheckinPage` | Patient-facing check-in entry |

`/patient` and `/demo/{token}/scripted` were removed when CHF was decommissioned. Both fall through to the HomePage soft-404.

## Demo Scenarios

### Marcus Williams — HTN + T2DM (BP crisis)
- 58M, Day 22 of continuous cardiometabolic care, conditions: Essential hypertension + Type 2 diabetes mellitus + Hyperlipidemia + Obesity (BMI 31.4).
- Today's BP **158/98** with a 4-day worsening trend from **142/88**. Fasting glucose **186 mg/dL**.
- Patient confesses missed Lisinopril for several days; AI dispatches a **SAME-DAY** alert to coordinator David Park citing the 2025 AHA/ACC HTN Guideline.

### Linda Patel — STABLE check-in
- 67F, HTN + T2DM + CKD Stage 3a. BP 122/78, A1c trending down.
- Recorded chat scenario `linda-chat-stable.json` (DRAFT clinical content — review before external sharing).

### David Brooks — WATCH-tier drift
- HTN. BP 146/92 with a 10-day upward drift, adherence-naive Losartan pattern.
- Recorded chat scenario `david-chat-watch.json` (DRAFT clinical content — review before external sharing).

## Escalation Taxonomy

Deterministic 4-tier output from `assessEscalationState(scenario, patient)`:

| State | Meaning | Coordinator response |
|-------|---------|----------------------|
| `IMMEDIATE` | Safety hard gate (hypertensive emergency, level-2 hypoglycemia, hyperglycemic crisis) | 911 + immediate alert |
| `SAME-DAY` | High priority within 4h (sustained Stage 2 + adherence gap, symptomatic hyperglycemia) | Priority alert, coordinator callback today |
| `WATCH` | Coordinator review within 24h (Stage 1 drift, A1c crossing 6.5%) | Watchlist, follow-up next check-in |
| `ROUTINE` | Default; readings tolerated or contextualized (post-activity, improper cuff) | No alert |

Each result also carries `subtype`, `triggers[]`, and `citation` — surfaced to the coordinator and quoted in the framework deck.

## TTS Architecture

### Live Mode
- TTS fetched on-demand per AI response.
- Voice input via Web Speech API (SpeechRecognition).

### Healthcare Pronunciation (`api/tts.js` + `api/cartesia-tts.js`)
Text normalizer applied to Cartesia calls:
- BP readings: `158/98` → `158 over 98`
- Units: `mg/dL` → `milligrams per deciliter`
- Abbreviations: `HTN`, `T2DM`, `HLD`, `BP`, `A1c` → expanded
- Medications: `Lisinopril` → `ly-SIN-oh-pril`, `Atorvastatin` → `ah-TOR-vah-stah-tin`, etc.
- Emergency: `911` → `nine one one`

## Design Tokens

### `DS.*` — Primary design system (App.jsx)
- Fonts: DM Serif Display (headings), DM Sans (body), IBM Plex Mono (code)
- Navy scale: `#1E3A5F` (950/900/800) → `#F6F7F9` (50)
- Amber: `#D97706` (warning)
- Jade: `#059669` (stable)
- Crimson: `#C0392B` (critical/alert)

### `c.*` — Compat layer mapping old tokens to DS values

### `DT.*` — Demo shell tokens (`src/demo/tokens.js`)
- `DT.navy`: `#1E3A5F`, `DT.accent`: `#3DBFA0` (teal)
- Used in demo slides, onboarding, shell chrome.

## iOS Audio

Web Audio API (`AudioContext` + `GainNode`) bypasses Safari autoplay restrictions. `unlockAudio()` must be called within user gesture context (button click handlers). Mute toggle controls `gainRef.current.gain.value`, not `audio.muted`.

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `CARTESIA_API_KEY` | Cartesia Sonic TTS |
| `ANTHROPIC_API_KEY` | Claude API key (fallback when `USE_BEDROCK=false`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Bedrock credentials |
| `USE_BEDROCK` | `true` (default) or `false` |
| `AWS_BEDROCK_REGION` | Bedrock region (default: `us-east-1`) |
| `BEDROCK_MODEL_ID` | Bedrock model (default: `anthropic.claude-sonnet-4-6`) |
| `EPIC_CLIENT_ID` | Epic FHIR sandbox client ID |
| `MEDPLUM_CLIENT_ID` / `MEDPLUM_CLIENT_SECRET` | Medplum service-account creds |
| `VITE_DEMO_TOKEN` | Demo URL token for `/demo/{token}` and `/coordinator?token=…` |
| `VITE_VOICE_BASE_URL` | EC2 voice service base URL (default `https://voice.vardana.ai`) |
| `VITE_VOICE_SESSION_TOKEN` | Bearer token for the EC2 voice service if configured |

## Build & Deploy

```bash
npm run dev          # Local dev server (Vite)
npm run build        # Production build
npx vercel --prod    # Manual deploy (fallback if GitHub auto-deploy stalls)
git push origin master   # Triggers Vercel auto-deploy
```

## Testing

```bash
npm run eval:harness                # Python harness — 8 calibration scenarios, must pass 8/8
npm run eval:harness:adversarial    # 3 adversarial scenarios (probe rule gaps)
npm run eval:escalation:ts          # TS port calibration (8/8 expected)
```

End-to-end Playwright tests were retired with the CHF demo; the deterministic harness is the new contract for clinical correctness. UI smoke testing is manual against the Vercel preview URL.

## Common Patterns

- **Navigation:** Use `navigate('/path')` (custom pushState), never `window.location`.
- **Timers:** All setTimeout/setInterval go through `addTimer()` for cleanup on cancel.
- **Cancel:** `cancelRef.current` checked before every async continuation.
- **FHIR log:** `setFhirLog(p => [...p, entry])` — append-only during call.
- **Mobile:** `useIsMobile(768)` hook used throughout; demo shell has its own copy in `src/demo/useIsMobile.js`.

## When changing escalation rules

The rule set has three implementations that must stay in lockstep:

1. `evals/eval-harness/rules.py` — canonical clinical source. **Change here first.**
2. `src/lib/clinical-skills/escalation.ts` — TS port for the front-end and the type contract.
3. `api/_lib/escalation.js` — CommonJS port for `api/voice-chat.js`.

After any change: run `python3 evals/eval-harness/harness.py` (must be 8/8), `npx tsx src/lib/clinical-skills/escalation.test.ts` (must be 8/8), and a quick `node -e "require('./api/_lib/escalation.js')…"` smoke against `scenarios.json` (must be 8/8). Trigger and citation strings are quoted verbatim in the framework deck — do not paraphrase.
