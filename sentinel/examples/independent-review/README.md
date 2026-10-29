# Independent Review Prototype (Experimental)

Optional prototype for issue #26. Does **not** affect the Gate, SPEC, or main Sentinel check/promote flow.

## Purpose

Prepare a snapshot of materials (with SHA-256 hashes), verify the files still match those hashes before use, send them to a fresh external session, validate the structured findings, and save a separate review record.

Findings are pendencies only. They never assign VERIFIED, authenticate human `ok`, or authorize promotion.

## Key guarantees added in this revision

- Non-hypothesis findings **must** include a `source`.
- Isolation is **not** assumed: `isolationProven` is false unless the host explicitly proves a fresh session was used.
- Call `verifySnapshotMaterials` before sending materials to confirm the files have not changed since the snapshot was taken.

## Suggested states

- `completed` — review executed and output validated
- `incomplete` — partial or invalid output
- `unavailable` — host cannot provide a fresh session
- `stale` — materials or candidate changed after snapshot

## Fixture example

See `fixture-evidence-package.json` for a synthetic case where evidence proves PDF export but not physical printing or WhatsApp preservation.

## Usage sketch (host-side)

1. Build snapshot with `buildSnapshot`.
2. Immediately before use, call `verifySnapshotMaterials`.
3. Send snapshot + prompt to a **new** session (do not reuse the implementer conversation). Record whether isolation was actually proven.
4. Validate returned findings with `validateFindings` (source required unless hypothesis).
5. Save with `saveReviewRecord` / `createCompletedRecord`.

If the host cannot create a fresh session, record state `unavailable` instead of simulating isolation.
