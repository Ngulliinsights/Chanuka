/**
 * Browser-Compatible Logger
 * 
 * A lightweight logging system designed specifically for browser environments.
 * This avoids Node.js dependencies while providing comprehensive error handling.
 */

// Browser-compatible error types
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorDomain {
  COMPONENT = 'component',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RENDERING = 'rendering',
  CHUNK_LOADING = 'chunk_loading',
  API = 'api',
  STORAGE = 'storage',
  BUSINESS_LOGIC = 'business_logic'
}

export interface LogContext {
  component?: string;
  user_id?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface BrowserErrorInfo {
  id: string;
  message: string;
  severity: ErrorSeverity;
  domain: ErrorDomain;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
  recoverable: boolean;
}

export class BrowserError extends Error {
  public readonly id: string;
  public readonly severity: ErrorSeverity;
  public readonly domain: ErrorDomain;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    options: Partial<BrowserErrorInfo> = {}
  ) {
    super(message);
    this.name = 'BrowserError';
    this.id = options.id || `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.domain = options.domain || ErrorDomain.COMPONENT;
    this.timestamp = options.timestamp || new Date();
    this.context = options.context;
    this.recoverable = options.recoverable ?? true;
  }
}

export interface Logger {
  debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => void;
  error: (message: string, context?: LogContext, error?: Error | unknown) => void;
  createError: (message: string, options?: Partial<BrowserError>) => BrowserError;
}

/**
 * Creates a browser error with proper metadata
 */
function createBrowserError(
  message: string,
  options: Partial<BrowserErrorInfo> = {}
): BrowserError {
  return new BrowserError(message, options);
}

/**
 * Determines error severity based on error characteristics
 */
function determineSeverity(error: Error | unknown): ErrorSeverity {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return ErrorSeverity.HIGH;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorSeverity.MEDIUM;
    }
    
    if (message.includes('cannot read') || message.includes('undefined')) {
      return ErrorSeverity.HIGH;
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorSeverity.HIGH;
    }
  }
  
  return ErrorSeverity.MEDIUM;
}

/**
 * Determines error domain based on error characteristics
 */
function determineDomain(error: Error | unknown): ErrorDomain {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return ErrorDomain.CHUNK_LOADING;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorDomain.NETWORK;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorDomain.VALIDATION;
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorDomain.AUTHENTICATION;
    }
    
    if (message.includes('storage') || message.includes('localStorage')) {
      return ErrorDomain.STORAGE;
    }
  }
  
  return ErrorDomain.COMPONENT;
}

/**
 * Formats log context into a consistent string representation
 */
function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return '';

  try {
    return JSON.stringify(context);
  } catch (error) {
    return '[Context serialization failed]';
  }
}

/**
 * Creates the browser-compatible logger implementation
 */
function createBrowserLogger(): Logger {
  return {
    debug: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        const contextStr = formatContext(context);
        const metaStr = meta ? JSON.stringify(meta) : '';
        console.debug(`[DEBUG] ${message}`, contextStr, metaStr);
      }
    },

    info: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
      const contextStr = formatContext(context);
      const metaStr = meta ? JSON.stringify(meta) : '';
      console.info(`[INFO] ${message}`, contextStr, metaStr);
    },

    warn: (message: string, context?: LogContext, meta?: Record<string, unknown>) => {
      const contextStr = formatContext(context);
      const metaStr = meta ? JSON.stringify(meta) : '';
      console.warn(`[WARN] ${message}`, contextStr, metaStr);
    },

    error: (message: string, context?: LogContext, error?: Error | unknown) => {
      const contextStr = formatContext(context);

      // Create structured error information
      let errorInfo: unknown = null;
      if (error instanceof Error) {
        errorInfo = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } as Record<string, unknown>;
      } else if (error) {
        errorInfo = error as Record<string, unknown>;
      }

      console.error(`[ERROR] ${message}`, contextStr, errorInfo);

      // Send to error tracking service if available
      if (typeof window !== 'undefined') {
        const w = window as unknown as { Sentry?: { captureException?: (err: unknown, opts?: unknown) => void } };
        const maybeSentry = w?.Sentry;
        if (maybeSentry && typeof maybeSentry.captureException === 'function') {
          maybeSentry.captureException(error || new Error(message), {
            contexts: {
              logger: {
                message,
                context: context || {},
              },
            },
          });
        }
      }
    },

    createError: (message: string, options: Partial<BrowserError> = {}) => {
      return createBrowserError(message, options);
    }
  };
}

/**
 * Error recovery utilities
 */
export const ErrorRecovery = {
  /**
   * Attempts to recover from chunk loading errors
   */
  recoverFromChunkError: (): void => {
    // Clear module cache if available
      if (typeof window !== 'undefined') {
        const w = window as unknown as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(w, 'webpackChunkName')) {
          // remove potentially injected webpack variable
          Reflect.deleteProperty(w, 'webpackChunkName');
        }
      }
    
    // Reload the page to fetch fresh chunks
    window.location.reload();
  },

  /**
   * Attempts to recover from network errors
   */
  recoverFromNetworkError: async (): Promise<boolean> => {
    // Check if we're online
    if (!navigator.onLine) {
      return false;
    }
    
    // Simple connectivity test
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Attempts to recover from storage errors
   */
  recoverFromStorageError: (): boolean => {
    try {
      // Clear potentially corrupted storage
      localStorage.clear();
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Performance monitoring utilities
 */
export const Performance = {
  startTimer: (name: string) => {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        logger.debug(`Performance: ${name} completed in ${duration}ms`);
        return duration;
      }
    };
  },
  
  measure: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const timer = Performance.startTimer(name);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
};

/**
 * Main logger instance
 */
export const logger = createBrowserLogger();

/**
 * Error handler hook for React components
 */
export function useErrorHandler() {
  return (error: Error | unknown, context?: LogContext) => {
    const browserError = createBrowserError(
      error instanceof Error ? error.message : 'Unknown error',
      {
        severity: determineSeverity(error),
        domain: determineDomain(error),
        context,
        stack: error instanceof Error ? error.stack : undefined
      }
    );
    
    logger.error(browserError.message, context, error);
    
    return browserError;
  };
}

export default logger;