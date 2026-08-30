package gilgal.network.coordinator_test

import rego.v1
import data.gilgal.network.coordinator

sha_a := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
sha_b := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
sha_c := "cccccccccccccccccccccccccccccccccccccccc"

verified_evidence(candidate_sha, capability_id, result) := {
	"schemaVersion": "0.1",
	"id": sprintf("EVIDENCE-%s", [capability_id]),
	"createdAt": "2026-08-30T19:00:00Z",
	"kind": "EVIDENCE",
	"taskId": "TASK-DEMO-001",
	"attemptId": "ATTEMPT-DEMO-001",
	"candidateSha": candidate_sha,
	"capabilityIds": [capability_id],
	"evidenceKind": "AUTOMATED",
	"integrity": "VERIFIED",
	"result": result,
	"environment": {"os": "ubuntu", "architecture": "x64"},
	"reference": "ci://verified",
	"synthetic": false,
}

claimed_human(candidate_sha, capability_id) := {
	"schemaVersion": "0.1",
	"id": sprintf("HUMAN-%s", [capability_id]),
	"createdAt": "2026-08-30T19:00:00Z",
	"kind": "EVIDENCE",
	"taskId": "TASK-DEMO-001",
	"attemptId": "ATTEMPT-DEMO-001",
	"candidateSha": candidate_sha,
	"capabilityIds": [capability_id],
	"evidenceKind": "HUMAN",
	"integrity": "CLAIMED",
	"result": "PENDING",
	"environment": {"os": "Windows", "architecture": "x64"},
	"reference": "AWAITING_HUMAN_TEST",
	"synthetic": false,
}

change(id, stable, candidate, mandatory, target) := {
	"capabilityId": id,
	"stableStatus": stable,
	"candidateStatus": candidate,
	"mandatory": mandatory,
	"target": target,
	"evidenceIds": [],
}

clean_candidate := {
	"attemptId": "ATTEMPT-CLEAN-001",
	"candidateSha": sha_a,
	"requiredEvidenceKinds": ["AUTOMATED"],
	"capabilityDiff": {
		"changes": [
			change("WHATSAPP_QR", "KNOWN_GOOD", "PASS", true, false),
			change("PRINT_DUPLEX", "KNOWN_BAD", "PASS", true, true),
		],
	},
	"evidence": [
		verified_evidence(sha_a, "WHATSAPP_QR", "PASS"),
		verified_evidence(sha_a, "PRINT_DUPLEX", "PASS"),
	],
}

regression_candidate := {
	"attemptId": "ATTEMPT-REGRESSION-001",
	"candidateSha": sha_b,
	"requiredEvidenceKinds": ["AUTOMATED"],
	"capabilityDiff": {
		"changes": [
			change("WHATSAPP_QR", "KNOWN_GOOD", "FAIL", true, false),
			change("PRINT_DUPLEX", "KNOWN_BAD", "PASS", true, true),
		],
	},
	"evidence": [
		verified_evidence(sha_b, "WHATSAPP_QR", "FAIL"),
		verified_evidence(sha_b, "PRINT_DUPLEX", "PASS"),
	],
}

wrong_sha_candidate := {
	"attemptId": "ATTEMPT-WRONG-SHA-001",
	"candidateSha": sha_c,
	"requiredEvidenceKinds": ["AUTOMATED"],
	"capabilityDiff": {
		"changes": [
			change("WHATSAPP_QR", "KNOWN_GOOD", "PASS", true, false),
			change("PRINT_DUPLEX", "KNOWN_BAD", "PASS", true, true),
		],
	},
	"evidence": [
		verified_evidence(sha_b, "WHATSAPP_QR", "PASS"),
		verified_evidence(sha_b, "PRINT_DUPLEX", "PASS"),
	],
}

pending_human_candidate := {
	"attemptId": "ATTEMPT-PENDING-001",
	"candidateSha": sha_c,
	"requiredEvidenceKinds": ["AUTOMATED", "HUMAN"],
	"capabilityDiff": {
		"changes": [
			change("WHATSAPP_QR", "KNOWN_GOOD", "PASS", true, false),
			change("PRINT_DUPLEX", "KNOWN_BAD", "PENDING", true, true),
		],
	},
	"evidence": [
		verified_evidence(sha_c, "WHATSAPP_QR", "PASS"),
		claimed_human(sha_c, "PRINT_DUPLEX"),
	],
}

test_regression_cannot_win_despite_target_improvement if {
	coordinator.candidate_outcome(regression_candidate) == "REGRESSION_QUARANTINE"
	coordinator.target_improvements(regression_candidate) == ["PRINT_DUPLEX"]
}

test_wrong_sha_evidence_blocks_candidate if {
	coordinator.candidate_outcome(wrong_sha_candidate) == "BLOCKED"
}

test_pending_human_evidence_is_not_promotable if {
	coordinator.candidate_outcome(pending_human_candidate) == "PENDING_HUMAN_EVIDENCE"
}

test_clean_reconciliation_candidate_is_selected_for_human_review if {
	result := coordinator.decision with input as {
		"candidates": [regression_candidate, clean_candidate],
	}
	result.outcome == "PROMOTABLE_CANDIDATE"
	result.winnerAttemptId == "ATTEMPT-CLEAN-001"
	result.promotionAllowed == false
	result.humanDecisionRequired == true
}

test_composite_no_winner_recommends_reconciliation if {
	result := coordinator.decision with input as {
		"candidates": [regression_candidate, wrong_sha_candidate],
	}
	result.outcome == "NO_WINNER"
	result.recommendedAction == "CREATE_RECONCILIATION_CANDIDATE"
	result.promotionAllowed == false
}
