import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Rate limit: 10 messages / 5 minutes per IP
  const rl = await checkRateLimit(`ai:${clientIp}`, 10, 5 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { text: 'Слишком много запросов. Подождите немного и попробуйте снова.' },
      { status: 429 },
    );
  }

  let body: { message?: string; channel?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ text: 'Неверный формат запроса.' }, { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ text: 'Введите сообщение.' }, { status: 400 });
  }

  const client = getOpenAIClient();
  try {
    const response = await client.chat({
      message: body.message,
      channel: (body.channel as 'telegram' | 'max' | 'avito' | 'web') || 'web',
      history: Array.isArray(body.history)
        ? body.history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
        : [],
    });

    return NextResponse.json({
      text: response.text,
      fallback: response.fallback,
      confidence: response.confidence,
      suggested_actions: response.suggested_actions,
    });
  } catch (err) {
    log.error('[AI Chat] Request failed', { error: String(err) });
    return NextResponse.json({
      text: 'Извините, произошла ошибка. Пожалуйста, попробуйте позже.',
      fallback: true,
    }, { status: 500 });
  }
}
