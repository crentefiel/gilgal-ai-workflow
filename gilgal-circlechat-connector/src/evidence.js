import { createHash, randomUUID } from "node:crypto";

export function createEvidence({ taskId, role, result, candidateSha = null }) {
  const body = {
    id: randomUUID(),
    taskId,
    role,
    candidateSha,
    requestedModel: result.requestedModel,
    resolvedModel: result.resolvedModel,
    usage: result.usage,
    outputSha256: createHash("sha256").update(result.content).digest("hex"),
    createdAt: new Date().toISOString(),
    assurance: candidateSha ? "SHA_BOUND_UNVERIFIED" : "UNBOUND_DRAFT",
  };
  return body;
}
