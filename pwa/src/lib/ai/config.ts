/**
 * AI / LLM Layer Configuration.
 * All settings from environment variables — no hardcoded keys or model names.
 *
 * Provider resolution:
 * - Preferred: LLM_* variables (LLM_API_KEY, LLM_API_BASE, LLM_MODEL, ...).
 *   Setting LLM_API_KEY (or LLM_API_BASE) switches the app to that provider;
 *   missing pieces default to DeepSeek (https://api.deepseek.com/v1, deepseek-chat).
 * - Fallback: legacy OPENAI_* variables keep working unchanged (status quo),
 *   so existing deployments are not broken until LLM_* is explicitly set.
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

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_MODEL = 'gpt-4o';

function defaultModelFor(apiBase: string): string {
  return apiBase.includes('deepseek') ? DEEPSEEK_MODEL : OPENAI_MODEL;
}

export function getLLMConfig(): LLMConfig {
  const llmKey = process.env.LLM_API_KEY;
  const llmBase = process.env.LLM_API_BASE;

  // Provider switch: any explicit LLM_* entry point activates the new provider
  // (DeepSeek by default). Otherwise keep the legacy OpenAI config untouched.
  const useLlmProvider = Boolean(llmKey || llmBase);

  const apiBase = useLlmProvider
    ? (llmBase ?? DEEPSEEK_API_BASE)
    : (process.env.OPENAI_API_BASE ?? OPENAI_API_BASE);

  const apiKey = useLlmProvider
    ? (llmKey ?? process.env.OPENAI_API_KEY ?? '')
    : (process.env.OPENAI_API_KEY ?? '');

  const model =
    process.env.LLM_MODEL ??
    process.env.OPENAI_MODEL ??
    defaultModelFor(apiBase);

  if (!apiKey) {
    log.warn(`[LLMConfig] ${useLlmProvider ? 'LLM_API_KEY' : 'OPENAI_API_KEY'} is not set`);
  }

  return {
    apiKey,
    model,
    timeout: parseInt(process.env.LLM_TIMEOUT ?? process.env.OPENAI_TIMEOUT ?? '20000', 10),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? process.env.OPENAI_MAX_TOKENS ?? '2048', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? process.env.OPENAI_TEMPERATURE ?? '0.7'),
    apiBase,
  };
}
