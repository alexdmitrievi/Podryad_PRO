import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = body.pin === adminPin;
  return NextResponse.json({ valid });
}
