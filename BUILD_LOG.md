# Build Log — Vardana Investor Demo

**Repository:** `infos/vardana-investor-demo` on GitHub
**Branch:** `claude/review-changes-mmn0c8pifc1z30xo-BeVMz`
**Last updated:** 2026-03-17
**Latest commit:** `f08f835`

---

## Deployment

- **Hosting:** Vercel (SPA with API routes)
- **Config:** `vercel.json` — Cache-Control no-cache, SPA rewrites, `/api/*` serverless functions
- **Repo URL:** `https://github.com/infos/vardana-investor-demo`
- **Branch:** `claude/review-changes-mmn0c8pifc1z30xo-BeVMz` (32 commits ahead of `master`)

---

## Repository Structure

```
vardana-investor-demo/
├── api/
│   └── elevenlabs-tts.js        # Serverless TTS proxy (ElevenLabs)
├── src/
│   ├── App.jsx                  # Main monolith (~3700 lines): Coordinator, Roster, Patient, Voice Call
│   ├── DemoPage.jsx             # Demo entry/landing page
│   ├── ROICalculator.jsx        # CHF ROI calculator (/roi route)
│   ├── main.jsx                 # Router: /, /demo, /roi, /coordinator
│   └── demo/
│       ├── DemoShell.jsx        # Shared demo layout shell
│       ├── LiveDemoPage.jsx     # Live demo onboarding slides
│       ├── ScriptedDemoPage.jsx # Scripted demo — Loom video embed
│       ├── AboutSlide.jsx       # "About Vardana" intro slide
│       ├── ScenarioSlide.jsx    # "The Scenario" slide
│       ├── icons.jsx            # SVG icon components
│       ├── tokens.js            # Design tokens
│       └── useIsMobile.js       # Mobile detection hook
├── vercel.json                  # Deployment config
├── BUILD_LOG.md                 # This file
└── package.json
```

---

## Changelog (All Commits)

### Phase 1 — Initial Demo UX Fixes (commit `40ef665`)

5 UX fixes targeting timing, readability, audio reliability, and mobile responsiveness.

**Fix 1 — Slower Auto-Navigation**
- Roster display: 1.5s → 4s before auto-navigating to Sarah
- Sarah detail: 2s → 7s with pointer appearing at 5s
- Added `amberBorderPulse` animation on Sarah's roster row

**Fix 2 — Roster Readability in Scripted Mode**
- Non-Sarah patients dimmed to `opacity: 0.35`
- Sarah's row highlighted with amber border pulse
- Epic EHR section hidden in scripted/mobile mode

**Fix 3 — Reduced Content in Scripted Mode**
- Hidden: accordion, action buttons, SupportingData charts
- Visible: header, risk badge, alert card, evidence chain, narrative, recommended actions, sticky CTA

**Fix 4 — Audio Pre-fetch Strategy**
- Parallel preload of all TTS segments on mount
- Progress indicator in tap-to-start overlay
- Zero-gap playback from cached blob URLs

**Fix 5 — Live Demo Path Fixes**
- Live demo navigates to `/coordinator?demo=live`
- No auto-navigation/dimming/pointer in live mode
- Markdown bold rendering in PatientChat

---

### Phase 2 — Voice, Slides, and ROI Calculator

**Faster AI voice + slide layout** (`267af56`)
- TTS speed 0.88 → 0.95
- Sarah transcript: added "Yes." prefix and "I had" phrasing
- AboutSlide/ScenarioSlide: flex layout pins CTA to viewport bottom
- `vercel.json`: Cache-Control no-cache for all routes

**ROI Calculator** (`4634c86`)
- New `/roi` route with interactive CHF ROI calculator
- Sliders for patient population, readmission rates, ED visits, pricing
- Displays net savings, ROI %, payback period, savings breakdown table, narrative
- File: `src/ROICalculator.jsx` (420 lines)

---

### Phase 3 — Scripted Demo Flow Streamlining

**Clean up demo text** (`45b520d`)
- Removed all `--` separators, replaced with commas/colons
- Removed "1 in 4 CHF patients" intro splash
- Desktop: show only Sarah row, auto-navigate to call after 2s
- Mobile: skip roster, go straight to voice call

