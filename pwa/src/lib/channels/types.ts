/**
 * Normalized multi-channel communication types.
 * Supported channels: telegram, max, avito.
 * Email has been fully removed from the communication layer.
 */

export type Channel = 'telegram' | 'max' | 'avito' | 'web';

export type IncomingEventType = 'message' | 'command' | 'callback' | 'system';

export interface NormalizedIncomingEvent {
  channel: Channel;
  type: IncomingEventType;
  user_id: string;
  chat_id: string;
  text: string;
  payload?: Record<string, unknown>;
  attachments?: Attachment[];
  timestamp: string; // ISO 8601
  raw?: unknown;
}

export interface NormalizedOutgoingMessage {
  channel: Channel;
  chat_id: string;
  user_id?: string;
  text: string;
  buttons?: MessageButton[];
  attachments?: Attachment[];
  reply_to?: string;
  meta?: Record<string, unknown>;
}

export interface MessageButton {
  type: 'url' | 'callback';
  text: string;
  url?: string;
  callback_data?: string;
}

export interface Attachment {
  type: 'image' | 'document' | 'video' | 'audio';
  url?: string;
  filename?: string;
  mime_type?: string;
}

export interface SendResult {
  success: boolean;
  message_id?: string;
  channel: Channel;
  error?: string;
  latency_ms?: number;
}

export interface ChannelHealth {
  channel: Channel;
  healthy: boolean;
  last_check: string;
  error?: string;
}

/**
 * Transport interface — each channel implements this.
 */
export interface ChannelTransport {
  readonly channel: Channel;
  send(message: NormalizedOutgoingMessage): Promise<SendResult>;
  healthCheck(): Promise<ChannelHealth>;
}

/**
 * Mapper interface — each channel implements this to normalize
 * raw platform-specific payloads into NormalizedIncomingEvent.
 */
export interface ChannelMapper {
  readonly channel: Channel;
  normalize(raw: unknown): NormalizedIncomingEvent;
}
