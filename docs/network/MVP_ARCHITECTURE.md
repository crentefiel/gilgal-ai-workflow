# GILGAL Network MVP Architecture

**Status:** Candidate foundation  
**Tracked by:** [Issue #6](https://github.com/crentefiel/gilgal-ai-workflow/issues/6)  
**Principle:** GILGAL supplies coordination and safety; participants supply agents and compute.

## 1. Purpose

GILGAL Network is an AI-native collaboration layer for software work. Humans and agents can publish problems, submit competing attempts, review evidence, preserve failed strategies, and make capability-aware decisions without requiring a permanent central agent server.

The MVP uses GitHub as the transport and durable record:

- Issues describe tasks.
- Branches and forks isolate attempts.
- Pull requests carry candidate changes.
- GitHub Actions validates records and runs policy.
- CUE validates structure.
- OPA produces Gate decisions.
- Humans retain authority over approvals, physical actions and promotion.

The MVP does not replace GitHub or host foundation models.

## 2. Trust boundaries

| Actor or component | May do | Must not be trusted to do alone |
|---|---|---|
| Human operator | Define task, authorize real-world actions, verify human evidence, approve promotion | Bypass recorded preservation contracts |
| Coding agent | Investigate, edit isolated code, test, propose evidence and open a PR | Approve its own evidence or promote a candidate |
| Reviewing agent | Analyze patches, challenge hypotheses and report defects | Manufacture human acceptance |
| GitHub Actions | Validate schemas, run reproducible checks and evaluate policy | Perform unapproved physical actions or merge automatically |
| GILGAL Gate | Produce a deterministic decision from recorded inputs | Treat unverified input claims as facts |
| External provider | Execute an agent or store a remote state | Prove a mutation succeeded without independent read-back |

## 3. Zero-server flow

1. A human creates a structured Task Contract.
2. A contributor claims the task without locking out competing attempts.
3. Each agent creates an isolated branch or fork from the declared STABLE reference.
4. The agent records its hypothesis before or with the attempt.
5. The candidate PR includes code plus an Agent Contribution Contract.
6. CI validates the records, runs relevant tests and evaluates the OPA Gate.
7. Reviewing humans or agents add review records and challenge unsupported claims.
8. The Gate returns one of the defined outcomes.
9. Failed or rejected strategies become Failure Memory.
10. Only a human-authorized workflow may promote a qualifying candidate.

## 4. Core record model

Every record has a schema version and stable identifier. Records supporting a decision must be bound to the exact candidate SHA and relevant environment.

| Record | Purpose | Required identity |
|---|---|---|
| Task | Problem, expected behavior, scope and evidence requirements | Task ID and STABLE SHA |
| Agent Attempt | Agent, hypothesis, strategy and changed scope | Attempt ID and candidate SHA |
| Capability Diff | Stable-to-candidate behavioral comparison | Capability IDs and candidate SHA |
| Evidence | Test or observation supporting a claim | Evidence ID, candidate SHA, environment and integrity |
| Failure Memory | Rejected hypothesis and reusable lesson | Attempt reference and evidence |
| Review | Findings and disposition from a human or agent | Reviewer identity and reviewed SHA |
| Gate Decision | Deterministic policy result | Policy version, input digest and candidate SHA |

## 5. Capability decisions

A candidate is not globally “better” merely because some tests pass.

The preservation rule is:

```text
NewStableKnownGood ⊇ OldStableKnownGood
TargetCapability(candidate) > TargetCapability(stable)
```

Required behavior:

- A mandatory known-good regression produces `REGRESSION_QUARANTINE`.
- Missing required human proof produces `PENDING_HUMAN_EVIDENCE`.
- Invalid evidence identity or critical proof debt produces `BLOCKED`.
- No proven target improvement produces `NO_WINNER`.
- A candidate becomes `PROMOTABLE` only when preservation and improvement are derived from verified capability evidence.
- `PROMOTABLE` does not mean merged or promoted.

## 6. Evidence integrity

Evidence is usable only when all applicable bindings are valid:

- exact candidate commit SHA;
- artifact digest when an artifact is tested;
- environment fingerprint;
- evidence kind and integrity;
- source reference;
- human identity for human-only claims;
- policy and schema version.

A top-level boolean must never replace derivation from evidence records.

Synthetic evidence cannot satisfy packaged, physical or human output. An AI-generated boolean cannot authenticate a human decision.

## 7. External state confirmation

Important external operations follow:

```text
INTENT → MUTATION → INDEPENDENT READ → EXPECTED STATE CONFIRMED
```

Mutation acknowledgement is not state evidence. A system must distinguish:

- `MUTATION_CONFIRMED`;
- `MUTATION_REJECTED`;
- `MUTATION_ACKNOWLEDGED_STATE_UNCONFIRMED`.

This applies to GitHub state, deployments, databases, messages, payments and other remote systems.

## 8. Bring Your Own Agent

The MVP is provider-neutral. A participant may use Codex, another hosted model, a local model or manual development.

An adapter needs only to:

1. read the Task Contract;
2. work in an isolated Git branch or fork;
3. produce the required contribution record;
4. attach evidence references without secrets;
5. open or update a pull request.

API keys remain in the participant's environment. They are never committed, placed in issue text or uploaded as evidence.

## 9. GitHub implementation

Initial repository interfaces:

- `.github/ISSUE_TEMPLATE/gilgal-task.yml` — Task Contract;
- `.github/PULL_REQUEST_TEMPLATE/agent-contribution.md` — contribution checklist;
- future `network/schemas/` — versioned CUE/JSON records;
- future `.github/workflows/gilgal-network-validate.yml` — validation and policy summary.

Workflows use least-privilege permissions. The first implementation is read-only except where a later reviewed design explicitly permits a PR comment. It never approves, merges or performs physical actions.

## 10. Threat model

The MVP must defend against:

- fabricated or stale evidence;
- evidence copied from another candidate;
- agent self-approval;
- prompt injection in issues or repository content;
- secret exfiltration;
- malicious workflow changes;
- dependency and action supply-chain drift;
- scope contamination;
- test bypass;
- hidden capability regression;
- race conditions between a validated SHA and a later candidate SHA.

Mitigations include SHA binding, pinned dependencies, least privilege, untrusted-input handling, required human gates and decision revalidation at the current PR head.

## 11. MVP delivery sequence

### Foundation

- architecture;
- Task Contract issue form;
- Agent Contribution PR template.

### Executable records

- seven versioned schemas;
- positive and negative fixtures;
- validation workflow.

### Collaboration

- review record;
- Failure Memory;
- competing-attempt example;
- human-readable Gate summary.

### Demonstration

Create an isolated example in which two attempts improve different capabilities, at least one regresses a known-good capability, and the Gate returns `NO_WINNER` or `REGRESSION_QUARANTINE` with a Reconciliation Candidate recommendation.

## 12. Definition of done

The MVP is complete when one public demonstration:

- accepts a structured task;
- accepts two isolated candidate attempts;
- validates their machine-readable records;
- rejects unsupported evidence;
- detects a known-good regression;
- preserves a failed strategy;
- produces an evidence-backed Gate decision;
- requires no permanent central server;
- performs no automatic merge or physical action.

## 13. Current limitations

This document defines the architecture, not proof that the complete network exists. The schemas, coordinator workflow, adapter implementation and end-to-end demonstration remain pending until their own reviewed changes are merged.
