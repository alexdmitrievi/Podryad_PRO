import { NextRequest, NextResponse } from 'next/server';
import { createMaterialRequest } from '@/lib/db';
import { normalizePhone } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (phoneRaw.length < 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  const phone = normalizePhone(phoneRaw);

  try {
    await createMaterialRequest(phone);
  } catch (e) {
    console.error('createMaterialRequest:', e);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Telegram notification to admin
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (botToken && adminId) {
    const text = `📦 Заявка на материалы\nТелефон: +${phone}`;
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminId, text }),
    }).catch((e) => console.error('Telegram notify failed:', e));
  }

  return NextResponse.json({ ok: true });
}
