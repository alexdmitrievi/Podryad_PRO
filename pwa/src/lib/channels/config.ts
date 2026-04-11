/**
 * Channel configuration — all tokens, URLs, timeouts come from env vars.
 * No hardcoded secrets.
 */

export interface ChannelConfig {
  enabled: boolean;
  apiBase: string;
  botToken: string;
  defaultChatId?: string;
  timeout: number;
  maxRetries: number;
  retryBaseDelay: number; // ms
}

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

export function getTelegramConfig(): ChannelConfig {
  return {
    enabled: !!env('TELEGRAM_BOT_TOKEN'),
    apiBase: `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}`,
    botToken: env('TELEGRAM_BOT_TOKEN'),
    defaultChatId: env('TELEGRAM_ADMIN_CHAT_ID') || env('TELEGRAM_ADMIN_ID'),
    timeout: envInt('TELEGRAM_TIMEOUT', 10000),
    maxRetries: envInt('TELEGRAM_MAX_RETRIES', 3),
    retryBaseDelay: envInt('TELEGRAM_RETRY_DELAY', 1000),
  };
}

export function getMaxConfig(): ChannelConfig {
  return {
    enabled: !!env('MAX_BOT_TOKEN'),
    apiBase: env('MAX_API_BASE', 'https://botapi.max.ru'),
    botToken: env('MAX_BOT_TOKEN'),
    defaultChatId: env('MAX_CHANNEL_ID'),
    timeout: envInt('MAX_TIMEOUT', 10000),
    maxRetries: envInt('MAX_MAX_RETRIES', 3),
    retryBaseDelay: envInt('MAX_RETRY_DELAY', 1000),
  };
}

export function getAvitoConfig(): ChannelConfig {
  return {
    enabled: !!env('AVITO_API_TOKEN'),
    apiBase: env('AVITO_API_BASE', 'https://api.avito.ru'),
    botToken: env('AVITO_API_TOKEN'),
    defaultChatId: undefined,
    timeout: envInt('AVITO_TIMEOUT', 15000),
    maxRetries: envInt('AVITO_MAX_RETRIES', 2),
    retryBaseDelay: envInt('AVITO_RETRY_DELAY', 2000),
  };
}

export const SUPPORTED_CHANNELS = ['telegram', 'max', 'avito'] as const;

export function isValidChannel(channel: string): channel is 'telegram' | 'max' | 'avito' {
  return SUPPORTED_CHANNELS.includes(channel as typeof SUPPORTED_CHANNELS[number]);
}
