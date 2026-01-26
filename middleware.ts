import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isRemoteMode = process.env.OS_REMOTE_MODE === 'true';

  if (!isRemoteMode) {
    // Desktop mode - normal routing
    return NextResponse.next();
  }

  // Mobile mode logic
  const { pathname } = request.nextUrl;

  // Allow login page and API routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('mobile-auth');

  if (!authCookie && pathname !== '/login') {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // In mobile mode, redirect root to mobile chat
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/mobile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
