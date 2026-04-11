import { getLLMConfig, type LLMConfig } from './config';
import type { AgentRequest, AgentResponse, ConversationMessage } from './types';

const SYSTEM_PROMPT = `Ты — AI-ассистент сервиса «Подряд PRO», платформы для заказа рабочей силы, техники и стройматериалов.

КАНАЛЫ КОММУНИКАЦИИ:
- Единственные разрешённые каналы: Telegram, MAX, Avito
- Email НЕ является каналом коммуникации. Никогда не предлагай связь по email.
- Если пользователь упоминает email — предложи MAX или Telegram.

ПРАВИЛА:
- Отвечай кратко, дружелюбно и по делу
- Используй формат, подходящий для мессенджера текущего канала
- Не используй HTML-разметку в сообщениях для мессенджеров
- Для Telegram — допускай Markdown (bold, italic)
- Для MAX — допускай Markdown
- Для Avito — только plain text, без форматирования
- Всегда помни, что ты представляешь Подряд PRO
- Не выдумывай цены — если не знаешь, скажи что уточнишь
- Город работы: Омск, Новосибирск
- MAX — основной мессенджер, Telegram — резервный`;

/**
 * OpenAI Client — abstraction layer for GPT-4o conversational agent.
 * All OpenAI API calls go through this single client.
 */
export class OpenAIClient {
  private config: LLMConfig;

  constructor(config?: LLMConfig) {
    this.config = config ?? getLLMConfig();
  }

  /**
   * Generate a conversational response.
   */
  async chat(request: AgentRequest): Promise<AgentResponse> {
    const start = Date.now();

    if (!this.config.apiKey) {
      return this.fallbackResponse('OPENAI_API_KEY not configured', start);
    }

    const messages = this.buildMessages(request);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeout);

      const res = await fetch(`${this.config.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[OpenAIClient] API error ${res.status}:`, errorText);
        return this.fallbackResponse(`OpenAI API error: ${res.status}`, start);
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? '';

      // Try to parse structured response if the assistant returns JSON
      const parsed = this.tryParseStructured(content);

      return {
        text: parsed.text,
        suggested_actions: parsed.suggested_actions,
        meta: {
          model: json.model,
          finish_reason: choice?.finish_reason,
          channel: request.channel,
        },
        confidence: choice?.finish_reason === 'stop' ? 0.9 : 0.6,
        fallback: false,
        usage: json.usage
          ? {
              prompt_tokens: json.usage.prompt_tokens,
              completion_tokens: json.usage.completion_tokens,
              total_tokens: json.usage.total_tokens,
            }
          : undefined,
        latency_ms: Date.now() - start,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[OpenAIClient] Request failed:', errorMsg);
      return this.fallbackResponse(errorMsg, start);
    }
  }

  private buildMessages(request: AgentRequest): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    // System prompt
    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\nТЕКУЩИЙ КАНАЛ: ${request.channel}`;

    if (request.policyInstructions) {
      systemContent += `\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n${request.policyInstructions}`;
    }

    if (request.systemConstraints?.length) {
      systemContent += `\n\nОГРАНИЧЕНИЯ:\n${request.systemConstraints.map((c) => `- ${c}`).join('\n')}`;
    }

    if (request.businessContext && Object.keys(request.businessContext).length > 0) {
      systemContent += `\n\nКОНТЕКСТ:\n${JSON.stringify(request.businessContext, null, 2)}`;
    }

    messages.push({ role: 'system', content: systemContent });

    // Conversation history
    for (const msg of request.history) {
      messages.push(msg);
    }

    // Current user message
    messages.push({ role: 'user', content: request.message });

    return messages;
  }

  private tryParseStructured(content: string): {
    text: string;
    suggested_actions: AgentResponse['suggested_actions'];
  } {
    // If the response is plain text, return as-is
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed.text) {
        return {
          text: parsed.text,
          suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions : [],
        };
      }
    } catch {
      // Not JSON, that's fine
    }
    return { text: content, suggested_actions: [] };
  }

  private fallbackResponse(error: string, startTime: number): AgentResponse {
    return {
      text: 'Извините, сейчас не могу обработать ваш запрос. Пожалуйста, попробуйте позже или свяжитесь с нами через MAX или Telegram.',
      suggested_actions: [],
      meta: { error },
      confidence: 0,
      fallback: true,
      latency_ms: Date.now() - startTime,
    };
  }
}

/** Singleton instance */
let _client: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!_client) {
    _client = new OpenAIClient();
  }
  return _client;
}
