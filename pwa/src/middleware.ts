import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Constant-time string comparison to prevent timing attacks. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const ADMIN_JWT_SECRET = () => new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-admin-secret'
);

async function verifyAdminCookie(cookieValue: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(cookieValue, ADMIN_JWT_SECRET());
    return typeof payload.admin_id === 'string' && !!payload.admin_id;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: check Origin header for state-changing API requests
  if (
    pathname.startsWith('/api/') &&
    MUTATING_METHODS.has(req.method) &&
    !pathname.startsWith('/api/telegram/webhook') &&
    !pathname.startsWith('/api/max/webhook') &&
    !pathname.startsWith('/api/avito/webhook') &&
    !pathname.startsWith('/api/payment/callback')
  ) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'CSRF rejected' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'CSRF rejected' }, { status: 403 });
      }
    }
  }

  // Protect admin API routes
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/login') && !pathname.startsWith('/api/admin/verify-pin')) {
    // 1. Try admin_session cookie (multi-admin JWT)
    const adminCookie = req.cookies.get('admin_session')?.value;
    if (adminCookie && await verifyAdminCookie(adminCookie)) {
      return NextResponse.next();
    }

    // 2. Fallback: x-admin-pin header (legacy PIN)
    const pin = req.headers.get('x-admin-pin') ?? '';
    const adminPin = process.env.ADMIN_PIN;

    if (adminPin && constantTimeEqual(pin, adminPin)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
