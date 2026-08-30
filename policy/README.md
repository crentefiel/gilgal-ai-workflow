# GILGAL Evidence & Policy Engine — Prototype 0.1

This directory contains an executable prototype for the capability-aware GILGAL 0.5 proposal.

## Status

- **PROPOSED:** full GILGAL 0.5 protocol.
- **PROTOTYPED:** CUE schemas, OPA Gate, contract tests and CI validation.
- **NOT YET IMPLEMENTED:** automatic Sentinel integration, dependency-graph blast radius, OpenTelemetry ingestion and Windows application attestation.
- **NOT PROMOTED:** this prototype does not make GILGAL 0.5 or Sentinel 0.3 STABLE.

## Layout

```text
policy/
  cue/gilgal.cue
  opa/gilgal_gate.rego
  opa/gilgal_gate_test.rego
  examples/lan-house-gate-input.json
```

## CUE validation

The CUE schema validates:

- SHA formats;
- Capability Ledger records;
- evidence type and integrity;
- Environment Fingerprint;
- Proof Debt;
- Transplant Manifest;
- scope and side-effect declarations.

```bash
cue vet -c policy/cue/gilgal.cue \
  policy/examples/lan-house-gate-input.json \
  -d '#GateInput'
```

## OPA Gate

The OPA policy can return:

- `PROMOTABLE`;
- `BLOCKED`;
- `PENDING_HUMAN_EVIDENCE`;
- `REGRESSION_QUARANTINE`;
- `NO_WINNER`.

The decision order intentionally gives mandatory known-good regressions the strongest practical priority. A target improvement cannot cancel a regression.

```bash
opa test policy/opa -v

opa eval \
  --data policy/opa/gilgal_gate.rego \
  --input policy/examples/lan-house-gate-input.json \
  data.gilgal.gate.decision
```

The LAN House fixture should enter `REGRESSION_QUARANTINE` because WhatsApp changed from known-good to failure. Artifact provenance and the human physical content retest remain separate proof debts.

## Artifact provenance

The manual `Sentinel Attested Build` workflow:

1. checks out an exact Git SHA;
2. installs locked dependencies;
3. runs typecheck, tests and build;
4. creates a Sentinel package;
5. records SHA-256 checksums;
6. generates a GitHub build provenance attestation;
7. uploads the package and checksum file.

Verification example:

```bash
gh attestation verify path/to/package.tgz \
  -R crentefiel/gilgal-ai-workflow
```

This workflow proves the origin of the Sentinel package it builds. It does **not** prove the origin of a LAN House Windows executable built elsewhere.

## Security model

- AI-generated evidence cannot self-approve a human-only Gate.
- Synthetic evidence cannot satisfy packaged, physical or human output.
- An open critical Proof Debt blocks promotion.
- Automated physical side effects block promotion.
- A mandatory known-good regression enters quarantine.
- Policies and schemas are version-controlled and independently testable.

## Toolchain note

The GitHub Actions setup actions are pinned, while the CUE and OPA binary inputs currently use `latest`. Before protocol promotion, binary versions and ideally action commit SHAs should be pinned to remove this reproducibility debt.
