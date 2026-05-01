import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';
import { log } from '@/lib/logger';

const BUCKET = 'site-images';
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

const ALLOWED_SLUGS = new Set([
  'hero.labor',
  'hero.equipment',
  'hero.materials',
  'hero.combo',
  'category.labor',
  'category.equipment',
  'category.materials',
]);

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

function pathFromPublicUrl(url: string): string | null {
  // https://<project>.supabase.co/storage/v1/object/public/site-images/<path>
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * POST /api/admin/site-images
 * Uploads a hero image and assigns it to a site slot.
 * Body: FormData { pin, slug, file }
 * On success, replaces any previously uploaded file at that slot (best-effort
 * delete of the old object to keep the bucket clean) and updates the
 * site_images row.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pin = String(formData.get('pin') || '');
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = String(formData.get('slug') || '');
  const file = formData.get('file') as File | null;

  if (!slug || !ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: 'invalid_format: jpg, png, webp, avif only' },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file_too_large: max 5MB' }, { status: 400 });
  }

  const db = getServiceClient();

  // Remove previous object at this slot, if any, so the bucket doesn't leak
  const { data: existing } = await db
    .from('site_images')
    .select('image_url')
    .eq('slug', slug)
    .single();

  const oldPath = existing?.image_url ? pathFromPublicUrl(existing.image_url) : null;

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${slug}/${Date.now()}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });

  if (uploadError) {
    log.error('site-images upload error', { error: String(uploadError) });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: upsertError } = await db
    .from('site_images')
    .upsert(
      { slug, image_url: publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'slug' },
    );

  if (upsertError) {
    // Roll back the upload so we don't orphan the file
    await db.storage.from(BUCKET).remove([path]).catch(() => {});
    log.error('site-images db upsert error', { error: String(upsertError) });
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Best-effort cleanup of the previous object — don't fail the request if it
  // doesn't work (e.g., already deleted out-of-band).
  if (oldPath) {
    db.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  return NextResponse.json({ ok: true, slug, url: publicUrl });
}

/**
 * DELETE /api/admin/site-images?slug=hero.labor
 * Header: x-admin-pin
 * Clears the slot and removes the underlying storage object.
 */
export async function DELETE(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin') || '';
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!slug || !ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: existing } = await db
    .from('site_images')
    .select('image_url')
    .eq('slug', slug)
    .single();

  const oldPath = existing?.image_url ? pathFromPublicUrl(existing.image_url) : null;

  const { error } = await db
    .from('site_images')
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) {
    log.error('site-images delete error', { error: String(error) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (oldPath) {
    db.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  return NextResponse.json({ ok: true, slug });
}
