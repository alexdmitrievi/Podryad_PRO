import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getServiceClient } from './supabase';
import { log } from '@/lib/logger';

const JWT_SECRET = new TextEncoder().encode(
  process.env.CUSTOMER_JWT_SECRET
);
if (!process.env.CUSTOMER_JWT_SECRET) {
  log.error('FATAL: CUSTOMER_JWT_SECRET environment variable is not set');
}
const COOKIE_NAME = 'customer_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface CustomerJWTPayload {
  sub: string;   // customer id
  phone: string;
  name: string;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  customer_type: 'personal' | 'business';
  org_name: string | null;
  inn: string | null;
  city: string | null;
  preferred_contact: string | null;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: CustomerJWTPayload): Promise<string> {
  return new SignJWT({ phone: payload.phone, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || typeof payload.phone !== 'string') return null;
    return {
      sub: payload.sub,
      phone: payload.phone,
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromCookies(): Promise<CustomerJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('customers')
    .select('id, phone, name, customer_type, org_name, inn, city, preferred_contact, created_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as CustomerProfile;
}
