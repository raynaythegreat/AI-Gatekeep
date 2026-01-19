import { NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

async function checkUrl(url: string, headers: Record<string, string> = {}) {
  try {
    const start = Date.now();
    const res = await fetch(url, { method: "HEAD", headers, cache: "no-store" });
    return {
      status: res.ok ? "healthy" : "unhealthy",
      latency: Date.now() - start,
      code: res.status
    };
  } catch (err) {
    return { status: "offline", latency: 0, error: "Connection failed" };
  }
}

export async function GET() {
  const env = getRuntimeEnv();
  
  const checks = {
    github: await checkUrl("https://api.github.com", env.GITHUB_TOKEN ? { Authorization: `token ${env.GITHUB_TOKEN}` } : {}),
    openai: env.OPENAI_API_KEY ? await checkUrl("https://api.openai.com/v1/models", { Authorization: `Bearer ${env.OPENAI_API_KEY}` }) : { status: "not_configured" },
    anthropic: env.ANTHROPIC_API_KEY ? await checkUrl("https://api.anthropic.com/v1/messages", { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }) : { status: "not_configured" },
    vercel: env.VERCEL_TOKEN ? await checkUrl("https://api.vercel.com/v9/projects", { Authorization: `Bearer ${env.VERCEL_TOKEN}` }) : { status: "not_configured" },
    render: env.RENDER_API_KEY ? await checkUrl("https://api.render.com/v1/services", { Authorization: `Bearer ${env.RENDER_API_KEY}` }) : { status: "not_configured" },
    ollama: await checkUrl("http://localhost:11434/api/tags")
  };

  return NextResponse.json({
    timestamp: Date.now(),
    checks
  });
}