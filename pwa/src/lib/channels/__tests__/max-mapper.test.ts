import { describe, it, expect } from 'vitest';
import { MaxMapper } from '../max';

const mapper = new MaxMapper();

describe('MaxMapper.normalize', () => {
  it('extracts text message correctly from update wrapper', () => {
    const raw = {
      update: {
        update_id: 100,
        message: {
          body: { text: 'Hello MAX' },
          sender: { user_id: 'user_1' },
          recipient: { chat_id: 'chat_1' },
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.channel).toBe('max');
    expect(event.type).toBe('message');
    expect(event.user_id).toBe('user_1');
    expect(event.chat_id).toBe('chat_1');
    expect(event.text).toBe('Hello MAX');
  });

  it('detects command type when text starts with /', () => {
    const raw = {
      update: {
        update_id: 100,
        message: {
          body: { text: '/start' },
          sender: { user_id: 'user_1' },
          recipient: { chat_id: 'chat_1' },
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('command');
    expect(event.text).toBe('/start');
  });

  it('detects callback type', () => {
    const raw = {
      update: {
        update_id: 100,
        callback: {
          callback_id: 'cb_1',
          user_id: 'user_1',
          chat_id: 'chat_1',
          payload: 'btn_accept',
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('callback');
    expect(event.text).toBe('btn_accept');
    expect(event.user_id).toBe('user_1');
    expect(event.chat_id).toBe('chat_1');
    expect(event.payload).toEqual({ callback_id: 'cb_1' });
  });

  it('handles legacy payload without update wrapper', () => {
    const raw = {
      message: {
        body: { text: 'Legacy message' },
        sender: { user_id: 'user_old' },
        recipient: { chat_id: 'chat_old' },
        timestamp: 1700000000000,
      },
    };
    const event = mapper.normalize(raw);
    expect(event.text).toBe('Legacy message');
    expect(event.user_id).toBe('user_old');
    expect(event.chat_id).toBe('chat_old');
  });

  it('falls back to message.chat_id when recipient is missing', () => {
    const raw = {
      update: {
        message: {
          body: { text: 'hi' },
          sender: { user_id: 'u1' },
          chat_id: 'fallback_chat',
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.chat_id).toBe('fallback_chat');
  });

  it('handles messages without text', () => {
    const raw = {
      update: {
        message: {
          body: {},
          sender: { user_id: 'u1' },
          recipient: { chat_id: 'c1' },
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.text).toBe('');
    expect(event.user_id).toBe('u1');
  });

  it('handles missing sender gracefully', () => {
    const raw = {
      update: {
        message: {
          body: { text: 'hi' },
          recipient: { chat_id: 'c1' },
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.user_id).toBe('');
  });

  it('handles completely empty payload', () => {
    const event = mapper.normalize({});
    expect(event.channel).toBe('max');
    expect(event.user_id).toBe('');
    expect(event.chat_id).toBe('');
    expect(event.text).toBe('');
  });

  it('converts timestamp to ISO string', () => {
    const raw = {
      update: {
        message: {
          body: { text: 'test' },
          sender: { user_id: 'u1' },
          recipient: { chat_id: 'c1' },
          timestamp: 1700000000000,
        },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.timestamp).toBe(new Date(1700000000000).toISOString());
  });

  it('uses current time when timestamp is missing', () => {
    const raw = {
      update: {
        message: {
          body: { text: 'test' },
          sender: { user_id: 'u1' },
          recipient: { chat_id: 'c1' },
        },
      },
    };
    const before = new Date().toISOString();
    const event = mapper.normalize(raw);
    expect(event.timestamp >= before).toBe(true);
  });

  it('preserves raw payload', () => {
    const raw = { update: { message: { body: { text: 'x' }, sender: { user_id: 'u' }, recipient: { chat_id: 'c' }, timestamp: 1 } } };
    const event = mapper.normalize(raw);
    expect(event.raw).toBe(raw);
  });

  it('handles TamTam-style callback with nested user object', () => {
    const raw = {
      update_type: 'message_callback',
      timestamp: 1700000000000,
      callback: {
        callback_id: 'cb_42',
        payload: 'menu:home',
        user: { user_id: 'user_99', name: 'Иван' },
      },
      message: {
        recipient: { chat_id: 'chat_77' },
      },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('callback');
    expect(event.text).toBe('menu:home');
    expect(event.user_id).toBe('user_99');
    expect(event.chat_id).toBe('chat_77');
    expect(event.payload?.callback_id).toBe('cb_42');
    expect(event.payload?.display_name).toBe('Иван');
  });

  it('treats bot_started as a /start command', () => {
    const raw = {
      update_type: 'bot_started',
      timestamp: 1700000000000,
      chat_id: 'chat_55',
      user: { user_id: 'user_55', name: 'Bot Newbie' },
    };
    const event = mapper.normalize(raw);
    expect(event.type).toBe('command');
    expect(event.text).toBe('/start');
    expect(event.user_id).toBe('user_55');
    expect(event.chat_id).toBe('chat_55');
    expect(event.payload?.display_name).toBe('Bot Newbie');
  });
});
