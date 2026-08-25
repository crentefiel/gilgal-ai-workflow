# GILGAL SENTINEL

GILGAL protocol version: **0.2.0**

Reference implementation version: **0.1.0**

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

## Position in the workflow

```text
STABLE
  ↓
WORK / CANDIDATE
  ↓
GILGAL SENTINEL
  ├── code checks
  ├── automated tests
  ├── regression comparison
  ├── runtime checks
  └── human-only checks
  ↓
GILGAL GATE
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

CODE CHECK
status:

AUTOMATED TEST
status:

REGRESSION CHECK
status:
regressions found:

RUNTIME CHECK
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

However, a numeric score MUST NOT override a failed critical contract.

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
- manual approvals.

## Relationship between components

```text
GILGAL
protects the last known-good code

GILGAL SENTINEL
verifies the candidate and searches for regressions

GILGAL GATE
controls promotion

GILGAL HISTORY
records what happened
```

## Core Sentinel invariant

> **A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.**

Combined with the GILGAL invariant:

> **A failed experiment must not destroy the last known-good state.**
