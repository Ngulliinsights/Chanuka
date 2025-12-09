/**
 * Console Reporter
 *
 * Enhanced console logging reporter with structured output,
 * severity-based coloring, and configurable formatting.
 */

import { AppError, ErrorReporter, ErrorSeverity } from '../types';

export interface ConsoleReporterConfig {
  enableColors: boolean;
  enableStackTraces: boolean;
  enableContext: boolean;
  maxMessageLength: number;
  timestampFormat: 'iso' | 'locale' | 'relative';
}

export class ConsoleReporter implements ErrorReporter {
  private config: Required<ConsoleReporterConfig>;

  constructor(config: Partial<ConsoleReporterConfig> = {}) {
    this.config = {
      enableColors: true,
      enableStackTraces: true,
      enableContext: true,
      maxMessageLength: 500,
      timestampFormat: 'iso',
      ...config,
    };
  }

  async report(error: AppError): Promise<void> {
    const formattedMessage = this.formatError(error);
    const logMethod = this.getLogMethod(error.severity);

    logMethod(formattedMessage);

    if (this.config.enableStackTraces && error.stack) {
      console.groupCollapsed('Stack Trace');
      console.log(error.stack);
      console.groupEnd();
    }

    if (this.config.enableContext && error.context) {
      console.groupCollapsed('Error Context');
      console.log(error.context);
      console.groupEnd();
    }
  }

  private formatError(error: AppError): string {
    const timestamp = this.formatTimestamp(error.timestamp);
    const severity = this.formatSeverity(error.severity);
    const domain = `[${error.type.toUpperCase()}]`;
    const code = error.code ? `[${error.code}]` : '';
    const message = this.truncateMessage(error.message);

    return `${timestamp} ${severity} ${domain} ${code} ${message}`;
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);

    switch (this.config.timestampFormat) {
      case 'iso':
        return date.toISOString();
      case 'locale':
        return date.toLocaleString();
      case 'relative':
        return this.getRelativeTime(timestamp);
      default:
        return date.toISOString();
    }
  }

  private getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  private formatSeverity(severity: ErrorSeverity): string {
    const severityText = severity.toUpperCase();

    if (!this.config.enableColors) {
      return `[${severityText}]`;
    }

    const colors = {
      [ErrorSeverity.CRITICAL]: '\x1b[91m', // Red
      [ErrorSeverity.HIGH]: '\x1b[93m',     // Yellow
      [ErrorSeverity.MEDIUM]: '\x1b[94m',   // Blue
      [ErrorSeverity.LOW]: '\x1b[92m',      // Green
    };

    const reset = '\x1b[0m';
    const color = colors[severity] || '';

    return `${color}[${severityText}]${reset}`;
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxMessageLength) {
      return message;
    }
    return message.substring(0, this.config.maxMessageLength - 3) + '...';
  }

  private getLogMethod(severity: ErrorSeverity): (message: string) => void {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return console.error;
      case ErrorSeverity.HIGH:
        return console.warn;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.LOW:
        return console.info;
      default:
        return console.log;
    }
  }

  updateConfig(config: Partial<ConsoleReporterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}