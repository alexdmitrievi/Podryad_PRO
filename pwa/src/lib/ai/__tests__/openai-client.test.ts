import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIClient } from '../openai-client';

// We test the OpenAI client's error handling and response parsing.
// Actual API calls are mocked via global fetch.

describe('OpenAIClient', () => {
  let client: OpenAIClient;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-4o';
    client = new OpenAIClient();
  });

  describe('system prompt', () => {
    it('does not mention email as a communication channel', async () => {
      // Mock fetch to capture the request body
      let capturedBody: string | undefined;
      const mockFetch = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
        capturedBody = options.body as string;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Тестовый ответ' } }],
            usage: { total_tokens: 10 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.chat({
        channel: 'telegram',
        user_id: 'test',
        text: 'Привет',
        history: [],
      });

      expect(capturedBody).toBeDefined();
      const body = JSON.parse(capturedBody!);
      const systemMsg = body.messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMsg).toBeDefined();
      // System prompt should explicitly say email is NOT a channel
      expect(systemMsg.content).toContain('Email НЕ является каналом');

      vi.unstubAllGlobals();
    });
  });

  describe('error handling', () => {
    it('returns fallback response on API error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      );

      const response = await client.chat({
        channel: 'max',
        user_id: 'test',
        text: 'Привет',
        history: [],
      });

      expect(response.fallback).toBe(true);
      expect(response.text).toBeTruthy();

      vi.unstubAllGlobals();
    });
  });
});
