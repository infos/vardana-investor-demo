#!/usr/bin/env tsx
// =============================================================================
// Eval Runner — entry point for `npm run eval` commands
// =============================================================================
// Delegates to the combined eval file which contains all three suites.
// Suite selection via --suite flag: all | decompensation | reasoning | safety
//
// Usage:
//   npx tsx evals/run-evals.ts                         # run all suites
//   npx tsx evals/run-evals.ts --suite decompensation   # algo only (no API)
//   npx tsx evals/run-evals.ts --suite reasoning        # LLM eval (needs API)
//   npx tsx evals/run-evals.ts --suite safety           # safety tests (needs API)

import { main } from './vardana-evals-combined';

main().catch(console.error);
