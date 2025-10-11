export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

export interface EnhancedLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: keyof LogLevel): void;
}

class Logger implements EnhancedLogger {
  private level: keyof LogLevel = 'INFO';
  private context: Record<string, any> = {};

  setLevel(level: keyof LogLevel): void {
    this.level = level;
  }

  withContext(context: Record<string, any>): Logger {
    const newLogger = new Logger();
    newLogger.level = this.level;
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('INFO')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('ERROR')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels: Record<keyof LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    return levels[level] >= levels[this.level];
  }
}

export const logger = new Logger();






