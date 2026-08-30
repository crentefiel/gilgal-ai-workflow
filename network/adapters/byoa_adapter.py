#!/usr/bin/env python3
"""Provider-neutral boundary for turning an untrusted agent response into GILGAL records."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

SHA_RE = re.compile(r"^[a-f0-9]{40}$")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
IDENTIFIER_RE = re.compile(r"^[A-Z0-9][A-Z0-9._:-]{2,127}$")
CAPABILITY_STATES = {
    "KNOWN_GOOD",
    "KNOWN_BAD",
    "UNKNOWN",
    "PENDING",
    "NOT_TESTED",
    "PASS",
    "FAIL",
}
EVIDENCE_KINDS = {"AUTOMATED", "INTEGRATION", "PACKAGED", "PHYSICAL", "HUMAN"}
FORBIDDEN_AGENT_FIELDS = {
    "candidateSha",
    "stableSha",
    "humanApproval",
    "humanApproved",
    "promotionAllowed",
    "gateDecision",
}


class AdapterError(ValueError):
    """An untrusted response violated the adapter contract."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AdapterError(message)


def require_non_empty(value: Any, field: str) -> str:
    require(isinstance(value, str) and value.strip() != "", f"{field} must be a non-empty string")
    return value.strip()


def require_identifier(value: Any, field: str) -> str:
    text = require_non_empty(value, field)
    require(bool(IDENTIFIER_RE.fullmatch(text)), f"{field} is not a valid GILGAL identifier")
    return text


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def generated_id(prefix: str, value: Any) -> str:
    return f"{prefix}-{canonical_digest(value)[:16].upper()}"


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AdapterError(f"cannot read JSON from {path}: {exc}") from exc
    require(isinstance(value, dict), f"{path} must contain a JSON object")
    return value


def reject_forbidden_fields(value: Any, location: str = "response") -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            require(key not in FORBIDDEN_AGENT_FIELDS, f"{location}.{key} is controlled by GILGAL, not the agent")
            reject_forbidden_fields(nested, f"{location}.{key}")
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            reject_forbidden_fields(nested, f"{location}[{index}]")


def validate_sha(value: str, field: str) -> str:
    require(bool(SHA_RE.fullmatch(value)), f"{field} must be a lowercase 40-character Git SHA")
    return value


def validate_task(task: dict[str, Any]) -> None:
    require(task.get("kind") == "TASK", "task.kind must be TASK")
    require(task.get("schemaVersion") == "0.1", "task.schemaVersion must be 0.1")
    validate_sha(require_non_empty(task.get("stableSha"), "task.stableSha"), "task.stableSha")
    require_identifier(task.get("id"), "task.id")
    for field in ("targetCapabilities", "preservedCapabilities", "allowedScope"):
        values = task.get(field)
        require(isinstance(values, list) and len(values) > 0, f"task.{field} must be a non-empty list")


def validate_scope(changed_files: list[str], task: dict[str, Any]) -> None:
    allowed = task["allowedScope"]
    forbidden = task.get("forbiddenScope", [])
    for path in changed_files:
        require(not path.startswith("/") and ".." not in Path(path).parts, f"unsafe changed path: {path}")
        require(any(fnmatch.fnmatch(path, pattern) for pattern in allowed), f"path outside allowed scope: {path}")
        require(not any(fnmatch.fnmatch(path, pattern) for pattern in forbidden), f"path enters forbidden scope: {path}")


def normalize_capability_changes(
    response: dict[str, Any], task: dict[str, Any]
) -> list[dict[str, Any]]:
    values = response.get("capabilityChanges")
    require(isinstance(values, list) and len(values) > 0, "capabilityChanges must be a non-empty list")
    task_targets = set(task["targetCapabilities"])
    task_preserved = set(task["preservedCapabilities"])
    output: list[dict[str, Any]] = []
    seen: set[str] = set()

    for index, value in enumerate(values):
        require(isinstance(value, dict), f"capabilityChanges[{index}] must be an object")
        capability_id = require_identifier(value.get("capabilityId"), f"capabilityChanges[{index}].capabilityId")
        require(capability_id not in seen, f"duplicate capability change: {capability_id}")
        seen.add(capability_id)
        stable_status = value.get("stableStatus")
        candidate_status = value.get("candidateStatus")
        require(stable_status in CAPABILITY_STATES, f"invalid stableStatus for {capability_id}")
        require(candidate_status in CAPABILITY_STATES, f"invalid candidateStatus for {capability_id}")
        output.append(
            {
                "capabilityId": capability_id,
                "mandatory": capability_id in task_preserved or bool(value.get("mandatory", False)),
                "target": capability_id in task_targets,
                "stableStatus": stable_status,
                "candidateStatus": candidate_status,
                "evidenceIds": [],
            }
        )

    missing_targets = task_targets - seen
    missing_preserved = task_preserved - seen
    require(not missing_targets, f"missing target capability changes: {sorted(missing_targets)}")
    require(not missing_preserved, f"missing preserved capability changes: {sorted(missing_preserved)}")
    return output


