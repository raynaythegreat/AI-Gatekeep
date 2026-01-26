import { NextResponse, NextRequest } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";
import { getServerApiKeyFromRequest } from "@/lib/serverKeys";

export const dynamic = "force-dynamic";

type ProviderBilling = {
  configured: boolean;
  currency: string;
  remainingUsd: number | null;
  limitUsd: number | null;
  usedUsd: number | null;
  refreshedAt: number;
  error: string | null;
};

async function fetchOpenAIBilling(apiKey: string): Promise<ProviderBilling> {
  const refreshedAt = Date.now();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const usageRes = await fetch(
      `https://api.openai.com/dashboard/billing/usage?start_date=${new Date().toISOString().slice(0, 10)}&end_date=${new Date().toISOString().slice(0, 10)}`,
      { headers }
    );
    const subRes = await fetch("https://api.openai.com/dashboard/billing/subscription", { headers });

    if (!usageRes.ok || !subRes.ok) throw new Error("Failed to fetch OpenAI billing");

    const usage = await usageRes.json();
    const sub = await subRes.json();

    return {
      configured: true,
      currency: "USD",
      remainingUsd: sub.hard_limit_usd - (usage.total_usage / 100),
      limitUsd: sub.hard_limit_usd,
      usedUsd: usage.total_usage / 100,
      refreshedAt,
      error: null,
    };
  } catch (err: any) {
    return { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt, error: err.message };
  }
}

async function fetchOpenRouterBilling(apiKey: string): Promise<ProviderBilling> {
  const refreshedAt = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("Failed to fetch OpenRouter credits");
    const data = await res.json();
    return {
      configured: true,
      currency: "USD",
      remainingUsd: data.data.usage,
      limitUsd: data.data.limit,
      usedUsd: data.data.usage,
      refreshedAt,
      error: null,
    };
  } catch (err: any) {
    return { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt, error: err.message };
  }
}

export async function GET(request: NextRequest) {
  const env = getRuntimeEnv();
  const results: Record<string, ProviderBilling> = {};
  
  // Get API keys from headers (from SecureStorage) or environment
  const openaiKey = getServerApiKeyFromRequest(request, 'openai');
  const openrouterKey = getServerApiKeyFromRequest(request, 'openrouter');
  const claudeKey = getServerApiKeyFromRequest(request, 'anthropic');
  const groqKey = getServerApiKeyFromRequest(request, 'groq');
  const geminiKey = getServerApiKeyFromRequest(request, 'gemini');
  const fireworksKey = getServerApiKeyFromRequest(request, 'fireworks');
  const mistralKey = getServerApiKeyFromRequest(request, 'mistral');
  const zaiKey = getServerApiKeyFromRequest(request, 'zai');

  if (openaiKey) {
    results.openai = await fetchOpenAIBilling(openaiKey);
  } else {
    results.openai = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (openrouterKey) {
    results.openrouter = await fetchOpenRouterBilling(openrouterKey);
  } else {
    results.openrouter = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  // Set configured status for other providers based on key presence
  if (claudeKey) {
    results.claude = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.claude = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (groqKey) {
    results.groq = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.groq = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (geminiKey) {
    results.gemini = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.gemini = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (fireworksKey) {
    results.fireworks = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.fireworks = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (mistralKey) {
    results.mistral = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.mistral = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  if (zaiKey) {
    results.zai = { configured: true, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  } else {
    results.zai = { configured: false, currency: "USD", remainingUsd: null, limitUsd: null, usedUsd: null, refreshedAt: Date.now(), error: null };
  }

  return NextResponse.json(results);
}