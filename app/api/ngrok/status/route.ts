import { NextRequest, NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/runtime";
import { ensureNgrokTunnel, getNgrokPublicUrl } from "@/lib/ngrok";
import { resolveCommand } from "@/lib/command";

export const dynamic = "force-dynamic";

function isLocalHostRequest(request: NextRequest) {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

interface NgrokStatusResponse {
  installed: boolean;
  running: boolean;
  tunnelUrl?: string;
  port?: number;
  canAutostart: boolean;
  platform: string;
  installInstructions?: {
    command: string;
    description: string;
  };
}

async function getNgrokStatus(port = 3456): Promise<NgrokStatusResponse> {
  const platform = process.platform;
  const ngrokPath = resolveCommand("ngrok");
  const installed = !!ngrokPath;

  // Check if ngrok agent is running
  const tunnelUrl = await getNgrokPublicUrl(port, 2000);
  const running = !!tunnelUrl;

  const response: NgrokStatusResponse = {
    installed,
    running,
    tunnelUrl: tunnelUrl || undefined,
    port,
    canAutostart: installed,
    platform,
  };

  // Add installation instructions if not installed
  if (!installed) {
    if (platform === "linux") {
      response.installInstructions = {
        command: "curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok",
        description: "Install ngrok via apt repository",
      };
    } else if (platform === "darwin") {
      response.installInstructions = {
        command: "brew install ngrok",
        description: "Install ngrok via Homebrew",
      };
    } else if (platform === "win32") {
      response.installInstructions = {
        command: "winget install ngrok.ngrok",
        description: "Install ngrok via winget",
      };
    }
  }

  return response;
}

export async function GET(request: NextRequest) {
  const { onCloud } = getRuntimeEnv();
  if (onCloud) {
    return NextResponse.json(
      { error: "Ngrok management is only available locally" },
      { status: 403 }
    );
  }

  if (!isLocalHostRequest(request)) {
    return NextResponse.json(
      { error: "This endpoint is only available from localhost" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const port = parseInt(searchParams.get("port") || "3456");

    const status = await getNgrokStatus(port);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get ngrok status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get ngrok status",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { onCloud } = getRuntimeEnv();
  if (onCloud) {
    return NextResponse.json(
      { error: "Ngrok management is only available locally" },
      { status: 403 }
    );
  }

  if (!isLocalHostRequest(request)) {
    return NextResponse.json(
      { error: "This endpoint is only available from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const port = body.port || 3456;
    const action = body.action; // 'start' or 'check'

    if (action === "start" || action === "ensure") {
      const result = await ensureNgrokTunnel(port);

      if (result.publicUrl) {
        return NextResponse.json({
          success: true,
          running: true,
          tunnelUrl: result.publicUrl,
          started: result.started,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to start ngrok",
          },
          { status: 500 }
        );
      }
    }

    // Default to status check
    const status = await getNgrokStatus(port);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to process ngrok request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}
