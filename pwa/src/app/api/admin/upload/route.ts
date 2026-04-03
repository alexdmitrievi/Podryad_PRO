import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServiceClient } from '@/lib/supabase';

function verifyPin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return false;
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(adminPin);
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf);
}

/**
 * POST /api/admin/upload
 * Uploads an image to Supabase Storage bucket "listing-images".
 * Body: FormData with fields: pin, file, listing_id
 * Returns: { ok, url } — public URL of the uploaded image.
 *
 * Prerequisite: Create a public bucket "listing-images" in Supabase Storage.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pin = String(formData.get('pin') || '');
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file = formData.get('file') as File | null;
  const listingId = String(formData.get('listing_id') || '');

  if (!file || !listingId) {
    return NextResponse.json({ error: 'missing file or listing_id' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: 'invalid_format: jpg, png, webp, avif only' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'file_too_large: max 5MB' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${listingId}/${Date.now()}.${ext}`;
  const db = getServiceClient();

  const { error: uploadError } = await db.storage
    .from('listing-images')
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage
    .from('listing-images')
    .getPublicUrl(path);

  const publicUrl = urlData.publicUrl;

  // Append image URL to listing's images array
  const { error: updateError } = await db.rpc('append_listing_image', {
    p_listing_id: listingId,
    p_image_url: publicUrl,
  });

  // Fallback: if RPC doesn't exist, update manually
  if (updateError) {
    const { data: existing } = await db
      .from('listings')
      .select('images')
      .eq('listing_id', listingId)
      .single();

    const images = Array.isArray(existing?.images) ? existing.images : [];
    images.push(publicUrl);

    await db
      .from('listings')
      .update({ images })
      .eq('listing_id', listingId);
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}
