# GILGAL Specification

**Protocol version: 0.5.1**

This document defines the current normative core of the GILGAL protocol.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate requirement strength.

Historical protocol-version documents remain in this repository as evolution records. The daily workflow does not depend on a visible 0.x version number.

## 1. Purpose

GILGAL governs whether a software change may be called trustworthy enough to replace the current known-good state.

It does not prescribe how an AI must reason, which model must be used, or which test framework must run.

The operational rule is:

> **WORK may claim it is finished. Only GILGAL may declare it passed.**

The normative rule is:

> **No actor declares that the product works. The contract does — and for risk L the contract includes a human check.**

## 2. Core states

### 2.1 STABLE

STABLE is the last verified and approved product state.

An implementation:

- **MUST** keep STABLE distinguishable from experimental work;
- **MUST NOT** use STABLE as the normal AI editing workspace;
- **SHOULD** identify STABLE by immutable version-control evidence such as a commit SHA or tag;
- **MUST NOT** promote rejected implementation merely to preserve history.

### 2.2 WORK / CANDIDATE

WORK is the isolated candidate under development.

A candidate:

- **MUST** record which STABLE reference it started from;
- **MUST** remain distinguishable from STABLE;
- **SHOULD** be created through version-control isolation, preferably a branch/worktree or equivalent;
- **MAY** fail without changing STABLE.

## 3. Minimal core

A conforming minimal implementation needs four responsibilities:

1. **Contracts** — define protected product behavior and evidence requirements.
2. **Memory** — record rejected, deferred, or exhausted strategy families and observed regressions.
3. **Check** — calculate affected contracts/risk and collect evidence for the exact candidate.
4. **Promote** — refuse promotion unless all required preconditions are satisfied.

The Gate **MAY** be implemented directly as the refusal logic of `promote`; it does not need to be a standalone service.

A Sentinel-style verifier **MAY** provide evidence to `check`, but a permanent Sentinel process is not required by the core protocol.

## 4. Product contracts

A project using contract-driven risk **SHOULD** maintain machine-readable contracts.

Each contract **SHOULD** contain:

- `id` — product-language behavior identifier;
- `risk` — `S`, `M`, or `L`;
- `paths` — code surfaces whose changes may affect the contract;
- automated checks when available;
- human checks when required.

Example:

```json
{
  "id": "WHATSAPP-QR-CONNECT",
  "risk": "L",
  "paths": ["src/whatsapp/**"],
  "checks": [
    { "kind": "command", "run": "pnpm test -- tests/whatsapp-status.test.ts" }
  ],
  "human": [
    "QR appears",
    "phone connects",
    "session survives restart"
  ]
}
```

Contract names **SHOULD** describe product behavior rather than implementation-library details.

## 5. Risk resolution

A candidate's effective risk **SHOULD** be computed from the contracts affected by the diff.

The implementation **SHOULD NOT** allow the authoring agent to lower risk merely by declaring a smaller scope.

The recommended ordering is:

```text
S < M < L
```

The candidate risk is the maximum risk of the matched contracts.

Typical policy:

- `S`: diff/static/type checks;
- `M`: S plus relevant automated tests/replays;
- `L`: M plus explicit human checks from the affected contracts.

Line count **MUST NOT** override contract risk.

A Change Budget **MAY** exist as an advisory scope-expansion signal, especially for S/M work. It **SHOULD NOT** be treated as a universal substitute for contract-derived risk.

## 6. Candidate metadata

A candidate **SHOULD** store machine-readable state including at least:

- `baseStableSha`;
- current candidate SHA when available;
- status;
- hypothesis/intent;
- strategy family when Failure Memory applies;
- affected contracts;
- effective risk.

Recommended statuses:

```text
draft
checking
pending-human
passed
failed
rejected
```

Human-written Markdown such as `READY`, `VERIFIED`, or `PASS` **MUST NOT** be treated as promotion authority by itself.

Candidate identity is local to the worktree where the command runs. The active candidate SHA **MUST** be resolved as `git rev-parse HEAD` in the current working directory/worktree. `check`, `ok` / `approve-manual`, and `promote` **MUST** use the same active-SHA resolver. They **MUST NOT** resolve the candidate by choosing a repository-global `gilgal/candidate/*` ref when multiple worktrees exist.

SHA-bound evidence **MUST** belong to the current worktree HEAD. If the evidence SHA differs from that HEAD, the command **MUST** block with `STALE_EVIDENCE` and **MUST** print the evidence SHA, the current HEAD SHA, and the current worktree path.

## 7. Failure Memory

Failure Memory uses three core decision states:

```text
REJECTED
DEFERRED
EXHAUSTED
```

Each rejection entry **MUST** record `kind`:

- `strategy` — the approach failed. It may become `EXHAUSTED`.
- `hypothesis` — the premise was wrong. It **MUST NOT** become `EXHAUSTED`. Reopening a `hypothesis` direction **REQUIRES** a new recorded premise, not merely new evidence for the same strategy.

