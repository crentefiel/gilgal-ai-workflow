# Bring Your Own Agent Adapter

The BYOA adapter lets Codex, another hosted model, a local model or a human-assisted tool contribute to GILGAL Network without giving the repository provider credentials.

## Trust model

Agent output is untrusted input.

The adapter accepts claims and structure, but it does not let an agent decide:

- the STABLE SHA;
- the candidate SHA;
- evidence integrity;
- human approval;
- Gate outcome;
- promotion permission.

The candidate SHA and timestamp come from the invoking coordinator. The STABLE SHA, baseline capability states and capability requirements come from the trusted Task record.

## Usage

```bash
python network/adapters/byoa_adapter.py \
  --task task.json \
  --response agent-response.json \
  --candidate-sha 2222222222222222222222222222222222222222 \
  --created-at 2026-08-30T20:00:00Z \
  --output normalized-attempt.json
```

The adapter uses only the Python standard library.

## Agent response contract

```json
{
  "contributor": {
    "name": "my-agent",
    "provider": "local-or-hosted-provider",
    "version": "agent-version"
  },
  "hypothesis": "Observed cause to test",
  "strategy": "Capability-scoped strategy",
  "changedFiles": ["src/printing/bridge.py"],
  "rollbackReference": "git revert <commit>",
  "capabilityChanges": [
    {
      "capabilityId": "PRINT_DUPLEX",
      "candidateStatus": "PASS"
    },
    {
      "capabilityId": "WHATSAPP_QR",
      "candidateStatus": "PASS"
    }
  ],
  "evidenceClaims": [
    {
      "capabilityIds": ["PRINT_DUPLEX"],
      "evidenceKind": "AUTOMATED",
      "environment": {
        "os": "ubuntu",
        "architecture": "x64"
      },
      "reference": "local://test-output",
      "result": "PASS",
      "synthetic": false
    }
  ]
}
```

## Safety behavior

- All non-synthetic agent evidence enters as `CLAIMED`.
- Synthetic evidence enters as `TAINTED`.
- A later independent verifier may create new `VERIFIED` evidence.
- The adapter rejects agent-supplied `candidateSha`, `stableSha`, human approval, Gate decisions and promotion permission.
- Changed paths must fit the Task's allowed scope and must not fit forbidden scope.
- Stable capability status is derived from the Task baseline, never from the agent.
- Environment fields are allowlisted so secrets or arbitrary nested data cannot cross the boundary.
- Every target and preserved capability must appear in the Capability Diff.
- IDs are deterministic hashes of normalized inputs.
- Provider API keys are neither accepted nor written.

## Output

The adapter emits:

- one Agent Attempt;
- one Capability Diff;
- zero or more claimed Evidence records;
- `requiresIndependentVerification: true`.

The output is not directly promotable. It must pass CUE validation, independent evidence verification and the OPA coordinator.

## Failure behavior

Unsafe or malformed input exits with code `2` and prints:

```text
BYOA_ADAPTER_REJECTED: <reason>
```

A successful conversion exits with code `0`. Success means only that the response was normalized; it does not prove the agent's claims.
