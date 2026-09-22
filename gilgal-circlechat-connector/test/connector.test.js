import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";
import { selectModel } from "../src/roles.js";
import { parseCircleChatEvent, toCircleChatActions } from "../src/circlechat.js";
import { GilgalOrchestrator } from "../src/orchestrator.js";

test("loads safe defaults", () => {
  const config = loadConfig({ CIRCLECHAT_BASE_URL: "http://circle/api/", FREELLM_BASE_URL: "http://llm/v1/" });
  assert.equal(config.circleChat.baseUrl, "http://circle/api");
  assert.equal(config.freeLlm.baseUrl, "http://llm/v1");
  assert.equal(config.dryRun, true);
});

test("assigns fusion only to council synthesizer", () => {
  assert.equal(selectModel("synthesizer", "council"), "fusion");
  assert.equal(selectModel("architect", "auto"), "auto");
  assert.equal(selectModel("reviewer", "specialist"), "frontier");
});

test("ignores messages that do not invoke GILGAL", () => {
  assert.equal(parseCircleChatEvent({ content: "bom dia" }), null);
});

test("orchestrates six independent roles and remains blocked without execution evidence", async () => {
  const calls = [];
  const llm = {
    async complete(input) {
      calls.push(input);
      return { content: `resposta-${input.metadata.role}`, requestedModel: input.model, resolvedModel: `provider/${input.model}`, usage: null };
    },
  };
  const orchestrator = new GilgalOrchestrator({ llm, policy: "council" });
  const result = await orchestrator.run({
    id: "T-1",
    goal: "Criar um site",
    acceptanceCriteria: ["Página abre"],
    knownGood: ["README preservado"],
    candidateSha: "abc123",
  });
  assert.equal(calls.length, 6);
  assert.equal(calls.at(-1).model, "fusion");
  assert.equal(result.evidence.length, 6);
  assert.equal(result.evidence[0].candidateSha, "abc123");
  assert.equal(result.gate.promotable, false);
  assert.match(toCircleChatActions(result)[1].content, /BLOCKED/);
});
