# Changelog

All notable changes to the GILGAL concept/specification will be documented here.

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
