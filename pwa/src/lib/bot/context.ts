// Bot context — single RPC call replacing getBotContact + getOrCreateSession + getContactProfile
import { rpc } from './supabase';
import type { BotSession } from './session';
import type { RegionCode, CustomerType } from './types';

export type BotContext = {
  contactId: string;
  identityId: string;
  isNew: boolean;
  region: RegionCode;
  customerType?: CustomerType;
  session: BotSession;
};

export async function resolveBotContext(params: {
  channel: 'telegram' | 'max';
  externalId: string;
  chatId: string;
  username?: string;
  displayName?: string;
}): Promise<BotContext> {
  const raw = await rpc<Record<string, unknown>>('resolve_bot_context', {
    p_channel: params.channel,
    p_external_id: params.externalId,
    p_chat_id: params.chatId,
    p_username: params.username ?? null,
    p_display_name: params.displayName ?? null,
  });

  const sessionRaw = (raw.session as Record<string, unknown>) ?? {};

  return {
    contactId: String(raw.contact_id ?? ''),
    identityId: String(raw.identity_id ?? ''),
    isNew: Boolean(raw.is_new),
    region: (raw.region === 'novosibirsk' ? 'novosibirsk' : 'omsk') as RegionCode,
    customerType: (raw.customer_type === 'b2c' || raw.customer_type === 'b2b'
      ? raw.customer_type as CustomerType
      : undefined),
    session: {
      id: String(sessionRaw.id ?? ''),
      chat_id: String(sessionRaw.chat_id ?? ''),
      channel: String(sessionRaw.channel ?? ''),
      contact_id: sessionRaw.contact_id ? String(sessionRaw.contact_id) : undefined,
      funnel: String(sessionRaw.funnel ?? ''),
      step: String(sessionRaw.step ?? ''),
      state: (sessionRaw.state ?? {}) as BotSession['state'],
    },
  };
}
