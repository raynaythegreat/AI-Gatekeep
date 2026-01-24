import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const headers = await buildChatApiHeaders();
    const opencodezenKey = headers['X-API-Key-Opencodezen'] || process.env.OPENCODE_API_KEY;

    if (!opencodezenKey || !opencodezenKey.trim()) {
      return NextResponse.json({
        error: "OpenCode Zen API key is not configured"
      }, { status: 400 });
    }

    const response = await fetch("https://opencode.ai/zen/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${opencodezenKey.trim()}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenCode Zen models fetch error:', errorText);
      return NextResponse.json({
        error: `Failed to fetch OpenCode Zen models: ${response.status}`,
        models: []
      }, { status: response.status });
    }

    const data = await response.json();

    const models = Array.isArray(data?.data) ? data.data.map((model: any) => ({
      id: `opencode:${model.id || model.model}`,
      name: model.name || model.id || model.model,
      description: model.description || 'OpenCode Zen model',
      provider: 'opencodezen' as const
    })) : [];

    return NextResponse.json({
      success: true,
      models
    });

  } catch (error) {
    console.error('OpenCode Zen models fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch OpenCode Zen models',
      models: []
    }, { status: 500 });
  }
}
