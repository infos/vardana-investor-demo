Verify the FHIR data layer is healthy and seed it if needed.

## Step 1: Check FHIR bundles exist locally
- Verify `public/data/marcus-williams-bundle.json` exists and is valid JSON
- Look for a Sarah Chen FHIR bundle (check `public/data/` for any sarah-related files)
- If no Sarah Chen bundle exists, note this as a gap

## Step 2: Check Medplum connection
- Read `api/medplum-fhir.js` to understand the connection config
- If there's a local Medplum instance expected (Docker), check if it's referenced and note the expected URL
- Read any `.env` or `.env.local` files (do NOT print secrets — just confirm variables are set)

## Step 3: Validate bundle structure
For each FHIR bundle found:
- Confirm it's a valid FHIR Bundle resource (`resourceType: "Bundle"`)
- List the resource types included (Patient, Condition, Observation, MedicationRequest, etc.)
- Check that Patient resource has required fields (name, birthDate, gender)
- Verify Observations have proper LOINC codes for vitals (weight, BP, glucose)

## Step 4: Check bundle usage in app
- Grep for where FHIR bundles are loaded in `src/App.jsx`
- Confirm the fetch paths match actual file locations
- Check that both Sarah Chen and Marcus Williams scenarios reference their data correctly

## Step 5: Reload if missing
If the Sarah Chen bundle is missing or malformed:
- Check git history for a previous version
- If found, restore it
- If not found, note that it needs to be created and describe the expected structure based on the Marcus bundle

## Step 6: Report
```
## FHIR Data Status
- Sarah Chen bundle: [FOUND/MISSING] — [resource count] resources
- Marcus Williams bundle: [FOUND/MISSING] — [resource count] resources
- Medplum config: [OK/NOT CONFIGURED]
- Bundle structure: [VALID/ISSUES]
- App references: [CORRECT/MISMATCHED]
```
