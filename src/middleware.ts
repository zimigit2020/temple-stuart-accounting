import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware: Protect app routes.
 * Public: /, /api/auth/*, static assets
 * Protected: /hub, /dashboard, /trading, /business, etc.
 */

const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/pricing',
  '/api/stripe/webhook',
  '/opengraph-image',
  '/terms',
  '/privacy',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

async function hasValidCustomAuth(request: NextRequest): Promise<boolean> {
  const customTokenPayload = await getToken({
    req: request,
    secret: process.env.JWT_SECRET,
    cookieName: 'auth-token',
  });
  if (!customTokenPayload || !customTokenPayload.userId) return false;

  // Bind the helper cookie to JWT claims to prevent cookie tampering.
  const userEmailCookie = request.cookies.get('userEmail')?.value;
  if (userEmailCookie) {
    const tokenEmail = typeof customTokenPayload.email === 'string' ? customTokenPayload.email : null;
    if (!tokenEmail) return false;
    if (tokenEmail.toLowerCase() !== userEmailCookie.toLowerCase()) return false;
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public paths through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const customAuthValid = await hasValidCustomAuth(request);
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  });

  if (!customAuthValid && !nextAuthToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
