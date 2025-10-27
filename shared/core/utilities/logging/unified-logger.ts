/**
 * Unified Logger
 */

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface LoggerConfig {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  format?: 'json' | 'text';
  enableColors?: boolean;
  enableTimestamp?: boolean;
}

export abstract class BaseLogger {
  protected config: LoggerConfig;
  protected readonly levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'INFO',
      format: 'text',
      enableColors: true,
      enableTimestamp: true,
      ...config
    };
  }

  abstract log(entry: LogEntry): void;

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.log({ level: 'DEBUG', message, timestamp: new Date(), metadata });
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('INFO')) {
      this.log({ level: 'INFO', message, timestamp: new Date(), metadata });
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('WARN')) {
      this.log({ level: 'WARN', message, timestamp: new Date(), metadata });
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    if (this.shouldLog('ERROR')) {
      this.log({ level: 'ERROR', message, timestamp: new Date(), error, metadata });
    }
  }

  private shouldLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): boolean {
    return this.levels[level] >= this.levels[this.config.level];
  }
}

export class ServerLogger extends BaseLogger {
  log(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    
    if (entry.level === 'ERROR') {
      console.error(formatted);
    } else if (entry.level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  private formatEntry(entry: LogEntry): string {
    const timestamp = this.config.enableTimestamp 
      ? `[${entry.timestamp.toISOString()}]` 
      : '';
    
    const level = `[${entry.level}]`;
    const message = entry.message;
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    const error = entry.error ? ` Error: ${entry.error.message}` : '';
    
    return `${timestamp} ${level} ${message}${metadata}${error}`;
  }
}

export class ClientLogger extends BaseLogger {
  log(entry: LogEntry): void {
    const args = [this.formatMessage(entry)];
    
    if (entry.metadata) args.push(entry.metadata);
    if (entry.error) args.push(entry.error);

    switch (entry.level) {
      case 'DEBUG': console.debug(...args); break;
      case 'INFO': console.info(...args); break;
      case 'WARN': console.warn(...args); break;
      case 'ERROR': console.error(...args); break;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = this.config.enableTimestamp 
      ? `[${entry.timestamp.toLocaleTimeString()}]` 
      : '';
    
    return `${timestamp} [${entry.level}] ${entry.message}`;
  }
}

export class UnifiedLogger {
  private static instance: BaseLogger;

  static createServerLogger(config?: Partial<LoggerConfig>): BaseLogger {
    return new ServerLogger(config);
  }

  static createClientLogger(config?: Partial<LoggerConfig>): BaseLogger {
    return new ClientLogger(config);
  }

  static getInstance(): BaseLogger {
    if (!this.instance) {
      if (typeof window !== 'undefined') {
        this.instance = this.createClientLogger();
      } else {
        this.instance = this.createServerLogger();
      }
    }
    return this.instance;
  }
}

export const logger = UnifiedLogger.getInstance();
