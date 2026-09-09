# GILGAL SENTINEL — Capability-First Evolution Proposal

Status: **proposal**

This document proposes an evolution of GILGAL Sentinel without changing its core rule: Sentinel observes, verifies, and reports; it does not promote CANDIDATE, mutate STABLE, or self-approve human-only evidence.

## 1. Activation model: event-driven, not an uncontrolled loop

Sentinel should not be treated as a process that "thinks forever" in the background.

The preferred model is event-driven:

```text
CANDIDATE changes
    ↓
explicit sentinel check / CI / PR event / optional watcher
    ↓
Sentinel evaluates evidence
    ↓
report + gate status
    ↓
stop
```

An optional future `watch` mode may observe repository events and re-run only the affected checks. Even in watch mode, Sentinel must remain bounded and deterministic:

- no self-promotion;
- no self-approval of human-only contracts;
- no mutation of STABLE;
- no invention of tests from arbitrary prose;
- no endless polling when there is no new evidence.

## 2. Capability-first contracts

Sentinel should evaluate the project by **capabilities**, not only by generic commands.

A capability is a behavior that the system claims to preserve, for example:

```text
receive PDF
render real content
print duplex
open printer preferences
preserve driver settings
restore file
send WhatsApp reply
```

Each capability SHOULD declare:

- `id`;
- human-readable name;
- criticality;
- evidence sources;
- exact PASS criteria;
- exact FAIL criteria;
- PENDING / NOT TESTED criteria;
- whether human evidence is mandatory;
- whether the evidence is SHA-bound;
- optional replay contracts that protect previous fixes.

Recommended invariant:

> **A capability without sufficient evidence is never PASS by default.**

## 3. Evidence matrix

For each capability, Sentinel should be able to produce a compact evidence matrix:

```text
CAPABILITY: physical-duplex

CODE CHECK ............ PASS
AUTOMATED TEST ........ PASS
RUNTIME EVIDENCE ...... PASS
REGRESSION REPLAY ..... PASS
HUMAN PHYSICAL TEST ... PENDING

CAPABILITY RESULT ..... PENDING
```

This prevents a strong automated result from hiding a missing physical or human validation.

## 4. Explicit PASS / FAIL criteria before execution

Where practical, the acceptance rule should exist **before** the test runs.

Example:

```text
Capability: driver-settings-authority

PASS:
- preferences selected in the native driver are preserved in the final job;
- no implicit Simplex override is injected;
- private DEVMODE data remains preserved;
- physical duplex succeeds when human validation is required.

FAIL:
- LAN House overwrites driver choice without explicit user override;
- driver-private state is discarded;
- the physical job contradicts the validated configuration.
```

This reduces post-hoc interpretation and makes the Gate auditable.

## 5. Evidence provenance and freshness

Every important evidence item SHOULD carry provenance:

```text
source
capturedAt
stableSha
candidateSha
tool/provider
artifact or report reference
human / automated
```

Evidence tied to a previous CANDIDATE SHA becomes stale when the CANDIDATE changes unless the contract explicitly states otherwise.

Recommended rule:

> **Evidence must prove the current candidate, not merely resemble evidence from an older one.**

For human-only checks, the existing SHA-bound approval rule remains mandatory.

## 6. Dependency-aware rechecks

A future Sentinel implementation may map changed files or subsystems to affected capabilities.

Example:

```text
printing bridge changed
    ↓
re-run:
- duplex transport
- driver settings authority
- Print Core integration
- regression replays related to printing

DO NOT automatically re-run unrelated WhatsApp contracts
```

This keeps repeated verification fast without weakening evidence.

The safe fallback is always to run the full configured set.

## 7. Regression memory should attach to capabilities

Regression Replay should become capability-aware.

A replay is not merely an old test. It is evidence that a previously broken capability remains protected.

Example:

```text
Capability: pdf-content-integrity
Replay: black-page-regression
Origin: simulated canvas returned uniform black pages
Expected: validator rejects invalid page before spooler
```

Recommended invariant remains:

> **Every reproducible regression should become executable memory.**

## 8. Proof Ceiling per capability

Sentinel SHOULD state what is and is not proven.

Example:

```text
Capability: physical-duplex

PROVEN:
- driver reports duplex support;
- requested PrintTicket validates;
- final DEVMODE preserves duplex.

NOT PROVEN:
- physical printer actually flips the sheet.

RESULT:
PENDING HUMAN
```

This prevents digital evidence from being presented as physical proof.

## 9. Contradiction detection

Sentinel SHOULD flag contradictory evidence instead of choosing the convenient result.

Example:

```text
validated PrintTicket: TwoSidedLongEdge
physical result: Simplex
```

Result:

```text
EVIDENCE CONTRADICTION
CAPABILITY: FAIL or INCONCLUSIVE
PROMOTION: BLOCKED when critical
```

Contradictions are evidence and should be retained in history.

## 10. Optional watch mode

A future `gilgal sentinel watch` could provide continuous **observation**, not continuous autonomous decision-making.

Suggested behavior:

```text
watch repository / PR / CI events
        ↓
new candidate evidence detected
        ↓
mark affected previous evidence STALE
        ↓
run configured affected checks
        ↓
write new report
        ↓
wait for another event
```

Important boundaries:

- watch mode MUST NOT promote;
- watch mode MUST NOT approve human checks;
- watch mode MUST NOT mutate STABLE;
- watch mode MUST NOT turn missing evidence into PASS;
- watch mode MUST expose what caused each re-evaluation.

## 11. Suggested capability report

```text
=== GILGAL SENTINEL — CAPABILITY REPORT ===

Candidate SHA:
Stable SHA:

CAPABILITY:
Critical:

Claim:

Evidence:
- source:
- status:
- candidate SHA:
- timestamp:

Automated checks:
Regression replays:
Runtime evidence:
Human evidence:

Proof Ceiling:

Contradictions:

CAPABILITY RESULT:
PASS / FAIL / PENDING / NOT TESTED / BLOCKED
```

## 12. Core invariants

The evolution above keeps the current Sentinel model and strengthens it with five additional rules:

> **No evidence means no PASS.**

> **PASS and FAIL criteria should be explicit before evaluation whenever practical.**

> **Evidence must be bound to the candidate it claims to prove.**

> **Contradictory evidence must be surfaced, never silently reconciled.**

> **Continuous observation must never become autonomous promotion.**

These rules are intended to make Sentinel more precise, auditable, and useful as the project grows without turning it into an unsafe autonomous deployment agent.
