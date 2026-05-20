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

/** Strip HTML tags & decode the basic entities — MAX bot UI doesn't render markup. */
export function stripHtml(s: string): string {
  if (!s) return s;
  return s
    .replace(/<\/?(b|strong|i|em|u|s|code|pre|br)\s*\/?>/gi, '')
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

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
      Authorization: this.config.botToken,
    };
  }

  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    const start = Date.now();
    const chatId = message.chat_id || this.config.defaultChatId;

    if (!chatId) {
      return { success: false, channel: 'max', error: 'No chat_id provided', latency_ms: 0 };
    }

    // Build URL — token in Authorization header per MAX API docs (query param deprecated)
    const proxyBase = process.env.MAX_API_PROXY;
    const url = proxyBase
      ? `${proxyBase}/proxy/max/messages`
      : `${this.config.apiBase}/messages`;

    const headers: Record<string, string> = proxyBase
      ? this.proxyHeaders()
      : { 'Content-Type': 'application/json', Authorization: this.config.botToken };

    // MAX doesn't render HTML/Markdown — strip tags so <b>...</b> doesn't leak.
    const plainText = stripHtml(message.text);
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: plainText,
    };

    // MAX inline keyboard — accept either flat list or pre-grouped rows.
    if (message.buttons?.length) {
      const toBtn = (btn: { type: string; text: string; url?: string; callback_data?: string }) =>
        btn.type === 'url'
          ? { type: 'link', text: btn.text, url: btn.url }
          : { type: 'callback', text: btn.text, payload: btn.callback_data };

      const isRowed = Array.isArray(message.buttons[0]);
      const rows = isRowed
        ? (message.buttons as unknown as Array<Array<Parameters<typeof toBtn>[0]>>).map((row) => row.map(toBtn))
        : (message.buttons as Array<Parameters<typeof toBtn>[0]>).map((b) => [toBtn(b)]);

      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: { buttons: rows },
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
          headers: headers,
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
      const proxyBase = process.env.MAX_API_PROXY;
      const url = proxyBase
        ? `${proxyBase}/proxy/max/me`
        : `${this.config.apiBase}/me`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Authorization: this.config.botToken },
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
 * MAX Mapper — converts raw MAX (TamTam) webhook payload to NormalizedIncomingEvent.
 *
 * Handles both shapes:
 *  - { update: { message: {...}, callback: {...}, update_type } }   ← legacy/some payloads
 *  - { update_type, timestamp, message: {...}, callback: {...} }    ← real TamTam shape
 *
 * Callback may carry user as either `callback.user.user_id` (TamTam) or
 * `callback.user_id` (flat). Same goes for chat_id.
 */
export class MaxMapper implements ChannelMapper {
  readonly channel = 'max' as const;

  normalize(raw: unknown): NormalizedIncomingEvent {
    const data = raw as Record<string, unknown>;
    const update = (data.update ?? data) as Record<string, unknown>;
    const message = (update.message ?? data.message ?? {}) as Record<string, unknown>;
    const body = (message.body ?? {}) as Record<string, unknown>;
    const sender = (message.sender ?? {}) as Record<string, unknown>;
    const recipient = (message.recipient ?? {}) as Record<string, unknown>;
    const callback = (update.callback ?? data.callback) as Record<string, unknown> | undefined;
    const updateType = String(update.update_type ?? data.update_type ?? '');

    let type: NormalizedIncomingEvent['type'] = 'message';
    let text = String(body.text ?? '');
    let userId = String(sender.user_id ?? sender.id ?? '');
    let cId = String(recipient.chat_id ?? message.chat_id ?? '');
    let username: string | undefined = sender.username ? String(sender.username) : undefined;
    let displayName: string | undefined = sender.name ? String(sender.name) : (sender.first_name ? String(sender.first_name) : undefined);

    if (callback || updateType === 'message_callback') {
      const cb = callback ?? {};
      const cbUser = (cb.user ?? {}) as Record<string, unknown>;
      type = 'callback';
      text = String(cb.payload ?? cb.callback_data ?? '');
      userId = String(cbUser.user_id ?? cb.user_id ?? sender.user_id ?? userId ?? '');
      cId = String(cb.chat_id ?? recipient.chat_id ?? message.chat_id ?? cId ?? '');
      if (cbUser.username) username = String(cbUser.username);
      if (cbUser.name) displayName = String(cbUser.name);
    } else if (text.startsWith('/')) {
      type = 'command';
    } else if (updateType === 'bot_started') {
      // Treat bot_started as an implicit /start so users get the welcome flow.
      type = 'command';
      text = '/start';
      const userField = (update.user ?? data.user ?? {}) as Record<string, unknown>;
      if (!userId) userId = String(userField.user_id ?? '');
      if (!cId) cId = String(update.chat_id ?? data.chat_id ?? userId ?? '');
      if (userField.name) displayName = String(userField.name);
    }

    const out: Record<string, unknown> = {};
    if (callback?.callback_id) out.callback_id = callback.callback_id;
    if (username) out.username = username;
    if (displayName) out.display_name = displayName;

    return {
      channel: 'max',
      type,
      user_id: userId,
      chat_id: cId,
      text,
      payload: Object.keys(out).length > 0 ? out : undefined,
      timestamp: message.timestamp
        ? new Date(message.timestamp as number).toISOString()
        : new Date().toISOString(),
      raw,
    };
  }
}
