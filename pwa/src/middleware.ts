import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: check Origin header for state-changing API requests
  // Skip webhook endpoints — they come from external servers (Telegram, MAX, etc.)
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

  // Protect admin API routes (except verify-pin which is the auth entry point)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/verify-pin')) {
    const pin = req.headers.get('x-admin-pin') ?? '';
    const adminPin = process.env.ADMIN_PIN;

    if (!adminPin || !constantTimeEqual(pin, adminPin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
