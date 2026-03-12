# Session Log

## Session 2026-03-11 (continued from previous)

### iOS/iPad Audio Fix (completed)
- Added `unlockAudio()` calls to scripted and live demo button click handlers
- Updated mute toggle to control Web Audio API `gainRef.current.gain.value`
- Added AudioContext cleanup on component unmount
- Committed as `9b63624`

### Mobile Responsiveness — Public Site (`vardana-website`)
- Root cause: fixed-width grids (3-col, 4-col, 2-col) + absolute-positioned hero mockup (520px) overlapping text
- Added `useScreenSize()` hook with `isMobile` (<768px) and `isTablet` (768-1024px) breakpoints
- Hamburger menu for mobile nav with dropdown
- All grids stack to single column on mobile
- Hero dashboard mockup hidden on mobile, fonts scaled down
- All section padding reduced on mobile
- Committed as `5449124`

### Mobile Responsiveness — Demo App (`vardana-investor-demo`)
- Root cause: voice call layout had left panel (280px fixed) + right panel (300px fixed) = 580px, exceeding mobile viewport (375px), leaving 0px for transcript
- Added `useIsMobile()` hook (breakpoint 768px)
- Voice call: side panels hidden on mobile, compact status bar with avatars + waveform + risk score
- Chat/Chart toggle tabs for switching between transcript and patient chart on mobile
- Setup screen cards stack vertically, header hides non-essential text
- Roster: tighter padding, hide date column
- Landing page: role cards stack vertically
- Committed as `464157c`

### Test Infrastructure
- Added Playwright E2E tests (dashboard, patient detail, voice setup/call, alert flow)
- Added responsive tests (desktop, iPad, mobile, landscape)
- Added API tests (TTS, voice chat)
- Added QA runner (`npm run qa`)
- All QA tests passed: 59 passed, 14 skipped (API-dependent), 0 failed
- Committed as `c1798b0`

### Deployment Fix
- `vardana.ai` was serving stale deployment (pre-mobile-fix)
- Vercel didn't auto-deploy from GitHub push
- Ran `npx vercel --prod` to deploy latest code manually
- Confirmed mobile-responsive JS bundle deployed and serving at vardana.ai
- DNS confirmed working: Cloudflare → Vercel IP (76.76.21.21), HTTPS 200

### Final Commits on `vardana-investor-demo`
1. `9b63624` — Fix iOS/iPad audio: use Web Audio API for Safari autoplay policy
2. `464157c` — Make demo app fully mobile responsive
3. `c1798b0` — Add Playwright E2E test infrastructure and QA runner
4. `3161593` — Add test-results to gitignore

### Final Commits on `vardana-website`
1. `5449124` — Make public site fully mobile responsive
