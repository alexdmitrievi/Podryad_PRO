import type { Channel } from '../channels/types';

/**
 * AI / LLM types for the conversational agent.
 */

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentRequest {
  /** Current user message text */
  message: string;
  /** Conversation history (newest last) */
  history: ConversationMessage[];
  /** Which channel the conversation is happening on */
  channel: Channel;
  /** Business context — lead info, order info, etc. */
  businessContext?: Record<string, unknown>;
  /** System-level constraints and policies */
  systemConstraints?: string[];
  /** Policy instructions for the agent */
  policyInstructions?: string;
}

export interface SuggestedAction {
  type: 'send_link' | 'create_order' | 'escalate' | 'schedule_followup' | 'custom';
  label: string;
  payload?: Record<string, unknown>;
}

export interface AgentResponse {
  /** Generated reply text */
  text: string;
  /** Suggested follow-up actions */
  suggested_actions: SuggestedAction[];
  /** Additional metadata */
  meta: Record<string, unknown>;
  /** Confidence score (0–1) */
  confidence: number;
  /** Whether the agent could not produce a good answer */
  fallback: boolean;
  /** Token usage */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Latency in ms */
  latency_ms: number;
}
