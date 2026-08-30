#!/usr/bin/env python3
"""Run the zero-server GILGAL Network demonstration."""

from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ADAPTER_PATH = ROOT / "network" / "adapters" / "byoa_adapter.py"
POLICY_PATH = ROOT / "network" / "opa" / "coordinator.rego"
DEMO_DIR = ROOT / "network" / "demo"

SPEC = importlib.util.spec_from_file_location("byoa_adapter", ADAPTER_PATH)
adapter = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(adapter)


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_candidate(task: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    records = adapter.adapt(
        copy.deepcopy(task),
        copy.deepcopy(fixture["response"]),
        fixture["candidateSha"],
        fixture["createdAt"],
    )
    return {
        "attemptId": records["attempt"]["id"],
        "candidateSha": records["attempt"]["candidateSha"],
        "capabilityDiff": records["capabilityDiff"],
        "evidence": records["evidence"],
    }


def apply_demo_verification(
    candidate: dict[str, Any], manifest: dict[str, Any]
) -> dict[str, Any]:
    """Promote exact fixture claims only. Never use this verifier for real evidence."""
    output = copy.deepcopy(candidate)
    allowed = {
        (
            entry["candidateSha"],
            entry["reference"],
            tuple(entry["capabilityIds"]),
        )
        for entry in manifest["entries"]
    }

    for evidence in output["evidence"]:
        identity = (
            evidence["candidateSha"],
            evidence["reference"],
            tuple(evidence["capabilityIds"]),
        )
        if identity in allowed:
            evidence["integrity"] = "VERIFIED"
            evidence["verificationReference"] = "demo-manifest://exact-match"
    return output


def evaluate(candidates: list[dict[str, Any]]) -> dict[str, Any]:
    input_value = {"candidates": candidates}
    with tempfile.TemporaryDirectory(prefix="gilgal-network-demo-") as temp_dir:
        input_path = Path(temp_dir) / "coordinator-input.json"
        input_path.write_text(json.dumps(input_value, indent=2) + "\n", encoding="utf-8")
        completed = subprocess.run(
            [
                "opa",
                "eval",
                "--format",
                "json",
                "--data",
                str(POLICY_PATH),
                "--input",
                str(input_path),
                "data.gilgal.network.coordinator.decision",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    payload = json.loads(completed.stdout)
    return payload["result"][0]["expressions"][0]["value"]


def main() -> int:
    task = load(DEMO_DIR / "task.json")
    fixtures = load(DEMO_DIR / "candidates.json")
    manifest = load(DEMO_DIR / "demo-verification-manifest.json")

    normalized = {
        name: apply_demo_verification(
            normalize_candidate(task, fixture),
            manifest,
        )
        for name, fixture in fixtures.items()
    }

    competing_decision = evaluate([normalized["attemptA"], normalized["attemptB"]])
    if competing_decision["outcome"] != "NO_WINNER":
        raise RuntimeError(f"expected NO_WINNER, got {competing_decision['outcome']}")
    if competing_decision["recommendedAction"] != "CREATE_RECONCILIATION_CANDIDATE":
        raise RuntimeError("coordinator did not recommend reconciliation")
    if competing_decision["promotionAllowed"] is not False:
        raise RuntimeError("competing decision unexpectedly allowed promotion")

    reconciliation_decision = evaluate([normalized["reconciliation"]])
    if reconciliation_decision["outcome"] != "PROMOTABLE_CANDIDATE":
        raise RuntimeError(
            f"expected PROMOTABLE_CANDIDATE, got {reconciliation_decision['outcome']}"
        )
    if reconciliation_decision["promotionAllowed"] is not False:
        raise RuntimeError("reconciliation decision unexpectedly allowed promotion")
    if reconciliation_decision["humanDecisionRequired"] is not True:
        raise RuntimeError("reconciliation candidate bypassed human review")

    report = {
        "demo": "GILGAL_NETWORK_ZERO_SERVER",
        "simulationOnly": True,
        "externalAgentCalls": 0,
        "physicalActions": 0,
        "automaticMerges": 0,
        "stage1": {
            "candidates": ["attemptA", "attemptB"],
            "decision": competing_decision,
        },
        "stage2": {
            "candidate": "reconciliation",
            "decision": reconciliation_decision,
        },
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
