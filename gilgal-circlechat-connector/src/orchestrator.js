import { ROLES, selectModel } from "./roles.js";
import { createEvidence } from "./evidence.js";

export class GilgalOrchestrator {
  constructor({ llm, policy = "specialist", modelOverrides = {}, maxRounds = 2 }) {
    this.llm = llm;
    this.policy = policy;
    this.modelOverrides = modelOverrides;
    this.maxRounds = maxRounds;
  }

  async run(task) {
    validateTask(task);
    const outputs = {};
    const evidence = [];

    for (const role of ["architect", "coderA", "coderB", "reviewer", "tester", "synthesizer"]) {
      const result = await this.llm.complete({
        model: selectModel(role, this.policy, this.modelOverrides),
        metadata: { role, taskId: task.id },
        messages: buildMessages(role, task, outputs),
      });
      outputs[role] = result.content;
      evidence.push(createEvidence({ taskId: task.id, role, result, candidateSha: task.candidateSha }));
    }

    return {
      taskId: task.id,
      status: "AWAITING_EXECUTION_EVIDENCE",
      policy: this.policy,
      outputs,
      evidence,
      gate: {
        promotable: false,
        reason: "LLM output is a proposal, not verified execution evidence.",
      },
    };
  }
}

function buildMessages(role, task, outputs) {
  const context = Object.entries(outputs)
    .map(([name, text]) => `\n## ${name}\n${text}`)
    .join("");
  return [
    {
      role: "system",
      content: [
        `You are the GILGAL ${role}.`,
        ROLES[role].purpose,
        "Never claim tests, builds, browser checks, commits, or human approval that were not observed.",
        "Preserve known-good capabilities. Say NO_WINNER when no candidate satisfies the contract.",
        "Return concise Markdown in Brazilian Portuguese.",
      ].join(" "),
    },
    {
      role: "user",
      content: `TASK ${task.id}\nGoal: ${task.goal}\nAcceptance criteria:\n${task.acceptanceCriteria.map((x) => `- ${x}`).join("\n")}\nKnown-good capabilities:\n${task.knownGood.map((x) => `- ${x}`).join("\n")}${context}`,
    },
  ];
}

function validateTask(task) {
  if (!task?.id || !task?.goal) throw new Error("Task requires id and goal");
  if (!Array.isArray(task.acceptanceCriteria) || task.acceptanceCriteria.length === 0) {
    throw new Error("Task requires at least one acceptance criterion");
  }
  if (!Array.isArray(task.knownGood)) throw new Error("Task knownGood must be an array");
}
