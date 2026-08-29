# GILGAL 0.5 Candidate — Capability-Aware Reconciliation

**Status:** protocol candidate; not promoted  
**Base protocol:** GILGAL 0.4.0  
**Origin:** real LAN House Files 2.0 integration evidence  
**Concept documented by:** David Ferreira ([@crentefiel](https://github.com/crentefiel))

## Problem

A project-wide PASS/FAIL result is too coarse when a candidate improves one capability and regresses another.

Example:

| Capability | STABLE | WORK |
|---|---|---|
| WhatsApp QR/session | KNOWN_GOOD | FAIL / unstable |
| File reception | KNOWN_GOOD | FAIL |
| Duplex transport | KNOWN_BAD | HUMAN_PASS |
| Printed content fidelity | UNKNOWN | HUMAN_FAIL |

The WORK candidate is not a winner merely because duplex improved. The STABLE state is not a winner for the target capability either.

The required comparative result is:

```text
COMPOSITE_RESULT = NO_WINNER
ACTION = CREATE_RECONCILIATION_CANDIDATE
```

## Central rule

> A candidate may replace STABLE only if it preserves every mandatory KNOWN_GOOD capability and improves at least one target capability, except for a regression explicitly accepted by a human with recorded evidence and rationale.

Compact form:

```text
NewStableKnownGood ⊇ OldStableKnownGood
TargetCapability(candidate) > TargetCapability(stable)
```

This rule is capability-aware. STABLE may contain known defects; STABLE means the protected reference state, not a claim of perfection.

## Capability Ledger

GILGAL SHOULD maintain a ledger of observable capabilities instead of assigning one binary status to the whole project.

Recommended statuses:

- `KNOWN_GOOD`
- `KNOWN_BAD`
- `UNKNOWN`
- `PENDING`
- `NOT_TESTED`

Each record SHOULD include:

```text
capability id
description
criticality
status
evidence type
evidence reference
exact candidate/STABLE SHA
environment fingerprint
proof debt
last verified time
dependencies
owners/files
```

A claim MUST NOT be stronger than its weakest mandatory evidence. Human-only evidence cannot be self-approved by an AI agent.

## Defect Ledger

Known defects in STABLE MUST be recordable without invalidating all known-good capabilities.

Example:

```text
STABLE:
  WHATSAPP_QR = KNOWN_GOOD
  WHATSAPP_RECEIVE_FILE = KNOWN_GOOD
  PRINT_DUPLEX = KNOWN_BAD
```

The Defect Ledger prevents “STABLE” from being misread as “defect-free.”

## Capability Diff

In addition to `git diff`, GILGAL SHOULD produce a behavioral comparison:

```text
WHATSAPP_QR:           PASS → FAIL
WHATSAPP_RECEIVE_FILE: PASS → FAIL
PRINT_DUPLEX:          FAIL → PASS
STORAGE:               PASS → PASS
```

A source diff explains what changed. A Capability Diff explains what the change did.

## Preservation Baseline and contracts

Human-verified STABLE behavior SHOULD become a Preservation Baseline and, where reproducible, an executable Preservation Contract.

Examples:

- `PRESERVE-WPP-01`: QR connects and the session remains active.
- `PRESERVE-WPP-02`: a received JPG appears in Inbox.
- `PRESERVE-WPP-03`: a received PDF appears and is recorded in the database.

A mandatory KNOWN_GOOD capability that changes to FAIL MUST block promotion.

## Regression Quarantine

If any mandatory KNOWN_GOOD capability regresses, the candidate enters `REGRESSION_QUARANTINE`.

Properties:

- unrelated green tests do not release quarantine;
- target-capability improvement does not cancel the regression;
- release requires restored evidence or explicit human acceptance;
- the Comparative Gate MUST NOT select a quarantined candidate.

## Composite NO WINNER

The Comparative Gate MUST return `NO_WINNER` when no candidate dominates STABLE across mandatory capabilities.

GILGAL MUST NOT choose “the least bad” candidate.

A `NO_WINNER` result SHOULD recommend a Reconciliation Candidate when verified improvements are reusable.

## Capability Transplant

A Capability Transplant takes a verified improvement from one candidate and reapplies only that capability over a clean branch created from STABLE.

```text
STABLE
  ├─ preserve known-good behavior
  └─ create clean reconciliation branch
       └─ transplant verified capability
            └─ run preservation + target contracts
                 └─ promote only if composite gate passes
```

A transplant is not a blind merge or cherry-pick. It is a constrained reconstruction supported by evidence.

## Selective Commit Extraction and scope contamination

GILGAL SHOULD identify commits and files associated with the target capability.

If one commit mixes the target capability with unrelated subsystems, GILGAL MUST report:

```text
SCOPE_CONTAMINATION
```

The contaminated commit MUST NOT be transplanted blindly. The change may be reconstructed selectively in a new commit, with provenance linking it back to the original experiment.

## Reconciliation Candidate

A Reconciliation Candidate:

1. starts from the exact STABLE SHA;
2. declares target capabilities;
3. declares mandatory preserved capabilities;
4. contains a Transplant Manifest;
5. imports only the minimum verified change;
6. executes target and preservation contracts;
7. records remaining Proof Debt;
8. requires human evidence where mandated;
9. can be promoted only after the composite Gate passes.

For the LAN House example:

```text
RECONCILIATION CANDIDATE
  base: STABLE with known-good WhatsApp
  target: verified Print Core integration
  preserve: QR, session, JPG/PDF reception, storage/database
  require: duplex transport + content fidelity
```

## Capability Ownership Map

Each capability SHOULD declare its primary code and runtime dependencies.

Example:

```text
WHATSAPP_RECEIVE_FILE
  supervisor
  WhatsApp engine
  storage
  database
  Inbox UI

PRINT_DUPLEX
  PrintService
  NativePrintBridgeClient
  bridge executable
  PDF preparation
  Windows spooler
```

A print hypothesis touching WhatsApp-owned files SHOULD trigger an immediate scope warning.

Ownership is evidence metadata, not an absolute architectural truth. Shared dependencies must be declared explicitly.

## Behavioral Snapshot

GILGAL SHOULD preserve observable behavior, not only source code.

A Behavioral Snapshot may record:

- input or triggering action;
- expected observable result;
- timeout or stability window;
- artifact/evidence reference;
- environment fingerprint;
- exact SHA.

Examples:

- “QR connects and remains connected for the required observation window.”
- “A JPG received through WhatsApp appears in Inbox.”
- “One duplex job uses one physical sheet and both sides contain the expected content.”

## Environment Fingerprint

Evidence SHOULD be linked to relevant environment facts:

- OS and architecture;
- Node/Electron/runtime versions;
- device and driver identifiers;
- external-service/API version when relevant;
- storage root and database schema;
- build/package mode;
- relevant configuration hashes.

The fingerprint helps distinguish a code regression from an environment mismatch. Secrets MUST NOT be recorded.

## Proof Debt

A capability may have partial evidence without being fully promotable.

Example:

```text
DUPLEX_TRANSPORT = HUMAN_PASS
CONTENT_FIDELITY = HUMAN_FAIL
PACKAGED_BUILD = PENDING
```

Proof Debt lists mandatory evidence still missing. It cannot be erased by unrelated automated PASS results.

## Capability Rollback

A transplanted capability SHOULD be independently reversible when practical.

The Transplant Manifest SHOULD record enough information to identify:

- introduced commits;
- reconstructed hunks/files;
- configuration changes;
- dependencies;
- contracts;
- rollback procedure.

Capability Rollback does not authorize unsafe automatic mutation of STABLE. It produces a reviewable rollback candidate.

## New extensions

### 1. Transplant Manifest

Every transplant SHOULD have a machine-readable or auditable manifest:

```text
transplant id
stable base SHA
source candidate SHA
target capabilities
preserved capabilities
selected commits/files
excluded contaminated scope
required contracts
evidence lineage
rollback references
human approvals
```

This prevents “selective reconciliation” from becoming an undocumented manual copy.

### 2. Capability Dependency Graph

Capabilities are rarely isolated. GILGAL SHOULD model dependencies and shared infrastructure.

If `WHATSAPP_RECEIVE_FILE` depends on `STORAGE`, and a print transplant changes storage, both capabilities enter the mandatory retest set.

The retest set is the transitive impact closure of the changed capability, bounded by declared evidence and reviewed ownership metadata.

### 3. Blast-Radius Gate

Before transplanting, GILGAL SHOULD calculate an expected impact set from:

- changed files;
- ownership map;
- dependency graph;
- runtime/configuration changes;
- shared data contracts.

If observed changes exceed the declared impact set, report:

```text
CAPABILITY_BLAST_RADIUS_EXCEEDED
```

This is capability-aware Change Budget: line count alone is not enough.

### 4. Evidence Provenance and taint

Evidence MUST retain lineage:

```text
input → transformation → artifact → observed output → verifier → SHA/environment
```

Synthetic, mocked, stale, wrong-SHA, or wrong-environment evidence MUST be marked with its limitations. Tainted evidence cannot silently satisfy real-output or human-only gates.

Core rule:

> Synthetic output cannot satisfy real output.

### 5. Shadow Validation

When feasible, a Reconciliation Candidate SHOULD first run in a non-authoritative shadow mode:

- receive the same safe inputs;
- produce comparison artifacts;
- avoid irreversible side effects;
- compare behavior with STABLE;
- require explicit authorization for physical or external actions.

Shadow validation reduces risk but does not replace required real-world evidence.

### 6. Confidence decay and revalidation

A KNOWN_GOOD capability is evidence-bound, not eternally true. GILGAL MAY mark evidence stale when major environment, dependency, schema, device, or driver changes invalidate its assumptions.

Staleness changes a capability to `PENDING_REVALIDATION`; it does not rewrite history or claim the prior evidence was false.

## Side-Effect Firewall

Automated tests MUST NOT cause physical or irreversible effects by default.

Examples requiring explicit authorization:

- physical printing;
- sending real messages;
- charging payments;
- deleting remote data;
- operating hardware.

A physical runner SHOULD require a deliberate authorization variable and MUST be excluded from ordinary test discovery.

## Output Fidelity Gate

“File exists” is not proof that its content is correct.

For generated artifacts, required evidence SHOULD examine meaningful fidelity such as:

- non-synthetic origin;
- expected dimensions/pages;
- pixel/content diagnostics;
- layout;
- readable text or expected markers;
- physical result when required.

## Gate algorithm

A capability-aware Gate SHOULD evaluate, in order:

1. evidence identity: exact SHA and environment;
2. mandatory target capability evidence;
3. preservation contracts;
4. dependency-derived retest set;
5. regression quarantine;
6. scope contamination and blast radius;
7. output fidelity and side-effect policy;
8. Proof Debt;
9. required human decisions;
10. composite dominance over STABLE.

Possible outcomes:

- `PROMOTABLE`
- `BLOCKED`
- `PENDING_HUMAN_EVIDENCE`
- `REGRESSION_QUARANTINE`
- `NO_WINNER`
- `RECONCILIATION_REQUIRED`

## Non-goals

This candidate does not claim that:

- Git commits map perfectly to capabilities;
- all behavior can be automated;
- STABLE is defect-free;
- a transplant can be performed safely without review;
- the Sentinel 0.2.0 implementation already enforces these rules.

This document proposes protocol semantics for a future implementation.

## Acceptance criteria for protocol promotion

Before this candidate becomes an official protocol version:

- normative schemas and state transitions are defined;
- Capability Gate behavior has executable contract tests;
- STABLE regressions reliably block promotion;
- `NO_WINNER` and reconciliation paths are tested;
- evidence identity and Proof Debt are enforced;
- scope contamination cannot be silently bypassed;
- human-only evidence remains human-only;
- documentation distinguishes protocol rules from implemented Sentinel features.

## Summary

GILGAL 0.5 changes the unit of reasoning from the whole project to verified capabilities.

> Do not promote the candidate that fixed one thing. Reconstruct the candidate that preserves everything proven and imports only the verified improvement.