Each relevant strategy entry **SHOULD** include:

- `kind: "strategy"`;
- strategy `family`;
- `status`;
- `reason`;
- supporting `evidence` references;
- `reopenWhen` criteria.

Each relevant hypothesis entry **SHOULD** include:

- `kind: "hypothesis"`;
- the rejected `hypothesis`/premise;
- `status: "REJECTED"`;
- `reason`;
- supporting `evidence` references;
- `reopenWhen` criteria that require a new premise.

An `EXHAUSTED` family **MUST NOT** be silently repeated as if it were new merely because files, classes, wrappers, branches, or adapters were renamed.

Reopening an exhausted strategy family **SHOULD** require new evidence or explicit recorded reauthorization.

`DEFERRED` **MUST NOT** be interpreted as permanently rejected.

Example strategy memory for a multi-worktree gate failure:

```json
{
  "kind": "strategy",
  "family": "gate-reads-sibling-worktree-ref",
  "status": "EXHAUSTED",
  "symptom": "STALE_EVIDENCE (other-worktree-sha vs HEAD)",
  "reopenWhen": [
    "approve/promote use HEAD of the current cwd; worktrees.json identifies the store when present; aborted checks do not produce valid CHECK evidence"
  ]
}
```

## 8. Hypothesis handling

The active hypothesis **SHOULD** live in the current candidate metadata.

A separate Hypothesis Ledger **MAY** be used for complex research, but is not required by the minimal protocol.

When a failed hypothesis matters to future work, the durable decision **SHOULD** be written into Failure Memory with `kind: "hypothesis"`.

## 9. Check and evidence

Before promotion, the implementation **MUST** compare WORK against its recorded STABLE base or current valid STABLE according to the promotion policy.

`check` **SHOULD**:

1. determine the candidate diff;
2. match affected contracts from their mapped code surfaces;
3. compute effective risk;
4. consult Failure Memory when a strategy family is present;
5. execute explicitly reviewed automated checks;
6. record results for the exact candidate SHA;
7. enter `pending-human` when required human checks remain.

Evidence **MUST NOT** be considered valid for another candidate SHA without explicit revalidation.

If the working tree is dirty, or if required typecheck/tests/replays/build steps did not actually run, the checker **MUST NOT** write evidence that `ok`, `approve-manual`, or `promote` can treat as a valid `CHECK`. It **MAY** write an `ABORT-*.txt` file or diagnostic log instead, and approval commands **MUST** ignore abort records.

A record with an implausibly short `wallClockMs` together with empty `artifacts: []` **MUST NOT** be accepted as successful check evidence. The implementation **MUST** classify it as `DECORATIVE_CONTRACT_PASS` or `ABORTED_CHECK`.

A SHA binding proves which code the evidence belongs to. It does **not** prove that a physical/human observation actually occurred.

## 10. Human checks

Risk-L contracts **SHOULD** define a small, objective list of human checks.

A human check record **SHOULD** identify:

- contract/check identifier;
- result;
- actor or operator identifier suitable for the project;
- timestamp;
- candidate SHA.

An AI agent **MUST NOT** manufacture human approval.

If the candidate SHA changes after a human check, the implementation **MUST** determine whether that check remains valid or requires re-execution.

## 11. Promote as Gate

Promotion **MUST** be blocked unless all required conditions are satisfied.

A conforming `promote` **MUST** refuse when any of the following applies:

- candidate status is not `passed`;
- required automated evidence is missing/failing;
- required human evidence is missing;
- evidence does not match the current candidate SHA;
- candidate base/STABLE relationship is no longer valid under the project's promotion policy;
- an exhausted strategy is being reused without required reopening/evidence when that rule is enabled;
- any contract covered by the promotion is `INCOMPLETE` because of an unresolved `regress` record and no fresh required `check` and/or `ok` evidence has re-established that contract after the regression.

Promotion **MUST NOT** hide a silent AI-performed rebase and then claim the previous evidence still applies.

A recommended safe rule is:

```text
recorded baseStableSha is still valid
candidate evidence SHA == candidate SHA being promoted
status == passed
all affected contract assurance states are complete
```

Promotion **SHOULD** use an explicit version-control operation such as fast-forward or another project-approved merge strategy whose resulting code is the code that was checked.

Changes to `scripts/gilgal/**`, gate-enforcing Sentinel surfaces, or the active-SHA resolver such as `getActiveSha` are risk L gate changes. They **MUST** be handled as their own candidate and **MUST NOT** share the same human `ok` with an unrelated product contract such as licensing, messaging, or file handling. An agent **MUST NOT** edit the gate while a product `ok` / `promote` operation is in progress.

## 12. Reject and regress

### 12.1 Reject

`reject` **MUST NOT** modify STABLE merely to preserve the failed implementation.

When `reject` writes reusable investigation knowledge to Failure Memory, the record **MUST** include `kind: "strategy"` or `kind: "hypothesis"` according to §7.

A rejection **SHOULD**:

