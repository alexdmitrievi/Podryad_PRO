import type {
  ChannelTransport,
  NormalizedOutgoingMessage,
  SendResult,
  ChannelHealth,
  NormalizedIncomingEvent,
  ChannelMapper,
} from './types';
import { getMaxConfig, type ChannelConfig } from './config';
import { log } from '@/lib/logger';

/**
 * MAX Transport — sends messages through MAX Bot API (botapi.max.ru).
 *
 * MAX API specifics:
 * - Auth via query param: access_token="{TOKEN}"
 * - Messages endpoint: /messages?chat_id={ID}&access_token={TOKEN}
 * - Supports markdown format
 * - Supports inline keyboard attachments
 */
export class MaxTransport implements ChannelTransport {
  readonly channel = 'max' as const;
  private config: ChannelConfig;

  constructor(config?: ChannelConfig) {
    this.config = config ?? getMaxConfig();
  }

  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    const start = Date.now();
    const chatId = message.chat_id || this.config.defaultChatId;

    if (!chatId) {
      return { success: false, channel: 'max', error: 'No chat_id provided', latency_ms: 0 };
    }

    const url = `${this.config.apiBase}/messages?chat_id=${encodeURIComponent(chatId)}&access_token=${encodeURIComponent(this.config.botToken)}`;

    const body: Record<string, unknown> = {
      text: message.text,
      format: 'markdown',
    };

    // MAX inline keyboard
    if (message.buttons?.length) {
      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: message.buttons.map((btn) => [
              btn.type === 'url'
                ? { type: 'link', text: btn.text, url: btn.url }
                : { type: 'callback', text: btn.text, payload: btn.callback_data },
            ]),
          },
        },
      ];
    }

    let lastError = '';
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          return {
            success: true,
            channel: 'max',
            message_id: json.message?.body?.mid ?? String(json.message_id ?? ''),
            latency_ms: Date.now() - start,
          };
        }

        lastError = `MAX API error: ${res.status} ${res.statusText}`;
        log.error(`[MaxTransport] Attempt ${attempt + 1} failed`, { error: String(lastError) });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        log.error(`[MaxTransport] Attempt ${attempt + 1} error`, { error: String(lastError) });
      }

      if (attempt < this.config.maxRetries) {
        await new Promise((r) => setTimeout(r, this.config.retryBaseDelay * 2 ** attempt));
      }
    }

    return { success: false, channel: 'max', error: lastError, latency_ms: Date.now() - start };
  }

  async healthCheck(): Promise<ChannelHealth> {
    try {
      const url = `${this.config.apiBase}/me?access_token=${encodeURIComponent(this.config.botToken)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return {
        channel: 'max',
        healthy: res.ok,
        last_check: new Date().toISOString(),
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        channel: 'max',
        healthy: false,
        last_check: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * MAX Mapper — converts raw MAX webhook payload to NormalizedIncomingEvent.
 */
export class MaxMapper implements ChannelMapper {
  readonly channel = 'max' as const;

  normalize(raw: unknown): NormalizedIncomingEvent {
    const data = raw as Record<string, unknown>;
    const update = data.update ?? data;
    const updateObj = update as Record<string, unknown>;
    const message = (updateObj.message ?? {}) as Record<string, unknown>;
    const body = (message.body ?? {}) as Record<string, unknown>;
    const sender = (message.sender ?? {}) as Record<string, unknown>;
    const recipient = (message.recipient ?? {}) as Record<string, unknown>;
    const callback = updateObj.callback as Record<string, unknown> | undefined;

    let type: NormalizedIncomingEvent['type'] = 'message';
    let text = String(body.text ?? '');
    let userId = String(sender.user_id ?? '');
    let cId = String(recipient.chat_id ?? message.chat_id ?? '');

    if (callback) {
      type = 'callback';
      text = String(callback.payload ?? '');
      // Callback has its own user_id and chat_id (not nested in message)
      userId = String(callback.user_id ?? sender.user_id ?? '');
      cId = String(callback.chat_id ?? recipient.chat_id ?? '');
    } else if (text.startsWith('/')) {
      type = 'command';
    }

    return {
      channel: 'max',
      type,
      user_id: userId,
      chat_id: cId,
      text,
      payload: callback ? { callback_id: callback.callback_id } : undefined,
      timestamp: message.timestamp
        ? new Date(message.timestamp as number).toISOString()
        : new Date().toISOString(),
      raw,
    };
  }
}
