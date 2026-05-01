import type {
  ChannelTransport,
  NormalizedOutgoingMessage,
  SendResult,
  ChannelHealth,
  NormalizedIncomingEvent,
  ChannelMapper,
} from './types';
import { getAvitoConfig, type ChannelConfig } from './config';
import { log } from '@/lib/logger';

/**
 * Avito Transport — sends messages through the Avito Messenger API.
 *
 * Avito API specifics:
 * - Auth via Bearer token (OAuth2)
 * - Messages: POST /messenger/v3/accounts/{user_id}/chats/{chat_id}/messages
 * - Rate limits apply
 * - Text-only messages (no inline keyboards)
 */
export class AvitoTransport implements ChannelTransport {
  readonly channel = 'avito' as const;
  private config: ChannelConfig;

  constructor(config?: ChannelConfig) {
    this.config = config ?? getAvitoConfig();
  }

  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    const start = Date.now();

    if (!message.chat_id) {
      return { success: false, channel: 'avito', error: 'No chat_id provided', latency_ms: 0 };
    }
    if (!message.user_id) {
      return { success: false, channel: 'avito', error: 'No user_id provided (required for Avito)', latency_ms: 0 };
    }

    const url = `${this.config.apiBase}/messenger/v3/accounts/${encodeURIComponent(message.user_id)}/chats/${encodeURIComponent(message.chat_id)}/messages`;

    const body = {
      message: { text: message.text },
      type: 'text',
    };

    let lastError = '';
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.botToken}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          return {
            success: true,
            channel: 'avito',
            message_id: String(json.id ?? ''),
            latency_ms: Date.now() - start,
          };
        }

        lastError = `Avito API error: ${res.status} ${res.statusText}`;
        log.error(`[AvitoTransport] Attempt ${attempt + 1} failed`, { error: String(lastError) });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        log.error(`[AvitoTransport] Attempt ${attempt + 1} error`, { error: String(lastError) });
      }

      if (attempt < this.config.maxRetries) {
        await new Promise((r) => setTimeout(r, this.config.retryBaseDelay * 2 ** attempt));
      }
    }

    return { success: false, channel: 'avito', error: lastError, latency_ms: Date.now() - start };
  }

  async healthCheck(): Promise<ChannelHealth> {
    // Avito doesn't have a simple health endpoint; check auth validity
    try {
      const url = `${this.config.apiBase}/core/v1/accounts/self`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.config.botToken}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      return {
        channel: 'avito',
        healthy: res.ok,
        last_check: new Date().toISOString(),
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        channel: 'avito',
        healthy: false,
        last_check: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Avito Mapper — converts raw Avito webhook payload to NormalizedIncomingEvent.
 */
export class AvitoMapper implements ChannelMapper {
  readonly channel = 'avito' as const;

  normalize(raw: unknown): NormalizedIncomingEvent {
    const data = raw as Record<string, unknown>;
    const payload = (data.payload ?? data) as Record<string, unknown>;
    const value = (payload.value ?? {}) as Record<string, unknown>;

    return {
      channel: 'avito',
      type: 'message',
      user_id: String(value.author_id ?? value.user_id ?? ''),
      chat_id: String(value.chat_id ?? ''),
      text: String((value.content as Record<string, unknown>)?.text ?? value.text ?? ''),
      timestamp: value.created
        ? new Date(value.created as number * 1000).toISOString()
        : new Date().toISOString(),
      raw,
    };
  }
}
