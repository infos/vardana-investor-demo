#!/usr/bin/env npx tsx
/**
 * Vardana QA Runner
 * Unified orchestrator: Evals → API Tests → E2E Tests → Device Tests → Summary
 *
 * Usage:
 *   npm run qa          # Full QA
 *   npm run qa:quick    # Quick QA (evals + API + Chromium only)
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const ROOT = path.resolve(__dirname, '..');
const isQuick = process.argv.includes('--quick');

interface StepResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
}

const results: StepResult[] = [];
let overallPassed = true;

function runStep(name: string, command: string, cwd = ROOT): StepResult {
  const start = Date.now();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${name}`);
  console.log(`${'─'.repeat(60)}`);

  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
      timeout: 300_000, // 5 min max per step
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    const duration = Date.now() - start;
    const result = { name, passed: true, duration, details: 'All checks passed' };
    results.push(result);
    console.log(`✅ ${name} — PASSED (${(duration / 1000).toFixed(1)}s)`);
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    const details = err.status ? `Exit code ${err.status}` : err.message?.slice(0, 200) || 'Unknown error';
    const result = { name, passed: false, duration, details };
    results.push(result);
    overallPassed = false;
    console.log(`❌ ${name} — FAILED (${(duration / 1000).toFixed(1)}s): ${details}`);
    return result;
  }
}

function printSummary() {
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  VARDANA QA REPORT${isQuick ? ' (Quick Mode)' : ''}`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    const time = `${(r.duration / 1000).toFixed(1)}s`;
    console.log(`  ${icon}  ${r.name.padEnd(40)} ${time.padStart(8)}`);
    if (!r.passed) {
      console.log(`      └─ ${r.details}`);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Total: ${passed} passed, ${failed} failed | ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Result: ${overallPassed ? '🟢 ALL PASSED' : '🔴 FAILURES DETECTED'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Save report
  const reportPath = path.join(ROOT, 'tests', 'results', `qa-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: isQuick ? 'quick' : 'full',
    overallPassed,
    totalDuration,
    results,
  }, null, 2));
  console.log(`  Report saved: ${reportPath}\n`);
}

// ── Main ──
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🔍 VARDANA QA${isQuick ? ' (Quick)' : ''} — Starting...`);
  console.log(`${'═'.repeat(60)}`);

  // Step 1: Evals (decompensation algorithm — no API needed, fast)
  runStep(
    'Evals: Decompensation Algorithm',
    'npx tsx evals/run-evals.ts --suite decompensation'
  );

  // Step 2: API Tests
  runStep(
    'API: TTS & Voice Chat Endpoints',
    'npx playwright test --config=tests/playwright.config.ts --project=api-tests'
  );

  // Step 3: E2E Chromium (primary)
  runStep(
    'E2E: Chromium (Full Suite)',
    'npx playwright test --config=tests/playwright.config.ts --project=chromium'
  );

  // Step 4: Responsive / Device Tests (always run — fast and important for demo)
  runStep(
    'Responsive: iPad Pro + iPhone 14 + Pixel 7',
    'npx playwright test --config=tests/playwright.config.ts --project=ipad-pro --project=iphone-14 --project=pixel-7'
  );

  if (!isQuick) {
    // Step 5: E2E Firefox (core subset)
    runStep(
      'E2E: Firefox (Core Flow)',
      'npx playwright test --config=tests/playwright.config.ts --project=firefox'
    );

    // Step 6: E2E WebKit/Safari (core subset)
    runStep(
      'E2E: WebKit/Safari (Core Flow)',
      'npx playwright test --config=tests/playwright.config.ts --project=webkit'
    );
  }

  // Step 7 (full mode): Clinical Reasoning & Safety Evals (API-dependent, slower)
  if (!isQuick) {
    runStep(
      'Evals: Clinical Reasoning',
      'npx tsx evals/run-evals.ts --suite reasoning'
    );

    runStep(
      'Evals: Safety & Scope',
      'npx tsx evals/run-evals.ts --suite safety'
    );
  }

  printSummary();
  process.exit(overallPassed ? 0 : 1);
}

main().catch(err => {
  console.error('QA runner crashed:', err);
  process.exit(1);
});
