import { NextResponse } from 'next/server';
import { getTelegramIdFromSession } from '@/lib/auth';
import {
  getWorkerByTelegramId,
  getWorkerStats,
} from '@/lib/db';

export async function GET() {
  const telegramId = await getTelegramIdFromSession();
  if (!telegramId) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  const worker = await getWorkerByTelegramId(telegramId);
  if (!worker) {
    return NextResponse.json(
      { error: 'Исполнитель не найден. Зарегистрируйтесь через бота.' },
      { status: 404 }
    );
  }

  const stats = await getWorkerStats(telegramId);

  return NextResponse.json({
    worker: {
      telegram_id: worker.telegram_id,
      username: worker.username,
      name: worker.name,
      phone: worker.phone,
      rating:
        (typeof worker.rating === 'string'
          ? parseFloat(worker.rating)
          : Number(worker.rating)) || 5,
      jobs_count: worker.jobs_count,
      is_vip: Boolean(worker.is_vip),
      vip_expires_at: worker.vip_expires_at,
      skills: worker.skills,
      balance: worker.balance,
      ban_until: worker.ban_until,
      is_selfemployed: Boolean(worker.is_selfemployed),
    },
    stats: {
      total_earned: stats.total_earned,
      pending_payout: stats.pending_payout,
      paid_orders: stats.paid_orders,
    },
  });
}
