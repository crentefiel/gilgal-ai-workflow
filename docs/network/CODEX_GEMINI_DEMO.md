# Codex + Gemini Manual Demo

David can use Codex and Gemini Pro as two independent contributors without purchasing a server or connecting an API.

A Pro application subscription may not include API access. This workflow uses copy and paste and therefore does not assume API credentials or API credits.

## Step 1 — Give the same Task to both agents

Open `network/demo/task.json` and send it with this instruction:

> You are an untrusted candidate agent in a GILGAL Network task. Analyze the Task JSON below and propose one capability-scoped attempt. Return only one JSON object matching the Agent Response Contract in `docs/network/BYO_AGENT_ADAPTER.md`. Do not include candidateSha, stableSha, evidence integrity, human approval, Gate outcome or promotion permission. Do not claim that tests were executed unless you actually executed them. Evidence from your response is only a claim and will require independent verification. Stay inside allowedScope and preserve every preserved capability.

Use the same instruction and Task with:

1. Codex;
2. Gemini Pro.

Do not tell the second agent to agree with the first. Independent hypotheses are more useful than duplicated answers.

## Step 2 — Save responses locally

Save the JSON-only outputs as:

```text
codex-response.json
gemini-response.json
```

Do not commit conversations, tokens, credentials, private source code or customer data.

## Step 3 — Normalize each response

A trusted operator obtains the exact Git SHA for each isolated candidate and runs:

```bash
python network/adapters/byoa_adapter.py \
  --task network/demo/task.json \
  --response codex-response.json \
  --candidate-sha <EXACT_CODEX_CANDIDATE_SHA> \
  --created-at <ISO_TIMESTAMP> \
  --output codex-attempt.json

python network/adapters/byoa_adapter.py \
  --task network/demo/task.json \
  --response gemini-response.json \
  --candidate-sha <EXACT_GEMINI_CANDIDATE_SHA> \
  --created-at <ISO_TIMESTAMP> \
  --output gemini-attempt.json
```

Normalization does not verify either agent's claims.

## Step 4 — Verify independently

Run the declared tests outside the model response. A trusted verifier creates new evidence bound to:

- the exact candidate SHA;
- the exact capability;
- the environment;
- the durable test reference.

Never change `CLAIMED` to `VERIFIED` merely because Codex or Gemini said a test passed.

## Step 5 — Coordinate

Provide the normalized candidates and independently verified evidence to the OPA coordinator.

Expected behavior:

- a target improvement with a known-good regression enters quarantine;
- a preserved candidate without a target improvement cannot win;
- no acceptable candidate produces `NO_WINNER`;
- a clean candidate reconstructed from STABLE may become `PROMOTABLE_CANDIDATE`;
- promotion still requires a separate human decision.

## Automated simulation

The repository simulation does not call Codex or Gemini:

```bash
python network/demo/run_demo.py
```

It proves the protocol flow with fixed fixtures and an explicitly labeled demo verifier. It does not prove real application behavior.
