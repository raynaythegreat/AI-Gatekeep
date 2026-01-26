import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies a request from mobile (Vercel) to desktop (localhost via ngrok).
 * Used in mobile mode when OS_REMOTE_MODE=true.
 */
export async function proxyRequest(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  const publicUrl = process.env.OS_PUBLIC_URL;

  if (!publicUrl) {
    return NextResponse.json(
      { error: 'OS_PUBLIC_URL not configured. Cannot connect to desktop.' },
      { status: 500 }
    );
  }

  // Build target URL
  const targetUrl = new URL(targetPath, publicUrl);

  // Forward headers (but skip x- headers and host)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!key.startsWith('x-') && key !== 'host' && key !== 'cookie') {
      headers.set(key, value);
    }
  });

  // Add special headers to indicate this is a proxied request
  headers.set('x-forwarded-for', request.headers.get('x-forwarded-for') || 'unknown');
  headers.set('x-mobile-proxy', 'true');

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      // @ts-ignore - duplex option is valid in Node 18+
      duplex: 'half',
    });

    // Create response with proxied headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip certain headers
      if (key !== 'transfer-encoding' && key !== 'connection') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to local OS Athena',
        details: 'Ensure your desktop app is running and the tunnel is active',
      },
      { status: 503 }
    );
  }
}
