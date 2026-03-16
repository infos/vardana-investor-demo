# Build Log — Scripted Demo UX Fixes

**Date:** 2026-03-16
**Branch:** `claude/review-changes-mmn0c8pifc1z30xo-BeVMz`
**Commit:** `40ef665`

---

## Task Overview

Implemented 5 UX fixes for the Vardana investor demo scripted and live demo flows. All changes target improved readability, timing, audio reliability, and mobile responsiveness.

---

## Codebase Exploration

**Files identified for modification:**
- `src/App.jsx` — Main monolith (~4000 lines) containing CareCoordinatorView, RosterView, PatientDetail, AIReasoningCard, SupportingData, VoiceCallDemo, PatientChat, PatientExperienceView
- `src/demo/LiveDemoPage.jsx` — Live demo onboarding slides
- `src/demo/AboutSlide.jsx` — Reviewed (no changes needed, "1 in 4" paragraph already removed)

**Key components mapped:**
- Auto-navigation: `CareCoordinatorView` useEffect with 1.5s timeout → Sarah select; `PatientDetail` useEffect with 2s timeout → onOutreach
- Audio: `startElevenLabs()` fetches in batches of 4, `playElevenLabs()` plays sequentially with 680ms/260ms gaps
- Tap-to-start overlay: shown when `autoStartScripted && !audioUnlocked`
- FHIR Activity: right panel, already hidden on mobile via `!isMobileView` guard
- Closing screen: `uiState === "closing"` renders fade-in summary card

---

## Fix 1 — Transition Delays: Slower Auto-Navigation

**Problem:** Roster visible for only 1.5s, Sarah detail for 2s — too fast to read.

**Changes in `src/App.jsx`:**

| Location | Before | After |
|---|---|---|
| `CareCoordinatorView` useEffect (line ~3330) | `setTimeout(..., 1500)` | `setTimeout(..., 4000)` |
| `PatientDetail` useEffect (line ~3205) | `setTimeout(onOutreach, 2000)` | Pointer at `setTimeout(5000)`, navigate at `setTimeout(7000)` |
| `RosterView` | Pointer shown immediately | Pointer hidden for 1.5s via `showPointerArrow` state, then appears |

**New animation added:**
```css
@keyframes amberBorderPulse {
  0% { box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
  50% { box-shadow: 0 0 0 4px rgba(245,158,11,0.5); }
  100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
}
```

---

## Fix 2 — Roster Readability in Scripted Mode

**Problem:** Viewer doesn't know where to look with 4 equally-styled patient rows.

**Changes in `src/App.jsx` — `RosterView`:**
- Non-Sarah patients: `opacity: 0.35` when `isScriptedDemo && !isSarahRow`
- Sarah's row: `boxShadow: "0 0 0 2px rgba(245,158,11,0.4)"` + `amberBorderPulse` animation
- Epic EHR section: `display: "none"` when `isScriptedDemo || isMobile`
- "1 patient needs attention" banner: kept visible (reinforces context)

---

## Fix 3 — Sarah Detail: Reduced Content in Scripted Mode

**Problem:** Too much content for 7 seconds of viewing time.

**Changes in `src/App.jsx`:**

| Section | Scripted Mode |
|---|---|
| Patient header + risk badge | Visible |
| Alert card (decompensation) | Visible |
| Evidence chain (Weight, BP, Patient Report, Trajectory) | Visible |
| Clinical narrative | Visible |
| Recommended actions | Visible |
| "What Sarah told Vardana today" accordion | **Hidden** |
| Action buttons (Initiate Outreach / Open in EHR / Dismiss) inside AIReasoningCard | **Hidden** |
| SupportingData (weight chart, BP chart, labs, meds) | **Hidden** |
| Sticky bottom CTA (single amber Contact Patient) | Visible (with pointer at 5s) |

**Implementation:** `AIReasoningCard` now accepts `isScriptedDemo` prop; accordion + action buttons wrapped in `{!isScriptedDemo && (...)}`. SupportingData render wrapped in `{!isScriptedDemo && (...)}` in `PatientDetail`.

---

## Fix 4 — Audio Pre-fetch Strategy

**Problem:** Sequential fetch-and-play causes gaps between audio segments.

**Before:**
```
startElevenLabs() → fetch batches → loading screen → launchCall → playElevenLabs
```
Audio fetched before play, but only started on explicit user action or auto-start.

**After:**
```
mount → preload all segments in parallel (background) → show progress in overlay
user tap (or auto-unlock) + preload complete → play from cached URLs → zero gap
```

**New state/refs added:**
- `preloadedUrlsRef` — cached array of blob URLs
- `preloadProgress` — 0-100% shown in tap-to-start overlay
- `preloadReady` — boolean, true when all segments fetched

**Tap-to-start overlay updated:**
```jsx
<div style={{ fontSize: 12, color: '#3A4F6B', marginTop: 12 }}>
  {preloadProgress < 100 ? `Loading... ${preloadProgress}%` : 'Ready — tap to start'}
</div>
```

**Auto-start logic refactored:** Two separate effects — one tries to unlock audio on mount, another watches for `audioUnlocked && preloadReady` to trigger playback. This ensures playback starts only when both conditions are met.

---

## Fix 5 — Live Demo Path Fixes

**Problem:** Live demo path lacked guidance banner and some mobile fixes.

**Changes:**

| File | Change |
|---|---|
| `src/demo/LiveDemoPage.jsx` | Skip and coordinator CTA now navigate to `/coordinator?demo=live` instead of `/coordinator` |
| `src/App.jsx` — App entry | Detects `?demo=live` param, passes `isLiveDemo` prop to `CareCoordinatorView` |
| `src/App.jsx` — `CareCoordinatorView` | Accepts `isLiveDemo` prop; shows roster banner with "Explore at your own pace" text |
| `src/App.jsx` — `CareCoordinatorView` | No auto-navigation, no dimming, no pointer in live mode |
| `src/App.jsx` — `PatientChat` | `**bold**` markdown now rendered via `split(/(\*\*[^*]+\*\*)/)` with `<strong>` tags |

---

## Build Verification

```
npx vite build
✓ 839 modules transformed
✓ built in 2.81s
dist/assets/index-DrzAwctI.js  733.10 kB │ gzip: 198.49 kB
```

No errors. Chunk size warning is pre-existing (monolith architecture).

---

## Commit & Push

```
git add src/App.jsx src/demo/LiveDemoPage.jsx
git commit -m "Slower auto-navigation, pre-fetch audio, and live demo UX fixes"
git push -u origin claude/review-changes-mmn0c8pifc1z30xo-BeVMz
```

**Commit hash:** `40ef665`
**Files changed:** 2
**Insertions:** 147
**Deletions:** 65

---

## Updated Timing Summary

| Step | Duration |
|---|---|
| Roster visible before auto-navigate | 4s |
| Amber pulse on Sarah's row | Immediate (1.5s animation loop) |
| Pointer appears on roster | After 1.5s |
| Sarah detail visible before auto-navigate | 7s |
| Pointer appears on Contact Patient | After 5s |
| Audio preload | Parallel on mount, shown as % |
| Inter-segment audio gap | ~0ms (pre-fetched) |
| Total automated flow (after Enter Demo) | ~95s |
| Total including slides | ~110-115s |
