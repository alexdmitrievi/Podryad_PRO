import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

interface ContactEntry {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'executor';
  messenger: string | null;
  email: string | null;
  telegram: string | null;
  city: string | null;
  work_type: string | null;
  comment: string | null;
  created_at: string;
  source: string;
}

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

/**
 * GET /api/admin/contacts
 * Returns a unified list of all customers (from leads) and executors (from executor_responses).
 * Deduplicates by phone number, keeping the most recent entry.
 */
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') ?? '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
  const db = getServiceClient();
  const contacts: ContactEntry[] = [];
  const seenPhones = new Set<string>();

  // 1. Get all leads (customers)
  const { data: leads } = await db
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  for (const lead of leads || []) {
    const phone = String(lead.phone || '');
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    // Parse messenger from comment if not in dedicated field
    let messenger = lead.messenger || null;
    let telegram = lead.telegram || null;
    const email = lead.email || null;

    if (!messenger && lead.comment) {
      const mMatch = lead.comment.match(/Мессенджер:\s*(MAX|Telegram|Позвонить)/i);
      if (mMatch) messenger = mMatch[1];
    }
    if (!telegram && lead.comment) {
      const tMatch = lead.comment.match(/@(\w+)/);
      if (tMatch) telegram = tMatch[1];
    }

    contacts.push({
      id: `lead-${lead.id}`,
      name: lead.name || '',
      phone,
      role: 'customer',
      messenger,
      email,
      telegram,
      city: lead.city || null,
      work_type: lead.work_type || null,
      comment: lead.comment || null,
      created_at: lead.created_at || '',
      source: lead.source || 'unknown',
    });
  }

  // 2. Get all executor responses (executors)
  const { data: responses } = await db
    .from('executor_responses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  for (const resp of responses || []) {
    const phone = String(resp.phone || '');
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    contacts.push({
      id: `resp-${resp.id}`,
      name: resp.name || '',
      phone,
      role: 'executor',
      messenger: null,
      email: null,
      telegram: null,
      city: null,
      work_type: null,
      comment: resp.comment || null,
      created_at: resp.created_at || '',
      source: 'executor_response',
    });
  }

  // 3. Get workers (executors from Telegram bot)
  const { data: workers } = await db
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  for (const worker of workers || []) {
    const phone = String(worker.phone || worker.user_phone || '');
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    contacts.push({
      id: `worker-${worker.telegram_id}`,
      name: worker.name || worker.username || '',
      phone,
      role: 'executor',
      messenger: 'Telegram',
      email: null,
      telegram: worker.username || null,
      city: null,
      work_type: null,
      comment: worker.skills || null,
      created_at: worker.created_at || '',
      source: 'telegram_bot',
    });
  }

  // Sort all contacts by created_at descending
  contacts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ contacts });
  } catch (err) {
    console.error('GET /api/admin/contacts:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
