package gilgal.gate_test

import rego.v1
import data.gilgal.gate

base_input := {
	"version": 1,
	"stable": {"sha": "1111111111111111111111111111111111111111"},
	"candidate": {"sha": "2222222222222222222222222222222222222222"},
	"evidenceIdentity": {
		"candidateSha": "2222222222222222222222222222222222222222",
		"environmentVerified": true,
		"artifactProvenanceVerified": true,
	},
	"capabilities": [{
		"id": "WHATSAPP_QR",
		"description": "QR remains available",
		"mandatory": true,
		"stableStatus": "KNOWN_GOOD",
		"candidateStatus": "PASS",
		"target": false,
		"dependencies": [],
		"owners": ["src/whatsapp"],
		"evidence": [],
		"humanAcceptance": false,
		"proofDebt": [],
	}],
	"scope": {"contaminated": false, "blastRadiusExceeded": false},
	"sideEffectPolicy": {
		"physicalActionAuthorized": false,
		"automatedPhysicalActions": 0,
	},
	"targetImproved": true,
}

test_clean_candidate_is_promotable if {
	gate.decision with input as base_input == {
		"outcome": "PROMOTABLE",
		"promotionAllowed": true,
		"reasons": [],
	}
}

test_known_good_regression_enters_quarantine if {
	candidate := object.union(base_input, {
		"capabilities": [object.union(base_input.capabilities[0], {
			"candidateStatus": "FAIL",
		})],
	})
	result := gate.decision with input as candidate
	result.outcome == "REGRESSION_QUARANTINE"
	result.promotionAllowed == false
	result.recommendedAction == "CREATE_RECONCILIATION_CANDIDATE"
	result.reasons == ["WHATSAPP_QR"]
}

test_unverified_artifact_provenance_blocks if {
	candidate := object.union(base_input, {
		"evidenceIdentity": object.union(base_input.evidenceIdentity, {
			"artifactProvenanceVerified": false,
		}),
	})
	result := gate.decision with input as candidate
	result.outcome == "BLOCKED"
	result.reasons == ["ARTIFACT_PROVENANCE_UNVERIFIED"]
}

test_critical_proof_debt_blocks if {
	capability := object.union(base_input.capabilities[0], {
		"proofDebt": [{
			"id": "PHYSICAL_CONTENT",
			"description": "Human physical content test pending",
			"critical": true,
			"status": "OPEN",
			"waivedByHuman": false,
		}],
	})
	candidate := object.union(base_input, {"capabilities": [capability]})
	result := gate.decision with input as candidate
	result.outcome == "BLOCKED"
	result.reasons == ["PHYSICAL_CONTENT"]
}
