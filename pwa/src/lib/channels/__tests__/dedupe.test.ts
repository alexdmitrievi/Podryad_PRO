import { describe, it, expect } from 'vitest';
import { isDuplicateUpdate, extractTelegramUpdateId, extractMaxUpdateId } from '../dedupe';

describe('dedupe', () => {
  describe('isDuplicateUpdate', () => {
    it('returns false for first occurrence', () => {
      expect(isDuplicateUpdate('tg:12345')).toBe(false);
    });

    it('returns true for duplicate', () => {
      expect(isDuplicateUpdate('tg:99999')).toBe(false);
      expect(isDuplicateUpdate('tg:99999')).toBe(true);
    });

    it('treats different IDs as distinct', () => {
      expect(isDuplicateUpdate('a')).toBe(false);
      expect(isDuplicateUpdate('b')).toBe(false);
      expect(isDuplicateUpdate('a')).toBe(true);
      expect(isDuplicateUpdate('b')).toBe(true);
    });

    it('handles many unique IDs without issue', () => {
      for (let i = 0; i < 100; i++) {
        expect(isDuplicateUpdate(`id:${i}`)).toBe(false);
      }
    });
  });

  describe('extractTelegramUpdateId', () => {
    it('extracts update_id from telegram payload', () => {
      const body = { update_id: 987654321, message: { text: 'hello' } };
      expect(extractTelegramUpdateId(body)).toBe('987654321');
    });

    it('falls back to Date.now() when missing', () => {
      const body = { message: { text: 'hello' } };
      const result = extractTelegramUpdateId(body);
      expect(Number(result)).toBeGreaterThan(0);
    });
  });

  describe('extractMaxUpdateId', () => {
    it('extracts update_id from max payload', () => {
      const body = { update: { update_id: 123, message: {} } };
      expect(extractMaxUpdateId(body)).toBe('123');
    });

    it('falls back to Date.now() when missing', () => {
      const body = { message: { text: 'hello' } };
      const result = extractMaxUpdateId(body);
      expect(Number(result)).toBeGreaterThan(0);
    });

    it('falls back when update field is missing', () => {
      const body = { event: 'something' };
      const result = extractMaxUpdateId(body);
      expect(Number(result)).toBeGreaterThan(0);
    });
  });
});
