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
 * MAX Transport — sends messages through MAX Bot API (platform-api.max.ru).
 *
 * Auth: Authorization: <token> header
 * Messages: POST /messages
 * Health: GET /me
 */
export class MaxTransport implements ChannelTransport {
  readonly channel = 'max' as const;
  private config: ChannelConfig;

  constructor(config?: ChannelConfig) {
    this.config = config ?? getMaxConfig();
  }

  private proxyHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Forward-To': this.config.apiBase,
      'X-Auth-Token': this.config.botToken,
    };
  }

  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    const start = Date.now();
    const chatId = message.chat_id || this.config.defaultChatId;

    if (!chatId) {
      return { success: false, channel: 'max', error: 'No chat_id provided', latency_ms: 0 };
    }

    // Use VPS proxy if MAX_API_PROXY is configured (Vercel can't reach .ru APIs)
    const proxyBase = process.env.MAX_API_PROXY;
    const apiBase = proxyBase || this.config.apiBase;
    const url = proxyBase
      ? `${proxyBase}/proxy/max/messages`
      : `${this.config.apiBase}/messages?access_token=${encodeURIComponent(this.config.botToken)}`;

    const headers: Record<string, string> = proxyBase
      ? this.proxyHeaders()
      : { 'Content-Type': 'application/json' };

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message.text,
      format: 'markdown',
    };

    // MAX inline keyboard — one button per row for good UX
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
          headers: this.authHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        const json = await res.json();
        if (res.ok) {
          return {
            success: true,
            channel: 'max',
            message_id: json.message?.body?.mid ?? String(json.message_id ?? ''),
            latency_ms: Date.now() - start,
          };
        }

        lastError = `MAX API error: ${res.status} ${json.message ?? res.statusText}`;
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.config.apiBase}/me?access_token=${encodeURIComponent(this.config.botToken)}`, {
        signal: controller.signal,
      });
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
