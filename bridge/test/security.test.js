import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWorkspaceGuard } from "../src/security.js";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "gilgal-bridge-"));
  await mkdir(path.join(root, "src", "printing"), { recursive: true });
  await writeFile(path.join(root, "src", "printing", "bridge.js"), "export const duplex = false;\n");
  await writeFile(path.join(root, ".env"), "TOKEN=do-not-read\n");
  return root;
}

test("allows a file inside the configured prefix", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const guard = await createWorkspaceGuard({ root, allowedPrefixes: ["src/printing"] });

  const safe = await guard.resolveFile("src/printing/bridge.js");

  assert.equal(safe.relativePath.replaceAll("\\", "/"), "src/printing/bridge.js");
});

test("denies traversal outside the workspace", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const guard = await createWorkspaceGuard({ root });

  await assert.rejects(() => guard.resolveFile("../outside.txt"), /GILGAL_PATH_TRAVERSAL_DENIED/);
});

test("denies secret-like files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const guard = await createWorkspaceGuard({ root });

  await assert.rejects(() => guard.resolveFile(".env"), /GILGAL_SECRET_PATH_DENIED/);
});

test("denies files outside the allowed prefix", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const guard = await createWorkspaceGuard({ root, allowedPrefixes: ["docs"] });

  await assert.rejects(
    () => guard.resolveFile("src/printing/bridge.js"),
    /GILGAL_PATH_OUTSIDE_ALLOWED_SCOPE/
  );
});

test("denies a symlink that escapes the workspace", async (t) => {
  const root = await fixture();
  const outside = await mkdtemp(path.join(tmpdir(), "gilgal-outside-"));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true })
  ]));
  const outsideFile = path.join(outside, "outside.txt");
  await writeFile(outsideFile, "outside\n");

  try {
    await symlink(outsideFile, path.join(root, "src", "printing", "escape.txt"));
  } catch (error) {
    if (error && (error.code === "EPERM" || error.code === "EACCES")) {
      t.skip("symlink creation is not permitted on this runner");
      return;
    }
    throw error;
  }

  const guard = await createWorkspaceGuard({ root });
  await assert.rejects(
    () => guard.resolveFile("src/printing/escape.txt"),
    /GILGAL_SYMLINK_ESCAPE_DENIED/
  );
});

test("denies oversized files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "src", "printing", "large.txt"), "x".repeat(32));
  const guard = await createWorkspaceGuard({ root, maxFileBytes: 16 });

  await assert.rejects(
    () => guard.resolveFile("src/printing/large.txt"),
    /GILGAL_FILE_TOO_LARGE/
  );
});
