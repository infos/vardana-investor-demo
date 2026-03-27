Systematically find and fix bugs in the demo experience. Follow this process:

## Step 1: Identify bugs
- Read `BUILD_LOG.md` for any noted issues or regressions
- Read `src/App.jsx` and scan for TODO/FIXME/HACK/BUG comments
- Read `src/demo/LiveDemoPage.jsx`, `src/demo/ScriptedDemoPage.jsx`, and other demo files for issues
- Check `api/voice-chat.js` and `api/tts.js` for error handling gaps
- Look at recent git log for any revert or fix commits that hint at recurring problems

## Step 2: Prioritize
List all found bugs, then work through them in this order:
1. **Blockers** — anything that prevents the demo from running
2. **Audio/voice** — TTS failures, playback issues, iOS audio bugs
3. **UI/UX** — visual glitches, broken transitions, mobile layout issues
4. **Data** — incorrect patient data, wrong risk scores, FHIR bundle issues

## Step 3: Fix and verify
For each bug:
1. Describe the bug and its root cause
2. Make the fix
3. Run `npm run build` to confirm no build errors
4. Note what was fixed before moving to the next bug

## Step 4: Summary
After all fixes, print a summary table:
| Bug | File(s) | Fix | Status |
|-----|---------|-----|--------|

Do NOT deploy. Leave that to the user.
