import { describe, it, expect } from 'vitest';
import { TelegramMapper } from '../telegram';

const mapper = new TelegramMapper();

describe('TelegramMapper.normalize', () => {
  it('extracts text message correctly', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        from: { id: 111, is_bot: false, first_name: 'User' },
        chat: { id: 222, type: 'private' },
        date: 1700000000,
        text: 'Hello world',
      },
    };
    const event = mapper.normalize(raw);
    expect(event.channel).toBe('telegram');
    expect(event.type).toBe('message');
    expect(event.user_id).toBe('111');
    expect(event.chat_id).toBe('222');
    expect(event.text).toBe('Hello world');
    expect(event.timestamp).toBeTruthy();
  });

  it('detects command type when text starts with /', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        from: { id: 111 },
        chat: { id: 222, type: 'private' },
        date: 1700000000,
        text: '/start',
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('command');
    expect(event.text).toBe('/start');
  });

  it('detects callback_query type', () => {
    const raw = {
      update_id: 100,
      callback_query: {
        id: 'cb_1',
        from: { id: 111 },
        message: {
          message_id: 1,
          from: { id: 0, is_bot: true },
          chat: { id: 222, type: 'private' },
          date: 1700000000,
          text: 'Menu',
        },
        data: 'btn_accept',
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('callback');
    expect(event.text).toBe('btn_accept');
    expect(event.user_id).toBe('111');
    expect(event.chat_id).toBe('222');
    expect(event.payload).toEqual({ callback_query_id: 'cb_1' });
  });

  it('handles messages without text (photo, sticker etc)', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        from: { id: 111 },
        chat: { id: 222, type: 'private' },
        date: 1700000000,
        photo: [{ file_id: 'abc', width: 100, height: 100 }],
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('message');
    expect(event.text).toBe('');
    expect(event.user_id).toBe('111');
  });

  it('handles missing from/callback fields gracefully', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        chat: { id: 222, type: 'private' },
        date: 1700000000,
        text: 'hi',
      },
    };
    const event = mapper.normalize(raw);
    expect(event.user_id).toBe('');
    expect(event.chat_id).toBe('222');
    expect(event.text).toBe('hi');
  });

  it('handles completely empty payload', () => {
    const event = mapper.normalize({});
    expect(event.channel).toBe('telegram');
    expect(event.user_id).toBe('');
    expect(event.chat_id).toBe('');
    expect(event.text).toBe('');
  });

  it('converts unix timestamp to ISO string', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        from: { id: 111 },
        chat: { id: 222, type: 'private' },
        date: 1700000000,
        text: 'test',
      },
    };
    const event = mapper.normalize(raw);
    expect(event.timestamp).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('uses current time when date is missing', () => {
    const raw = {
      update_id: 100,
      message: {
        message_id: 1,
        from: { id: 111 },
        chat: { id: 222, type: 'private' },
        text: 'test',
      },
    };
    const before = new Date().toISOString();
    const event = mapper.normalize(raw);
    expect(event.timestamp >= before).toBe(true);
  });

  it('preserves raw payload', () => {
    const raw = { update_id: 999, message: { message_id: 1, from: { id: 1 }, chat: { id: 2, type: 'private' }, date: 1, text: 'x' } };
    const event = mapper.normalize(raw);
    expect(event.raw).toBe(raw);
  });
});
