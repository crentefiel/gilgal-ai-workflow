# Sentinel Local Extension 0.4.0 — Evaluation

Status: **proposal / evaluation only**

This document evaluates lessons learned from operating GILGAL 0.5.0 and a LAN House Files local Sentinel extension identified locally as **0.4.0**.

The upstream GILGAL Sentinel reference implementation remains **0.2.0**. This document does not rename the upstream reference implementation and does not claim that the local extension has been independently audited in this repository.

## 1. What is already present upstream

The upstream Sentinel 0.2.0 already contains several mechanisms that also appeared in the LAN House local report:

- clean-working-tree enforcement before a candidate SHA can be trusted;
- SHA-bound manual approvals;
- stale-approval behavior when the candidate SHA changes;
- Regression Replay contracts;
- Change Budget support;
- explicit READY/BLOCKED gate semantics;
- anti-auto-approval by design: human-only contracts remain pending until an explicit approval is recorded.

Therefore these mechanisms must not be presented as newly invented by the local extension.

## 2. Local-extension ideas worth evaluating for upstream

The LAN House experience exposed several additions that are potentially useful beyond that project.

### 2.1 Evidence Integrity digest

The local workflow reports a SHA-256 digest for generated Sentinel evidence and binds evidence to the exact STABLE and CANDIDATE SHAs.

Proposed upstream direction:

- reports SHOULD include a canonical evidence digest;
- the digest SHOULD cover the normalized evidence payload, not unstable rendering details;
- the report MUST identify the STABLE SHA and CANDIDATE SHA included in the digest;
- a changed candidate MUST make previous evidence stale;
- integrity verification MUST NOT be treated as proof that the underlying test was semantically correct — it proves evidence identity, not behavioral truth.

This is a strong candidate for implementation.

### 2.2 Explicit promotion ancestry / fast-forward gate

The upstream Sentinel already verifies ancestry and working-tree cleanliness. The local workflow adds a stronger operational promotion invariant: promotion should advance STABLE to the approved candidate without silently mixing unrelated commits.

Proposed upstream direction:

- promotion logic, if implemented outside Sentinel, SHOULD require an expected STABLE SHA and expected CANDIDATE SHA;
- promotion SHOULD reject STABLE drift;
- promotion SHOULD reject candidate drift;
- a fast-forward promotion SHOULD be preferred when the repository topology permits it;
- Sentinel itself SHOULD continue to observe and report rather than silently promote.

This should remain a Gate/promotion-layer capability rather than giving Sentinel autonomous promotion authority.

## 3. Self-Diff Trap: context-aware validation

### Observed problem

A WORK-oriented integrity test required `diff(STABLE, CANDIDATE).filesChanged > 0`. After successful promotion, STABLE and CANDIDATE became identical, making the same assertion invalid and creating a false post-promotion alarm.

### Proposed model

Tests need an explicit execution context such as:

```text
WORK
STABLE
POST_PROMOTION
```

However, tests MUST NOT trust a freely supplied environment variable as the source of truth.

Recommended design:

1. Sentinel derives the context from Git evidence and the invoked command.
2. Sentinel may inject a convenience variable such as `GILGAL_ENV` into child processes.
3. The variable is treated as derived metadata, not trusted evidence.
4. Context-sensitive contracts declare which contexts they support.
5. Unsupported contexts return `SKIPPED` or `NOT_APPLICABLE`, not `PASS`.

Example semantics:

```text
WORK            -> candidate may differ from stable
STABLE          -> repository represents current stable state
POST_PROMOTION  -> promoted stable must equal approved candidate
```

This proposal directly addresses false failures after promotion without weakening pre-promotion checks.

## 4. Native snapshot command

The LAN House workflow repeatedly needed a safe way to turn a verified dirty candidate into a clean, reviewable Git snapshot.

A future command could be:

```text
gilgal sentinel snapshot --scope <id>
```

or a higher-level GILGAL command outside Sentinel.

Required safety properties:

- MUST show the current branch, HEAD, and dirty paths before writing;
- MUST refuse obvious secrets, session files, production databases, customer files, build caches, and ignored temporary artifacts when detectable;
- SHOULD support an explicit allow-list of files or paths;
- MUST NOT silently run formatters or mutate source content;
- MUST create a deterministic, reviewable commit message;
- MUST report the new candidate SHA;
- MUST make previous SHA-bound approvals stale;
- MAY run a configured verification profile after the commit;
- MUST NOT create or manufacture human approval;
- MUST NOT promote STABLE.

A snapshot helper reduces workflow friction, but it must not become an automatic `git add -A && git commit` wrapper.

## 5. Fast and full verification profiles

A two-profile model is useful, but the promotion semantics must remain strict.

### FAST

Intended for agent iteration.

Typical checks:

