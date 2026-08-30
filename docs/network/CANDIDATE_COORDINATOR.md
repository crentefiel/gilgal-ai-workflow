# GILGAL Network Candidate Coordinator

The coordinator compares isolated attempts by capability and verified evidence. It does not score candidates by total tests, code volume or agent confidence.

## Inputs

Each candidate supplies:

- an attempt identifier;
- the exact candidate SHA;
- a Capability Diff;
- evidence records.

The current prototype reads a normalized coordinator input. A later adapter will derive it from the versioned Network Bundle.

## Derived properties

The policy derives rather than trusts:

- mandatory known-good regressions;
- pending human evidence;
- PASS claims without verified evidence;
- target improvements supported by verified evidence;
- evidence-to-candidate SHA binding.

No caller-provided `targetImproved` or `preservedKnownGood` boolean can make a candidate win.

## Candidate outcomes

| Outcome | Meaning |
|---|---|
| `REGRESSION_QUARANTINE` | A mandatory KNOWN_GOOD capability is no longer PASS |
| `PENDING_HUMAN_EVIDENCE` | A mandatory pending capability requires human proof |
| `BLOCKED` | A mandatory PASS claim lacks verified evidence bound to the candidate SHA |
| `NO_WINNER` | No target improvement is proven |
| `PROMOTABLE` | Preservation and a target improvement are supported by verified evidence |

`PROMOTABLE` is an assessment, not a promotion.

## Composite outcomes

- Exactly one promotable candidate: `PROMOTABLE_CANDIDATE`, requiring separate human review.
- Multiple promotable candidates: `HUMAN_SELECTION_REQUIRED`.
- No promotable candidate: `NO_WINNER`, recommending a Reconciliation Candidate.

Every composite result keeps `promotionAllowed: false`. The coordinator has no merge authority.

## Contract tests

The policy verifies that:

1. a candidate cannot win when it improves duplex but regresses WhatsApp;
2. evidence from a different SHA cannot support a PASS claim;
3. pending human evidence is not promotable;
4. a clean reconciliation candidate can be selected for human review;
5. two unacceptable candidates result in composite `NO_WINNER`.

## Current limits

- Referential integrity from Task through every record is not yet enforced by the coordinator.
- Human approval signature verification is not implemented.
- Environment equivalence is recorded but not compared.
- Dependency-graph blast radius is not computed.
- OPA and CUE binary versions still need exact pinning.
