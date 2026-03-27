Run a pre-deploy health check to confirm the app builds and all routes are functional.

## Step 1: Build
Run `npm run build` and report any errors or warnings. If the build fails, fix the issue before continuing.

## Step 2: Check imports
- Grep for any imports that reference files that don't exist (dead imports)
- Verify all files referenced in `src/main.jsx` route definitions exist
- Check that `api/*.js` serverless functions have no missing dependencies

## Step 3: Verify route components
Confirm each route in `src/main.jsx` maps to an existing, exportable component:
- `/` -> `HomePage.jsx`
- `/coordinator` -> `App.jsx`
- `/patient` -> `App.jsx`
- `/demo` -> `DemoPage.jsx`
- `/demo/scripted` -> `ScriptedDemoPage.jsx`
- `/demo/recorded` -> `RecordedDemoPage.jsx`
- `/demo/live` -> `LiveDemoPage.jsx`
- `/roi` -> `ROICalculator.jsx`
- `/admin` -> `AdminAnalytics.jsx`

## Step 4: Check vercel.json
Read `vercel.json` and confirm:
- SPA rewrite rules cover all routes
- `/api/*` routes are not caught by the SPA rewrite
- Cache-Control headers are set

## Step 5: Report
Print a status report:
```
## Deploy Check Results
- Build: [PASS/FAIL]
- Dead imports: [count or NONE]
- Routes: [all OK / list broken ones]
- Vercel config: [OK / issues]
- Ready to deploy: [YES/NO]
```

If everything passes, remind the user to deploy with `git push origin master` or `npx vercel --prod`.
