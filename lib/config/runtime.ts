import { RuntimeEnvSchema, type RuntimeEnv, normalizeBaseUrl, nonEmpty } from "./schema";

export function getRuntimeEnv(): RuntimeEnv {
  // Only read server-side env vars. Never expose these directly to the client.
  const parsed = RuntimeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Avoid throwing full zod errors with environment details; return best-effort subset.
    return RuntimeEnvSchema.parse({});
  }
  return parsed.data;
}

/**
 * Heuristic: whether we are running packaged desktop.
 * This is a placeholder for future Tauri/Electron detection.
 * For now we assume "web" unless explicitly set.
 */
export function getPlatformHint(): "web" | "desktop" {
  const hint = (process.env.PLATFORM_HINT || "").toLowerCase().trim();
  return hint === "desktop" ? "desktop" : "web";
}

export function getOllamaBaseUrl(): string | null {
  const env = getRuntimeEnv();
  const base = nonEmpty(env.OLLAMA_BASE_URL) ?? "http://127.0.0.1:11434";
  return normalizeBaseUrl(base);
}

export function providerConfiguredFromEnv(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function summarizeProvidersFromEnv() {
  const env = getRuntimeEnv();

  const fireworksConfigured =
    providerConfiguredFromEnv(env.FIREWORKS_API_KEY) || providerConfiguredFromEnv(env.FIREWORKS_IMAGE_API_KEY);

  return {
    anthropic: { configured: providerConfiguredFromEnv(env.ANTHROPIC_API_KEY), source: "env" as const },
    openai: { configured: providerConfiguredFromEnv(env.OPENAI_API_KEY), source: "env" as const },
    groq: { configured: providerConfiguredFromEnv(env.GROQ_API_KEY), source: "env" as const },
    openrouter: { configured: providerConfiguredFromEnv(env.OPENROUTER_API_KEY), source: "env" as const },
    fireworks: { configured: fireworksConfigured, source: "env" as const }
  };
}