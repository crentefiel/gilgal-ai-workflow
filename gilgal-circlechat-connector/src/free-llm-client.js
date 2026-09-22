export class FreeLlmClient {
  constructor({ baseUrl, apiKey, timeoutMs = 120000, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async complete({ model = "auto", messages, metadata = {} }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          "x-gilgal-role": metadata.role || "unknown",
        },
        body: JSON.stringify({ model, messages, temperature: 0.2 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`FreeLLMAPI ${response.status}: ${await response.text()}`);
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) throw new Error("FreeLLMAPI returned an empty completion");
      return {
        content,
        requestedModel: model,
        resolvedModel: payload.model || model,
        usage: payload.usage || null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
