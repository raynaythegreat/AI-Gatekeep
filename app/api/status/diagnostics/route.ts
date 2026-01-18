import { NextResponse } from "next/server";
import { ok } from "@/lib/apiResponse";
import { getOllamaBaseUrl, getPlatformHint, getRuntimeEnv, summarizeProvidersFromEnv } from "@/lib/config/runtime";
import { normalizeBaseUrl } from "@/lib/config/schema";

export const dynamic = "force-dynamic";

async function checkOllamaReachable(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const env = getRuntimeEnv();
  const platformHint = getPlatformHint();

  const providers = summarizeProvidersFromEnv();
  const ollamaBaseUrl = getOllamaBaseUrl();
  const reachable = ollamaBaseUrl ? await checkOllamaReachable(ollamaBaseUrl) : null;

  return ok({
    runtime: {
      nodeEnv: env.NODE_ENV ?? "production",
      platformHint
    },
    providers: {
      ...providers,
      ollama: {
        baseUrl: ollamaBaseUrl,
        reachable
      }
    },
    meta: {
      refreshedAt: Date.now()
    }
  });
}