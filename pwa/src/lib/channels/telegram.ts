import type {
  ChannelTransport,
  NormalizedOutgoingMessage,
  SendResult,
  ChannelHealth,
  NormalizedIncomingEvent,
  ChannelMapper,
} from './types';
import { getTelegramConfig, type ChannelConfig } from './config';
import { log } from '@/lib/logger';

/**
 * Escape text for Telegram MarkdownV2 parse mode.
 * Characters that must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Telegram Transport — sends messages through the Telegram Bot API.
 */
export class TelegramTransport implements ChannelTransport {
  readonly channel = 'telegram' as const;
  private config: ChannelConfig;

  constructor(config?: ChannelConfig) {
    this.config = config ?? getTelegramConfig();
  }

  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    const start = Date.now();
    const chatId = message.chat_id || this.config.defaultChatId;

    if (!chatId) {
      return { success: false, channel: 'telegram', error: 'No chat_id provided', latency_ms: 0 };
    }

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message.text,
      parse_mode: message.parse_mode ?? 'HTML',
      disable_web_page_preview: true,
    };

    // Inline keyboard — accept either flat list (one per row) or pre-grouped rows (button[][]).
    if (message.buttons?.length) {
      const toBtn = (btn: { type: string; text: string; url?: string; callback_data?: string }) =>
        btn.type === 'url'
          ? { text: btn.text, url: btn.url }
          : { text: btn.text, callback_data: btn.callback_data };

      // If already a 2D array of rows, pass through as-is; otherwise wrap each as its own row.
      const isRowed = Array.isArray(message.buttons[0]);
      const rows = isRowed
        ? (message.buttons as unknown as Array<Array<Parameters<typeof toBtn>[0]>>).map((row) => row.map(toBtn))
        : (message.buttons as Array<Parameters<typeof toBtn>[0]>).map((b) => [toBtn(b)]);

      body.reply_markup = { inline_keyboard: rows };
    }

    let lastError = '';
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);

        const res = await fetch(`${this.config.apiBase}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        const json = await res.json();
        if (json.ok) {
          return {
            success: true,
            channel: 'telegram',
            message_id: String(json.result?.message_id ?? ''),
            latency_ms: Date.now() - start,
          };
        }

        lastError = `Telegram API error: ${json.description ?? res.status}`;
        log.error(`[TelegramTransport] Attempt ${attempt + 1} failed`, { error: String(lastError) });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        log.error(`[TelegramTransport] Attempt ${attempt + 1} error`, { error: String(lastError) });
      }

      if (attempt < this.config.maxRetries) {
        await new Promise((r) => setTimeout(r, this.config.retryBaseDelay * 2 ** attempt));
      }
    }

    return { success: false, channel: 'telegram', error: lastError, latency_ms: Date.now() - start };
  }

  async healthCheck(): Promise<ChannelHealth> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.config.apiBase}/getMe`, { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      return {
        channel: 'telegram',
        healthy: !!json.ok,
        last_check: new Date().toISOString(),
        error: json.ok ? undefined : json.description,
      };
    } catch (err: unknown) {
      return {
        channel: 'telegram',
        healthy: false,
        last_check: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Telegram Mapper — converts raw Telegram webhook payload to NormalizedIncomingEvent.
 */
export class TelegramMapper implements ChannelMapper {
  readonly channel = 'telegram' as const;

  normalize(raw: unknown): NormalizedIncomingEvent {
    const data = raw as Record<string, unknown>;
    const cbq = data.callback_query as Record<string, unknown> | undefined;
    const message = (data.message ?? cbq?.message ?? {}) as Record<string, unknown>;
    const from = (cbq?.from ?? message.from ?? {}) as Record<string, unknown>;
    const callbackQuery = cbq;

    let type: NormalizedIncomingEvent['type'] = 'message';
    let text = String(message.text ?? '');

    if (callbackQuery) {
      type = 'callback';
      text = String(callbackQuery.data ?? '');
    } else if (text.startsWith('/')) {
      type = 'command';
    }

    const username = from.username ? String(from.username) : undefined;
    const firstName = from.first_name ? String(from.first_name) : '';
    const lastName = from.last_name ? String(from.last_name) : '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;

    const payload: Record<string, unknown> = {};
    if (callbackQuery) payload.callback_query_id = callbackQuery.id;
    if (username) payload.username = username;
    if (displayName) payload.display_name = displayName;

    const attachments: NormalizedIncomingEvent['attachments'] = [];
    const photoArr = message.photo as Array<Record<string, unknown>> | undefined;
    if (photoArr?.length) {
      const best = photoArr.reduce((a, b) => ((a.width as number) > (b.width as number) ? a : b));
      const fileId = best.file_id ? String(best.file_id) : undefined;
      if (fileId) {
        attachments.push({ type: 'image', url: fileId });
        if (!text) text = '[фото]';
      }
    }
    const document = message.document as Record<string, unknown> | undefined;
    if (document) {
      attachments.push({
        type: 'document',
        url: document.file_id ? String(document.file_id) : undefined,
        filename: document.file_name ? String(document.file_name) : undefined,
        mime_type: document.mime_type ? String(document.mime_type) : undefined,
      });
    }

    return {
      channel: 'telegram',
      type,
      user_id: String(from.id ?? ''),
      chat_id: String((message.chat as Record<string, unknown>)?.id ?? ''),
      text,
      payload: Object.keys(payload).length > 0 ? payload : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: message.date
        ? new Date((message.date as number) * 1000).toISOString()
        : new Date().toISOString(),
      raw,
    };
  }
}
