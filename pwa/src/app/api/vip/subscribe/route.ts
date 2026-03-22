import { NextResponse } from 'next/server';
import { getViewerSession } from '@/lib/auth';
import { createPayment } from '@/lib/yukassa';
import crypto from 'crypto';

export async function POST() {
  try {
    const viewer = await getViewerSession();
    if (!viewer) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podryad.pro';

    const payment = await createPayment({
      amount: 1000,
      description: 'VIP-подписка Подряд PRO (1 месяц)',
      returnUrl: `${siteUrl}/vip`,
      metadata: {
        type: 'vip',
        user_id: viewer.user_id,
      },
      idempotenceKey: crypto.randomUUID(),
    });

    return NextResponse.json({ payment_url: payment.confirmationUrl });
  } catch (error) {
    console.error('POST /api/vip/subscribe error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания платежа' },
      { status: 500 },
    );
  }
}
