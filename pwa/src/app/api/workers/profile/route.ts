import { NextRequest, NextResponse } from 'next/server';
import { getWorkerActor } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';
import { getWorkerByUserId } from '@/lib/db';

// ── GET: получить текущий профиль исполнителя ──

export async function GET() {
  const actor = await getWorkerActor();
  if (!actor) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 },
    );
  }

  const worker = await getWorkerByUserId(actor.user_id);
  if (!worker) {
    return NextResponse.json(
      { error: 'Профиль исполнителя не найден' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      skills: worker.skills ?? '',
      city: worker.city ?? '',
      is_selfemployed: Boolean(worker.is_selfemployed),
      about: worker.about ?? '',
      payout_card: worker.payout_card ?? null,
    },
  });
}

// ── POST: обновить профиль исполнителя ──

export async function POST(req: NextRequest) {
  const actor = await getWorkerActor();
  if (!actor) {
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 },
    );
  }

  const worker = await getWorkerByUserId(actor.user_id);
  if (!worker) {
    return NextResponse.json(
      { error: 'Профиль исполнителя не найден' },
      { status: 404 },
    );
  }

  let body: {
    skills?: string;
    city?: string;
    is_selfemployed?: boolean;
    about?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'Некорректный JSON' },
      { status: 400 },
    );
  }

  // Валидация
  const updates: Record<string, unknown> = {};

  if (body.skills !== undefined) {
    const skills = String(body.skills).trim();
    if (skills.length > 500) {
      return NextResponse.json(
        { error: 'Слишком длинный список навыков' },
        { status: 400 },
      );
    }
    updates.skills = skills;
  }

  if (body.city !== undefined) {
    const city = String(body.city).trim();
    if (city.length > 100) {
      return NextResponse.json(
        { error: 'Некорректный город' },
        { status: 400 },
      );
    }
    updates.city = city;
  }

  if (body.is_selfemployed !== undefined) {
    updates.is_selfemployed = Boolean(body.is_selfemployed);
  }

  if (body.about !== undefined) {
    const about = String(body.about).trim().slice(0, 300);
    updates.about = about;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Нет данных для обновления' },
      { status: 400 },
    );
  }

  // Определяем ключ записи (telegram_id или phone)
  const workerId = worker.telegram_id ?? worker.phone;
  const idColumn = worker.telegram_id ? 'telegram_id' : 'phone';

  try {
    const db = getServiceClient();
    const { error } = await db
      .from('workers')
      .update(updates)
      .eq(idColumn, workerId);

    if (error) {
      console.error('POST /api/workers/profile update error:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления профиля' },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('POST /api/workers/profile error:', err);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
