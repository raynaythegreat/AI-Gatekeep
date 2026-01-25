import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";
import { NgrokService } from "@/services/ngrok";
import { VercelService } from "@/services/vercel";
import { getServerApiKey } from "@/lib/serverKeys";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Tunnel recovery only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { projectName, repository } = body;

    if (!projectName || !repository) {
      return NextResponse.json(
        { error: "Missing required fields: projectName, repository" },
        { status: 400 }
      );
    }

    const headers = await buildChatApiHeaders();
    const ngrokKey = getServerApiKey('ngrok', headers);
    const vercelKey = getServerApiKey('vercel', headers);

    if (!ngrokKey || !vercelKey) {
      return NextResponse.json(
        { error: "Missing required API keys (ngrok, vercel)" },
        { status: 400 }
      );
    }

    const ngrok = new NgrokService(ngrokKey);
    const vercel = new VercelService(vercelKey);

    // Create a new tunnel
    const tunnel = await ngrok.createTunnel({
      port: 3456,
      proto: 'http'
    });

    // Update Vercel environment variables with the new tunnel URL
    try {
      await vercel.updateProjectEnvironmentVariables(projectName, [
        {
          key: 'OS_PUBLIC_URL',
          value: tunnel.public_url,
          target: ['production', 'preview']
        },
        {
          key: 'NGROK_TUNNEL_ID',
          value: tunnel.id,
          target: ['production', 'preview']
        }
      ]);
    } catch (envError) {
      console.error('Failed to update Vercel env vars:', envError);
      // Continue anyway - tunnel is created, env var update is secondary
    }

    return NextResponse.json({
      success: true,
      tunnel: {
        id: tunnel.id,
        public_url: tunnel.public_url
      },
      message: "Tunnel recovered successfully"
    });
  } catch (error) {
    console.error('Tunnel recovery error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to recover tunnel' },
      { status: 500 }
    );
  }
}
