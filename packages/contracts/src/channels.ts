import { z } from 'zod';

export const ChannelSchema = z.enum(['telegram', 'max', 'avito']);
export type Channel = z.infer<typeof ChannelSchema>;

export const MessageTypeSchema = z.enum(['message', 'command', 'callback']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageButtonSchema = z.object({
  type: z.enum(['url', 'callback']),
  text: z.string().max(128),
  url: z.string().optional(),
  callback_data: z.string().optional(),
});
export type MessageButton = z.infer<typeof MessageButtonSchema>;

export const NormalizedIncomingEventSchema = z.object({
  channel: ChannelSchema,
  type: MessageTypeSchema,
  user_id: z.string(),
  chat_id: z.string(),
  text: z.string(),
  update_id: z.string().optional(),
  timestamp: z.string().optional(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document']),
    url: z.string(),
  })).optional(),
});
export type NormalizedIncomingEvent = z.infer<typeof NormalizedIncomingEventSchema>;

export const NormalizedOutgoingMessageSchema = z.object({
  channel: ChannelSchema,
  chat_id: z.string(),
  user_id: z.string().optional(),
  text: z.string().max(4000),
  buttons: z.array(z.array(MessageButtonSchema)).optional(),
  parse_mode: z.enum(['HTML', 'Markdown']).optional(),
});
export type NormalizedOutgoingMessage = z.infer<typeof NormalizedOutgoingMessageSchema>;

export const SendResultSchema = z.object({
  success: z.boolean(),
  channel: ChannelSchema,
  message_id: z.string().optional(),
  latency_ms: z.number(),
  error: z.string().optional(),
});
export type SendResult = z.infer<typeof SendResultSchema>;
