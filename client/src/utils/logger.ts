// Minimal client-side logger shim used only for builds/tests
// Keeps a compatible API with server logger usage but is a no-op in tests
export const logger = {
  debug: (...args: any[]) => {
    // no-op in test environment
    if (typeof window !== 'undefined' && (window as any).__DEV_LOG__) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (typeof window !== 'undefined' && (window as any).__DEV_LOG__) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined' && (window as any).__DEV_LOG__) console.warn(...args);
  },
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined' && (window as any).__DEV_LOG__) console.error(...args);
  },
  child: (meta: Record<string, any> = {}) => {
    // return same logger for simplicity
    return logger;
  },
};





































