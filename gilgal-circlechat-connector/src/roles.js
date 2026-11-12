export const ROLES = Object.freeze({
  architect: {
    route: "frontier",
    purpose: "Transform the request into an explicit plan and acceptance criteria.",
  },
  coderA: {
    route: "balanced",
    purpose: "Produce the primary implementation proposal.",
  },
  coderB: {
    route: "advisor",
    purpose: "Produce an independent alternative and identify hidden assumptions.",
  },
  reviewer: {
    route: "frontier",
    purpose: "Find regressions, security issues and unsupported claims.",
    mustDifferFrom: ["coderA"],
  },
  tester: {
    route: "economy",
    purpose: "Define executable checks and inspect supplied evidence.",
  },
  synthesizer: {
    route: "fusion",
    purpose: "Compare candidates without inventing evidence and return NO_WINNER when needed.",
  },
});

export function selectModel(role, policy, overrides = {}) {
  if (overrides[role]) return overrides[role];
  if (policy === "auto") return "auto";
  if (policy === "council" && role === "synthesizer") return "fusion";
  return ROLES[role]?.route || "auto";
}
