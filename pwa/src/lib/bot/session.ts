// Bot session management — CRUD for bot_sessions table
import { rpc } from './supabase';
import type { SessionState, Screen } from './types';

export type BotSession = {
  id: string;
  chat_id: string;
  channel: string;
  contact_id?: string;
  funnel: string;
  step: string;
  state: SessionState;
};

export async function getOrCreateSession(
  chatId: string,
  channel: string,
  contactId?: string,
): Promise<BotSession> {
  const data = await rpc<BotSession>('get_or_create_bot_session', {
    p_chat_id: chatId,
    p_channel: channel,
    p_contact_id: contactId ?? null,
  });
  return data;
}

export async function updateSession(
  chatId: string,
  channel: string,
  opts: {
    funnel?: string;
    step?: string;
    state?: SessionState;
  },
): Promise<void> {
  await rpc('update_bot_session', {
    p_chat_id: chatId,
    p_channel: channel,
    p_funnel: opts.funnel ?? null,
    p_step: opts.step ?? null,
    p_state: opts.state ? JSON.stringify(opts.state) : null,
  });
}

export async function setSessionState(
  chatId: string,
  channel: string,
  screen: Screen,
  step: string,
  state: SessionState,
): Promise<void> {
  await updateSession(chatId, channel, {
    funnel: screen,
    step,
    state: { ...state, screen },
  });
}

export async function clearSession(chatId: string, channel: string): Promise<void> {
  await updateSession(chatId, channel, {
    funnel: 'home',
    step: 'start',
    state: { screen: 'home' },
  });
}