**Stabilize Sarah's voice** (`d56a52f`)
- ElevenLabs stability: 0.55 → 0.78
- Style: 0.35 → 0.10 (prevents pitch variation)

**Roster timing iterations** (`3ffd6c9` → `c836cf6` → `b7ad765`)
- Extended roster display 2s → 5s
- Then removed auto-navigation entirely (manual click required)
- Added "Call Patient" button directly on Sarah's roster row
- All patients visible again (not just Sarah)
- Pointer arrow targets the Call Patient button

---

### Phase 4 — Loom Video Embed

**Video embed evolution** (`72d7d50` → `f06f409` → `4e563f3` → `58b93cf`)
- Started with Loom iframe → switched to Descript → back to Loom
- Final: ScriptedDemoPage is now just a back link + responsive Loom embed
- Removed all slide state, step logic, feature cards, navigation buttons

**Mobile + sizing refinements** (`532e470` → `98fdb52` → `a8c5bc6` → `0a656be`)
- Mobile: "Watch Demo" button linking to Loom share URL (no iframe)
- Desktop: responsive iframe with `maxHeight: calc(100vh - 80px)`
- Updated to latest Loom recording
- Clean Loom params: hide_owner, hide_share, hide_title, hideEmbedTopBar

---

### Phase 5 — Patient View & Live Demo Polish

**Simplify patient view** (`ea8ccbf`)
- Removed "Open in EHR" and "Dismiss" buttons, keeping single "Contact Patient" CTA
- Replaced 3-channel outreach modal (Voice/SMS/App + timing) with simple Voice/Chat picker
- Removed scripted/live demo mode selection — auto-show live call setup
- Renamed "Initiate Outreach" → "Contact Patient" throughout

**Fix live mode echo/overlap** (`3ef3c23`)
- Echo guard: 400ms → 800ms
- Kill active speech recognition before AI speaks
- Patient transcript labeled "You" instead of "Sarah Chen" in live mode
- Text input placeholder: "your response" (not "Sarah's response")

**Fix live demo UX** (`f08f835`)
- Hide scripted demo banner in live mode
- Remove duplicate "Contact Patient" button when sticky bar is showing
- Rename Epic "Start AI Check-in" → "Contact Patient"
- Auto-start voice call in live mode (skip setup screen)

---

## Files Changed (vs master)

| File | Lines Added | Lines Removed | Summary |
|---|---|---|---|
| `src/App.jsx` | ~600 | ~400 | Core demo logic, roster, patient detail, voice call |
| `src/ROICalculator.jsx` | 420 | 0 | New ROI calculator page |
| `src/demo/ScriptedDemoPage.jsx` | 52 | 0 | Loom video embed |
| `src/demo/DemoShell.jsx` | 147 | 0 | Demo layout shell |
| `src/demo/ScenarioSlide.jsx` | 155 | 0 | Scenario onboarding slide |
| `src/demo/LiveDemoPage.jsx` | 46 | 0 | Live demo onboarding |
| `src/demo/AboutSlide.jsx` | ~97 | ~80 | Slide layout, text cleanup |
| `src/demo/icons.jsx` | 53 | 0 | SVG icon components |
| `src/demo/tokens.js` | 38 | 0 | Design tokens |
| `src/demo/useIsMobile.js` | 13 | 0 | Mobile detection hook |
| `src/DemoPage.jsx` | ~10 | ~5 | Demo entry page tweaks |
| `src/main.jsx` | 18 | 2 | Added /roi and /demo routes |
| `api/elevenlabs-tts.js` | ~6 | ~3 | TTS stability/speed params |
| `vercel.json` | 11 | 0 | Cache-Control, rewrites |
| **Total** | **~1920** | **~540** | |

---

## Build Verification

```
npx vite build
✓ 839 modules transformed
✓ built in ~3s
dist/assets/index-*.js  ~733 kB │ gzip: ~198 kB
```

No errors. Chunk size warning is pre-existing (monolith architecture).
