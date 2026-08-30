package gilgal

#SHA: =~"^[a-f0-9]{40}$"

#CapabilityStatus: "KNOWN_GOOD" | "KNOWN_BAD" | "UNKNOWN" | "PENDING" | "NOT_TESTED" | "PENDING_REVALIDATION"
#CandidateStatus: "PASS" | "FAIL" | "PENDING" | "NOT_TESTED"
#EvidenceKind: "AUTOMATED" | "INTEGRATION" | "PACKAGED" | "PHYSICAL" | "HUMAN"
#EvidenceIntegrity: "VERIFIED" | "CLAIMED" | "TAINTED" | "STALE"

#Environment: {
	os: string
	architecture: string
	runtime?: string
	driver?: string
	device?: string
	configHash?: string
}

#Evidence: {
	id: string
	kind: #EvidenceKind
	integrity: #EvidenceIntegrity
	sha: #SHA
	artifactSha256?: =~"^[a-f0-9]{64}$"
	environment: #Environment
	reference: string
	humanApproved: bool | *false
	synthetic: bool | *false

	if kind == "HUMAN" {
		humanApproved: true
	}

	if synthetic {
		integrity: "TAINTED"
	}
}

#Capability: {
	id: string
	description: string
	mandatory: bool
	stableStatus: #CapabilityStatus
	candidateStatus: #CandidateStatus
	target: bool | *false
	dependencies: [...string]
	owners: [...string]
	evidence: [...#Evidence]
	humanAcceptance: bool | *false
	proofDebt: [...#ProofDebt]
}

#ProofDebt: {
	id: string
	description: string
	critical: bool
	status: "OPEN" | "WAIVED" | "SATISFIED"
	waivedByHuman: bool | *false

	if status == "WAIVED" {
		waivedByHuman: true
	}
}

#TransplantManifest: {
	id: string
	stableBaseSha: #SHA
	sourceCandidateSha: #SHA
	targetCapabilities: [string, ...string]
	preservedCapabilities: [string, ...string]
	selectedCommits: [...#SHA]
	selectedFiles: [...string]
	excludedContaminatedScope: [...string]
	requiredContracts: [string, ...string]
	rollbackReferences: [string, ...string]
	humanApprovals: [...string]
}

#GateInput: {
	version: 1
	stable: {
		sha: #SHA
	}
	candidate: {
		sha: #SHA
	}
	evidenceIdentity: {
		candidateSha: #SHA
		environmentVerified: bool
		artifactProvenanceVerified: bool
	}
	capabilities: [#Capability, ...#Capability]
	scope: {
		contaminated: bool
		blastRadiusExceeded: bool
	}
	sideEffectPolicy: {
		physicalActionAuthorized: bool
		automatedPhysicalActions: int & >=0
	}
	targetImproved: bool
}
