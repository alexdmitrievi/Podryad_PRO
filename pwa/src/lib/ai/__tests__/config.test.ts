import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLLMConfig } from '../config';

const LLM_VARS = [
  'LLM_API_KEY',
  'LLM_API_BASE',
  'LLM_MODEL',
  'LLM_TIMEOUT',
  'LLM_MAX_TOKENS',
  'LLM_TEMPERATURE',
  'OPENAI_API_KEY',
  'OPENAI_API_BASE',
  'OPENAI_MODEL',
  'OPENAI_TIMEOUT',
  'OPENAI_MAX_TOKENS',
  'OPENAI_TEMPERATURE',
] as const;

describe('getLLMConfig', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const v of LLM_VARS) {
      saved[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    for (const v of LLM_VARS) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
  });

  it('falls back to legacy OpenAI config when no LLM_* is set', () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    const cfg = getLLMConfig();
    expect(cfg.apiKey).toBe('openai-key');
    expect(cfg.apiBase).toBe('https://api.openai.com/v1');
    expect(cfg.model).toBe('gpt-4o');
  });

  it('switches to DeepSeek defaults when only LLM_API_KEY is set', () => {
    process.env.LLM_API_KEY = 'ds-key';
    const cfg = getLLMConfig();
    expect(cfg.apiKey).toBe('ds-key');
    expect(cfg.apiBase).toBe('https://api.deepseek.com/v1');
    expect(cfg.model).toBe('deepseek-chat');
  });

  it('honours explicit LLM_API_BASE and derives a matching default model', () => {
    process.env.LLM_API_KEY = 'ds-key';
    process.env.LLM_API_BASE = 'https://api.deepseek.com/v1';
    const cfg = getLLMConfig();
    expect(cfg.apiBase).toBe('https://api.deepseek.com/v1');
    expect(cfg.model).toBe('deepseek-chat');
  });

  it('LLM_* takes precedence over OPENAI_*', () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.LLM_API_KEY = 'ds-key';
    process.env.LLM_MODEL = 'deepseek-reasoner';
    const cfg = getLLMConfig();
    expect(cfg.apiKey).toBe('ds-key');
    expect(cfg.model).toBe('deepseek-reasoner');
  });

  it('legacy OPENAI_MODEL is respected when provider is DeepSeek but model not pinned', () => {
    process.env.LLM_API_KEY = 'ds-key';
    process.env.OPENAI_MODEL = 'custom-model';
    const cfg = getLLMConfig();
    expect(cfg.model).toBe('custom-model');
    expect(cfg.apiBase).toBe('https://api.deepseek.com/v1');
  });

  it('reads numeric knobs from LLM_* first, then OPENAI_*', () => {
    process.env.LLM_API_KEY = 'ds-key';
    process.env.LLM_TIMEOUT = '5000';
    process.env.OPENAI_MAX_TOKENS = '1024';
    const cfg = getLLMConfig();
    expect(cfg.timeout).toBe(5000);
    expect(cfg.maxTokens).toBe(1024);
    expect(cfg.temperature).toBe(0.7);
  });

  it('returns empty key with a warning when nothing is configured', () => {
    const cfg = getLLMConfig();
    expect(cfg.apiKey).toBe('');
    expect(cfg.apiBase).toBe('https://api.openai.com/v1');
  });
});
