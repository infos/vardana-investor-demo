"""
Vardana — calibration harness.

Runs all scenarios from scenarios.json through the rule set in rules.py,
compares predicted labels against ground truth, and emits:

    1. Per-scenario pass/fail with triggering conditions
    2. Confusion matrix (predicted x ground truth)
    3. Safety hard gate verification (0 misses required)
    4. False positive count
    5. Aggregate label agreement %
    6. A markdown report (report.md) you can paste anywhere

Run:
    python harness.py

Optional:
    python harness.py --json    # also emit results.json for downstream tooling
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import importlib.util

import rules as reference_rules
from rules import RuleResult


HARNESS_DIR = Path(__file__).resolve().parent
DEFAULT_SCENARIOS_FILE = HARNESS_DIR / "scenarios.json"


ESCALATION_ORDER = ["ROUTINE", "WATCH", "SAME-DAY", "IMMEDIATE"]


def load_scenarios(path: Path) -> dict:
    with open(path) as f:
        data = json.load(f)
    # Adversarial files don't carry their own patient registry; merge from main set.
    if "patients" not in data:
        with open(DEFAULT_SCENARIOS_FILE) as f:
            base = json.load(f)
        data["patients"] = base["patients"]
        data.setdefault("metadata", {"version": "adversarial"})
    return data


def load_rules_module(path_str: str):
    """Load a rules module either by name (default) or by file path."""
    if path_str in (None, "", "rules"):
        return reference_rules
    path = Path(path_str).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Rules module not found: {path}")
    spec = importlib.util.spec_from_file_location("custom_rules", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["custom_rules"] = module
    spec.loader.exec_module(module)
    return module


def run_all(data: dict, rules_module=None) -> list[dict]:
    """Run every scenario, return list of result records.

    rules_module supplies an `assess_escalation_state(scenario, patient)`
    callable. Defaults to the reference rules in rules.py.
    """
    if rules_module is None:
        rules_module = reference_rules
    patients = data["patients"]
    out = []
    for s in data["scenarios"]:
        patient = patients[s["patient_id"]]
        predicted = rules_module.assess_escalation_state(s, patient)
        passed = predicted.state == s["ground_truth"]
        # Subtype agreement is a softer check - only fails the scenario if
        # state is correct but the rule fired for a different reason than expected
        subtype_match = predicted.subtype == s.get("ground_truth_subtype")
        out.append({
            "id": s["id"],
            "patient": patient["name"],
            "title": s["title"],
            "ground_truth_state": s["ground_truth"],
            "ground_truth_subtype": s.get("ground_truth_subtype"),
            "predicted_state": predicted.state,
            "predicted_subtype": predicted.subtype,
            "triggers": predicted.triggers,
            "citation": predicted.citation,
            "passed": passed,
            "subtype_match": subtype_match,
        })
    return out


def confusion_matrix(results: list[dict]) -> dict:
    matrix = {gt: {pred: 0 for pred in ESCALATION_ORDER} for gt in ESCALATION_ORDER}
    for r in results:
        matrix[r["ground_truth_state"]][r["predicted_state"]] += 1
    return matrix


def safety_hard_gate_check(results: list[dict]) -> dict:
    """Check that no IMMEDIATE-tier scenario was downgraded."""
    immediate_scenarios = [r for r in results if r["ground_truth_state"] == "IMMEDIATE"]
    misses = [r for r in immediate_scenarios if r["predicted_state"] != "IMMEDIATE"]
    return {
        "total_immediate_scenarios": len(immediate_scenarios),
        "misses": misses,
        "passed": len(misses) == 0,
    }


def false_positive_count(results: list[dict]) -> int:
    """Count scenarios where predicted severity exceeded ground truth."""
    rank = {state: i for i, state in enumerate(ESCALATION_ORDER)}
    return sum(1 for r in results if rank[r["predicted_state"]] > rank[r["ground_truth_state"]])


def false_negative_count(results: list[dict]) -> int:
    """Count scenarios where predicted severity was below ground truth (any tier)."""
    rank = {state: i for i, state in enumerate(ESCALATION_ORDER)}
    return sum(1 for r in results if rank[r["predicted_state"]] < rank[r["ground_truth_state"]])


def render_report(data: dict, results: list[dict]) -> str:
    matrix = confusion_matrix(results)
    safety = safety_hard_gate_check(results)
    fp = false_positive_count(results)
    fn = false_negative_count(results)
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    agreement_pct = (passed / total * 100) if total else 0.0

    lines: list[str] = []
    lines.append("# Vardana — Calibration Harness Results")
    lines.append("")
    lines.append(f"**Run date:** {data['metadata']['version']}")
    lines.append(f"**Rule set version:** reference implementation (Apr 27, 2026)")
    lines.append(f"**Scenarios evaluated:** {total}")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- **Label agreement:** {passed}/{total} ({agreement_pct:.1f}%)")
    lines.append(f"- **Safety hard gates passed:** {'YES' if safety['passed'] else 'NO'} "
                 f"({safety['total_immediate_scenarios'] - len(safety['misses'])}"
                 f"/{safety['total_immediate_scenarios']} IMMEDIATE caught)")
    lines.append(f"- **False positives (over-escalation):** {fp}")
    lines.append(f"- **False negatives (under-escalation):** {fn}")
    lines.append("")

    lines.append("## Threshold Status")
    lines.append("")
    lines.append("| Threshold | Target | Actual | Status |")
    lines.append("|---|---|---|---|")
    lines.append(f"| Label agreement | >=92% | {agreement_pct:.1f}% | "
                 f"{'PASS' if agreement_pct >= 92 else 'FAIL'} |")
    lines.append(f"| Safety hard gate misses | 0 | {len(safety['misses'])} | "
                 f"{'PASS' if safety['passed'] else 'FAIL'} |")
    lines.append(f"| False positives | <=1 | {fp} | "
                 f"{'PASS' if fp <= 1 else 'FAIL'} |")
    lines.append("")

    lines.append("## Confusion Matrix")
    lines.append("")
    lines.append("Rows = ground truth, columns = predicted. Diagonal = correct.")
    lines.append("")
    header = "| Ground truth \\ Predicted | " + " | ".join(ESCALATION_ORDER) + " |"
    sep = "|" + "|".join(["---"] * (len(ESCALATION_ORDER) + 1)) + "|"
    lines.append(header)
    lines.append(sep)
    for gt in ESCALATION_ORDER:
        row = [gt] + [str(matrix[gt][pred]) for pred in ESCALATION_ORDER]
        lines.append("| " + " | ".join(row) + " |")
    lines.append("")

    if not safety["passed"]:
        lines.append("## SAFETY HARD GATE MISSES")
        lines.append("")
        lines.append("These are blocking. The rule set cannot ship until each is resolved.")
        lines.append("")
        for r in safety["misses"]:
            lines.append(f"- **{r['id']}** ({r['title']}): predicted "
                         f"`{r['predicted_state']}`, ground truth `IMMEDIATE`")
        lines.append("")

    lines.append("## Per-Scenario Detail")
    lines.append("")
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        lines.append(f"### {r['id']} - {r['title']} - {status}")
        lines.append("")
        lines.append(f"- **Patient:** {r['patient']}")
        lines.append(f"- **Ground truth:** {r['ground_truth_state']} "
                     f"({r['ground_truth_subtype']})")
        lines.append(f"- **Predicted:** {r['predicted_state']} ({r['predicted_subtype']})")
        lines.append(f"- **Triggers:** {', '.join(r['triggers'])}")
        lines.append(f"- **Citation:** {r['citation']}")
        if not r["passed"]:
            lines.append(f"- **Discrepancy:** state mismatch")
        elif not r["subtype_match"]:
            lines.append(f"- **Note:** state matched but subtype differs "
                         f"(reasoning path divergence)")
        lines.append("")

    return "\n".join(lines)


def print_console_summary(data: dict, results: list[dict]) -> None:
    """Print a compact stdout summary in addition to the report file."""
    safety = safety_hard_gate_check(results)
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    agreement_pct = (passed / total * 100) if total else 0.0
    fp = false_positive_count(results)
    fn = false_negative_count(results)

    print("=" * 64)
    print("Vardana Calibration Harness")
    print("=" * 64)
    print(f"  Scenarios:        {total}")
    print(f"  Label agreement:  {passed}/{total} ({agreement_pct:.1f}%)")
    print(f"  Safety gates:     {'PASS' if safety['passed'] else 'FAIL'} "
          f"({len(safety['misses'])} misses)")
    print(f"  False positives:  {fp}")
    print(f"  False negatives:  {fn}")
    print("-" * 64)
    for r in results:
        mark = "OK" if r["passed"] else "XX"
        print(f"  [{mark}] {r['id']}  gt={r['ground_truth_state']:<10} "
              f"pred={r['predicted_state']:<10} {r['title']}")
    print("=" * 64)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenarios", default=str(DEFAULT_SCENARIOS_FILE),
                        help="Path to scenarios JSON (default: scenarios.json)")
    parser.add_argument("--report", default=None,
                        help="Path to write markdown report (default: report_<scenarios_stem>.md)")
    parser.add_argument("--json", action="store_true",
                        help="Also emit results JSON next to the report")
    parser.add_argument("--rules", default="rules",
                        help="Rules module: 'rules' (default reference) or a "
                             "path to a Python file exposing "
                             "assess_escalation_state(scenario, patient).")
    args = parser.parse_args()

    scenarios_path = Path(args.scenarios)
    stem = scenarios_path.stem
    rules_module = load_rules_module(args.rules)
    rules_tag = "ref" if rules_module is reference_rules else Path(args.rules).stem
    report_stem = f"report_{stem}" if rules_tag == "ref" else f"report_{stem}_{rules_tag}"
    report_path = Path(args.report) if args.report else HARNESS_DIR / f"{report_stem}.md"

    data = load_scenarios(scenarios_path)
    results = run_all(data, rules_module=rules_module)
    report = render_report(data, results)
    report_path.write_text(report)
    print_console_summary(data, results)
    print(f"\nFull report written to: {report_path}")

    if args.json:
        results_path = report_path.with_suffix(".json")
        results_path.write_text(json.dumps({
            "metadata": data.get("metadata", {}),
            "results": results,
        }, indent=2))
        print(f"Results JSON written to: {results_path}")

    safety = safety_hard_gate_check(results)
    return 0 if safety["passed"] else 2


if __name__ == "__main__":
    sys.exit(main())
