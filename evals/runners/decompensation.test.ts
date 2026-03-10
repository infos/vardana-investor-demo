// =============================================================================
// Suite 1: Decompensation Algorithm — deterministic unit tests (no API)
// =============================================================================
// Imports the real assessDecompensationRisk function and runs all 25 scenarios.
// Run: npx tsx evals/runners/decompensation.test.ts
// Or via Jest: npx jest --testPathPattern decompensation.test

import { assessDecompensationRisk, type DecompensationInput } from '../../src/lib/clinical-skills/decompensation';
import { EVAL_SCENARIOS, DECOMPENSATION_THRESHOLDS, type EvalScenario } from '../vardana-evals-combined';

const RISK_ORDER: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };

function isHighSeverity(level: string): boolean {
  return RISK_ORDER[level] >= RISK_ORDER['high'];
}

function buildInput(scenario: EvalScenario): DecompensationInput {
  return {
    vitals: scenario.vitals,
    symptoms: scenario.symptoms,
    journeyDay: scenario.journeyDay,
    conditionCount: scenario.conditionCount,
    missedDoses: scenario.missedDoses,
  };
}

interface AlgoTestResult {
  scenarioId: string;
  passed: boolean;
  isFalseNegative: boolean;
  details: string;
  actual: { riskLevel: string; riskScore: number };
  expected: { riskLevel: string; min: number; max: number };
}

async function runDecompensationTests(): Promise<void> {
  console.log('\n--- Suite 1: Decompensation Algorithm (Real Function) ---\n');

  const results: AlgoTestResult[] = [];
  const falseNegatives: string[] = [];

  for (const scenario of EVAL_SCENARIOS) {
    const input = buildInput(scenario);
    const output = assessDecompensationRisk(input);
    const { groundTruth } = scenario;

    const tolerance = DECOMPENSATION_THRESHOLDS.scoreTolerancePts;
    const scoreInRange =
      output.riskScore >= groundTruth.expectedRiskScoreMin - tolerance &&
      output.riskScore <= groundTruth.expectedRiskScoreMax + tolerance;

    const levelMatch = output.riskLevel === groundTruth.riskLevel;
    const isFalseNegative = isHighSeverity(groundTruth.riskLevel) && !isHighSeverity(output.riskLevel);

    if (isFalseNegative) falseNegatives.push(scenario.id);

    const passed = scoreInRange && levelMatch && !isFalseNegative;
    const icon = passed ? '✅' : '❌';
    const details = passed
      ? `score=${output.riskScore}, level=${output.riskLevel}`
      : `FAIL — got score=${output.riskScore}/${output.riskLevel}, expected ${groundTruth.expectedRiskScoreMin}-${groundTruth.expectedRiskScoreMax}/${groundTruth.riskLevel}${isFalseNegative ? ' [FALSE NEGATIVE]' : ''}`;

    results.push({
      scenarioId: scenario.id,
      passed,
      isFalseNegative,
      details,
      actual: { riskLevel: output.riskLevel, riskScore: output.riskScore },
      expected: { riskLevel: groundTruth.riskLevel, min: groundTruth.expectedRiskScoreMin, max: groundTruth.expectedRiskScoreMax },
    });

    console.log(`  ${scenario.id} ${icon} ${scenario.description}`);
    console.log(`       ${details}`);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = passed / results.length;

  console.log('\n' + '─'.repeat(60));
  console.log(`  Result: ${passed}/${results.length} passed (${(passRate * 100).toFixed(1)}%)`);
  console.log(`  False negatives: ${falseNegatives.length}${falseNegatives.length > 0 ? ` [${falseNegatives.join(', ')}]` : ''}`);
  console.log(`  Required pass rate: ${(DECOMPENSATION_THRESHOLDS.minPassRate * 100).toFixed(0)}%`);

  const suitePass = passRate >= DECOMPENSATION_THRESHOLDS.minPassRate && falseNegatives.length <= DECOMPENSATION_THRESHOLDS.falsNegativeAllowed;
  console.log(`\n  Suite 1: ${suitePass ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('─'.repeat(60) + '\n');

  // Return results for JSON report
  const report = { suite: 'decompensation', timestamp: new Date().toISOString(), passed, failed, falseNegatives, passRate, suitePass, results };
  const fs = await import('fs');
  fs.mkdirSync('evals/results', { recursive: true });
  fs.writeFileSync(`evals/results/decompensation-${Date.now()}.json`, JSON.stringify(report, null, 2));

  if (!suitePass) process.exit(1);
}

runDecompensationTests().catch(err => { console.error(err); process.exit(1); });
