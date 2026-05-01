# Local development notes

Things that have surprised someone here. Append rather than rewrite.

## `vercel dev` does NOT load `.env.local` into serverless functions

**TL;DR:** The Vite dev server reads `.env.local` for browser-bundle vars (`import.meta.env`). The `vercel dev` runtime does NOT plumb that file into `process.env` of API functions in `api/*.js`. Both behaviors hold even when the file is properly formatted.

### Symptom

`POST http://localhost:3000/api/session-start` returns `500` with body:
```json
{"error":"VOICE_SESSION_TOKEN not configured on this Vercel deployment"}
```
…even though `.env.local` contains a clean line:
```
VOICE_SESSION_TOKEN=vardana-dev-token-123
```
And `node --env-file=.env.local -e 'console.log(process.env.VOICE_SESSION_TOKEN)'` prints the right value.

### Why

`vercel dev` populates a function's `process.env` from two sources only:
1. **The parent shell** — anything `export`ed (or set inline) before `vercel dev` runs.
2. **Vercel cloud env vars in the Development scope** — pulled once at startup.

Neither `.env.local` nor `.env.development.local` is read by the function runtime. Tested both 2026-04-30; both produced the 500 above. Vite's own bundle-time read of `.env.local` (for `VITE_*` prefixed vars) is unrelated.

### Fixes (pick one)

**(A) Cloud Development scope — recommended.** Set the var once, every team member who runs `vercel dev` after `vercel link` gets it automatically. Doesn't touch Production or Preview.
```bash
echo -n "<value>" | vercel env add VOICE_SESSION_TOKEN development
echo -n "https://voice.vardana.ai" | vercel env add VOICE_BACKEND_URL development
# restart vercel dev
```

**(B) Inline at the command line.** No persistence, no team sync. Useful for one-off testing with a different token.
```bash
VOICE_BACKEND_URL=https://voice.vardana.ai \
VOICE_SESSION_TOKEN=<value> \
  vercel dev --listen 3000
```

### What does NOT work

- Editing `.env.local` and restarting `vercel dev`.
- Editing `.env.development.local` and restarting `vercel dev`.
- Editing `.env.local` while `vercel dev` is running (no hot-reload either way).
- `vercel env pull .env.local` then restarting — the pulled file is what cloud Development *already has*; if those vars aren't in cloud Development, the pull is a no-op for our purposes.

### Stuck `vercel dev` processes

`kill <pid>` (SIGTERM) is sometimes ignored by the wrapper script. If `pgrep -fl "vercel dev"` still shows the process after a kill, use `pkill -9 -f "vercel dev"`. Then `lsof -iTCP:3000 -sTCP:LISTEN` should show port 3000 free before restart.

## Cloud env-var hygiene check (2026-04-30)

While diagnosing the above, discovered `VITE_VOICE_SESSION_TOKEN` set on Vercel cloud in **Production + Preview** scopes (3 days old as of 2026-04-30). Two issues:

1. The proxy at `api/session-start.js` reads `VOICE_SESSION_TOKEN` (no `VITE_`). Production deploys of `/voice-test` will 500 until the cloud var is renamed or the proxy is changed.
2. **`VITE_*` vars get inlined into the client JS bundle.** That token has been shipped to every browser that loaded the app since it was set. After fixing the rename, consider rotating the actual token value on the EC2 backend.

Not fixed in this session — Production + Preview scopes were explicitly off-limits per the runbook. Flag for the next person who has authorization.
