import pino from 'pino';
import { config } from '../config/index.js';

// Configuration for the logger
const loggerOptions = {
  level: config.logging?.level || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
};

// Create logger instance
const pinoLogger = pino(loggerOptions);

// Export a wrapper to ensure consistent typing
export const logger = {
  info: (obj: object | string, msg?: string, ...args: any[]) => {
    if (typeof obj === 'string') {
      pinoLogger.info(msg || obj, ...args);
    } else {
      pinoLogger.info(obj, msg, ...args);
    }
  },
  error: (obj: object | string, msg?: string, ...args: any[]) => {
    if (typeof obj === 'string') {
      pinoLogger.error(msg || obj, ...args);
    } else {
      pinoLogger.error(obj, msg, ...args);
    }
  },
  warn: (obj: object | string, msg?: string, ...args: any[]) => {
    if (typeof obj === 'string') {
      pinoLogger.warn(msg || obj, ...args);
    } else {
      pinoLogger.warn(obj, msg, ...args);
    }
  },
  debug: (obj: object | string, msg?: string, ...args: any[]) => {
    if (typeof obj === 'string') {
      pinoLogger.debug(msg || obj, ...args);
    } else {
      pinoLogger.debug(obj, msg, ...args);
    }
  },
};
