# Vardana Project Memory

## Repos & Deployment

- See [deployment.md](deployment.md) for repo URLs, Vercel projects, and domain config
- See [session-log.md](session-log.md) for chronological session updates

## Key Architecture

- Two separate apps: public marketing site (Vite/React) and investor demo (Vite/React)
- FHIR-first data model via Medplum (local Docker)
- Claude API for clinical reasoning with FHIR tool use
- Voice: ElevenLabs TTS + Web Speech API STT (scripted mode) or live Anthropic streaming

## Mobile Responsiveness

- Both apps use custom `useIsMobile()` / `useScreenSize()` hooks (breakpoint: 768px)
- Public site: hamburger nav, stacked grids, hidden hero mockup on mobile
- Demo app: voice call hides side panels on mobile, shows compact status bar + Chat/Chart toggle

## iOS Audio

- Uses Web Audio API (AudioContext + GainNode) to bypass Safari autoplay restrictions
- `unlockAudio()` must be called within user gesture context (button click handlers)
- Mute toggle controls `gainRef.current.gain.value` (not `audio.muted`)

## Vercel Deployment Notes

- Auto-deploy from GitHub push may not always trigger; use `npx vercel --prod` as fallback
- If push fails with HTTP 400, run `git config http.postBuffer 524288000` first
- vardana.ai DNS uses Cloudflare proxying to Vercel IP (76.76.21.21) — works fine despite nameserver mismatch warning
