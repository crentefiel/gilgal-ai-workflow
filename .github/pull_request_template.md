# GILGAL Agent Contribution Contract

Closes or relates to: #

> Complete this contract for agent-assisted and competing-attempt contributions. Do not include secrets, credentials, private customer data or unredacted logs.

## Identity

- **Task ID:**
- **STABLE SHA:**
- **Candidate SHA:** Filled or confirmed after the final candidate commit
- **Attempt ID:**
- **Contributor/agent:**
- **Agent or tool version:**
- **Environment fingerprint:**

## Hypothesis

Describe the suspected cause before describing the implementation.

## Strategy and scope

- **Target capability:**
- **Allowed scope used:**
- **Files changed:**
- **Selected commits:**
- **Scope intentionally excluded:**
- **Rollback reference:**

## Capability Diff

| Capability | STABLE | Candidate | Mandatory | Target | Evidence |
|---|---|---|---|---|---|
| Example | KNOWN_GOOD | PASS / FAIL / PENDING | Yes / No | Yes / No | Evidence ID |

A target improvement cannot cancel a mandatory known-good regression.

## Evidence

For every decision-relevant claim, provide:

| Evidence ID | Kind | Integrity | Candidate SHA | Environment | Reference |
|---|---|---|---|---|---|
|  | AUTOMATED / INTEGRATION / PACKAGED / PHYSICAL / HUMAN | VERIFIED / CLAIMED / TAINTED / STALE |  |  |  |

State explicitly when evidence remains pending. Do not label evidence `VERIFIED` merely because an agent produced it.

## Verification performed

- [ ] Relevant automated tests
- [ ] Typecheck or static analysis
- [ ] Build or packaging check
- [ ] Preservation contracts for mandatory KNOWN_GOOD capabilities
- [ ] Candidate artifact bound to the tested SHA, when applicable
- [ ] Human or physical validation, when required and actually performed

Commands and results:

```text
Add commands, summaries and durable references here.
```

## Regressions and Proof Debt

List all regressions, unknowns, untested behavior and open Proof Debt. Write `None observed` only when supported by the required preservation evidence.

## Failed strategies

Record rejected hypotheses and attempts so they can become Failure Memory:

| Hypothesis or strategy | Result | Evidence | Reusable lesson |
|---|---|---|---|
|  |  |  |  |

## External state confirmation

For every important external mutation, record the independent read-back:

| Intent | Mutation result | Independent read | Confirmed state |
|---|---|---|---|
|  |  |  | MUTATION_CONFIRMED / MUTATION_REJECTED / MUTATION_ACKNOWLEDGED_STATE_UNCONFIRMED |

## Human-only decisions

- **Physical action authorized by:**
- **Human evidence verified by:**
- **Regression acceptance, rationale and approver:**
- **Promotion decision:** Not part of this PR unless performed separately by an authorized human

An AI may report a human decision but cannot create, infer or authenticate one.

## Proposed Gate outcome

Choose exactly one value:

`PROMOTABLE | BLOCKED | PENDING_HUMAN_EVIDENCE | REGRESSION_QUARANTINE | NO_WINNER`

**Selected outcome:** 

Explain why this single outcome follows from capability records and verified evidence rather than from manually asserted aggregate booleans.

## Safety confirmation

- [ ] STABLE was not used as the laboratory.
- [ ] No automatic merge or promotion was performed.
- [ ] No unauthorized physical action was performed.
- [ ] No secret or provider credential is included.
- [ ] The final Gate must revalidate the current PR head SHA.
- [ ] `READY != PROMOTED`.
