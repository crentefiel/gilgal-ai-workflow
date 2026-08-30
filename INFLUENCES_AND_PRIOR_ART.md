# Influences and Prior Art

GILGAL is a protocol synthesis. It does not claim to have invented version control, protected branches, continuous integration, regression testing, agent memory, patch transplantation, policy-as-code, software product lines, provenance attestations, or observability.

Its contribution is the specific combination of those ideas into a guarded, capability-aware workflow for AI coding agents.

**Concept synthesis documented by:** David Ferreira ([@crentefiel](https://github.com/crentefiel))

## Influence map

| Existing technology or research | Idea that influenced GILGAL | GILGAL-specific extension |
|---|---|---|
| Git branches and worktrees | Isolated development states | STABLE is protected evidence memory; WORK is the laboratory |
| Git cherry-pick and rerere | Selective replay and reuse of prior resolutions | Capability Transplant with provenance, scope contamination and preservation contracts |
| GitHub protected branches and required checks | Promotion can be blocked by mandatory checks | Capability-aware Gate, Proof Debt, human-only evidence and `NO_WINNER` |
| GitHub merge queue | Re-test a candidate against the current base | Reconciliation Candidate reconstructed from the exact STABLE SHA |
| Continuous Integration | Automated build, test and validation before integration | Automated evidence is necessary but cannot replace physical or human evidence |
| Regression testing | Preserve previously verified behavior | Regression Replay and capability-level Preservation Baseline |
| Software Product Lines and feature models | Model features, dependencies and variant-specific tests | Capability Ledger, Ownership Map and transitive retest set |
| Branch by Abstraction / incremental replacement | Replace one subsystem while preserving operations | Capability Transplant constrained by evidence and mandatory known-good behavior |
| Reflexion and experiential agent learning | Remember failed attempts to guide later trials | Failure Memory tied to hypotheses, candidate SHAs, evidence and strategy exhaustion |
| SWE-agent and software engineering agents | Agents edit repositories and execute tests | Guardrails governing isolation, proof, physical side effects and promotion |
| Automated Patch Transplantation / TransplantFix | Adapt and reuse verified patches | Transplant a behaviorally verified capability, not merely a syntactic patch |
| Open Policy Agent | Policy decisions can be expressed and tested as code | Independent GILGAL Capability Gate |
| CUE | Structured evidence can be validated by constraints | Schemas for Ledgers, Proof Debt, evidence and Transplant Manifests |
| SLSA, in-toto and Sigstore | Artifacts can carry verifiable build provenance | Evidence identity binds packaged outputs to candidate SHA and environment |
| OpenTelemetry | Traces, metrics and logs can describe runtime behavior | Evidence Lineage from input through transformation to observed output |
| Reproducible-build systems such as Nix | Isolated builds, declared inputs and rollback | Environment Fingerprint and artifact reproducibility evidence |

## Direct references

### Version control and protected integration

- Git worktree: https://git-scm.com/docs/git-worktree
- Git cherry-pick: https://git-scm.com/docs/git-cherry-pick
- Git rerere: https://git-scm.com/docs/git-rerere
- GitHub protected branches: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches
- GitHub merge queue: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

### Incremental change and regression preservation

- Continuous Integration and Branch by Abstraction: https://martinfowler.com/articles/continuousIntegration.html
- Software Product Line testing review: https://link.springer.com/article/10.1007/s10664-024-10516-x

### Agent learning and software agents

- Reflexion: Language Agents with Verbal Reinforcement Learning: https://arxiv.org/abs/2303.11366
- ExpeL: LLM Agents Are Experiential Learners: https://arxiv.org/abs/2308.10144
- SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering: https://arxiv.org/abs/2405.15793

### Patch transplantation

- Automated Patch Transplantation: https://rshariffdeen.com/paper/TOSEM21.pdf
- TransplantFix: https://dl.acm.org/doi/10.1145/3551349.3556893

### Executable policy, evidence and provenance

- Open Policy Agent: https://openpolicyagent.org/docs
- CUE language specification: https://cuelang.org/docs/reference/spec/
- SLSA Provenance: https://slsa.dev/provenance/v1
- in-toto: https://in-toto.io/
- Sigstore: https://www.sigstore.dev/
- OpenTelemetry: https://opentelemetry.io/docs/
- Nix: https://nixos.org/guides/how-nix-works/

## Distinction

The mechanisms above generally solve one part of the problem:

- isolate changes;
- block merges;
- execute tests;
- remember failed trials;
- transplant patches;
- validate policy;
- attest artifacts;
- trace runtime behavior.

GILGAL combines them around a different governing question:

> Did this exact candidate preserve every mandatory capability already proven in STABLE, improve the target capability with evidence strong enough for its claim, avoid prohibited side effects, and remain traceable to the correct source and environment?

GILGAL adds a unified vocabulary and decision model:

- Executable Memory;
- Failure Memory;
- Evidence Integrity;
- Proof Ceiling and Proof Debt;
- Capability Ledger and Defect Ledger;
- Preservation Baseline and Contracts;
- Regression Quarantine;
- Composite `NO_WINNER`;
- Reconciliation Candidate;
- Capability Transplant;
- Scope Contamination;
- Side-Effect Firewall;
- Output Fidelity Gate;
- mandatory human evidence for physical or real-world behavior.

## Novelty statement

This repository does not claim patent status or worldwide novelty.

The project should describe GILGAL as an original protocol synthesis unless and until a systematic academic, product and patent review supports a stronger claim. Discovering additional prior art should result in this document being expanded, not hidden.
