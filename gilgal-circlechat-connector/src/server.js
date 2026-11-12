import http from "node:http";
import { loadConfig } from "./config.js";
import { FreeLlmClient } from "./free-llm-client.js";
import { GilgalOrchestrator } from "./orchestrator.js";
import { parseCircleChatEvent, toCircleChatActions } from "./circlechat.js";

const config = loadConfig();
const orchestrator = new GilgalOrchestrator({
  llm: new FreeLlmClient(config.freeLlm),
  policy: config.policy,
  maxRounds: config.maxRounds,
});

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, { status: "ok", service: "gilgal-circlechat-connector" });
  }
  if (request.method !== "POST" || request.url !== "/circlechat/events") {
    return json(response, 404, { error: "not_found" });
  }

  try {
    const payload = await readJson(request);
    const task = parseCircleChatEvent(payload);
    if (!task) return json(response, 200, { actions: [], ignored: true });
    const run = await orchestrator.run(task);
    return json(response, 200, { actions: toCircleChatActions(run), gilgal: run });
  } catch (error) {
    return json(response, 500, { error: "orchestration_failed", message: error.message });
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`GILGAL connector listening on :${config.port}`);
});

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
