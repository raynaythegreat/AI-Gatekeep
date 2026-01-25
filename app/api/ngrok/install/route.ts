import { NextRequest, NextResponse } from "next/server";
import { installNgrok, checkNgrokInstalled } from "@/lib/ngrok-installer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Check if ngrok is already installed
  try {
    const status = await checkNgrokInstalled();

    return NextResponse.json({
      installed: status.installed,
      path: status.path,
      version: status.version,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to check ngrok status",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check if request is from localhost
  const host = request.headers.get("host") || "";
  const isLocalhost =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0") ||
    host.startsWith("[::1]");

  if (!isLocalhost) {
    return NextResponse.json(
      { error: "Ngrok installation only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;

    const progressMessages: string[] = [];

    const result = await installNgrok({
      onProgress: (message, percent) => {
        progressMessages.push(message);
        // In a real implementation, you might use Server-Sent Events
        // for real-time progress updates
      },
      force,
    });

    return NextResponse.json({
      ...result,
      progress: progressMessages,
    });
  } catch (error) {
    console.error("Ngrok installation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Installation failed",
      },
      { status: 500 }
    );
  }
}
