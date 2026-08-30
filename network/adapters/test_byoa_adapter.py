import copy
import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("byoa_adapter.py")
SPEC = importlib.util.spec_from_file_location("byoa_adapter", MODULE_PATH)
adapter = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(adapter)

CANDIDATE_SHA = "2222222222222222222222222222222222222222"
CREATED_AT = "2026-08-30T20:00:00Z"

TASK = {
    "schemaVersion": "0.1",
    "id": "TASK-ADAPTER-001",
    "createdAt": CREATED_AT,
    "kind": "TASK",
    "stableSha": "1111111111111111111111111111111111111111",
    "title": "Printing task",
    "problem": "Duplex fails",
    "expectedBehavior": "Duplex passes while messaging remains available",
    "targetCapabilities": ["PRINT_DUPLEX"],
    "preservedCapabilities": ["WHATSAPP_QR"],
    "allowedScope": ["src/printing/**"],
    "forbiddenScope": ["src/whatsapp/**"],
    "requiredEvidenceKinds": ["AUTOMATED"],
    "physicalEffects": False,
    "humanEvidenceRequired": False,
}

RESPONSE = {
    "contributor": {
        "name": "example-agent",
        "provider": "provider-neutral",
        "version": "test-1",
    },
    "hypothesis": "The bridge does not pass duplex settings.",
    "strategy": "Change only the printing bridge.",
    "changedFiles": ["src/printing/bridge.py"],
    "rollbackReference": "git revert example",
    "capabilityChanges": [
        {
            "capabilityId": "PRINT_DUPLEX",
            "stableStatus": "KNOWN_BAD",
            "candidateStatus": "PASS",
        },
        {
            "capabilityId": "WHATSAPP_QR",
            "stableStatus": "KNOWN_GOOD",
            "candidateStatus": "PASS",
        },
    ],
    "evidenceClaims": [
        {
            "capabilityIds": ["PRINT_DUPLEX"],
            "evidenceKind": "AUTOMATED",
            "environment": {
                "os": "ubuntu",
                "architecture": "x64",
            },
            "reference": "local://test-output",
            "synthetic": False,
        }
    ],
}


class ByoaAdapterTests(unittest.TestCase):
    def test_binds_trusted_candidate_sha_and_keeps_claim_unverified(self):
        result = adapter.adapt(copy.deepcopy(TASK), copy.deepcopy(RESPONSE), CANDIDATE_SHA, CREATED_AT)

        self.assertEqual(result["attempt"]["candidateSha"], CANDIDATE_SHA)
        self.assertEqual(result["capabilityDiff"]["candidateSha"], CANDIDATE_SHA)
        self.assertEqual(result["evidence"][0]["candidateSha"], CANDIDATE_SHA)
        self.assertEqual(result["evidence"][0]["integrity"], "CLAIMED")
        self.assertTrue(result["requiresIndependentVerification"])

    def test_rejects_agent_assigned_verified_integrity(self):
        response = copy.deepcopy(RESPONSE)
        response["evidenceClaims"][0]["integrity"] = "VERIFIED"

        with self.assertRaisesRegex(adapter.AdapterError, "cannot assign evidence integrity"):
            adapter.adapt(copy.deepcopy(TASK), response, CANDIDATE_SHA, CREATED_AT)

    def test_rejects_agent_controlled_candidate_sha(self):
        response = copy.deepcopy(RESPONSE)
        response["candidateSha"] = "a" * 40

        with self.assertRaisesRegex(adapter.AdapterError, "controlled by GILGAL"):
            adapter.adapt(copy.deepcopy(TASK), response, CANDIDATE_SHA, CREATED_AT)

    def test_rejects_forbidden_scope(self):
        response = copy.deepcopy(RESPONSE)
        response["changedFiles"] = ["src/whatsapp/session.py"]

        with self.assertRaises(adapter.AdapterError):
            adapter.adapt(copy.deepcopy(TASK), response, CANDIDATE_SHA, CREATED_AT)

    def test_synthetic_evidence_is_tainted(self):
        response = copy.deepcopy(RESPONSE)
        response["evidenceClaims"][0]["synthetic"] = True

        result = adapter.adapt(copy.deepcopy(TASK), response, CANDIDATE_SHA, CREATED_AT)

        self.assertEqual(result["evidence"][0]["integrity"], "TAINTED")

    def test_requires_every_preserved_capability_in_diff(self):
        response = copy.deepcopy(RESPONSE)
        response["capabilityChanges"] = response["capabilityChanges"][:1]

        with self.assertRaisesRegex(adapter.AdapterError, "missing preserved capability"):
            adapter.adapt(copy.deepcopy(TASK), response, CANDIDATE_SHA, CREATED_AT)

    def test_ids_are_deterministic_for_same_input(self):
        first = adapter.adapt(copy.deepcopy(TASK), copy.deepcopy(RESPONSE), CANDIDATE_SHA, CREATED_AT)
        second = adapter.adapt(copy.deepcopy(TASK), copy.deepcopy(RESPONSE), CANDIDATE_SHA, CREATED_AT)

        self.assertEqual(first["attempt"]["id"], second["attempt"]["id"])
        self.assertEqual(first["capabilityDiff"]["id"], second["capabilityDiff"]["id"])
        self.assertEqual(first["evidence"][0]["id"], second["evidence"][0]["id"])


if __name__ == "__main__":
    unittest.main()