def normalize_evidence(
    response: dict[str, Any],
    *,
    task_id: str,
    attempt_id: str,
    candidate_sha: str,
    created_at: str,
    known_capabilities: set[str],
) -> list[dict[str, Any]]:
    claims = response.get("evidenceClaims", [])
    require(isinstance(claims, list), "evidenceClaims must be a list")
    output: list[dict[str, Any]] = []

    for index, claim in enumerate(claims):
        require(isinstance(claim, dict), f"evidenceClaims[{index}] must be an object")
        require("integrity" not in claim, "an agent cannot assign evidence integrity")
        require("humanApproval" not in claim, "an agent cannot supply human approval")

        evidence_kind = claim.get("evidenceKind")
        require(evidence_kind in EVIDENCE_KINDS, f"invalid evidence kind at evidenceClaims[{index}]")
        capability_ids = claim.get("capabilityIds")
        require(isinstance(capability_ids, list) and capability_ids, f"evidenceClaims[{index}].capabilityIds is required")
        for capability_id in capability_ids:
            require(capability_id in known_capabilities, f"evidence references unknown capability: {capability_id}")

        environment = claim.get("environment")
        require(isinstance(environment, dict), f"evidenceClaims[{index}].environment must be an object")
        require_non_empty(environment.get("os"), f"evidenceClaims[{index}].environment.os")
        require_non_empty(environment.get("architecture"), f"evidenceClaims[{index}].environment.architecture")

        synthetic = bool(claim.get("synthetic", False))
        normalized = {
            "schemaVersion": "0.1",
            "id": generated_id("EVIDENCE", {"attempt": attempt_id, "index": index, "claim": claim}),
            "createdAt": created_at,
            "kind": "EVIDENCE",
            "taskId": task_id,
            "attemptId": attempt_id,
            "candidateSha": candidate_sha,
            "capabilityIds": capability_ids,
            "evidenceKind": evidence_kind,
            "integrity": "TAINTED" if synthetic else "CLAIMED",
            "environment": environment,
            "reference": require_non_empty(claim.get("reference"), f"evidenceClaims[{index}].reference"),
            "synthetic": synthetic,
        }
        artifact_sha = claim.get("artifactSha256")
        if artifact_sha is not None:
            require(isinstance(artifact_sha, str) and SHA256_RE.fullmatch(artifact_sha), "invalid artifactSha256")
            normalized["artifactSha256"] = artifact_sha
        output.append(normalized)
    return output


def adapt(task: dict[str, Any], response: dict[str, Any], candidate_sha: str, created_at: str) -> dict[str, Any]:
    validate_task(task)
    validate_sha(candidate_sha, "candidateSha")
    require_non_empty(created_at, "createdAt")
    reject_forbidden_fields(response)

    contributor = response.get("contributor")
    require(isinstance(contributor, dict), "contributor must be an object")
    contributor_name = require_non_empty(contributor.get("name"), "contributor.name")
    provider = require_non_empty(contributor.get("provider"), "contributor.provider")
    version = require_non_empty(contributor.get("version"), "contributor.version")

    changed_files = response.get("changedFiles")
    require(isinstance(changed_files, list) and changed_files, "changedFiles must be a non-empty list")
    changed_files = [require_non_empty(path, "changedFiles[]") for path in changed_files]
    validate_scope(changed_files, task)

    changes = normalize_capability_changes(response, task)
    attempt_seed = {
        "taskId": task["id"],
        "candidateSha": candidate_sha,
        "provider": provider,
        "hypothesis": response.get("hypothesis"),
        "strategy": response.get("strategy"),
    }
    attempt_id = generated_id("ATTEMPT", attempt_seed)

    evidence = normalize_evidence(
        response,
        task_id=task["id"],
        attempt_id=attempt_id,
        candidate_sha=candidate_sha,
        created_at=created_at,
        known_capabilities={change["capabilityId"] for change in changes},
    )
    evidence_by_capability: dict[str, list[str]] = {}
    for item in evidence:
        for capability_id in item["capabilityIds"]:
            evidence_by_capability.setdefault(capability_id, []).append(item["id"])
    for change in changes:
        change["evidenceIds"] = evidence_by_capability.get(change["capabilityId"], [])

    attempt = {
        "schemaVersion": "0.1",
        "id": attempt_id,
        "createdAt": created_at,
        "kind": "AGENT_ATTEMPT",
        "taskId": task["id"],
        "stableSha": task["stableSha"],
        "candidateSha": candidate_sha,
        "contributor": {
            "name": contributor_name,
            "actorType": "AGENT",
            "provider": provider,
            "version": version,
        },
        "hypothesis": require_non_empty(response.get("hypothesis"), "hypothesis"),
        "strategy": require_non_empty(response.get("strategy"), "strategy"),
        "changedFiles": changed_files,
        "targetCapabilities": task["targetCapabilities"],
        "failedStrategyIds": [],
        "rollbackReference": require_non_empty(response.get("rollbackReference"), "rollbackReference"),
    }

    capability_diff = {
        "schemaVersion": "0.1",
        "id": generated_id("DIFF", {"attemptId": attempt_id, "changes": changes}),
        "createdAt": created_at,
        "kind": "CAPABILITY_DIFF",
        "taskId": task["id"],
        "attemptId": attempt_id,
        "candidateSha": candidate_sha,
        "changes": changes,
    }

    return {
        "adapterVersion": "0.1",
        "sourceTrust": "UNTRUSTED_AGENT_RESPONSE",
        "attempt": attempt,
        "capabilityDiff": capability_diff,
        "evidence": evidence,
        "requiresIndependentVerification": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert an untrusted agent response into GILGAL records")
    parser.add_argument("--task", required=True, type=Path)
    parser.add_argument("--response", required=True, type=Path)
    parser.add_argument("--candidate-sha", required=True)
    parser.add_argument("--created-at", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    try:
        result = adapt(
            load_json(args.task),
            load_json(args.response),
            args.candidate_sha,
            args.created_at,
        )
        args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except (AdapterError, OSError) as exc:
        print(f"BYOA_ADAPTER_REJECTED: {exc}", file=sys.stderr)
        return 2

    print(f"BYOA_ADAPTER_ACCEPTED: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
