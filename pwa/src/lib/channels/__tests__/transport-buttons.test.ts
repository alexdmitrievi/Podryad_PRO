import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramTransport } from '../telegram';
import { MaxTransport } from '../max';

const TG_CONFIG = {
  enabled: true,
  apiBase: 'https://api.telegram.org/bot123',
  botToken: '123',
  defaultChatId: '999',
  timeout: 5000,
  maxRetries: 0,
  retryBaseDelay: 1,
};

const MAX_CONFIG = {
  enabled: true,
  apiBase: 'https://platform-api.max.ru',
  botToken: 'tok',
  defaultChatId: '999',
  timeout: 5000,
  maxRetries: 0,
  retryBaseDelay: 1,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('TelegramTransport — button rows passthrough', () => {
  it('preserves multi-button rows when buttons are MessageButton[][]', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const transport = new TelegramTransport(TG_CONFIG);
    await transport.send({
      channel: 'telegram',
      chat_id: '111',
      text: 'hi',
      buttons: [
        [
          { type: 'callback', text: 'A', callback_data: 'a' },
          { type: 'callback', text: 'B', callback_data: 'b' },
        ],
        [{ type: 'url', text: 'Site', url: 'https://example.com' }],
      ] as never,
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const body = JSON.parse(String(calls[0]?.[1]?.body ?? '{}'));
    expect(body.reply_markup.inline_keyboard).toEqual([
      [
        { text: 'A', callback_data: 'a' },
        { text: 'B', callback_data: 'b' },
      ],
      [{ text: 'Site', url: 'https://example.com' }],
    ]);
  });

  it('wraps a flat button list as one button per row', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const transport = new TelegramTransport(TG_CONFIG);
    await transport.send({
      channel: 'telegram',
      chat_id: '111',
      text: 'hi',
      buttons: [
        { type: 'callback', text: 'A', callback_data: 'a' },
        { type: 'callback', text: 'B', callback_data: 'b' },
      ],
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const body = JSON.parse(String(calls[0]?.[1]?.body ?? '{}'));
    expect(body.reply_markup.inline_keyboard).toEqual([
      [{ text: 'A', callback_data: 'a' }],
      [{ text: 'B', callback_data: 'b' }],
    ]);
  });
});

describe('MaxTransport — button rows passthrough', () => {
  it('preserves multi-button rows when buttons are MessageButton[][]', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: { body: { mid: 'm1' } } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const transport = new MaxTransport(MAX_CONFIG);
    await transport.send({
      channel: 'max',
      chat_id: '111',
      text: 'hi',
      buttons: [
        [
          { type: 'callback', text: 'A', callback_data: 'a' },
          { type: 'callback', text: 'B', callback_data: 'b' },
        ],
      ] as never,
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const body = JSON.parse(String(calls[0]?.[1]?.body ?? '{}'));
    expect(body.attachments[0].payload.buttons).toEqual([
      [
        { type: 'callback', text: 'A', payload: 'a' },
        { type: 'callback', text: 'B', payload: 'b' },
      ],
    ]);
  });
});
