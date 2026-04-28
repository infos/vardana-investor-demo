"""
production_rules.py

Adapter the harness loads via `harness.py --rules production_rules.py`.
Bridges into the production JS escalation rule set at `api/_lib/escalation.js`
through a Node subprocess (`run_production.mjs`). Returns a `RuleResult` with
the same shape the reference rules return.

The JS rule set is the code path the Vercel function (`api/voice-chat.js`)
runs in production. By exercising it through this adapter we measure the
exact runtime behavior, not a Python re-implementation.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from rules import RuleResult

HARNESS_DIR = Path(__file__).resolve().parent
RUNNER = HARNESS_DIR / "run_production.mjs"


def assess_escalation_state(scenario: dict, patient: dict) -> RuleResult:
    payload = json.dumps({"scenario": scenario, "patient": patient}, default=str)
    proc = subprocess.run(
        ["node", str(RUNNER)],
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"run_production.mjs failed (exit {proc.returncode}): {proc.stderr.strip()}"
        )
    out = proc.stdout.strip()
    if not out:
        raise RuntimeError(
            f"run_production.mjs produced no stdout. stderr: {proc.stderr.strip()}"
        )
    parsed = json.loads(out)
    return RuleResult(
        state=parsed.get("state", "ROUTINE"),
        subtype=parsed.get("subtype", "production_unspecified"),
        triggers=list(parsed.get("triggers") or []),
        citation=parsed.get("citation", ""),
    )
