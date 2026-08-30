package network

#NonEmpty: string & =~"^\\S(?:.*\\S)?$"
#Identifier: string & =~"^[A-Z0-9][A-Z0-9._:-]{2,127}$"
#SHA: string & =~"^[a-f0-9]{40}$"
#SHA256: string & =~"^[a-f0-9]{64}$"
#Timestamp: string & =~"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$"
#CapabilityState: "KNOWN_GOOD" | "KNOWN_BAD" | "UNKNOWN" | "PENDING" | "NOT_TESTED" | "PASS" | "FAIL"
#EvidenceKind: "AUTOMATED" | "INTEGRATION" | "PACKAGED" | "PHYSICAL" | "HUMAN"
#EvidenceIntegrity: "VERIFIED" | "CLAIMED" | "TAINTED" | "STALE"
#GateOutcome: "PROMOTABLE" | "BLOCKED" | "PENDING_HUMAN_EVIDENCE" | "REGRESSION_QUARANTINE" | "NO_WINNER"

#RecordBase: {
	schemaVersion: "0.1"
	id:            #Identifier
	createdAt:     #Timestamp
}

#Environment: {
	os:            #NonEmpty
	architecture:  #NonEmpty
	runtime?:      #NonEmpty
	driver?:       #NonEmpty
	device?:       #NonEmpty
	configSha256?: #SHA256
}

#HumanApprovalClaim: {
	actor:     #NonEmpty
	actorType: "HUMAN"
	rationale: #NonEmpty
	reference: #NonEmpty
	createdAt: #Timestamp
	status:    "CLAIMED"
}

#Task: {
	#RecordBase
	kind:             "TASK"
	stableSha:        #SHA
	title:            #NonEmpty
	problem:          #NonEmpty
	expectedBehavior: #NonEmpty
	targetCapabilities: [#Identifier, ...#Identifier]
	preservedCapabilities: [#Identifier, ...#Identifier]
	allowedScope: [#NonEmpty, ...#NonEmpty]
	forbiddenScope: [...#NonEmpty]
	requiredEvidenceKinds: [#EvidenceKind, ...#EvidenceKind]
	physicalEffects: bool
	humanEvidenceRequired: bool

	if physicalEffects {
		humanEvidenceRequired: true
	}
}

#AgentAttempt: {
	#RecordBase
	kind:         "AGENT_ATTEMPT"
	taskId:       #Identifier
	stableSha:    #SHA
	candidateSha: #SHA
	contributor: {
		name:      #NonEmpty
		actorType: "AGENT" | "HUMAN"
		provider?: #NonEmpty
		version?:  #NonEmpty
	}
	hypothesis:       #NonEmpty
	strategy:         #NonEmpty
	changedFiles:     [#NonEmpty, ...#NonEmpty]
	targetCapabilities: [#Identifier, ...#Identifier]
	failedStrategyIds: [...#Identifier]
	rollbackReference: #NonEmpty
}

#CapabilityChange: {
	capabilityId:   #Identifier
	mandatory:      bool
	target:         bool
	stableStatus:   #CapabilityState
	candidateStatus: #CapabilityState
	evidenceIds:    [...#Identifier]
}

#CapabilityDiff: {
	#RecordBase
	kind:         "CAPABILITY_DIFF"
	taskId:       #Identifier
	attemptId:    #Identifier
	candidateSha: #SHA
	changes:      [#CapabilityChange, ...#CapabilityChange]
}

#Evidence: {
	#RecordBase
	kind:         "EVIDENCE"
	taskId:       #Identifier
	attemptId:    #Identifier
	candidateSha: #SHA
	capabilityIds: [#Identifier, ...#Identifier]
	evidenceKind: #EvidenceKind
	integrity:    #EvidenceIntegrity
	environment:  #Environment
	reference:    #NonEmpty
	synthetic:    bool | *false
	artifactSha256?: #SHA256
	humanApprovalClaim?: #HumanApprovalClaim

	if synthetic {
		integrity: "TAINTED"
	}

	if evidenceKind == "HUMAN" {
		integrity: "CLAIMED" | "TAINTED" | "STALE"
	}

	if evidenceKind == "PACKAGED" && integrity == "VERIFIED" {
		artifactSha256: #SHA256
	}
}

#FailureMemory: {
	#RecordBase
	kind:          "FAILURE_MEMORY"
	taskId:        #Identifier
	attemptId:     #Identifier
	candidateSha:  #SHA
	hypothesis:    #NonEmpty
	strategy:      #NonEmpty
	result:        "REJECTED" | "FAILED" | "REGRESSION"
	evidenceIds:   [#Identifier, ...#Identifier]
	reusableLesson: #NonEmpty
	doNotRepeatWithout: #NonEmpty
}

#ReviewFinding: {
	severity: "P0" | "P1" | "P2" | "P3"
	title:    #NonEmpty
	detail:   #NonEmpty
	path?:    #NonEmpty
	evidenceIds: [...#Identifier]
}

#Review: {
	#RecordBase
	kind:         "REVIEW"
	taskId:       #Identifier
	attemptId:    #Identifier
	reviewedSha:  #SHA
	reviewer: {
		name:      #NonEmpty
		actorType: "AGENT" | "HUMAN"
		provider?: #NonEmpty
	}
	disposition: "COMMENTED" | "CHANGES_REQUESTED"
	findings: [...#ReviewFinding]
}

#GateDecision: {
	#RecordBase
	kind:         "GATE_DECISION"
	taskId:       #Identifier
	attemptId:    #Identifier
	candidateSha: #SHA
	policyVersion: #NonEmpty
	inputSha256:   #SHA256
	outcome:       #GateOutcome
	promotionAllowed: bool
	reasons:       [...#NonEmpty]
	evidenceIds:   [...#Identifier]
	recommendedAction?: #NonEmpty

	if outcome == "PROMOTABLE" {
		promotionAllowed: true
		evidenceIds: [#Identifier, ...#Identifier]
	}

	if outcome != "PROMOTABLE" {
		promotionAllowed: false
		reasons: [#NonEmpty, ...#NonEmpty]
	}
}

#NetworkBundle: {
	task:            #Task
	attempts:        [#AgentAttempt, ...#AgentAttempt]
	capabilityDiffs: [#CapabilityDiff, ...#CapabilityDiff]
	evidence:        [...#Evidence]
	failureMemory:   [...#FailureMemory]
	reviews:         [...#Review]
	gateDecisions:   [...#GateDecision]
}