- typecheck / static checks;
- critical Regression Replay contracts;
- Change Budget;
- targeted capability checks.

`FAST` evidence MUST NOT by itself authorize promotion unless a project explicitly defines a promotion policy that proves it is equivalent to the required full evidence.

### FULL

Intended for snapshot, release, and promotion gates.

Typical checks:

- full automated suite;
- all required Regression Replays;
- build;
- runtime checks when configured;
- evidence-integrity generation;
- required human-contract state.

A future configuration could define named profiles rather than hard-coding only two modes.

## 6. Avoiding duplicate Replay execution

The LAN House project observed that some Replay tests were executed once as part of the full Vitest suite and then again as explicit Replay contracts.

Potential solutions:

- mark replay tests with a dedicated test project/tag and exclude them from the generic suite when Sentinel runs them separately;
- allow a contract to consume trusted test-run evidence from the same candidate SHA rather than re-executing the same test;
- include command identity, candidate SHA, environment fingerprint, timestamp/freshness, and result provenance before reusing evidence;
- never reuse evidence from a different candidate SHA.

Evidence reuse can improve speed, but freshness and provenance must be explicit.

## 7. Append-only promotion ledger

An append-only JSONL ledger is useful for audit history, but it must not store reusable human approval tokens.

Recommended shape:

```json
{"timestamp":"2026-09-02T10:58:06Z","event":"PROMOTION","fromSha":"fd97d97","toSha":"75c729d","approvalId":"externalApplication","approvalEvidenceDigest":"sha256:...","contracts":["externalApplication"],"status":"SUCCESS"}
```

Rules:

- MUST NOT store raw secrets or reusable confirmation tokens;
- SHOULD store immutable SHAs;
- SHOULD store evidence/report digests;
- SHOULD distinguish `CHECK`, `APPROVAL`, `REJECTION`, `SNAPSHOT`, and `PROMOTION` events;
- SHOULD be append-only under normal operation;
- ledger integrity MAY later be strengthened through chained hashes or signed attestations.

The ledger is audit history, not an executable command source.

## 8. Contract taxonomy: separate kind from lifecycle

The proposed contract list contains two different concepts mixed into one `type` field.

Execution kind and lifecycle should be modeled separately.

Recommended model:

```text
kind:
  command
  replay
  manual

manualClass (when kind=manual):
  physical
  functional

lifecycle:
  active
  deferred
  retired
```

Why:

- `retired` describes whether a contract participates in the current product Gate; it is not an execution engine;
- `human_physical` and `human_functional` are both manual evidence classes;
- `regression_replay` maps naturally to the existing upstream `replay` execution kind.

Gate rule:

- active critical contracts may block promotion;
- deferred/retired contracts MUST NOT be reported as PASS if they were not executed;
- deferred/retired contracts SHOULD remain visible as historical/governance metadata;
- Failure Memory should preserve why a capability or strategy became deferred/retired.

## 9. Recommended upstream roadmap

Suggested order of implementation:

1. **Context-aware execution** with derived `WORK / STABLE / POST_PROMOTION` context and `NOT_APPLICABLE` semantics.
2. **Evidence Integrity digest** bound to immutable Git SHAs and canonical report content.
3. **Named check profiles** with explicit rule that reduced profiles are not promotion-equivalent by default.
4. **Replay evidence de-duplication** with strict provenance/freshness checks.
5. **Append-only audit ledger** without raw approval tokens.
6. **Snapshot helper** as a guarded write-capability, preferably outside the observation-only Sentinel core.
7. **Contract lifecycle metadata** separated from execution kind.

## 10. Compatibility with GILGAL 0.5.0

These proposals reinforce the GILGAL 0.5.0 Success-Only Promotion rule:

> The success becomes product. The failure becomes knowledge.

They should not weaken these invariants:

- STABLE remains protected;
- evidence is bound to exact code;
- missing evidence never becomes PASS;
- agents cannot manufacture human approval;
- rejected/deferred implementation is not promoted merely to preserve history;
- reproducible regressions remain executable memory;
- reduced/fast checks do not silently replace the full promotion Gate.

## 11. Evaluation status

Based on the LAN House operational report:

- **Strongly recommended for upstream prototyping:** context awareness, Evidence Integrity digest, named profiles, replay de-duplication.
- **Recommended with security constraints:** append-only ledger, guarded snapshot helper.
- **Needs schema redesign before implementation:** contract classification / lifecycle.
- **Already substantially present upstream:** clean-worktree enforcement, SHA-bound approval, stale approval detection, Regression Replay, Change Budget, anti-auto-approval semantics.

The local extension should therefore be treated as a useful field experiment and source of upstream ideas, not as a drop-in Sentinel 0.4.0 release until its implementation is independently reviewed and tested against the reference repository.