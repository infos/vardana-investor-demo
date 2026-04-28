# Build Log — Vardana Investor Demo

## 2026-04-27 — CHF decommissioned, cardiometabolic is the sole beachhead

The CHF / Sarah Chen demo surface was removed entirely. Cardiometabolic (HTN + T2DM) is the only patient population the platform now serves; Marcus Williams is the headline demo persona, with Linda Patel and David Brooks seeded for additional chat surfaces.

**Rule set port (commit 6d8b9f2 → merged in #94)**
- `assessDecompensationRisk` (HF scoring) replaced by the deterministic `assessEscalationState` rule set at `src/lib/clinical-skills/escalation.ts` + `api/_lib/escalation.js`. Same brain mirrored in Python at `evals/eval-harness/rules.py`. All three runtimes pass 8/8 calibration with byte-equal trigger and citation strings (the framework deck quotes them verbatim).
- `api/voice-chat.js` rewritten end-to-end. CHF lab bumps, CHF emergency short-circuit, `buildSarahPrompt`, `getSarahDemoVitals`, and the Sarah demo response cache all gone. Pipeline now runs the deterministic rule set, injects state/subtype/triggers/citation as a hard system-prompt constraint, and returns those fields in the response payload. The LLM controls language only; the escalation decision is the rule set's.
- Routes removed: `/patient`, `/demo/{token}/scripted`. `ScriptedDemoPage.jsx` deleted.

**Sarah / CHF excision**
- Sarah-specific data constants in `src/App.jsx` deleted (`WEIGHT_DATA`, `BP_DATA`, `ROSTER`, `PATIENT_CLINICAL_DATA`, `VOICE_TRANSCRIPT`, `FHIR_QUERIES`). `isMarcusDemo` ternaries collapsed to the Marcus path. `PatientChat` and `PatientExperienceView` removed.
- `src/lib/clinical-skills/decompensation.ts` deleted.
- Demo slides cleaned: `ScenarioSlide` is Marcus-only, `LiveDemoPage` defaults to Marcus, `AboutSlide` no longer references "decompensation", `ROICalculator` reframed as cardiometabolic.
- TTS pronunciation maps lost their CHF entries (`HFrEF`, `NYHA`, `CHF`, Furosemide, Carvedilol, Metoprolol, Spironolactone). Cartesia voice IDs no longer carry a `Sarah` voice.
- Public seeds: no `sarah-chen-bundle.json` (was already absent from the repo). `marcus-williams-bundle.json`, `linda-patel-bundle.json`, `david-brooks-bundle.json` are the cardiometabolic patient set.
- Eval surface: the old TS suite at `evals/vardana-evals-combined.ts` (CHF decompensation + reasoning + safety) was deleted along with `evals/run-evals.ts`. The Python harness at `evals/eval-harness/` is the new clinical-correctness contract; the TS calibration test at `src/lib/clinical-skills/escalation.test.ts` mirrors it.
- Playwright e2e + responsive + API tests + qa-runner deleted; they exercised CHF flows that no longer exist. Manual smoke against the Vercel preview is the new pre-merge gate.
- `CLAUDE.md` positioning rewritten — cardiometabolic is the sole beachhead.

If a CHF reference appears anywhere in the repo after this date, it is technical debt to remove.

---

## 2026-04-10 — Pipecat/LiveKit/EC2 removal

Removed all Pipecat-era voice experiment code that had accumulated in the
production Vite repo from prior merges. The production demo was attempting
to open `ws://3.89.228.45:8765/ws` on every coordinator page load, causing
mixed-content errors (HTTPS page → ws:// endpoint), a console flood visible
in DevTools, and a persistent "Disconnected" lie in the coordinator header.

Older entries (CHF-era — kept in git history but no longer load-bearing) were truncated when the build log was rewritten on 2026-04-27. Anything pre-`fix/cardiometabolic-cleanup` is recoverable from the prior commit if needed.
