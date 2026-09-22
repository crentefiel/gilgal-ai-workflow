const required = ["CIRCLECHAT_BASE_URL", "FREELLM_BASE_URL"];

export function loadConfig(env = process.env) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);

  return {
    port: positiveInteger(env.PORT, 7332),
    publicBaseUrl: env.PUBLIC_BASE_URL || "http://localhost:7332",
    circleChat: {
      baseUrl: stripSlash(env.CIRCLECHAT_BASE_URL),
      token: env.CIRCLECHAT_BOT_TOKEN || "",
    },
    freeLlm: {
      baseUrl: stripSlash(env.FREELLM_BASE_URL),
      apiKey: env.FREELLM_API_KEY || "",
      timeoutMs: positiveInteger(env.GILGAL_REQUEST_TIMEOUT_MS, 120000),
    },
    policy: ["auto", "specialist", "council"].includes(env.GILGAL_DEFAULT_POLICY)
      ? env.GILGAL_DEFAULT_POLICY
      : "specialist",
    maxRounds: Math.min(5, positiveInteger(env.GILGAL_MAX_ROUNDS, 2)),
    dryRun: env.GILGAL_DRY_RUN !== "false",
  };
}

function stripSlash(value) {
  return value.replace(/\/+$/, "");
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
