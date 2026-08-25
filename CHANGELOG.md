# Changelog

All notable changes to the GILGAL concept/specification will be documented here.

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
