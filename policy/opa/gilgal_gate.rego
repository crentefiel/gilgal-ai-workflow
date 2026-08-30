package gilgal.gate

import rego.v1

regressions := [cap.id |
	some cap in input.capabilities
	cap.mandatory == true
	cap.stableStatus == "KNOWN_GOOD"
	cap.candidateStatus != "PASS"
	object.get(cap, "humanAcceptance", false) == false
]

critical_proof_debt := [debt.id |
	some cap in input.capabilities
	some debt in cap.proofDebt
	debt.critical == true
	debt.status == "OPEN"
]

tainted_evidence := [evidence.id |
	some cap in input.capabilities
	some evidence in cap.evidence
	evidence.integrity == "TAINTED"
]

synthetic_real_output_evidence := [evidence.id |
	some cap in input.capabilities
	some evidence in cap.evidence
	evidence.synthetic == true
	evidence.kind in {"PACKAGED", "PHYSICAL", "HUMAN"}
]

pending_human := [cap.id |
	some cap in input.capabilities
	cap.mandatory == true
	cap.candidateStatus == "PENDING"
	some evidence in cap.evidence
	evidence.kind == "HUMAN"
	evidence.humanApproved == false
]

evidence_identity_valid if {
	input.evidenceIdentity.candidateSha == input.candidate.sha
	input.evidenceIdentity.environmentVerified == true
}

provenance_verified if {
	input.evidenceIdentity.artifactProvenanceVerified == true
}

scope_valid if {
	input.scope.contaminated == false
	input.scope.blastRadiusExceeded == false
}

side_effects_valid if {
	input.sideEffectPolicy.automatedPhysicalActions == 0
}

decision := {
	"outcome": "REGRESSION_QUARANTINE",
	"promotionAllowed": false,
	"reasons": regressions,
	"recommendedAction": "CREATE_RECONCILIATION_CANDIDATE",
} if {
	count(regressions) > 0
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": ["EVIDENCE_IDENTITY_INVALID"],
} if {
	not evidence_identity_valid
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": ["ARTIFACT_PROVENANCE_UNVERIFIED"],
} if {
	not provenance_verified
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": array.concat(tainted_evidence, synthetic_real_output_evidence),
} if {
	count(tainted_evidence) + count(synthetic_real_output_evidence) > 0
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": critical_proof_debt,
} if {
	count(critical_proof_debt) > 0
} else := {
	"outcome": "PENDING_HUMAN_EVIDENCE",
	"promotionAllowed": false,
	"reasons": pending_human,
} if {
	count(pending_human) > 0
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": ["SCOPE_CONTAMINATION_OR_BLAST_RADIUS"],
} if {
	not scope_valid
} else := {
	"outcome": "BLOCKED",
	"promotionAllowed": false,
	"reasons": ["SIDE_EFFECT_FIREWALL_VIOLATION"],
} if {
	not side_effects_valid
} else := {
	"outcome": "NO_WINNER",
	"promotionAllowed": false,
	"reasons": ["TARGET_CAPABILITY_NOT_IMPROVED"],
	"recommendedAction": "RECONCILIATION_REQUIRED",
} if {
	input.targetImproved == false
} else := {
	"outcome": "PROMOTABLE",
	"promotionAllowed": true,
	"reasons": [],
}
