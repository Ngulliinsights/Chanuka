/**
 * Legacy Logger Adapter
 * 
 * Provides backward compatibility for the old logger interface
 * while using the new core logging system underneath
 */

import { logger as coreLogger } from '../logger';

interface LegacyLogger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Create a legacy logger that wraps the core logging system
 */
const createLegacyLogger = (): LegacyLogger => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const canLog = typeof window !== 'undefined' && window.console && isDevelopment;

  return {
    info: (message: string, ...args: unknown[]): void => {
      if (canLog) {
        // Use core logger if available, otherwise fallback to console
        if (coreLogger && coreLogger.info) {
          coreLogger.info(`ℹ️ ${message}`, { args });
        } else {
          // eslint-disable-next-line no-console
          window.console.log(`ℹ️ ${message}`, ...args);
        }
      }
    },
    warn: (message: string, ...args: unknown[]): void => {
      if (canLog) {
        if (coreLogger && coreLogger.warn) {
          coreLogger.warn(`⚠️ ${message}`, { args });
        } else {
          // eslint-disable-next-line no-console
          window.console.warn(`⚠️ ${message}`, ...args);
        }
      }
    },
    error: (message: string, ...args: unknown[]): void => {
      if (canLog) {
        if (coreLogger && coreLogger.error) {
          coreLogger.error(`❌ ${message}`, { args });
        } else {
          // eslint-disable-next-line no-console
          window.console.error(`❌ ${message}`, ...args);
        }
      }
    },
  };
};

export const logger = createLegacyLogger();
export default logger;