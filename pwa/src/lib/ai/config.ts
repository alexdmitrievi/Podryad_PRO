/**
 * AI / LLM Layer Configuration.
 * All settings from environment variables — no hardcoded keys or model names.
 */

import { log } from '@/lib/logger';

export interface LLMConfig {
  apiKey: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  apiBase: string;
}

export function getLLMConfig(): LLMConfig {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) {
    log.warn('[LLMConfig] OPENAI_API_KEY is not set');
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    timeout: parseInt(process.env.OPENAI_TIMEOUT ?? '30000', 10),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS ?? '2048', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE ?? '0.7'),
    apiBase: process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1',
  };
}
