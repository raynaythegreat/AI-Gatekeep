import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if there's a deployment stored in the request headers (from client)
    const deploymentId = request.headers.get('x-mobile-deployment-id');
    const publicUrl = request.headers.get('x-mobile-public-url');
    const mobileUrl = request.headers.get('x-mobile-url');
    const active = request.headers.get('x-mobile-active') === 'true';

    // If no headers, the client will check localStorage directly
    // Return structure that matches what the mobile page expects
    return NextResponse.json({
      active: active || false,
      url: publicUrl || null,
      id: deploymentId || null,
      tunnelId: deploymentId || null,
      publicUrl: publicUrl || null,
      mobileUrl: mobileUrl || null,
      deploymentId: deploymentId || null,
      createdAt: null
    });
  } catch (error) {
    console.error('Get deployment status error:', error);

    return NextResponse.json({
      error: 'Failed to get deployment status'
    }, { status: 500 });
  }
}