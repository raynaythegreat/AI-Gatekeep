import { NextRequest, NextResponse } from "next/server";
import { buildChatApiHeaders } from "@/lib/chatHeaders";
import { VercelService } from "@/services/vercel";
import { SecureStorage } from "@/lib/secureStorage";

export const dynamic = 'force-dynamic';

function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
}

export async function POST(request: NextRequest) {
  if (!isLocalhostRequest(request)) {
    return NextResponse.json(
      { error: "Password change only allowed from localhost" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const { newPassword } = body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
    return NextResponse.json(
      { error: "New password is required (minimum 4 characters)" },
      { status: 400 }
    );
  }

  try {
    await SecureStorage.saveKeys({ mobilePassword: newPassword });
    console.log('Mobile password updated locally');

    const deployment = JSON.parse(localStorage.getItem('mobile-deployment') || '{}');

    if (deployment.projectName) {
      const vercelKey = await SecureStorage.getKey('vercel');
      
      if (vercelKey) {
        const vercel = new VercelService(vercelKey);
        
        await vercel.updateProjectEnvironmentVariables(
          deployment.projectName,
          [{
            key: 'MOBILE_PASSWORD',
            value: newPassword,
            target: ['production', 'preview']
          }]
        );
        
        console.log('Mobile password synced to Vercel:', deployment.projectName);
      } else {
        console.warn('Cannot sync to Vercel - no Vercel key or project name');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mobile password updated successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update password'
      },
      { status: 500 }
    );
  }
}
