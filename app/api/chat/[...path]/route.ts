import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Only proxy in remote mode
  if (process.env.OS_REMOTE_MODE !== 'true') {
    return new Response('This route is only available in mobile mode', { status: 404 });
  }

  const targetPath = `/api/chat/${params.path.join('/')}`;
  return proxyRequest(request, targetPath);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
