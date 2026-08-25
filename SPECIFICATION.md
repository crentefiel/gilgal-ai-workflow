# GILGAL Specification

GILGAL protocol version: **0.2.0**

This document defines the normative workflow for the GILGAL protocol.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate requirement strength within this specification.

## 1. States

### 1.1 STABLE

STABLE is the last known-good state of the project.

A GILGAL implementation:

- **MUST** preserve STABLE while a candidate is being developed.
- **MUST NOT** use STABLE as the normal AI editing workspace.
- **SHOULD** identify STABLE by an immutable commit SHA, tag, or equivalent versioned reference.

### 1.2 WORK / CANDIDATE

WORK is the isolated state where an AI coding agent may modify code.

A candidate:

- **MUST** originate from a known STABLE state.
- **MUST** remain distinguishable from STABLE.
- **SHOULD** be reproducible from version-control history.

### 1.3 FAILED

FAILED is an optional preserved state for rejected candidates.

A failed candidate **MAY** be archived to help diagnose regressions.

## 2. Candidate creation

Before editing, the implementation **MUST** establish:

- the current STABLE reference;
- the candidate base reference;
- whether the stable working tree is clean;
- whether unrelated user work would be overwritten.

The implementation **MUST NOT** use destructive reset or cleanup operations merely to prepare a candidate.

## 3. Editing rule

AI-driven code changes **MUST** occur in WORK/CANDIDATE rather than directly in STABLE during the normal GILGAL workflow.

If the agent discovers that it is editing STABLE, it **SHOULD** stop and move the task into a candidate environment before continuing.

## 4. Diff requirement

Before promotion, the candidate **MUST** be compared against STABLE.

The diff **SHOULD** expose at least:

- added files;
- modified files;
- deleted files;
- summary statistics.

When a regression is reported between a known-good version and a newer version, the agent **SHOULD** inspect the diff before attempting a broad rewrite.

## 5. GILGAL SENTINEL

GILGAL SENTINEL is the verification layer between CANDIDATE and the GILGAL Gate.

A conforming Sentinel **SHOULD** evaluate five classes of evidence:

1. code/static checks;
2. automated tests;
3. STABLE-vs-CANDIDATE regression contracts;
4. runtime evidence;
5. human-only validation where required.

Sentinel **MAY** integrate external test engines and QA systems.

Sentinel **MUST NOT** treat a successful build alone as sufficient evidence for promotion.

### 5.1 Reference implementation

The repository's GILGAL Sentinel Reference Implementation has its own version, **0.1.0**, independent from this protocol version. It is an evidence provider for the Gate and **MUST NOT** perform promotion, modify STABLE, or manufacture human approval.

## 6. Code and automated validation

A project **MAY** define automated gates such as:

- typecheck;
- unit tests;
- integration tests;
- build;
- lint;
- static analysis;
- security checks;
- end-to-end tests;
- UI tests;
- project-specific validators.

Sentinel **MAY** consume results from tools such as TestSprite, Playwright, Vitest, Jest, pytest, CI systems, or equivalent tools.

No specific external testing product is required by GILGAL.

## 7. Regression contracts

Projects using GILGAL **SHOULD** define critical behaviors as regression contracts.

Examples:

- a file can still be received;
- a user session persists;
- a document preview still renders;
- an existing data path still resolves;
- a repeated message does not create duplicates.

If a required contract fails for CANDIDATE while it passes for STABLE, Sentinel **MUST** report a regression and the GILGAL Gate **MUST** block promotion.

Critical contracts **SHOULD** be distinguishable from advisory/non-critical checks.

A numeric or percentage score **MUST NOT** override a failed critical contract.

## 8. Runtime validation

Sentinel **MAY** inspect runtime evidence including:

- crashes;
- unhandled exceptions;
- unexpected process exits;
- retry loops;
- timeout loops;
- render loops;
- failed state transitions;
- resource warnings;
- application logs.

Runtime evidence **MUST NOT** expose secrets, tokens, customer files, or other sensitive data unnecessarily.

## 9. Human-only validation

Some checks depend on real-world observation, hardware, external accounts, or subjective acceptance.

Examples include:

- physical printing;
- hardware-device behavior;
- real external-service login/session behavior;
- installation on a second machine;
- user acceptance of visual output.

An AI agent **MUST NOT** mark such a check as passed unless an authorized human or trusted external test source provides that evidence.

Without such evidence, the status **SHOULD** be PENDING or NOT TESTED.

## 10. Sentinel result vocabulary

Recommended statuses are:

```text
PASS
FAIL
PENDING
NOT TESTED
BLOCKED
```

An implementation **MUST NOT** report PASS when the relevant validation was not actually executed.

## 11. Sentinel report

A Sentinel report **SHOULD** identify:

- STABLE reference;
- CANDIDATE reference;
- code-check status;
- automated-test status;
- regression-check status;
- runtime-check status;
- human-check status;
- critical regressions found;
- final promotion recommendation.

## 12. Promotion gate

Promotion from CANDIDATE to STABLE **MUST** be blocked when any required gate fails or remains pending when that pending check is mandatory.

Promotion **SHOULD** require:

- candidate based on expected STABLE;
- clean and reviewable diff;
- required automated checks passing;
- required regression contracts passing;
- required manual approvals complete;
- no unresolved merge conflict.

Promotion **SHOULD** be explicit rather than silent.

## 13. Promotion

A successful promotion creates a new STABLE state.

Version-control-native mechanisms **SHOULD** be preferred over raw directory copying.

When possible, a promotion **SHOULD** preserve an easy rollback reference such as a tag or immutable commit.

## 14. Rejection

When a candidate fails:

- STABLE **MUST** remain unchanged;
- the candidate **MAY** be fixed and retested;
- the candidate **MAY** be archived as FAILED;
- the candidate **MAY** be discarded after safe confirmation.

## 15. Memory principle

GILGAL treats the last working implementation as part of the agent's operational memory.

Documentation explains intent. STABLE provides executable historical evidence.

For regression diagnosis, the agent **SHOULD** compare known-good code and candidate code before inventing a replacement implementation.

## 16. Suggested Git mapping

One possible mapping is:

```text
main or gilgal/stable       → STABLE
gilgal/candidate/<id>       → CANDIDATE
gilgal/failed/<id>          → FAILED
```

A separate worktree may expose CANDIDATE as a physical folder while sharing Git object history.

The exact branch names are implementation details and are not mandatory.

## 17. Security and data safety

A GILGAL workflow **MUST NOT** treat production secrets, user data, session tokens, databases, or customer files as ordinary version-controlled source code.

Workspaces and test environments **SHOULD** use safe test data whenever possible.

## 18. Component model

A complete GILGAL workflow may be understood as:

```text
GILGAL
  protects the last known-good state

GILGAL SENTINEL
  verifies the candidate and detects regressions

GILGAL GATE
  controls promotion

GILGAL HISTORY
  records cycle outcomes and evidence
```

## 19. Core invariants

The defining GILGAL invariant is:

> **A failed experiment must not destroy the last known-good state.**

The defining Sentinel invariant is:

> **A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.**

Or, equivalently:

```text
STABLE is protected.
WORK is experimental.
SENTINEL verifies.
PROMOTION is gated.
```
