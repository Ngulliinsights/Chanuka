/**
 * Simple logger for testing
 */

export interface LogContext {
  component?: string;
  user_id?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: LogContext, error?: Error | unknown) => void;
}

class SimpleLogger implements Logger {
  debug(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message, context, meta);
    }
  }

  info(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    console.info('[INFO]', message, context, meta);
  }

  warn(message: string, context?: LogContext, meta?: Record<string, unknown>): void {
    console.warn('[WARN]', message, context, meta);
  }

  error(message: string, context?: LogContext, error?: Error | unknown): void {
    console.error('[ERROR]', message, context, error);
  }
}

export const logger = new SimpleLogger();