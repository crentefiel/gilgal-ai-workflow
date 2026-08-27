# GILGAL SENTINEL

GILGAL protocol version: **0.5.0**

Reference implementation version: **0.2.0**

**Concept documented by:** David Ferreira ([@crentefiel](https://github.com/crentefiel))  
**Part of:** GILGAL

## Purpose

**GILGAL SENTINEL** is the verification layer of the GILGAL workflow.

GILGAL protects the last known-good state. Sentinel inspects the candidate before the GILGAL Gate decides whether promotion may occur.

The local reference implementation lives in [`sentinel/`](sentinel/README.md). It observes, tests, and reports. It never promotes a candidate, changes STABLE, or self-approves a human-only contract.

The central question is not only:

> Does the new code work?

It is also:

> Does the candidate still preserve the behavior that was verified in STABLE?

From protocol 0.4.0, a difficult investigation may also ask:

> Is this candidate testing a genuinely new hypothesis, or silently repeating a rejected strategy?

From protocol 0.5.0, it must also ask:

> Is the strength of this conclusion bounded by every required evidence item, and are generated artifacts valid before downstream use?

## Position in the workflow

```text
STABLE
  ↓
problem / Hypothesis Ledger when needed
  ↓
WORK / CANDIDATE
  ↓
Change Budget
  ↓
GILGAL SENTINEL
  ├── code checks
  ├── automated tests
  ├── regression comparison
  ├── Regression Replay
  ├── runtime checks
  ├── human-only checks
  ├── Evidence Sufficiency / Proof Ceiling
  ├── artifact/render integrity when applicable
  └── Failure Memory evidence when supported
  ↓
GILGAL GATE / optional Comparative Gate
  ├── FAIL / PENDING → promotion blocked
  └── PASS           → candidate may be promoted
```

## Five verification layers

### 1. CODE CHECK

Sentinel MAY execute or consume results from:

- typecheck;
- lint;
- static analysis;
- import/dependency checks;
- security checks;
- dead-code analysis;
- project-specific validation.

A passing code check does not prove runtime correctness.

### 2. AUTOMATED TEST

Sentinel SHOULD run or integrate with the project's available test engines, such as:

- unit tests;
- integration tests;
- UI tests;
- API tests;
- database tests;
- IPC/process tests;
- end-to-end tests.

GILGAL Sentinel is tool-agnostic. It MAY consume results from TestSprite, Playwright, Vitest, Jest, pytest, CI systems, or other test providers.

No single external tool is mandatory.

A test engine executes a particular test. Sentinel combines evidence from multiple engines, compares CANDIDATE with verified STABLE behavior, detects regressions, and determines whether Gate requirements have been met. TestSprite can feed Sentinel as a future external QA provider; Sentinel is not a TestSprite clone.

### 3. REGRESSION CHECK

This is a defining capability of Sentinel.

Sentinel SHOULD compare verified contracts in STABLE against the same contracts in CANDIDATE.

Example:

```text
Contract: receive PDF
STABLE:    PASS
CANDIDATE: FAIL

Result:
REGRESSION DETECTED
PROMOTION BLOCKED
```

When possible, Sentinel SHOULD also inspect the code diff between STABLE and CANDIDATE to help isolate the change responsible for the regression.

### 3.1 REGRESSION REPLAY

A regression that was found, fixed, and can be reproduced SHOULD become a replayable contract.

Recommended rule:

> **Every regression should become a contract.**

The reference implementation uses `type: "replay"` contracts. They behave like reviewed command checks but are identified separately as historical regression memory.

Example:

```json
{
  "id": "qr-auth-regression",
  "name": "QR authentication leaves waiting screen",
  "critical": true,
  "type": "replay",
  "origin": "Previously fixed authentication/UI regression",
  "command": "npm run test:qr-auth-regression"
}
```

Sentinel MUST NOT invent replay commands from arbitrary text. A replay must point to an explicitly reviewed project test or script.

If the exact STABLE baseline records `PASS` and CANDIDATE returns `FAIL`, the replay is a regression and the Gate MUST block when the contract is critical.

### 3.2 CHANGE BUDGET

A project MAY define an explicit budget for the size of a candidate change.

The reference implementation can limit:

- changed files;
- insertions;
- deletions;
- total changed lines.

When a configured limit is exceeded, Sentinel reports:

```text
SCOPE EXPANSION DETECTED
```

A critical Change Budget failure blocks the Gate.

Change Budget does not claim that large changes are inherently incorrect. It exists to expose a mismatch between expected task scope and actual candidate scope so that expansion cannot remain invisible.

### 3.3 FAILURE MEMORY / HYPOTHESIS EVIDENCE

Protocol 0.4.0 adds **Failure Memory**, **Hypothesis Ledger**, **Candidate Families**, and **Strategy Exhaustion**.

A Sentinel implementation MAY consume this evidence to detect situations such as:

```text
ACTIVE candidate belongs to an EXHAUSTED strategy family
candidate silently inherits a REJECTED hypothesis
multiple candidates claim different strategies but are actually the same family
required hypothesis evidence is still PENDING
```

Recommended invariant:

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

A Hypothesis Ledger is metadata, not executable input. Sentinel MUST NOT synthesize commands from arbitrary ledger prose.

### 3.4 EVIDENCE SUFFICIENCY / PROOF CEILING

Protocol 0.5.0 defines:

> **A hypothesis can never be more verified than its weakest required evidence.**

A Sentinel implementation that evaluates hypotheses SHOULD preserve per-item required-evidence status. Automated `PASS` plus required human `PENDING` cannot become `CONFIRMED`; required human `FAIL` rejects the hypothesis being tested; all required evidence `PASS` makes confirmation eligible but does not itself promote the candidate.

An AI agent MUST NOT use `PROVEN`, `VERIFIED`, `FIXED`, or equivalent language while required evidence is pending, untested, blocked, or failing. Root Cause Claim and Root Cause Evidence remain separate.

### Reference implementation note

The **Sentinel Reference Implementation 0.2.0** does not yet automatically enforce every Failure Memory rule introduced in GILGAL protocol 0.4.0 or every Evidence Sufficiency / Artifact Integrity rule introduced in protocol 0.5.0.

This distinction is intentional: protocol version and implementation version are independent. A project may enforce those protocol rules manually until a reference implementation adds machine enforcement.

### 4. RUNTIME CHECK

Sentinel MAY inspect runtime evidence such as:

- crashes;
- unhandled exceptions;
- timeout loops;
- repeated retries;
- unexpected process exits;
- render loops;
- memory/resource warnings;
- application logs;
- failed state transitions.

Runtime evidence MUST be collected without exposing secrets or user data unnecessarily.

### 4.1 ARTIFACT / RENDER INTEGRITY

When a downstream operation depends on a generated artifact, Sentinel SHOULD verify the artifact contract before treating generation as successful.

A synthetic fallback or placeholder MUST NOT count as success merely because it produced a file. For a render pipeline, evidence may include decodeability, expected dimensions, plausible buffer size, expected page count, and readability by the next consumer.

If required render integrity fails, the recommended result is:

```text
RENDER_INTEGRITY_FAIL
```

A dependent spool/print operation MUST NOT proceed after that failure until a valid artifact exists.

### 5. HUMAN CHECK

Some validations cannot be truthfully approved by an AI agent alone.

Examples:

- physical printing;
- real hardware behavior;
- installation on another machine;
- real external-service login/session;
- user acceptance of visual output.

For these checks, Sentinel MUST use a state such as:

```text
PENDING
NOT TESTED
```

until evidence is supplied by an authorized human or trusted external source.

An AI agent MUST NOT self-approve a human-only check.

## Sentinel result vocabulary

Recommended states:

```text
PASS
FAIL
PENDING
NOT TESTED
BLOCKED
```

## Suggested report

```text
=== GILGAL SENTINEL ===

Candidate:
Stable reference:

HYPOTHESIS / FAILURE MEMORY
problem:
hypothesis:
strategy family:
hypothesis state:
family exhausted:

CHANGE BUDGET
status:

CODE CHECK
status:

AUTOMATED TEST
status:

REGRESSION REPLAY
status:
replays executed:

REGRESSION CHECK
status:
regressions found:

RUNTIME CHECK
status:

EVIDENCE SUFFICIENCY / PROOF CEILING
status:
weakest required evidence:

ARTIFACT / RENDER INTEGRITY
status:

HUMAN CHECK
status:

SENTINEL RESULT:
PASS / FAIL / PENDING

PROMOTION:
ALLOWED / BLOCKED
```

## Sentinel score

An implementation MAY expose a score for readability, for example:

```text
Code ............. 100%
Tests ............ 100%
Regression ....... 100%
Runtime .......... 95%
Human ............ PENDING
```

However, a numeric score MUST NOT override a failed critical contract, a required human check, the Proof Ceiling, an artifact-integrity failure, or a critical Failure Memory policy violation.

Example:

```text
Overall score: 98%
Critical regression: FAIL
Promotion: BLOCKED
```

## Critical contracts

Projects SHOULD identify contracts as critical or non-critical.

If a critical contract passes in STABLE and fails in CANDIDATE, Sentinel MUST report a regression and the GILGAL Gate MUST block promotion.

## External test engines

Sentinel is an orchestration and comparison layer, not necessarily a replacement for specialized testing tools.

It MAY integrate with tools such as TestSprite or other automated QA systems and combine their outputs with:

- Git diff evidence;
- project contracts;
- runtime evidence;
- historical STABLE behavior;
- Regression Replay;
- Change Budget evidence;
- Failure Memory / Hypothesis Ledger evidence;
- manual approvals.

## Relationship between components

```text
GILGAL
protects the last known-good code

GILGAL SENTINEL
verifies candidates and searches for regressions

REGRESSION REPLAY
turns old failures into reusable executable memory

CHANGE BUDGET
makes unexpected scope expansion visible

FAILURE MEMORY
records rejected hypotheses and strategies

PROOF CEILING / EVIDENCE SUFFICIENCY
limits claim strength to the weakest required evidence

ARTIFACT / RENDER INTEGRITY
blocks invalid generated artifacts from downstream use

HYPOTHESIS LEDGER
makes investigation history explicit

BRANCHING / DIVERGENCE
isolates competing strategies from the same STABLE base

COMPARATIVE GATE
compares eligible candidates by evidence

GILGAL GATE
controls promotion

GILGAL HISTORY
records what happened
```

## Core Sentinel invariant

> **A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.**

Combined with the GILGAL invariant:

> **A failed experiment must not destroy the last known-good state.**

And the Failure Memory invariant:

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

And the Evidence Sufficiency invariant:

> **A hypothesis can never be more verified than its weakest required evidence.**
