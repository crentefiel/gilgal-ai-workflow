package gilgal.network.coordinator

import rego.v1

verified_evidence(candidate, capability_id) if {
	some evidence in candidate.evidence
	evidence.integrity == "VERIFIED"
	evidence.result == "PASS"
	evidence.candidateSha == candidate.candidateSha
	capability_id in evidence.capabilityIds
}

regressions(candidate) := [change.capabilityId |
	some change in candidate.capabilityDiff.changes
	change.mandatory == true
	change.stableStatus == "KNOWN_GOOD"
	change.candidateStatus != "PASS"
]

pending_human_capabilities(candidate) := [change.capabilityId |
	some change in candidate.capabilityDiff.changes
	change.mandatory == true
	change.candidateStatus == "PENDING"
	some evidence in candidate.evidence
	evidence.candidateSha == candidate.candidateSha
	change.capabilityId in evidence.capabilityIds
	evidence.evidenceKind == "HUMAN"
	evidence.integrity != "VERIFIED"
]

unverified_pass_claims(candidate) := [change.capabilityId |
	some change in candidate.capabilityDiff.changes
	change.mandatory == true
	change.candidateStatus == "PASS"
	not verified_evidence(candidate, change.capabilityId)
]

verified_evidence_kind(candidate, required_kind) if {
	some evidence in candidate.evidence
	evidence.integrity == "VERIFIED"
	evidence.result == "PASS"
	evidence.candidateSha == candidate.candidateSha
	evidence.evidenceKind == required_kind
}

missing_required_evidence_kinds(candidate) := [required_kind |
	some required_kind in candidate.requiredEvidenceKinds
	not verified_evidence_kind(candidate, required_kind)
]

target_improvements(candidate) := [change.capabilityId |
	some change in candidate.capabilityDiff.changes
	change.target == true
	change.candidateStatus == "PASS"
	change.stableStatus != "KNOWN_GOOD"
	change.stableStatus != "PASS"
	verified_evidence(candidate, change.capabilityId)
]

candidate_outcome(candidate) := "REGRESSION_QUARANTINE" if {
	count(regressions(candidate)) > 0
} else := "PENDING_HUMAN_EVIDENCE" if {
	count(pending_human_capabilities(candidate)) > 0
} else := "BLOCKED" if {
	count(unverified_pass_claims(candidate)) + count(missing_required_evidence_kinds(candidate)) > 0
} else := "NO_WINNER" if {
	count(target_improvements(candidate)) == 0
} else := "PROMOTABLE"

blocked_reasons(candidate) := array.concat(
	unverified_pass_claims(candidate),
	missing_required_evidence_kinds(candidate),
)

candidate_reasons(candidate) := regressions(candidate) if {
	candidate_outcome(candidate) == "REGRESSION_QUARANTINE"
} else := pending_human_capabilities(candidate) if {
	candidate_outcome(candidate) == "PENDING_HUMAN_EVIDENCE"
} else := blocked_reasons(candidate) if {
	candidate_outcome(candidate) == "BLOCKED"
} else := ["TARGET_CAPABILITY_NOT_PROVEN"] if {
	candidate_outcome(candidate) == "NO_WINNER"
} else := []

assessments := [assessment |
	some candidate in input.candidates
	assessment := {
		"attemptId": candidate.attemptId,
		"candidateSha": candidate.candidateSha,
		"outcome": candidate_outcome(candidate),
		"reasons": candidate_reasons(candidate),
		"verifiedTargetImprovements": target_improvements(candidate),
	}
]

promotable_ids := [candidate.attemptId |
	some candidate in input.candidates
	candidate_outcome(candidate) == "PROMOTABLE"
]

decision := {
	"outcome": "PROMOTABLE_CANDIDATE",
	"winnerAttemptId": promotable_ids[0],
	"promotionAllowed": false,
	"humanDecisionRequired": true,
	"assessments": assessments,
	"recommendedAction": "HUMAN_REVIEW_THEN_SEPARATE_PROMOTION",
} if {
	count(promotable_ids) == 1
} else := {
	"outcome": "HUMAN_SELECTION_REQUIRED",
	"winnerAttemptIds": promotable_ids,
	"promotionAllowed": false,
	"humanDecisionRequired": true,
	"assessments": assessments,
	"recommendedAction": "COMPARE_PROMOTABLE_CANDIDATES",
} if {
	count(promotable_ids) > 1
} else := {
	"outcome": "NO_WINNER",
	"winnerAttemptIds": [],
	"promotionAllowed": false,
	"humanDecisionRequired": true,
	"assessments": assessments,
	"recommendedAction": "CREATE_RECONCILIATION_CANDIDATE",
}
