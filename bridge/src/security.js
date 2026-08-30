import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

const SECRET_SEGMENTS = new Set([
  ".env",
  ".git",
  ".npmrc",
  ".pypirc",
  "credentials",
  "secrets",
  "id_rsa",
  "id_ed25519"
]);

const SECRET_SUFFIXES = [".pem", ".key", ".p12", ".pfx"];

export function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

export function assertNonSecret(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.toLowerCase().split("/");
  if (segments.some((segment) => SECRET_SEGMENTS.has(segment))) {
    throw new Error("GILGAL_SECRET_PATH_DENIED");
  }
  if (segments.some((segment) => segment.includes("token") || segment.includes("secret"))) {
    throw new Error("GILGAL_SECRET_PATH_DENIED");
  }
  if (SECRET_SUFFIXES.some((suffix) => normalized.toLowerCase().endsWith(suffix))) {
    throw new Error("GILGAL_SECRET_PATH_DENIED");
  }
}

export function assertAllowedPrefix(relativePath, allowedPrefixes) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const allowed = allowedPrefixes.some((prefix) => {
    const clean = prefix.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    return clean === "." || normalized === clean || normalized.startsWith(clean + "/");
  });
  if (!allowed) {
    throw new Error("GILGAL_PATH_OUTSIDE_ALLOWED_SCOPE");
  }
}

export async function createWorkspaceGuard({
  root,
  allowedPrefixes = ["."],
  maxFileBytes = DEFAULT_MAX_FILE_BYTES
}) {
  if (!path.isAbsolute(root)) {
    throw new Error("GILGAL_WORKSPACE_ROOT_MUST_BE_ABSOLUTE");
  }

  const realRoot = await realpath(root);

  async function resolveExisting(relativePath, { expectFile = false, expectDirectory = false } = {}) {
    if (typeof relativePath !== "string" || relativePath.trim() === "" || path.isAbsolute(relativePath)) {
      throw new Error("GILGAL_INVALID_RELATIVE_PATH");
    }

    const clean = path.normalize(relativePath);
    const lexical = path.resolve(realRoot, clean);
    if (!isInside(realRoot, lexical)) {
      throw new Error("GILGAL_PATH_TRAVERSAL_DENIED");
    }

    assertNonSecret(clean);
    assertAllowedPrefix(clean, allowedPrefixes);

    const resolved = await realpath(lexical);
    if (!isInside(realRoot, resolved)) {
      throw new Error("GILGAL_SYMLINK_ESCAPE_DENIED");
    }

    const resolvedRelative = path.relative(realRoot, resolved);
    assertNonSecret(resolvedRelative);
    assertAllowedPrefix(resolvedRelative, allowedPrefixes);

    const info = await stat(resolved);
    if (expectFile && !info.isFile()) {
      throw new Error("GILGAL_EXPECTED_FILE");
    }
    if (expectDirectory && !info.isDirectory()) {
      throw new Error("GILGAL_EXPECTED_DIRECTORY");
    }
    if (expectFile && info.size > maxFileBytes) {
      throw new Error("GILGAL_FILE_TOO_LARGE");
    }

    return { absolutePath: resolved, relativePath: path.relative(realRoot, resolved), stat: info };
  }

  return Object.freeze({
    root: realRoot,
    allowedPrefixes: Object.freeze([...allowedPrefixes]),
    maxFileBytes,
    resolveFile: (relativePath) => resolveExisting(relativePath, { expectFile: true }),
    resolveDirectory: (relativePath) => resolveExisting(relativePath, { expectDirectory: true })
  });
}
