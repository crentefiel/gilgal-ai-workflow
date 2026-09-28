import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rank = new Map([
  ["FAIL", 0],
  ["PENDING", 1],
  ["PASS", 2],
  ["KNOWN_GOOD", 2],
]);

function authenticatedAcceptance(acceptance, sha) {
  return Boolean(
    acceptance &&
    acceptance.authenticated === true &&
    acceptance.candidateSha === sha &&
    acceptance.actorId &&
    acceptance.decisionId &&
    acceptance.rationale &&
    acceptance.decidedAt
  );
}

function hasVerifiedEvidence(capability, sha) {
  return capability.evidence?.some(
    (evidence) => evidence.status === "VERIFIED" && evidence.sha === sha,
  ) === true;
}

function candidateDecision(candidate) {
  const relevant = candidate.capabilities.filter(
    (capability) => capability.mandatory || capability.target,
  );

  if (
    relevant.some(
      (capability) => !hasVerifiedEvidence(capability, candidate.sha),
    )
  ) {
    return "BLOCKED";
  }

  const regression = candidate.capabilities.some(
    (capability) =>
      capability.mandatory &&
      capability.stableStatus === "KNOWN_GOOD" &&
      capability.candidateStatus !== "PASS" &&
      !authenticatedAcceptance(capability.humanAcceptance, candidate.sha),
  );

  if (regression) return "REGRESSION_QUARANTINE";

  const improvedTarget = candidate.capabilities.some(
    (capability) =>
      capability.target === true &&
      rank.has(capability.stableStatus) &&
      rank.has(capability.candidateStatus) &&
      rank.get(capability.candidateStatus) > rank.get(capability.stableStatus),
  );

  return improvedTarget ? "PROMOTABLE" : "NO_WINNER";
}

function scenarioDecision(scenario) {
  const decisions = scenario.candidates.map(candidateDecision);
  if (decisions.includes("PROMOTABLE")) return "PROMOTABLE";
  if (scenario.candidates.length === 1) return decisions[0];
  return decisions.includes("BLOCKED") ? "BLOCKED" : "NO_WINNER";
}

const input = JSON.parse(
  await readFile(new URL("./scenarios.json", import.meta.url), "utf8"),
);

let passed = 0;
for (const scenario of input.scenarios) {
  const actual = scenarioDecision(scenario);
  assert.equal(actual, scenario.expected, scenario.id);
  console.log(`PASS ${scenario.id} -> ${actual}`);
  passed += 1;
}
console.log(`${passed}/${input.scenarios.length} scenarios passed`);
