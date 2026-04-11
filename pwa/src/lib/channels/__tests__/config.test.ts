import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTelegramConfig,
  getMaxConfig,
  getAvitoConfig,
  SUPPORTED_CHANNELS,
  isValidChannel,
} from '../config';

describe('Channel config', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('SUPPORTED_CHANNELS', () => {
    it('contains exactly telegram, max, avito', () => {
      expect(SUPPORTED_CHANNELS).toEqual(['telegram', 'max', 'avito']);
    });

    it('does NOT include email', () => {
      expect((SUPPORTED_CHANNELS as readonly string[]).includes('email')).toBe(false);
    });
  });

  describe('isValidChannel', () => {
    it.each(['telegram', 'max', 'avito'])('returns true for %s', (ch) => {
      expect(isValidChannel(ch)).toBe(true);
    });

    it.each(['email', 'whatsapp', 'sms', '', 'Email'])('returns false for %s', (ch) => {
      expect(isValidChannel(ch)).toBe(false);
    });
  });

  describe('getTelegramConfig', () => {
    it('reads token from env', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-tg-token';
      const cfg = getTelegramConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.botToken).toBe('test-tg-token');
      expect(cfg.apiBase).toContain('test-tg-token');
    });

    it('reports disabled when no token', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const cfg = getTelegramConfig();
      expect(cfg.enabled).toBe(false);
    });
  });

  describe('getMaxConfig', () => {
    it('reads token from env', () => {
      process.env.MAX_BOT_TOKEN = 'test-max-token';
      const cfg = getMaxConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.botToken).toBe('test-max-token');
    });
  });

  describe('getAvitoConfig', () => {
    it('reads token from env', () => {
      process.env.AVITO_API_TOKEN = 'test-avito-token';
      const cfg = getAvitoConfig();
      expect(cfg.enabled).toBe(true);
      expect(cfg.botToken).toBe('test-avito-token');
    });
  });
});
