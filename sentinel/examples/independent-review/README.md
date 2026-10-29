# Independent Review Prototype (Experimental)

Optional prototype for issue #26. Does **not** affect the Gate, SPEC, or main Sentinel check/promote flow.

## Purpose

Prepare a snapshot of materials (with SHA-256 hashes), send them to a fresh external session, validate the structured findings, and save a separate review record.

Findings are pendencies only. They never assign VERIFIED, authenticate human `ok`, or authorize promotion.

## Suggested states

- `completed` — review executed and output validated
- `incomplete` — partial or invalid output
- `unavailable` — host cannot provide a fresh session
- `stale` — materials or candidate changed after snapshot

## Fixture example

See `fixture-evidence-package.json` for a synthetic case where evidence proves PDF export but not physical printing or WhatsApp preservation.

## Usage sketch (host-side)

1. Build snapshot with `buildSnapshot`.
2. Send snapshot + prompt to a **new** session (do not reuse the implementer conversation).
3. Validate returned findings with `validateFindings`.
4. Save with `saveReviewRecord` / `createCompletedRecord`.

If the host cannot create a fresh session, record state `unavailable` instead of simulating isolation.
