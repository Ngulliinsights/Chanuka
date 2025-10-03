import { config } from '../config/index.js';

// Simple logger levels
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[config.logging?.level as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;

// Simple logger implementation
class SimpleLogger {
  private formatMessage(level: string, obj: object | string, msg?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (typeof obj === 'string') {
      return `${prefix} ${obj}`;
    } else {
      const message = msg || '';
      const objStr = JSON.stringify(obj, null, 2);
      return `${prefix} ${message}\n${objStr}`;
    }
  }

  info(obj: object | string, msg?: string, ...args: any[]) {
    if (currentLogLevel <= LOG_LEVELS.info) {
      console.log(this.formatMessage('info', obj, msg), ...args);
    }
  }

  error(obj: object | string, msg?: string, ...args: any[]) {
    if (currentLogLevel <= LOG_LEVELS.error) {
      console.error(this.formatMessage('error', obj, msg), ...args);
    }
  }

  warn(obj: object | string, msg?: string, ...args: any[]) {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      console.warn(this.formatMessage('warn', obj, msg), ...args);
    }
  }

  debug(obj: object | string, msg?: string, ...args: any[]) {
    if (currentLogLevel <= LOG_LEVELS.debug) {
      console.debug(this.formatMessage('debug', obj, msg), ...args);
    }
  }
}

export const logger = new SimpleLogger();
