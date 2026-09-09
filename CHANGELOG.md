# Changelog

All notable changes to the GILGAL concept/specification will be documented here.

## Simplified Core — 2026-09-09

Refined the current GILGAL architecture to reduce operational ceremony while preserving the protocol's trust guarantees.

### Current core

The daily protocol is now expressed through four responsibilities:

```text
CONTRACTS
  what must not break

MEMORY
  what the project already learned

CHECK
  what the exact candidate actually proved

PROMOTE
  refuses promotion until all required evidence is complete and current
```

### Changed

- Risk is now explicitly derived from the **product contracts affected by the diff**, not line count or agent-declared scope.
- Added the recommended `contract → paths → risk → automated checks → human checks` mapping.
- Defined S/M/L as the operational risk model, with risk L requiring human checks declared by the contract.
- Clarified that **Gate may be implemented as `promote` refusal logic** rather than a standalone service.
- Reframed Sentinel as a verification/evidence function that may run inside `check`; a permanent Sentinel process is not required by the minimal protocol.
- Folded the active hypothesis into candidate state; a separate Hypothesis Ledger is now optional rather than part of the minimal core.
- Simplified Failure Memory to `REJECTED`, `DEFERRED`, and `EXHAUSTED`, with explicit `reopenWhen` criteria.
- Clarified that `EXHAUSTED` means “do not repeat without new evidence or explicit reopening”, not “forbidden forever”.
- Kept SHA-bound evidence, but limited its meaning: the SHA proves which candidate the evidence belongs to, not that a physical/human observation truly happened.
- Reclassified Change Budget as optional/advisory scope evidence rather than a universal promotion gate.
- Made Comparative Gate and multi-candidate branching optional extensions, not requirements of the daily flow.
- Added explicit promotion freshness/idempotency requirements: candidate evidence must match the promoted SHA and silent AI rebases must not inherit stale evidence.
- Added a minimal machine-readable model under `examples/minimal/.gilgal/`.
- Removed visible protocol-version ceremony from the recommended operator workflow; historical 0.x documents remain as evolution records.

### Operational rule

> **WORK may say “finished”. Only GILGAL may say “passed”.**

### Normative rule

> **No actor declares that the product works. The contract does — and for risk L the contract includes a human check.**

## 0.5.0 — 2026-09-02

Formalized **Success-Only Promotion** as a normative GILGAL protocol rule.

### Core principle

> **The success becomes product. The failure becomes knowledge.**

Portuguese formulation:

> **O acerto vira produto. O erro vira conhecimento.**

### Added

- **Success-Only Promotion**: only verified and approved implementation belongs in STABLE.
- Explicit separation between **Product / Executable Memory** and **Investigation Memory**.
- Failed or rejected implementation must not be promoted merely to preserve history.
- Failure Memory preserves rejected, deferred, or inconclusive reasoning and supporting evidence.
- Regression Replay remains the executable protection against reproducible historical failures.
- `DEFERRED` is distinguished from `REJECTED`: deferred work is intentionally outside the current product scope but may be reopened later with appropriate context/evidence.
- Agents should consult Failure Memory / Hypothesis Ledger before repeating a previously investigated strategy.
- Reuse of a rejected or exhausted strategy without new evidence should be reported as `REJECTED STRATEGY REUSE DETECTED`.
- Renaming files, classes, branches, or applying cosmetic implementation changes does not make an underlying rejected strategy new.
- Promotion reports should distinguish what becomes active product code from what remains investigation knowledge.

### Memory model

```text
STABLE
  verified and approved implementation only

FAILURE MEMORY
  rejected/deferred/inconclusive reasoning and evidence

REGRESSION REPLAY
  executable protection against known reproducible failures
```

### Reference implementation note

The GILGAL Sentinel reference implementation remains at **0.2.0**. Protocol version and Sentinel implementation version remain independent. Sentinel 0.2.0 does not yet automatically enforce every Success-Only Promotion rule introduced by protocol 0.5.0.

## 0.4.0 — 2026-08-27

Extended the GILGAL protocol with **Failure Memory**, **Hypothesis Ledger**, **Candidate Families**, **Strategy Exhaustion**, **Branching / Divergence**, and **Comparative Gate**.

### Motivation

Protecting STABLE prevents a failed experiment from destroying the last known-good version, but an AI agent can still become trapped in one bad strategy by repeatedly patching the same WORK lineage.

GILGAL 0.4.0 addresses that second failure mode.

### Added

