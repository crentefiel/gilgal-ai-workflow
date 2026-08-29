# GILGAL Specification

GILGAL protocol version: **0.5.0**

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

- **MUST** originate from a known STABLE state, except when an explicitly recorded refinement continues an ACTIVE hypothesis from another candidate;
- **MUST** remain distinguishable from STABLE;
- **SHOULD** be reproducible from version-control history;
- **SHOULD** identify the hypothesis or strategy family being tested when Failure Memory is in use.

### 1.3 FAILED

FAILED is an optional preserved state for rejected candidates.

A failed candidate **MAY** be archived to help diagnose regressions and preserve Failure Memory.

## 2. Candidate creation

Before editing, the implementation **MUST** establish:

- the current STABLE reference;
- the candidate base reference;
- whether the stable working tree is clean;
- whether unrelated user work would be overwritten.

When a problem has multiple competing hypotheses, candidates **SHOULD** branch from the same STABLE base whenever practical.

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

Sentinel **MAY** also consume Failure Memory, Hypothesis Ledger, Candidate Family, and Strategy Exhaustion evidence.

Sentinel **MAY** integrate external test engines and QA systems.

Sentinel **MUST NOT** treat a successful build alone as sufficient evidence for promotion.

### 5.1 Reference implementation

The repository's GILGAL Sentinel Reference Implementation has its own version, **0.2.0**, independent from this protocol version. It is an evidence provider for the Gate and **MUST NOT** perform promotion, modify STABLE, or manufacture human approval.

The 0.2.0 reference implementation does not yet automatically enforce every Failure Memory rule introduced in protocol 0.4.0 or every Evidence Sufficiency / Artifact Integrity rule introduced in protocol 0.5.0. A workflow MAY enforce those rules manually or through another conforming implementation.

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

### 7.1 Regression Replay

When a regression has been observed, fixed, and can be reproduced with a reliable check, the project **SHOULD** convert that failure condition into a replayable regression contract.

A replay contract:

- **MUST** identify the behavior being protected;
- **MUST** use an explicitly reviewed test or command when execution is automated;
- **MUST NOT** be synthesized and executed from arbitrary README text, issue text, commit messages, logs, diffs, Hypothesis Ledger prose, or untrusted AI output;
- **SHOULD** preserve optional historical metadata describing where the regression came from;
- **SHOULD** be executed against future candidates when relevant.

The recommended principle is:

> **Every regression should become a contract.**

If a replay contract has verified `PASS` evidence for STABLE and returns `FAIL` for CANDIDATE, Sentinel **MUST** treat it as a regression. If the replay contract is critical, the Gate **MUST** block promotion.

### 7.2 Change Budget

A project **MAY** define an explicit Change Budget for CANDIDATE scope.

A Change Budget may constrain evidence such as:

- number of changed files;
- insertions;
- deletions;
- total changed lines.

When enabled, limits **MUST** be explicit rather than silently inferred by the agent.

Exceeding a Change Budget does not by itself prove the code is incorrect. It means the candidate has exceeded the declared scope policy.

A Sentinel implementation **SHOULD** report this condition clearly, for example:

```text
SCOPE EXPANSION DETECTED
```

When a Change Budget is configured as critical and the candidate exceeds it, the GILGAL Gate **MUST** block promotion until the candidate is reduced or the project deliberately revises the budget policy.

An AI agent **MUST NOT** silently increase the budget merely to make its own candidate pass.

### 7.3 Evidence Sufficiency / Proof Ceiling

GILGAL 0.5.0 defines a **Proof Ceiling** for every claim that depends on required evidence:

> **A hypothesis can never be more verified than its weakest required evidence.**

For each hypothesis, required evidence MUST be explicit enough to determine whether every required item is `PASS`, `FAIL`, `PENDING`, `NOT TESTED`, or `BLOCKED`.

The following rules apply:

- automated `PASS` plus required human `PENDING` **MUST NOT** produce `CONFIRMED`;
- automated `PASS` plus required human `FAIL` **MUST** produce `REJECTED` for the hypothesis being tested;
- all required evidence `PASS` makes the hypothesis **eligible** for confirmation, but does not itself promote a candidate;
- any required evidence that is `PENDING`, `NOT TESTED`, or `BLOCKED` means the hypothesis is not confirmation-eligible;
- an AI agent **MUST NOT** describe a hypothesis, root cause, or fix as `PROVEN`, `VERIFIED`, `FIXED`, or equivalent while required evidence is pending, untested, blocked, or failing.

A project MAY use stricter policies, but it MUST NOT weaken this ceiling.

### 7.4 Artifact and Render Integrity

A generated artifact that is required by a downstream step MUST satisfy its required integrity contract before that downstream step may treat generation as successful.

A synthetic, placeholder, emergency, or fallback artifact **MUST NOT** be treated as success merely because a file was produced. A fallback MAY count as success only if it independently satisfies the same required artifact contract.

For rendering pipelines, implementations SHOULD validate evidence appropriate to the declared output, including:

