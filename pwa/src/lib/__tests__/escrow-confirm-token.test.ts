import { describe, it, expect, beforeEach } from 'vitest';
import { signConfirmationToken, verifyConfirmationToken } from '@/lib/auth';

describe('signConfirmationToken', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret-key-for-testing';
  });

  it('Test 1: produces a 3-part dot-separated JWT string', () => {
    const token = signConfirmationToken({
      orderId: 'order-42',
      role: 'customer',
      phone: '79001234567',
    });

    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });
});

describe('verifyConfirmationToken', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-secret-key-for-testing';
  });

  it('Test 2: returns correct payload for valid token', () => {
    const token = signConfirmationToken({
      orderId: 'order-42',
      role: 'customer',
      phone: '79001234567',
    });

    const payload = verifyConfirmationToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.orderId).toBe('order-42');
    expect(payload!.role).toBe('customer');
    expect(payload!.sub).toBe('79001234567');
    expect(payload!.purpose).toBe('escrow_confirm');
  });

  it('Test 3: returns null for expired token (exp in past)', () => {
    // Manually craft a token with exp in the past using the same signing logic
    const crypto = require('crypto');
    const { createHmac } = crypto;

    const secret = process.env.SESSION_SECRET!;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const expiredPayload = {
      purpose: 'escrow_confirm',
      orderId: 'order-42',
      role: 'customer',
      sub: '79001234567',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    const payloadEncoded = Buffer.from(JSON.stringify(expiredPayload), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const signingInput = `${header}.${payloadEncoded}`;
    const sig = createHmac('sha256', secret).update(signingInput).digest();
    const sig64 = sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const expiredToken = `${header}.${payloadEncoded}.${sig64}`;
    const result = verifyConfirmationToken(expiredToken);
    expect(result).toBeNull();
  });

  it('Test 4: returns null for token with wrong purpose', () => {
    // Create a valid token then tamper with the payload to change purpose
    const crypto = require('crypto');
    const { createHmac } = crypto;

    const secret = process.env.SESSION_SECRET!;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const tamperedPayload = {
      purpose: 'session',  // wrong purpose
      orderId: 'order-42',
      role: 'customer',
      sub: '79001234567',
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const payloadEncoded = Buffer.from(JSON.stringify(tamperedPayload), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Sign with correct secret so signature is valid — but purpose is wrong
    const signingInput = `${header}.${payloadEncoded}`;
    const sig = createHmac('sha256', secret).update(signingInput).digest();
    const sig64 = sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const wrongPurposeToken = `${header}.${payloadEncoded}.${sig64}`;
    const result = verifyConfirmationToken(wrongPurposeToken);
    expect(result).toBeNull();
  });

  it('Test 5: returns null for token signed with wrong secret', () => {
    // Sign with correct secret
    const token = signConfirmationToken({
      orderId: 'order-42',
      role: 'customer',
      phone: '79001234567',
    });

    // Change SECRET and verify — should fail
    process.env.SESSION_SECRET = 'completely-different-secret';
    const result = verifyConfirmationToken(token);
    expect(result).toBeNull();
  });

  it('Test 6: payload contains orderId, role, sub, purpose fields', () => {
    const token = signConfirmationToken({
      orderId: 'order-99',
      role: 'supplier',
      phone: '79009876543',
    });

    const payload = verifyConfirmationToken(token);
    expect(payload).not.toBeNull();
    expect(payload).toHaveProperty('orderId', 'order-99');
    expect(payload).toHaveProperty('role', 'supplier');
    expect(payload).toHaveProperty('sub', '79009876543');
    expect(payload).toHaveProperty('purpose', 'escrow_confirm');
    expect(payload).toHaveProperty('exp');
    expect(typeof payload!.exp).toBe('number');
  });

  it('Test 7: token with role=customer verifies with role=customer (not supplier)', () => {
    const token = signConfirmationToken({
      orderId: 'order-42',
      role: 'customer',
      phone: '79001234567',
    });

    const payload = verifyConfirmationToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.role).toBe('customer');
    expect(payload!.role).not.toBe('supplier');
  });
});
