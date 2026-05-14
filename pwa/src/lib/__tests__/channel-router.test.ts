import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelRouter, getChannelRouter } from '../channels';
import { SUPPORTED_CHANNELS } from '../channels/config';
import type { NormalizedOutgoingMessage, SendResult } from '../channels';
import type { Channel } from '../channels';

describe('getChannelRouter singleton', () => {
  it('returns the same instance on multiple calls', () => {
    const a = getChannelRouter();
    const b = getChannelRouter();
    expect(a).toBe(b);
  });

  it('returns an instance of ChannelRouter', () => {
    const router = getChannelRouter();
    expect(router).toBeInstanceOf(ChannelRouter);
  });
});

describe('ChannelRouter.channels', () => {
  let router: ChannelRouter;

  beforeEach(() => {
    router = new ChannelRouter();
  });

  it('includes telegram, max, avito', () => {
    expect(router.channels).toEqual(['telegram', 'max', 'avito']);
  });

  it('matches SUPPORTED_CHANNELS', () => {
    expect(router.channels).toEqual(SUPPORTED_CHANNELS);
  });
});

describe('ChannelRouter.normalize', () => {
  let router: ChannelRouter;

  beforeEach(() => {
    router = new ChannelRouter();
  });

  it('does not throw for telegram channel with raw object', () => {
    const raw = {
      message: { chat: { id: 123 }, text: 'hello' },
    };
    expect(() => router.normalize('telegram', raw)).not.toThrow();
  });

  it('does not throw for max channel with raw object', () => {
    const raw = {
      user_id: 'u1',
      chat_id: 'c1',
      body: 'test',
    };
    expect(() => router.normalize('max', raw)).not.toThrow();
  });

  it('returns a NormalizedIncomingEvent with required fields', () => {
    const raw = {
      message: { chat: { id: 456 }, text: 'hello world' },
    };
    const event = router.normalize('telegram', raw);
    expect(event).toHaveProperty('channel');
    expect(event).toHaveProperty('type');
    expect(event).toHaveProperty('user_id');
    expect(event).toHaveProperty('chat_id');
    expect(event).toHaveProperty('text');
    expect(event).toHaveProperty('timestamp');
  });

  it('throws for unsupported channel', () => {
    expect(() => router.normalize('whatsapp' as Channel, {})).toThrow(
      'No mapper configured',
    );
  });
});

describe('ChannelRouter.send invalid channel', () => {
  let router: ChannelRouter;

  beforeEach(() => {
    router = new ChannelRouter();
  });

  it('returns success:false for unsupported channel', async () => {
    const msg: NormalizedOutgoingMessage = {
      channel: 'whatsapp' as Channel,
      chat_id: '123',
      text: 'hello',
    };

    const result = await router.send(msg);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported channel');
    expect(result.error).toContain('whatsapp');
  });

  it('lists supported channels in error message', async () => {
    const msg: NormalizedOutgoingMessage = {
      channel: 'sms' as Channel,
      chat_id: '123',
      text: 'test',
    };

    const result = await router.send(msg);
    expect(result.error).toContain('Supported: telegram, max, avito');
  });
});

describe('ChannelRouter.broadcast', () => {
  let router: ChannelRouter;

  beforeEach(() => {
    router = new ChannelRouter();
  });

  it('returns a Map with entries for each channel (mocked send)', async () => {
    vi.spyOn(router, 'send').mockImplementation(async (msg) => ({
      success: true,
      channel: msg.channel,
      message_id: 'mock-id',
      latency_ms: 1,
    }));

    const channels: Channel[] = ['telegram', 'max'];
    const msgBuilder = (ch: Channel): NormalizedOutgoingMessage => ({
      channel: ch,
      chat_id: 'test-chat',
      text: `Message for ${ch}`,
    });

    const results = await router.broadcast(channels, msgBuilder);
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(2);
    expect(router.send).toHaveBeenCalledTimes(2);
  });

  it('includes results keyed by channel name', async () => {
    vi.spyOn(router, 'send').mockImplementation(async (msg) => ({
      success: true,
      channel: msg.channel,
      message_id: 'mock-id',
      latency_ms: 1,
    }));

    const channels: Channel[] = ['telegram', 'max'];
    const msgBuilder = (ch: Channel): NormalizedOutgoingMessage => ({
      channel: ch,
      chat_id: 'test-chat',
      text: `Message for ${ch}`,
    });

    const results = await router.broadcast(channels, msgBuilder);
    expect(results.has('telegram')).toBe(true);
    expect(results.has('max')).toBe(true);
  });

  it('returns SendResult-shaped entries via mocked send', async () => {
    const mockResult: SendResult = {
      success: false,
      channel: 'telegram',
      error: 'simulated failure',
      latency_ms: 12,
    };
    vi.spyOn(router, 'send').mockResolvedValue(mockResult);

    const channels: Channel[] = ['telegram'];
    const msgBuilder = (ch: Channel): NormalizedOutgoingMessage => ({
      channel: ch,
      chat_id: 'test-chat',
      text: 'test',
    });

    const results = await router.broadcast(channels, msgBuilder);
    const entry = results.get('telegram');
    expect(entry).toEqual(mockResult);
  });

  it('handles empty channel list gracefully', async () => {
    const results = await router.broadcast([], () => ({
      channel: 'telegram' as Channel,
      chat_id: 'x',
      text: 'x',
    }));
    expect(results.size).toBe(0);
  });
});
