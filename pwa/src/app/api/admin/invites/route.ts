import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

function getPin(req: NextRequest): string {
  return req.headers.get('x-admin-pin') ?? '';
}

/* ------------------------------------------------------------------ */
/*  GET /api/admin/invites — list all invite lists + stats            */
/* ------------------------------------------------------------------ */
async function handleGet(req: NextRequest) {
  const pin = getPin(req);
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getServiceClient();
  const { data, error } = await db
    .from('invite_lists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('[InvitesAPI] GET failed', { error: String(error) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: worker } = await db
    .from('worker_control')
    .select('is_active, started_at, stopped_at')
    .eq('id', 1)
    .maybeSingle();

  return NextResponse.json({ lists: data ?? [], worker: worker ?? { is_active: false } });
}

/* ------------------------------------------------------------------ */
/*  POST /api/admin/invites — upload CSV/Excel file                   */
/* ------------------------------------------------------------------ */
async function handlePost(req: NextRequest) {
  const pin = getPin(req);
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const targetType = String(formData.get('target_type') || 'channel');
  const targetId = String(formData.get('target_id') || '');
  const targetName = String(formData.get('target_name') || '');
  const dailyLimit = parseInt(String(formData.get('daily_limit') || '0'), 10) || 15;

  if (!file) {
    return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: 'Укажите ID канала/чата' }, { status: 400 });
  }
  if (targetType !== 'channel' && targetType !== 'chat') {
    return NextResponse.json({ error: 'target_type должен быть channel или chat' }, { status: 400 });
  }
  if (dailyLimit < 1 || dailyLimit > 50) {
    return NextResponse.json({ error: 'Дневной лимит: 1–50' }, { status: 400 });
  }

  let rows: Array<Record<string, string>> = [];
  try {
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      rows = parseCSV(text);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await parseExcel(Buffer.from(await file.arrayBuffer()));
    } else {
      return NextResponse.json({ error: 'Формат файла не поддерживается. Загрузите .csv, .xlsx или .xls' }, { status: 400 });
    }
  } catch (err) {
    log.error('[InvitesAPI] File parse error', { error: String(err) });
    return NextResponse.json({ error: 'Ошибка чтения файла' }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Файл пуст или не содержит данных' }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: list, error: listErr } = await db
    .from('invite_lists')
    .insert({
      filename: file.name,
      target_type: targetType,
      target_id: targetId,
      target_name: targetName || targetId,
      total_count: rows.length,
      daily_limit: dailyLimit,
      status: 'draft',
    })
    .select('id')
    .single();

  if (listErr || !list) {
    log.error('[InvitesAPI] List create error', { error: String(listErr) });
    return NextResponse.json({ error: 'Ошибка создания списка' }, { status: 500 });
  }

  const queueItems = rows.map((row) => ({
    list_id: list.id,
    telegram_id: Number(row.user_id || row.telegram_id || row.id || row.ID || 0),
    username: String(row.username || row.Username || ''),
    first_name: String(row.first_name || row.name || ''),
    last_name: String(row.last_name || ''),
    target_id: targetId,
    target_type: targetType,
    status: 'pending',
  })).filter((item) => item.telegram_id > 0);

  if (queueItems.length === 0) {
    await db.from('invite_lists').delete().eq('id', list.id);
    return NextResponse.json({ error: 'Не найдено валидных Telegram ID в файле. Ожидаются колонки: ID, user_id, telegram_id или id' }, { status: 400 });
  }

  const { error: queueErr } = await db.from('invite_queue').insert(queueItems);

  if (queueErr) {
    log.error('[InvitesAPI] Queue insert error', { error: String(queueErr) });
    return NextResponse.json({ error: 'Ошибка создания очереди' }, { status: 500 });
  }

  log.info('[InvitesAPI] List created', { list_id: list.id, items: queueItems.length, target: targetId });
  return NextResponse.json({ ok: true, list_id: list.id, total: queueItems.length });
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/admin/invites — update list status (start/stop)        */
/* ------------------------------------------------------------------ */
async function handlePatch(req: NextRequest) {
  const pin = getPin(req);
  if (!verifyPin(pin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const listId = String(body.list_id || '');
  const action = String(body.action || '');

  if (!listId) return NextResponse.json({ error: 'list_id required' }, { status: 400 });

  const db = getServiceClient();

  if (action === 'activate') {
    const { error } = await db.from('invite_lists').update({ status: 'active' }).eq('id', listId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] List activated', { list_id: listId });
    return NextResponse.json({ ok: true });
  }

  if (action === 'pause') {
    const { error } = await db.from('invite_lists').update({ status: 'paused' }).eq('id', listId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] List paused', { list_id: listId });
    return NextResponse.json({ ok: true });
  }

  if (action === 'cancel') {
    const { error } = await db.from('invite_lists').update({ status: 'cancelled' }).eq('id', listId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] List cancelled', { list_id: listId });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const { error } = await db.from('invite_lists').delete().eq('id', listId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] List deleted', { list_id: listId });
    return NextResponse.json({ ok: true });
  }

  if (action === 'worker_start') {
    const { error } = await db.from('worker_control').upsert({ id: 1, worker_type: 'invite', is_active: true, started_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] Worker started');
    return NextResponse.json({ ok: true });
  }

  if (action === 'worker_stop') {
    const { error } = await db.from('worker_control').upsert({ id: 1, worker_type: 'invite', is_active: false, stopped_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void log.info('[InvitesAPI] Worker stopped');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action. Use: activate, pause, cancel, delete, worker_start, worker_stop' }, { status: 400 });
}

export async function GET(req: NextRequest) { return handleGet(req); }
export async function POST(req: NextRequest) { return handlePost(req); }
export async function PATCH(req: NextRequest) { return handlePatch(req); }

/* ------------------------------------------------------------------ */
/*  CSV parser                                                        */
/* ------------------------------------------------------------------ */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;\t]/).map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Excel parser (dynamic import to avoid bloating edge runtime)      */
/* ------------------------------------------------------------------ */
async function parseExcel(buf: Buffer): Promise<Array<Record<string, string>>> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (raw.length < 2) return [];

  const headers = (raw[0] as unknown[]).map(h => String(h).trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < raw.length; i++) {
    const vals = raw[i] as unknown[];
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = String(vals?.[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}
