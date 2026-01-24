import { NextRequest, NextResponse } from "next/server";
import { SecureStorage } from "@/lib/secureStorage";
import { NgrokService } from "@/services/ngrok";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized - stop deployment only allowed from localhost" },
      { status: 403 }
    );
  }

  try {
    // For localStorage-based system, return success
    // Actual deployment cleanup happens client-side
    return NextResponse.json({
      success: true,
      message: 'Mobile deployment stopped. Please clear deployment data in browser localStorage.'
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to stop deployment'
      },
      { status: 500 }
    );
  }
}