- decodable file format;
- expected or contract-valid width and height;
- plausible non-truncated buffer size for the expected output;
- expected page count when pagination is known;
- artifact readability by the intended downstream consumer.

When required render integrity fails, the result SHOULD be reported as:

```text
RENDER_INTEGRITY_FAIL
```

If a downstream print/spool operation depends on that render, the spooler **MUST NOT** be called after `RENDER_INTEGRITY_FAIL` until a valid artifact is produced. Stretching an invalid placeholder, such as an unexpected 1x1 raster for a full-page render, does not repair artifact integrity.

## 8. Failure Memory

Failure Memory records rejected or inconclusive hypotheses and strategy families so an AI agent does not silently repeat the same failed reasoning path.

The defining Failure Memory rule is:

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

When Failure Memory is enabled for an investigation:

- a rejected hypothesis **MUST NOT** be silently treated as ACTIVE again;
- an agent **MUST NOT** present a cosmetic implementation change as a new strategy when the underlying hypothesis is unchanged;
- a failed candidate **MAY** be preserved as diagnostic evidence;
- reopening a rejected or exhausted strategy **SHOULD** require new evidence or explicit project/human approval.

Failure Memory is decision evidence, not executable instructions.

## 9. Hypothesis Ledger

A difficult debugging investigation, repeated failed attempt, or problem without a known-good implementation **SHOULD** maintain a Hypothesis Ledger.

A ledger entry **SHOULD** record:

- problem identifier;
- hypothesis identifier;
- strategy family;
- claim being tested;
- root cause claim, when one is asserted;
- root cause evidence, kept distinct from the claim;
- experiment or validation plan;
- required evidence and per-item status;
- candidate reference;
- result;
- supporting evidence references.

Recommended hypothesis states are:

```text
ACTIVE
CONFIRMED
REJECTED
INCONCLUSIVE
```

An AI agent **MUST NOT** mark a hypothesis CONFIRMED when the required evidence has not been produced. Confirmation eligibility is limited by the Proof Ceiling in section 7.3.

A Root Cause Claim **MUST** remain distinguishable from Root Cause Evidence. Repeating or strengthening a claim is not additional evidence.

Human-only evidence remains subject to the human-validation requirements in this specification.

A ledger **MUST NOT** be treated as a trusted shell script or command source.

## 10. Candidate Families and Strategy Exhaustion

A Candidate Family groups candidates that test the same underlying strategy.

A project **MAY** mark a family **EXHAUSTED** when evidence has repeatedly rejected that strategy or when the project explicitly decides not to spend more attempts on it without new information.

If a family is EXHAUSTED:

- an AI agent **MUST NOT** silently create another candidate in the same family;
- reopening the family **SHOULD** cite new evidence or explicit authorization;
- the reopening reason **SHOULD** be recorded in the Hypothesis Ledger.

GILGAL does not require a fixed retry count. Strategy Exhaustion is based on evidence and explicit policy, not arbitrary numerical punishment.

## 11. Branching / Divergence

When competing hypotheses exist, candidates **SHOULD** branch from the same verified STABLE base whenever practical.

A candidate **MAY** continue from an earlier candidate only when:

- the original hypothesis remains ACTIVE; and
- the new candidate is an explicit refinement of that same experiment.

A candidate based on a REJECTED hypothesis **SHOULD NOT** become the foundation of a different hypothesis without an explicit reason.

