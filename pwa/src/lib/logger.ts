/**
 * Structured JSON logger for production observability.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.error('payment/callback: order row missing', { orderId });
 *   log.warn('OPENAI_API_KEY is not set');
 *   log.info('ChannelRouter send result', { channel, success });
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function emit(entry: LogEntry): void {
  // Production: structured JSON for log aggregation (Vercel Logs, Datadog, etc.)
  // Development: pretty-print with timestamp
  if (process.env.NODE_ENV === 'production') {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const ts = entry.timestamp.slice(11, 23); // HH:MM:SS.mmm
    const ctx = entry.context && Object.keys(entry.context).length > 0
      ? ' ' + JSON.stringify(entry.context)
      : '';
    const method = entry.level === 'error' ? 'error'
      : entry.level === 'warn' ? 'warn'
      : 'log';
    console[method](`[${ts}] ${entry.level.toUpperCase()} ${entry.message}${ctx}`);
  }
}

function logAt(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  emit({
    level,
    message,
    timestamp: new Date().toISOString(),
    context: context && Object.keys(context).length > 0 ? context : undefined,
  });
}

export const log = {
  error(message: string, context?: Record<string, unknown>): void {
    logAt('error', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    logAt('warn', message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    logAt('info', message, context);
  },
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return; // no debug in prod
    logAt('debug', message, context);
  },
};
