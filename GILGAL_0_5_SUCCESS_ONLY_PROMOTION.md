# GILGAL 0.5 — Success-Only Promotion

Status: protocol evolution proposal

## Purpose

GILGAL separates product state from investigation memory.

The central rule is:

> **The success becomes product. The failure becomes knowledge.**

Equivalent operational form:

```text
STABLE = approved working implementation
FAILURE MEMORY = rejected reasoning and failed strategies
REGRESSION REPLAY = executable protection against known regressions
```

A failed experiment may be preserved for diagnosis, but its failed implementation MUST NOT be promoted merely to preserve history.

History belongs in evidence. Approved behavior belongs in STABLE.

## 1. Success-Only Promotion invariant

A GILGAL promotion MUST promote only implementation that satisfies the active Gate requirements.

A candidate containing an implementation path that was explicitly rejected by the current investigation MUST NOT be promoted as active product behavior merely because other parts of the candidate passed.

The defining invariant is:

> **STABLE contains only the implementation that earned promotion. Rejected implementation remains evidence, not active product code.**

This does not require deleting all historical code from version control. It requires that rejected behavior is not silently shipped as the current approved path.

## 2. Failure is not deletion

When an experiment fails, GILGAL SHOULD preserve the useful knowledge produced by that failure.

Failure Memory SHOULD record, when known:

- problem identifier;
- hypothesis identifier;
- strategy family;
- claim that was tested;
- experiment performed;
- evidence produced;
- observed failure;
- root cause, when known;
- result classification;
- reason the strategy was rejected, deferred, or considered inconclusive;
- conditions that would justify reopening it.

Recommended result classes include:

```text
CONFIRMED
REJECTED
PARTIAL
INCONCLUSIVE
DEFERRED
```

A failed implementation MUST NOT be copied into STABLE solely so that future agents can inspect it.

Use version history, FAILED candidates, Failure Memory, reports, and replay contracts for that purpose.

## 3. Product memory versus investigation memory

GILGAL distinguishes two kinds of memory.

### Product memory

Product memory answers:

> What behavior has been proven good enough to ship?

Its strongest representation is STABLE plus verified contracts.

### Investigation memory

Investigation memory answers:

> What did we already try, what failed, and what should not be repeated blindly?

Its representations include:

- Failure Memory;
- Hypothesis Ledger;
- FAILED candidates;
- diagnostic reports;
- Candidate Family state;
- Strategy Exhaustion state.

The two MUST NOT be confused.

## 4. Regression Replay

When a failure is reproducible and later corrected, the failure condition SHOULD become a Regression Replay contract.

Recommended lifecycle:

```text
bug observed
    ↓
failed behavior reproduced
    ↓
root cause understood
    ↓
fix verified
    ↓
old failure condition becomes replay contract
    ↓
future candidates replay it
```

This creates three complementary layers:

```text
STABLE
  remembers what is approved

FAILURE MEMORY
  remembers what reasoning or strategy failed

REGRESSION REPLAY
  remembers how to prove that a known bug did not return
```

## 5. Agent preflight rule

Before starting a candidate for a problem that already has investigation history, an AI coding agent SHOULD inspect the relevant Failure Memory and Hypothesis Ledger.

If the proposed strategy substantially matches a previously REJECTED or EXHAUSTED strategy, the agent MUST NOT silently continue as if it were new.

It SHOULD report:

```text
REJECTED STRATEGY REUSE DETECTED
```

and identify:

- prior hypothesis;
- prior strategy family;
- prior rejection evidence;
- what is materially different in the new attempt.

The agent MAY continue only when at least one of the following is true:

1. new evidence materially changes the hypothesis;
2. the implementation strategy is genuinely different;
3. an authorized human explicitly reopens the strategy;
4. the previous result was INCONCLUSIVE rather than REJECTED and the new experiment closes the missing evidence gap.

The reopening reason SHOULD be recorded.

## 6. Cosmetic changes do not create a new strategy

An agent MUST NOT evade Failure Memory by renaming files, classes, branches, hypotheses, or implementation details while preserving the same rejected causal strategy.

Examples of insufficient difference:

```text
same print engine + another flag
same failed transport + another wrapper
same rejected API + renamed adapter
same hypothesis + larger patch
```

Candidate Family classification SHOULD focus on the underlying causal strategy, not cosmetic code structure.

