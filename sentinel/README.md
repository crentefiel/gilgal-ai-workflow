# GILGAL Sentinel reference implementation

Version: **0.1.0**

This directory contains the first local reference implementation of GILGAL Sentinel. The implementation version is independent from the GILGAL protocol version.

Sentinel is a verification orchestrator, regression comparator, contract evaluator, and promotion-gate evidence provider. It observes, runs explicitly configured checks, and reports. It does not merge, checkout, reset, clean, push, promote a candidate, or modify STABLE.

## Requirements and installation

- Node.js 20 or newer
- Git available on `PATH`

```bash
cd sentinel
npm ci
npm run build
```

During development, run the repository configuration with:

```bash
npm run sentinel -- check
```

That repository-local npm script supplies `../gilgal.sentinel.json`. Direct binary use defaults to `gilgal.sentinel.json` in the current directory.

The built package also exposes `gilgal` and `gilgal-sentinel` binaries. Its parser accepts both `gilgal sentinel check` and `gilgal-sentinel check` forms.

## Commands

```text
gilgal sentinel check
gilgal sentinel status
gilgal sentinel report
gilgal sentinel report --json
gilgal sentinel approve <contract-id>
gilgal sentinel revoke <contract-id>
gilgal sentinel reset
```

All commands accept `--config <path>`. The default is `gilgal.sentinel.json` in the current directory.

`check` resolves both refs and their merge base, validates that STABLE is an ancestor of CANDIDATE, requires a clean working tree by default, computes the diff, runs checks and contracts sequentially, evaluates regressions, writes JSON/Markdown evidence, and returns the gate exit code.

`status` compares current Git SHAs with the last report and warns when that report is stale. `report` renders the last locally recorded report. `reset` removes only the configured local state directory after confirmation (or with `--yes`); it does not remove reports, baselines, source code, or Git data.

## Configuration

See [sentinel.config.example.json](examples/sentinel.config.example.json). Commands come exclusively from this trusted project configuration and the contracts file. Sentinel does not assume npm: `pytest`, `dotnet test`, `cargo test`, `go test ./...`, or another executable can be configured.

Commands are parsed into an executable and argument vector and launched without a shell. Shell composition such as pipelines, redirection, variable expansion, `&&`, or `;` is not interpreted. Put complex logic in a reviewed project script and configure Sentinel to execute that script directly.

Each check supports:

```json
{
  "enabled": true,
  "critical": true,
  "command": "npm test",
  "timeoutMs": 120000,
  "outputLimitBytes": 51200
}
```

The retained stdout/stderr is limited to the tail of the configured number of bytes. A truncated result records `outputTruncated: true`. A timeout or launch failure is `ERROR`, never `PASS`. Ctrl+C aborts the active child and prevents a successful report from being recorded.

All configured paths are resolved relative to the configuration file and must remain within that project root.

## Contracts

The MVP implements two provider types:

- `command`: exit 0 is `PASS`, non-zero is `FAIL`, timeout/start failure is `ERROR`.
- `manual`: no matching human approval is `PENDING`.

See [contracts.example.json](examples/contracts.example.json). The `SentinelProvider` interface leaves room for future adapters such as Playwright, TestSprite, GitHub Actions, Sentry, HTTP, file, log, and UI evidence, but none is bundled in 0.1.0.

### Human approval

`gilgal sentinel approve <contract-id>` records evidence supplied by an authorized human. It is not part of `check` and must not be invoked automatically by an AI agent merely to open the gate.

Approval stores only the contract id, timestamp, STABLE SHA, and CANDIDATE SHA. It requires a clean working tree. A change to either SHA makes the previous approval `STALE`; the contract becomes `PENDING`. `revoke` removes the local approval.

## Baselines and regression

Verified STABLE results may be committed as:

```text
.gilgal/baselines/<stable-sha>.json
```

```json
{
  "stableSha": "abc123...",
  "contracts": {
    "login-flow": "PASS"
  }
}
```

Sentinel only reads an exact-SHA baseline. Missing entries are `NOT_RECORDED`, never inferred as `PASS`. A contract with STABLE `PASS` and CANDIDATE `FAIL` is a regression; a critical regression blocks the gate.

## Gate and exit codes

`READY` requires no critical `FAIL`/`ERROR`, no critical `PENDING`, and no critical regression. Non-critical failures are advisory unless `gate.blockOnNonCriticalFailure` is true.

```text
0  READY / PASS
1  BLOCKED / FAIL
2  BLOCKED / PENDING
3  configuration error
4  internal error
```

An interrupted CLI conventionally returns 130.

## Files and security policy

Configuration, contracts, and verified baselines are intended to be versioned. Approvals, last status, and generated reports are local evidence and are ignored by this repository by default:

```text
.gilgal/state/
.gilgal/reports/
```

The Git client has an allowlist limited to `status`, `rev-parse`, `diff`, `merge-base`, and `log`. The same allowlist blocks a configured command from directly invoking a mutating Git subcommand. Read-only commands (`check`, `status`, and `report`) never execute promotion or destructive Git operations. `approve`, `revoke`, and `reset` only mutate local Sentinel state.

Sentinel never executes commands found in README files, issues, commit messages, diffs, or source comments. It does not collect telemetry or personal identity data.

## External test engines

A test engine executes a particular test. Sentinel aggregates evidence from multiple engines, compares it with verified STABLE behavior, detects regressions, and determines whether the GILGAL Gate requirements are satisfied.

TestSprite can be a future external QA engine whose result feeds a contract. Sentinel is not a TestSprite clone, and 0.1.0 has no TestSprite dependency.
