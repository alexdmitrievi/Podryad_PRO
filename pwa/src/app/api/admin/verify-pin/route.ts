import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPin } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ua = req.headers.get('user-agent') ?? undefined;

  // Shared rate limiter (Upstash + in-memory fallback)
  const rl = await checkRateLimit(`pin:${clientIp}`, 5, 15 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { valid: false, error: 'Слишком много попыток. Повторите через 15 минут.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'invalid_json' }, { status: 400 });
  }

  const pin = body.pin ?? '';
  const result = await verifyAdminPin(pin);

  if (result.valid) {
    await resetRateLimit(`pin:${clientIp}`);
    void writeAuditLog({
      admin_id: result.adminId,
      admin_username: result.username,
      action: 'POST /api/admin/verify-pin',
      endpoint: '/api/admin/verify-pin',
      ip_address: clientIp,
      user_agent: ua,
      details: { success: true },
    });
    return NextResponse.json({ valid: true, admin: { id: result.adminId, username: result.username } });
  }

  void writeAuditLog({
    admin_id: undefined,
    admin_username: undefined,
    action: 'POST /api/admin/verify-pin (failed)',
    endpoint: '/api/admin/verify-pin',
    ip_address: clientIp,
    user_agent: ua,
    details: { success: false },
  });

  return NextResponse.json({ valid: false });
}
