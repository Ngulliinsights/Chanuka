/**
 * Browser-compatible logger
 * Simple logging utility that works in the browser environment
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  [key: string]: any;
}

class BrowserLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(message: string, context?: LogContext, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, context), ...args);
    }
  }

  info(message: string, context?: LogContext, ...args: any[]): void {
    console.info(this.formatMessage('INFO', message, context), ...args);
  }

  warn(message: string, context?: LogContext, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message, context), ...args);
  }

  error(message: string, context?: LogContext, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, context), ...args);
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const component = context?.component ? `[${context.component}]` : '';
    return `${timestamp} ${level} ${component} ${message}`;
  }
}

export const logger = new BrowserLogger();