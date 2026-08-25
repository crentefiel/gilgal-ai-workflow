# GILGAL Specification

Version: **0.1.0**

This document defines the initial normative workflow for the GILGAL protocol.

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

## 5. Automated validation

A project **MAY** define automated gates such as:

- typecheck;
- unit tests;
- integration tests;
- build;
- lint;
- static analysis;
- security checks.

A passing build **MUST NOT** by itself be treated as proof that the product still behaves correctly.

## 6. Regression contracts

Projects using GILGAL **SHOULD** define critical behaviors as regression contracts.

Examples:

- a file can still be received;
- a user session persists;
- a document preview still renders;
- an existing data path still resolves;
- a repeated message does not create duplicates.

If a required contract fails for CANDIDATE while it passes for STABLE, the implementation **MUST** report a regression and **MUST** block promotion.

## 7. Human-only validation

Some checks depend on real-world observation, hardware, external accounts, or subjective acceptance.

Examples include:

- physical printing;
- hardware-device behavior;
- real external-service login/session behavior;
- installation on a second machine;
- user acceptance of visual output.

An AI agent **MUST NOT** mark such a check as passed unless an authorized human or trusted external test source provides that evidence.

Without such evidence, the status **SHOULD** be PENDING or NOT TESTED.

## 8. Promotion gate

Promotion from CANDIDATE to STABLE **MUST** be blocked when any required gate fails.

Promotion **SHOULD** require:

- candidate based on expected STABLE;
- clean and reviewable diff;
- required automated checks passing;
- required regression contracts passing;
- required manual approvals complete;
- no unresolved merge conflict.

Promotion **SHOULD** be explicit rather than silent.

## 9. Promotion

A successful promotion creates a new STABLE state.

Version-control-native mechanisms **SHOULD** be preferred over raw directory copying.

When possible, a promotion **SHOULD** preserve an easy rollback reference such as a tag or immutable commit.

## 10. Rejection

When a candidate fails:

- STABLE **MUST** remain unchanged;
- the candidate **MAY** be fixed and retested;
- the candidate **MAY** be archived as FAILED;
- the candidate **MAY** be discarded after safe confirmation.

## 11. Memory principle

GILGAL treats the last working implementation as part of the agent's operational memory.

Documentation explains intent. STABLE provides executable historical evidence.

For regression diagnosis, the agent **SHOULD** compare known-good code and candidate code before inventing a replacement implementation.

## 12. Suggested Git mapping

One possible mapping is:

```text
main or gilgal/stable       → STABLE
gilgal/candidate/<id>       → CANDIDATE
gilgal/failed/<id>          → FAILED
```

A separate worktree may expose CANDIDATE as a physical folder while sharing Git object history.

The exact branch names are implementation details and are not mandatory.

## 13. Minimal result vocabulary

For real validation reports, GILGAL recommends unambiguous statuses such as:

```text
PASS
FAIL
PENDING
NOT TESTED
```

An implementation **MUST NOT** report PASS when the relevant validation was not actually executed.

## 14. Security and data safety

A GILGAL workflow **MUST NOT** treat production secrets, user data, session tokens, databases, or customer files as ordinary version-controlled source code.

Workspaces and test environments **SHOULD** use safe test data whenever possible.

## 15. Core invariant

The defining invariant of GILGAL is:

> **A failed experiment must not destroy the last known-good state.**

Or, equivalently:

```text
STABLE is protected.
WORK is experimental.
PROMOTION is gated.
```