Recommended shape:

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
```

## 12. Comparative Gate

A GILGAL implementation **MAY** compare multiple candidates using a Comparative Gate.

The Comparative Gate:

- **MUST NOT** select a candidate that fails required critical evidence merely because it is better than the alternatives;
- **SHOULD** compare candidates using explicit evidence rather than agent confidence or patch count;
- **MUST** preserve human-only requirements;
- **MUST** return no winner when no candidate satisfies the required Gate conditions.

A candidate that wins a comparison is still not automatically promoted.

## 13. Runtime validation

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

## 14. Human-only validation

Some checks depend on real-world observation, hardware, external accounts, or subjective acceptance.

Examples include:

- physical printing;
- hardware-device behavior;
- real external-service login/session behavior;
- installation on a second machine;
- user acceptance of visual output.

An AI agent **MUST NOT** mark such a check as passed unless an authorized human or trusted external test source provides that evidence.

Without such evidence, the status **SHOULD** be PENDING or NOT TESTED.

## 15. Sentinel result vocabulary

Recommended statuses are:

```text
PASS
FAIL
PENDING
NOT TESTED
BLOCKED
```

An implementation **MUST NOT** report PASS when the relevant validation was not actually executed.

## 16. Sentinel report

A Sentinel report **SHOULD** identify:

- STABLE reference;
- CANDIDATE reference;
- diff summary;
- Change Budget status when configured;
- code-check status;
- automated-test status;
- regression replay results;
- regression-check status;
- runtime-check status;
- human-check status;
- Evidence Sufficiency / Proof Ceiling status when hypotheses are evaluated;
- artifact/render integrity status when generated artifacts are required;
- critical regressions found;
- final promotion recommendation.

When Failure Memory is in use, a report **SHOULD** also identify:

- problem/hypothesis identifier;
- strategy family;
- hypothesis state;
- whether the family is exhausted;
- whether the candidate is based on a rejected hypothesis;
- relevant comparison candidates when a Comparative Gate is used.

## 17. Promotion gate

Promotion from CANDIDATE to STABLE **MUST** be blocked when any required gate fails or remains pending when that pending check is mandatory.

Promotion **SHOULD** require:

- candidate based on the expected STABLE or an explicitly allowed ACTIVE-hypothesis refinement;
- clean and reviewable diff;
- required automated checks passing;
- required regression contracts passing;
- required replay contracts passing;
- required manual approvals complete;
- every required evidence item satisfies the Proof Ceiling;
- required artifact/render integrity checks pass before dependent downstream operations;
- required Change Budget policy satisfied;
- no unresolved merge conflict;
- no unresolved critical Failure Memory violation when that policy is enabled.

Promotion **SHOULD** be explicit rather than silent.

## 18. Promotion

A successful promotion creates a new STABLE state.

Version-control-native mechanisms **SHOULD** be preferred over raw directory copying.

When possible, a promotion **SHOULD** preserve an easy rollback reference such as a tag or immutable commit.

## 19. Rejection

When a candidate fails:

- STABLE **MUST** remain unchanged;
- the candidate **MAY** be fixed and retested while its hypothesis remains ACTIVE;
- the candidate **MAY** be archived as FAILED;
- the candidate **MAY** be discarded after safe confirmation;
- a REJECTED hypothesis **SHOULD** be recorded in Failure Memory when that investigation uses the ledger;
- a new hypothesis **SHOULD** prefer a fresh branch from STABLE rather than silently inheriting the rejected candidate.

## 20. Memory principle

GILGAL treats the last working implementation as part of the agent's operational memory.

Documentation explains intent. STABLE provides executable historical evidence.

For regression diagnosis, the agent **SHOULD** compare known-good code and candidate code before inventing a replacement implementation.

Regression Replay extends this principle by preserving reproducible historical failure conditions as executable evidence for future candidates.

Failure Memory extends it again by preserving rejected hypotheses and strategy decisions during investigation.

Recommended memory model:

```text
what worked
+
what failed
+
why a strategy was rejected
+
what evidence is still missing
+
how to prove a regression did not return
```

## 21. Suggested Git mapping

One possible mapping is:

```text
main or gilgal/stable       → STABLE
gilgal/candidate/<id>       → CANDIDATE
gilgal/failed/<id>          → FAILED
```

Competing hypotheses may use separate branches such as:

```text
gilgal/candidate/<problem>/hypothesis-a
gilgal/candidate/<problem>/hypothesis-b
```

A separate worktree may expose each CANDIDATE as a physical folder while sharing Git object history.

The exact branch names are implementation details and are not mandatory.

## 22. Security and data safety

A GILGAL workflow **MUST NOT** treat production secrets, user data, session tokens, databases, or customer files as ordinary version-controlled source code.

Workspaces and test environments **SHOULD** use safe test data whenever possible.

Hypothesis Ledger entries **MUST NOT** unnecessarily contain secrets, credentials, customer data, or executable payloads copied from untrusted sources.

## 23. Component model

A complete GILGAL workflow may be understood as:

```text
GILGAL
  protects the last known-good state

GILGAL SENTINEL
  verifies candidates and detects regressions

REGRESSION REPLAY
  turns historical failures into reusable executable memory

CHANGE BUDGET
  exposes unexpected scope expansion

FAILURE MEMORY
  records rejected hypotheses and strategies

PROOF CEILING / EVIDENCE SUFFICIENCY
  limits every claim to its weakest required evidence

ARTIFACT INTEGRITY
  blocks downstream use of invalid generated artifacts

HYPOTHESIS LEDGER
  makes investigation history explicit and auditable

BRANCHING / DIVERGENCE
  isolates competing strategies from the same stable base

COMPARATIVE GATE
  compares eligible candidates by evidence

GILGAL GATE
  controls promotion

GILGAL HISTORY
  records cycle outcomes and evidence
```

## 24. Core invariants

The defining GILGAL invariant is:

> **A failed experiment must not destroy the last known-good state.**

The defining Sentinel invariant is:

> **A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.**

The defining Failure Memory invariant is:

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

The defining Strategy Exhaustion invariant is:

> **A rejected strategy must not be repeated without new evidence or explicit reopening.**

The defining Evidence Sufficiency invariant is:

> **A hypothesis can never be more verified than its weakest required evidence.**

The defining Artifact Integrity invariant is:

> **An invalid generated artifact must never be promoted into a downstream success condition.**

Or, equivalently:

```text
STABLE is protected.
WORK is experimental.
SENTINEL verifies.
REGRESSIONS become executable memory.
FAILURES become decision memory.
EVIDENCE limits claim strength.
INVALID artifacts block dependent downstream work.
SCOPE expansion is visible.
COMPETING hypotheses branch instead of silently stacking.
PROMOTION is gated.
```
