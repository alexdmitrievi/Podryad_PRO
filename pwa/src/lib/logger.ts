/**
 * Structured JSON logger with optional DB persistence to app_logs.
 * Writes level=warn and level=error to public.app_logs (fire-and-forget)
 * so n8n Workflow 04 (Error Watch) can pick them up.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function emit(entry: LogEntry): void {
  if (process.env.NODE_ENV === 'production') {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const ts = entry.timestamp.slice(11, 23);
    const ctx = entry.context && Object.keys(entry.context).length > 0
      ? ' ' + JSON.stringify(entry.context)
      : '';
    const method = entry.level === 'error' ? 'error'
      : entry.level === 'warn' ? 'warn'
      : 'log';
    console[method](`[${ts}] ${entry.level.toUpperCase()} ${entry.message}${ctx}`);
  }
}

/** Fire-and-forget write to public.app_logs for n8n error watchdog */
function persistToDb(entry: LogEntry): void {
  void (async () => {
    try {
      const { getServiceClient } = await import('./supabase');
      const db = getServiceClient();
      await db.from('app_logs').insert({
        level: entry.level,
        source: 'vercel:app',
        message: entry.message,
        context: entry.context ?? {},
        created_at: entry.timestamp,
      });
    } catch {
      // silently ignore DB write failures — logging must never crash
    }
  })();
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
    persistToDb({ level: 'error', message, timestamp: new Date().toISOString(), context });
  },
  warn(message: string, context?: Record<string, unknown>): void {
    logAt('warn', message, context);
    persistToDb({ level: 'warn', message, timestamp: new Date().toISOString(), context });
  },
  info(message: string, context?: Record<string, unknown>): void {
    logAt('info', message, context);
  },
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return;
    logAt('debug', message, context);
  },
};
