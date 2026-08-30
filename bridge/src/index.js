#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { createWorkspaceGuard } from "./security.js";

const execFileAsync = promisify(execFile);
const MAX_TEXT_OUTPUT = 512 * 1024;

function textResult(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text: text.slice(0, MAX_TEXT_OUTPUT) }] };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : "GILGAL_UNKNOWN_ERROR";
  return { isError: true, content: [{ type: "text", text: message }] };
}

async function git(root, args) {
  const safeGitArgs = [
    "--no-optional-locks",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "core.untrackedCache=false",
    "-C",
    root,
    ...args
  ];
  const { stdout } = await execFileAsync("git", safeGitArgs, {
    encoding: "utf8",
    maxBuffer: MAX_TEXT_OUTPUT,
    windowsHide: true,
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      GIT_EXTERNAL_DIFF: ""
    }
  });
  return stdout.trim();
}

async function buildServer() {
  const configuredRoot = process.env.GILGAL_WORKSPACE_ROOT;
  if (!configuredRoot) {
    throw new Error("GILGAL_WORKSPACE_ROOT_REQUIRED");
  }

  const allowedPrefixes = (process.env.GILGAL_ALLOWED_PATHS || ".")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const guard = await createWorkspaceGuard({
    root: path.resolve(configuredRoot),
    allowedPrefixes
  });

  const server = new McpServer({
    name: "gilgal-bridge-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "gilgal_status",
    {
      description: "Read the authorized workspace Git identity and clean/dirty status. This tool never writes.",
      inputSchema: z.object({})
    },
    async () => {
      try {
        const [branch, head, porcelain] = await Promise.all([
          git(guard.root, ["rev-parse", "--abbrev-ref", "HEAD"]),
          git(guard.root, ["rev-parse", "HEAD"]),
          git(guard.root, ["status", "--porcelain=v1"])
        ]);
        return textResult({
          workspaceRoot: guard.root,
          branch,
          headSha: head,
          clean: porcelain === "",
          changedEntries: porcelain === "" ? [] : porcelain.split("\n"),
          stableRef: process.env.GILGAL_STABLE_REF || null,
          mode: "READ_ONLY"
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "gilgal_read_task",
    {
      description: "Read and parse a GILGAL Task JSON file inside the authorized workspace.",
      inputSchema: z.object({
        path: z.string().default("network/demo/task.json")
      })
    },
    async ({ path: taskPath }) => {
      try {
        const safe = await guard.resolveFile(taskPath);
        const raw = await readFile(safe.absolutePath, "utf8");
        const task = JSON.parse(raw);
        if (task.kind !== "TASK") {
          throw new Error("GILGAL_TASK_KIND_REQUIRED");
        }
        return textResult({ path: safe.relativePath, task });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "gilgal_list_files",
    {
      description: "List immediate non-secret entries in an authorized directory. This tool does not recurse.",
      inputSchema: z.object({
        path: z.string().default("."),
        limit: z.number().int().min(1).max(500).default(200)
      })
    },
    async ({ path: directoryPath, limit }) => {
      try {
        const safe = await guard.resolveDirectory(directoryPath);
        const entries = await readdir(safe.absolutePath, { withFileTypes: true });
        const visible = entries
          .filter((entry) => !entry.name.startsWith("."))
          .slice(0, limit)
          .map((entry) => ({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
          }));
        return textResult({ path: safe.relativePath || ".", entries: visible, truncated: entries.length > limit });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "gilgal_read_file",
    {
      description: "Read one authorized non-secret UTF-8 text file with a strict size limit.",
      inputSchema: z.object({
        path: z.string()
      })
    },
    async ({ path: filePath }) => {
      try {
        const safe = await guard.resolveFile(filePath);
        const content = await readFile(safe.absolutePath, "utf8");
        if (content.includes("\u0000")) {
          throw new Error("GILGAL_BINARY_FILE_DENIED");
        }
        return textResult({ path: safe.relativePath, bytes: safe.stat.size, content });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "gilgal_git_diff",
    {
      description: "Read a Git diff for an authorized file or directory. No shell is used and no write occurs.",
      inputSchema: z.object({
        path: z.string().default("."),
        staged: z.boolean().default(false)
      })
    },
    async ({ path: diffPath, staged }) => {
      try {
        let safe;
        try {
          safe = await guard.resolveFile(diffPath);
        } catch {
          safe = await guard.resolveDirectory(diffPath);
        }
        const args = ["diff", "--no-ext-diff", "--no-textconv", "--no-color"];
        if (staged) args.push("--cached");
        args.push("--", safe.relativePath || ".");
        return textResult({
          path: safe.relativePath || ".",
          staged,
          diff: await git(guard.root, args)
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  return server;
}

async function main() {
  const server = await buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write("GILGAL_BRIDGE_START_FAILED: " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
