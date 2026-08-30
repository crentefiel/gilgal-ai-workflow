# GILGAL Bridge MCP 0.1

A local, read-only bridge between an MCP-capable coding host and one explicitly selected Git workspace.

## What this release does

- reports branch, HEAD SHA and clean/dirty state;
- reads a GILGAL Task JSON;
- lists immediate files in authorized directories;
- reads bounded non-secret text files;
- shows read-only Git diffs.

It cannot write files, run arbitrary commands, commit, push, open PRs, merge or trigger physical actions.

## Requirements

- Node.js 22 or newer;
- Git available on the local machine;
- an MCP host/editor that supports local stdio servers.

A ChatGPT or Gemini subscription alone does not automatically install a local MCP server. Use an editor or coding host with MCP support.

## Install locally

From the repository:

```bash
cd bridge
npm install
npm test
```

Exact direct dependency versions are declared in `package.json`. A lockfile and published package remain release requirements.

## Environment

| Variable | Required | Meaning |
|---|---:|---|
| `GILGAL_WORKSPACE_ROOT` | yes | Absolute path to the one authorized repository |
| `GILGAL_ALLOWED_PATHS` | no | Comma-separated relative path prefixes; default `.` |
| `GILGAL_STABLE_REF` | no | Human-declared protected STABLE branch or SHA shown in status |

No GitHub token or model API key is accepted.

## VS Code workspace configuration

Create `.vscode/mcp.json` in the repository. Replace both absolute paths:

```json
{
  "servers": {
    "gilgal-bridge": {
      "command": "node",
      "args": [
        "C:\\ABSOLUTE\\PATH\\TO\\gilgal-ai-workflow\\bridge\\src\\index.js"
      ],
      "env": {
        "GILGAL_WORKSPACE_ROOT": "C:\\ABSOLUTE\\PATH\\TO\\YOUR\\PROJECT",
        "GILGAL_ALLOWED_PATHS": "network,docs,src/printing",
        "GILGAL_STABLE_REF": "main"
      }
    }
  }
}
```

In VS Code, run `MCP: List Servers`, review the configuration, and start `gilgal-bridge`. Local MCP servers execute code on your computer; review the source before trusting them.

## Example agent request

```text
Use gilgal_status first. Then read network/demo/task.json with gilgal_read_task.
Inspect only authorized paths. Do not claim a file exists until gilgal_list_files or
gilgal_read_file confirms it. Do not claim evidence is VERIFIED.
```

## Security boundaries

- lexical traversal is rejected;
- real paths are checked after symlink resolution;
- secret-like names and key/certificate suffixes are rejected;
- allowed path prefixes are enforced;
- files larger than 256 KiB are rejected;
- binary-looking files are rejected;
- Git uses `execFile`, not a shell;
- stdout is reserved for MCP JSON-RPC messages;
- responses are size-limited.

## Why read-only first

MCP makes tools available to a model; it does not by itself prove that every tool invocation is safe. GILGAL separates inspection from mutation. A future write-capable release requires an isolated worktree, exact base SHA, capability grant, allowlisted files, human confirmation, evidence recording and independent state read-back.

## Supported MCP foundation

This prototype follows the official MCP TypeScript SDK v2 stdio pattern and the 2026-07-28 protocol line:

- https://ts.sdk.modelcontextprotocol.io/v2/
- https://github.com/modelcontextprotocol/typescript-sdk
- https://code.visualstudio.com/docs/agent-customization/mcp-servers
