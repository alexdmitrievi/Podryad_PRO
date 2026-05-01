import type {
  Channel,
  ChannelTransport,
  NormalizedOutgoingMessage,
  SendResult,
  ChannelHealth,
  NormalizedIncomingEvent,
  ChannelMapper,
} from './types';
import { TelegramTransport, TelegramMapper } from './telegram';
import { MaxTransport, MaxMapper } from './max';
import { AvitoTransport, AvitoMapper } from './avito';
import { SUPPORTED_CHANNELS, isValidChannel } from './config';
import { log } from '@/lib/logger';

/**
 * ChannelRouter — unified dispatcher for all supported channels.
 * Business logic uses this single entry point; it never calls
 * platform-specific APIs directly.
 */
export class ChannelRouter {
  private transports: Map<Channel, ChannelTransport>;
  private mappers: Map<Channel, ChannelMapper>;

  constructor() {
    this.transports = new Map<Channel, ChannelTransport>([
      ['telegram', new TelegramTransport()],
      ['max', new MaxTransport()],
      ['avito', new AvitoTransport()],
    ]);

    this.mappers = new Map<Channel, ChannelMapper>([
      ['telegram', new TelegramMapper()],
      ['max', new MaxMapper()],
      ['avito', new AvitoMapper()],
    ]);
  }

  /**
   * Send a normalized message through the appropriate transport.
   */
  async send(message: NormalizedOutgoingMessage): Promise<SendResult> {
    if (!isValidChannel(message.channel)) {
      return {
        success: false,
        channel: message.channel,
        error: `Unsupported channel: ${message.channel}. Supported: ${SUPPORTED_CHANNELS.join(', ')}`,
        latency_ms: 0,
      };
    }

    const transport = this.transports.get(message.channel);
    if (!transport) {
      return {
        success: false,
        channel: message.channel,
        error: `No transport configured for channel: ${message.channel}`,
        latency_ms: 0,
      };
    }

    const correlationId = `${message.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    log.info(`[ChannelRouter] Sending message`, {
      correlation_id: correlationId,
      channel: message.channel,
      chat_id: message.chat_id,
      text_length: message.text.length,
    });

    const result = await transport.send(message);

    log.info(`[ChannelRouter] Send result`, {
      correlation_id: correlationId,
      channel: message.channel,
      success: result.success,
      message_id: result.message_id,
      latency_ms: result.latency_ms,
      error: result.error,
    });

    return result;
  }

  /**
   * Broadcast a message to multiple channels simultaneously.
   */
  async broadcast(
    channels: Channel[],
    messageBuilder: (channel: Channel) => NormalizedOutgoingMessage,
  ): Promise<Map<Channel, SendResult>> {
    const results = new Map<Channel, SendResult>();
    const promises = channels.map(async (ch) => {
      const msg = messageBuilder(ch);
      const result = await this.send(msg);
      results.set(ch, result);
    });
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Normalize a raw incoming event from any channel.
   */
  normalize(channel: Channel, raw: unknown): NormalizedIncomingEvent {
    const mapper = this.mappers.get(channel);
    if (!mapper) {
      throw new Error(`No mapper configured for channel: ${channel}`);
    }
    return mapper.normalize(raw);
  }

  /**
   * Health check for all channels.
   */
  async healthCheckAll(): Promise<ChannelHealth[]> {
    const checks = Array.from(this.transports.values()).map((t) => t.healthCheck());
    return Promise.all(checks);
  }

  /**
   * Get available channels.
   */
  get channels(): readonly Channel[] {
    return SUPPORTED_CHANNELS;
  }
}

/** Singleton instance for the application. */
let _router: ChannelRouter | null = null;

export function getChannelRouter(): ChannelRouter {
  if (!_router) {
    _router = new ChannelRouter();
  }
  return _router;
}
