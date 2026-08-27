# GILGAL Failure Memory and Hypothesis Ledger

GILGAL protocol version: **0.4.0**

**Concept documented by:** David Ferreira ([@crentefiel](https://github.com/crentefiel))  
**Part of:** GILGAL

## Why this exists

Protecting STABLE prevents a failed AI experiment from destroying the last known-good version. That is necessary, but it is not sufficient.

An AI agent can still become trapped inside one bad strategy:

```text
STABLE
  ↓
WORK attempt 1
  ↓
WORK attempt 2 based on attempt 1
  ↓
WORK attempt 3 based on attempt 2
  ↓
more patches, same underlying hypothesis
```

If the first hypothesis was wrong, later attempts may inherit its assumptions and accumulate workarounds.

GILGAL 0.4.0 adds **Failure Memory**, **Hypothesis Ledger**, **Candidate Families**, **Strategy Exhaustion**, and **Branching / Comparative Gate** to make that failure mode visible.

## Failure Memory

Executable Memory remembers verified working behavior.

Failure Memory remembers rejected or inconclusive reasoning paths so they are not silently repeated.

> **Executable Memory remembers what worked. Failure Memory remembers what must not be repeated.**

Failure Memory does not mean that an old failed candidate can never be inspected or reused. It means that failed assumptions must stay explicit.

A failed hypothesis **MUST NOT** silently become the foundation of the next hypothesis.

## Hypothesis Ledger

For difficult debugging, repeated failures, or problems without a known-good implementation, a GILGAL workflow SHOULD keep a Hypothesis Ledger.

A ledger entry SHOULD record at least:

```text
problem id
hypothesis id
strategy family
claim
experiment
required evidence
candidate reference
result
supporting evidence
```

Recommended hypothesis states:

```text
ACTIVE
CONFIRMED
REJECTED
INCONCLUSIVE
```

Example:

```text
PROBLEM: PRINT-DUPLEX

HYPOTHESIS: DUPLEX-A
FAMILY: chromium-silent-print
CLAIM: Electron silent printing loses duplex at the Windows boundary.
EXPERIMENT: Compare silent Electron, dialog Electron, and native Windows output.
REQUIRED EVIDENCE: Two-page document produces one physical duplex sheet.
RESULT: REJECTED / CONFIRMED / INCONCLUSIVE
```

The ledger is evidence metadata. It MUST NOT be treated as executable instructions. A Sentinel or agent MUST NOT synthesize shell commands from arbitrary ledger prose.

## Candidate Families

A Candidate Family groups candidates that test the same underlying strategy.

Example:

```text
FAMILY: chromium-print
  A1: duplexMode only
  A2: duplexMode + PDF hint
  A3: driver preference synchronization

FAMILY: windows-native-print
  B1: native spooler adapter
  B2: validated DEVMODE / PrintTicket path
```

This prevents cosmetic implementation changes from being mistaken for genuinely different hypotheses.

## Strategy Exhaustion

A strategy family MAY be marked **EXHAUSTED** when repeated evidence rejects the same underlying approach or when the project explicitly concludes that the family should not receive another candidate without new evidence.

Recommended rule:

> **A rejected strategy must not receive another candidate merely by renaming the implementation.**

If a family is EXHAUSTED:

- an AI agent MUST NOT silently create another candidate in that family;
- reopening the family SHOULD require new evidence or explicit human/project approval;
- the reason for reopening SHOULD be recorded in the Hypothesis Ledger.

This is not a fixed retry counter. The important distinction is whether there is a genuinely new hypothesis or evidence.

## Branching rule

When competing hypotheses exist, candidates SHOULD branch from the same verified STABLE base whenever practical:

```text
                    STABLE
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   CANDIDATE A   CANDIDATE B   CANDIDATE C
   strategy A    strategy B    strategy C
        │             │             │
     Sentinel      Sentinel      Sentinel
        └─────────────┼─────────────┘
                      │
              COMPARATIVE GATE
                      │
               best verified path
                      │
                  HUMAN CHECK
                      │
                  NEW STABLE
```

A new hypothesis SHOULD NOT inherit a rejected candidate as its base merely because that candidate is convenient.

A refinement MAY continue from an earlier candidate when the original hypothesis is still ACTIVE and the refinement is explicitly part of the same experiment. If the hypothesis has been REJECTED, continuing from it requires an explicit reason.

## Comparative Gate

When multiple candidates test different hypotheses, GILGAL MAY use a Comparative Gate.

The Comparative Gate compares evidence across candidates. It does not select the "least bad" candidate.

Rules:

- each candidate MUST remain independently auditable;
- each candidate MUST satisfy its own required Sentinel evidence;
- a critical failure in every candidate means no winner;
- human-only evidence remains human-only;
- READY is not equivalent to PROMOTED;
- promotion still requires an explicit decision.

## Relationship to FAILED

FAILED now carries two kinds of value:

```text
1. code/history for diagnosis
2. reasoning history for Failure Memory
```

Preserving a failed candidate can help answer not only "what code failed?" but also "which hypothesis was tested and what evidence rejected it?"

## Relationship to Regression Replay

Regression Replay protects known historical failures after a fix has been verified.

Failure Memory operates earlier, while the team is still discovering the correct fix.

```text
Failure Memory
  remembers rejected hypotheses during investigation

Regression Replay
  remembers reproducible failures after a fix is verified
```

Together they create a fuller memory model:

```text
what worked
+
what failed
+
why a strategy was rejected
+
how to prove a regression did not return
```

## Core invariants added in 0.4.0

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

> **A rejected strategy must not be repeated without new evidence or explicit reopening.**

> **Parallel candidates must compete on evidence, not on patch count or agent confidence.**

These rules extend the original invariant:

> **A failed experiment must not destroy the last known-good state.**
