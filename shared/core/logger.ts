/**
 * Simple Logger for Development
 * Temporary solution until full observability system is integrated
 */

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export const logger: Logger = {
  info: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${msg}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${msg}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${msg}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  debug: (msg: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] [DEBUG] ${msg}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
};