## 7. Promotion filtering

Before promotion, the Gate SHOULD ask two separate questions:

```text
1. What implementation is being promoted?
2. What investigation evidence is being preserved?
```

The promoted implementation MUST satisfy the Gate.

Rejected experiments SHOULD remain outside the active product path.

Evidence about rejected experiments SHOULD remain available through Failure Memory, history, archived candidates, or replay contracts.

Recommended promotion report fields:

```text
SUCCESSFUL IMPLEMENTATION
promoted path:
verified contracts:
human evidence:

REJECTED / DEFERRED KNOWLEDGE
strategies not promoted:
failure-memory references:
replay contracts created:

PROMOTION
success-only invariant satisfied: YES / NO
```

If `success-only invariant satisfied` is `NO`, promotion SHOULD be blocked until the active product path and historical failure evidence are properly separated.

## 8. Deferred work

A strategy may be DEFERRED without being permanently rejected.

DEFERRED means:

> The project intentionally chose not to ship or continue this implementation now.

A deferred implementation SHOULD NOT remain active in STABLE unless it is itself approved product behavior.

Failure Memory SHOULD explain why it was deferred and what evidence would be required before reopening it.

This prevents future agents from interpreting deferred work as either proven success or permanent impossibility.

## 9. Example

```text
PROBLEM
Native printing does not reliably honor the required real-world workflow.

CANDIDATE A
Native print path
Result: DEFERRED
Evidence: technically complex, launch blocked by unresolved real-world behavior

CANDIDATE B
Generate/open document in the operating system's default application
Result: CONFIRMED
Evidence: automated contracts + human validation

PROMOTION
STABLE receives Candidate B behavior.

MEMORY
Candidate A strategy remains documented as DEFERRED.
Its failed conditions remain available for future investigation.

REPLAY
Any reproducible regression from Candidate B becomes a replay contract.
```

The outcome is:

```text
product = proven path
memory = prior failed/deferred path
```

## 10. Required mental model for agents

An AI agent working under GILGAL SHOULD reason as follows:

```text
Do not preserve a mistake by shipping it.
Do not erase a mistake by forgetting it.

Ship the proven behavior.
Record the failed reasoning.
Replay reproducible failures.
```

## 11. Relationship to existing GILGAL invariants

This rule complements the existing invariants:

> **A failed experiment must not destroy the last known-good state.**

> **A candidate must not be promoted merely because it compiles; it must preserve every required verified contract.**

> **A failed hypothesis must not silently become the foundation of the next hypothesis.**

> **A rejected strategy must not be repeated without new evidence or explicit reopening.**

GILGAL 0.5 adds:

> **The success becomes product. The failure becomes knowledge.**

and:

> **Rejected implementation is not promoted to preserve history; rejected reasoning is preserved as evidence so it is not repeated blindly.**

## 12. Compact model

```text
                EXPERIMENT
                    │
             ┌──────┴──────┐
             │             │
           PASS          FAIL
             │             │
             ↓             ↓
          GATE         FAILURE MEMORY
             │             │
             ↓             ├── Hypothesis Ledger
          STABLE            ├── FAILED candidate/history
                             └── Regression Replay when reproducible

STABLE: only approved behavior
MEMORY: failed/deferred reasoning remains available
```

## 13. Normative summary

A conforming GILGAL workflow applying Success-Only Promotion:

- MUST keep rejected implementation from becoming active STABLE behavior merely to preserve history;
- MUST preserve STABLE when an experiment fails;
- SHOULD record relevant rejected/deferred reasoning in Failure Memory;
- SHOULD convert reproducible corrected regressions into replay contracts;
- SHOULD require agents to inspect relevant Failure Memory before repeating a known problem area;
- MUST NOT treat cosmetic renaming as a new strategy when the causal strategy is unchanged;
- SHOULD require new evidence or explicit reopening before reusing a REJECTED or EXHAUSTED strategy;
- SHOULD distinguish CONFIRMED, REJECTED, PARTIAL, INCONCLUSIVE, and DEFERRED outcomes when those distinctions matter;
- SHOULD report separately what implementation is promoted and what failure knowledge is preserved.

The intended result is simple:

```text
STABLE gets the win.
GILGAL remembers the loss.
The next agent learns from both.
```
