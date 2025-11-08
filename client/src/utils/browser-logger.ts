/**
 * Browser Logger - Client Utility
 *
 * Simple console-based logger for browser environment that avoids
 * importing Node.js specific modules that can cause runtime errors.
 */

type LoggerLike = {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

const browserLogger: LoggerLike = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

export const logger: LoggerLike = browserLogger;

export default logger;