- mark the candidate rejected/failed;
- update Failure Memory when the result contains reusable investigation knowledge;
- archive or remove WORK according to project policy.

A strategy rejection may exhaust a strategy family when the evidence supports that decision. A hypothesis rejection records that the premise was wrong and **MUST NOT** exhaust the family merely because the premise failed.

> **Verified success becomes product. Failure becomes knowledge.**

### 12.2 Regress

```text
gilgal regress <CONTRACT> "<operator observation>"
```

Use this when an already-promoted STABLE violates a contract in real-world use.

`regress` **MUST**:

- identify the contract, the SHA that had been promoted, and the human/operator observation;
- set the contract to `INCOMPLETE`;
- record the regression in `memory.json` (or equivalent durable Memory);
- block promotion for that contract until a fresh `check`, a fresh `gilgal ok`, or both exist according to the contract's evidence requirements.

`regress` **MUST NOT**:

- move or replace STABLE by itself;
- automatically roll back to the previous known-good state.

Replacing a broken STABLE remains an explicit human decision through the project's `promote` / `restore` workflow.

## 13. Minimal data model

A minimal implementation MAY use:

```text
.gilgal/
  state.json
  contracts.json
  memory.json
  evidence/
  worktrees.json   # optional
```

A repository **MAY** have multiple Git worktrees. Each worktree **MUST** have at most one role: `store/stable`, `work/candidate`, or another candidate.

An optional `.gilgal/worktrees.json` may make those roles explicit:

```json
{
  "store": { "path": "...", "ref": "gilgal/stable" },
  "work":  { "path": "...", "ref": "gilgal/candidate/<name>" },
  "others": []
}
```

If `worktrees.json` exists, `promote` **MUST** print `store.path` and state that this is the filesystem path expected to contain the new STABLE **before** moving the stable ref. If the map does not exist, `promote` **MUST** print the ref it intends to move and the current working directory, and **MUST NOT** claim that an unverified filesystem path was updated.

When a store worktree is checked out at `gilgal/stable`, moving that ref is what causes that mapped store path to contain the promoted STABLE. This relationship **MUST** be reported explicitly rather than hidden behind a fixed-path success message.

Recommended responsibilities:

- `state.json`: STABLE/WORK identity, candidate status, hypothesis and strategy family, plus contract assurance state such as `INCOMPLETE` after a regression;
- `contracts.json`: product contract, risk, paths, automated and human checks;
- `memory.json`: typed strategy/hypothesis decisions, REJECTED/DEFERRED/EXHAUSTED reopening criteria, and regression records;
- `evidence/<sha>.json`: checks performed for one exact candidate.

## 14. Minimal command surface

A practical implementation SHOULD aim for a small interface:

```text
gilgal start <hypothesis>
gilgal check
gilgal ok <contract> [check]
gilgal promote
gilgal reject
gilgal regress <contract> "<operator observation>"
gilgal status
```

The stored result of `reject` **MUST** include `kind: "strategy"` or `kind: "hypothesis"`; an implementation MAY choose its own command-line syntax for selecting that kind.

No command name is normative. The behavior is.

## 15. Optional mechanisms

The following remain compatible extensions but are not required by the minimal core:

- a standalone/permanent Sentinel process;
- a separate Hypothesis Ledger;
- parallel Candidate Families and Comparative Gate;
- Change Budget as more than advisory scope evidence;
- extensive cryptographic signing of human check text;
- visible protocol-version rituals in normal operation.

Implementations **MAY** add them when they solve a real project need without weakening the core invariants.

## 16. Core invariants

1. **STABLE is not the laboratory.**
2. **Risk comes from affected product contracts, not author confidence or line count.**
3. **Evidence belongs to an exact candidate.**
4. **Risk L includes required human observation.**
5. **An exhausted strategy is not new because it was renamed.**
6. **A rejected hypothesis requires a new premise; it does not exhaust a strategy family by itself.**
7. **A reported regression makes its contract INCOMPLETE until fresh evidence re-establishes it.**
8. **`regress` never moves STABLE or performs rollback automatically.**
9. **Promotion is explicit and refuses when evidence is incomplete or stale.**
10. **The agent that writes the change does not gain unilateral authority to declare it production-ready.**
11. **Candidate identity is `HEAD` of the current worktree; `check`, human approval, and `promote` use the same resolver.**
12. **If evidence SHA differs from current worktree `HEAD`, the command blocks with `STALE_EVIDENCE` and prints both SHAs and the worktree path.**
13. **An aborted or non-executed check is not approval evidence; abort records are ignored by approval and promotion.**
14. **Gate-code changes are risk L, use their own candidate, and do not share a product human approval.**
15. **Before moving STABLE, `promote` identifies the mapped store path when available; without a map it reports only the ref and cwd it verified.**

For an agent with very little context, two rules preserve the spirit of GILGAL:

> **Do not edit STABLE.**

> **Do not repeat an EXHAUSTED strategy family without new evidence or explicit reopening.**