- **Failure Memory** as auditable memory of rejected or inconclusive hypotheses.
- **Hypothesis Ledger** for recording problem, hypothesis, strategy family, experiment, required evidence, candidate reference, result, and evidence.
- **Candidate Families** to distinguish genuinely different strategies from cosmetic variations of the same approach.
- **Strategy Exhaustion** so a rejected strategy cannot be silently repeated without new evidence or explicit reopening.
- **Branching / Divergence** recommendation: competing hypotheses should branch from the same STABLE base whenever practical.
- **Comparative Gate** for comparing independently verified candidates without selecting a candidate that still fails critical evidence.
- Explicit relationship between Failure Memory and Regression Replay.

### New invariants

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

> **A rejected strategy must not be repeated without new evidence or explicit reopening.**

> **Parallel candidates must compete on evidence, not on patch count or agent confidence.**

### Memory model

```text
Executable Memory
  remembers what worked

Regression Replay
  remembers reproducible historical regressions

Failure Memory
  remembers rejected hypotheses and strategies
```

### Reference implementation note

The GILGAL Sentinel reference implementation remains at **0.2.0** in this protocol release. It does not yet automatically enforce every Failure Memory rule from protocol 0.4.0. Protocol version and implementation version remain independent.

## GILGAL Sentinel reference implementation 0.2.0 — 2026-08-26

This implementation version is independent from the GILGAL protocol version.

### Added

- **Change Budget** check with explicit limits for changed files, insertions, deletions, and total changed lines.
- `SCOPE EXPANSION DETECTED` failure evidence when a configured budget is exceeded.
- `replay` contract type for previously fixed regressions.
- Optional replay metadata through `origin` and `description`.
- Dedicated Regression Replay summary in JSON and Markdown reports.
- Unit/integration coverage for Change Budget and replay regressions.

### Safety rules

- Change Budget is disabled unless explicitly configured.
- An enabled budget requires at least one explicit limit.
- Sentinel does not silently enlarge the budget to make a candidate pass.
- Replay commands must be explicitly reviewed project commands; Sentinel does not execute commands synthesized from arbitrary text, logs, issues, diffs, or AI output.

## 0.3.0 — 2026-08-26

Extended the GILGAL protocol with **Regression Replay** and **Change Budget**.

### Added

- Principle: **Every regression should become a contract** when the old failure can be reproduced reliably.
- Regression Replay as executable memory of previously fixed failures.
- Change Budget as an explicit scope policy for AI-generated candidate changes.
- Rule that critical scope-budget violations block promotion until the candidate is reduced or policy is deliberately revised.
- Rule that an AI agent must not silently raise its own Change Budget to pass the Gate.
- Expanded Sentinel report model to include replay and scope evidence.

## GILGAL Sentinel reference implementation 0.1.0 — 2026-08-25

This implementation version is independent from the GILGAL protocol version.

### Added

- Node.js/TypeScript CLI with `check`, `status`, `report`, `approve`, `revoke`, and `reset`.
- Read-only Git ref, merge-base, ancestry, working-tree, and diff evidence.
- Generic shell-free command runner with timeout, cancellation, and bounded logs.
- Configured automated checks and `command`/`manual` contracts.
- SHA-bound local human approvals with stale-approval detection.
- Exact-STABLE-SHA baseline loading and critical regression detection.
- JSON/Markdown reports, CI exit codes, and READY/BLOCKED gate evaluation.
- Unit, integration, and Git read-only protection tests.
- Configuration/contracts/baseline versioning policy and local-state ignore policy.

## 0.2.0 — 2026-08-25

Introduced **GILGAL SENTINEL**, the verification and regression-detection layer.

### Added

- GILGAL Sentinel as the verification layer between CANDIDATE and the GILGAL Gate.
- Five verification classes: code checks, automated tests, regression checks, runtime checks, and human-only checks.
- Explicit STABLE-vs-CANDIDATE contract comparison.
- Rule that a critical regression must block promotion even if the overall score is high.
- Runtime evidence checks for crashes, loops, retries, timeouts, state-transition failures, and logs.
- Human-check rule: AI agents cannot self-approve physical or real-world validations.
- Tool-agnostic external QA integration model; Sentinel may consume results from TestSprite, Playwright, Vitest, Jest, pytest, CI systems, or other engines.
- Recommended Sentinel statuses: PASS, FAIL, PENDING, NOT TESTED, BLOCKED.
- Sentinel report model and component relationship: GILGAL → SENTINEL → GATE → HISTORY.

### Sentinel invariant

> A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.

## 0.1.0 — 2026-08-25

Initial public documentation of the GILGAL workflow.

### Added

- Public definition of GILGAL.
- Authorship record for David Ferreira / @crentefiel.
- Core STABLE → WORK/CANDIDATE → GILGAL GATE model.
- Protected last-known-good state principle.
- Regression-contract requirement.
- Human-only validation gate for real-world tests.
- Executable-memory principle: compare known-good STABLE against broken CANDIDATE.
- Initial normative specification.

### Core invariant

> A failed experiment must not destroy the last known-good state.
