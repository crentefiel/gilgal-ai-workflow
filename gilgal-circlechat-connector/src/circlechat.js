export function parseCircleChatEvent(payload) {
  const text = payload?.message?.content ?? payload?.content ?? "";
  const marker = /(?:@gilgal|gilgal:)\s*(.+)/is.exec(text);
  if (!marker) return null;
  return {
    id: payload?.task?.id || payload?.message?.id || crypto.randomUUID(),
    goal: marker[1].trim(),
    acceptanceCriteria: payload?.task?.acceptanceCriteria?.length
      ? payload.task.acceptanceCriteria
      : ["Entregar um resultado verificável para o objetivo informado"],
    knownGood: payload?.task?.knownGood || [],
    candidateSha: payload?.task?.candidateSha || null,
    replyTarget: payload?.channel?.id || payload?.channelId || null,
  };
}

export function toCircleChatActions(run) {
  const summary = run.outputs.synthesizer;
  return [
    { type: "post_message", content: `## Resultado provisório do GILGAL\n\n${summary}` },
    {
      type: "post_message",
      content: `**Gate:** ${run.gate.promotable ? "PROMOTABLE" : "BLOCKED"}\n\n${run.gate.reason}\n\nEstado: \`${run.status}\``,
    },
  ];
}
