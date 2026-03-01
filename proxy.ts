import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Define paths that don't need authentication
const publicPaths = ['/api/auth/login', '/api/auth/logout', '/api/auth/verify-pin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints unconditionally
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith('/api');
  const isProtectedFrontendRoute = pathname.startsWith('/kasir') || pathname.startsWith('/dashboard');

  // We only run this middleware for API routes and protected frontend routes
  if (!isApiRoute && !isProtectedFrontendRoute) {
    return NextResponse.next();
  }


  // Get the session cookie
  const sessionCookie = request.cookies.get('bestea-session');

  if (!sessionCookie || !sessionCookie.value) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized: No session token provided' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the JWT token
  const payload = await verifyToken(sessionCookie.value);

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Optionally pass user info to routes using headers
  const response = NextResponse.next();
  response.headers.set('x-user-role', String(payload.role));
  response.headers.set('x-employee-id', String(payload.employeeId));
  if (payload.branchId) {
     response.headers.set('x-branch-id', String(payload.branchId));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
