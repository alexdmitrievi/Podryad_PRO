import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelRouter } from '../router';
import type { NormalizedOutgoingMessage } from '../types';

// We test the router's rejection of invalid channels and its dispatch logic.
// Transport send() calls hit real APIs, so we mock them at transport level.

describe('ChannelRouter', () => {
  let router: ChannelRouter;

  beforeEach(() => {
    router = new ChannelRouter();
  });

  describe('email rejection', () => {
    it('rejects email as a channel with error', async () => {
      const msg: NormalizedOutgoingMessage = {
        channel: 'email' as never,
        chat_id: 'test@example.com',
        text: 'Hello',
      };

      const result = await router.send(msg);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported channel');
      expect(result.error).toContain('email');
    });

    it('rejects any unknown channel', async () => {
      const msg: NormalizedOutgoingMessage = {
        channel: 'whatsapp' as never,
        chat_id: '123',
        text: 'Hello',
      };

      const result = await router.send(msg);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported channel');
    });
  });

  describe('channels property', () => {
    it('exposes only telegram, max, avito', () => {
      expect(router.channels).toEqual(['telegram', 'max', 'avito']);
    });

    it('does not include email', () => {
      expect(router.channels).not.toContain('email');
    });
  });

  describe('normalize', () => {
    it('throws for unknown channel', () => {
      expect(() => router.normalize('email' as never, {})).toThrow(
        'No mapper configured for channel: email',
      );
    });
  });
});
