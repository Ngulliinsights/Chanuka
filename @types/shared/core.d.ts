/**
 * Shared core type declarations
 */

export interface Logger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, context?: any, error?: Error) => void;
}

export interface EventEmitter {
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

export interface Validator<T = any> {
  validate: (data: unknown) => T;
  isValid: (data: unknown) => boolean;
  errors: string[];
}

export interface ServiceConfig {
  enabled: boolean;
  timeout?: number;
  retries?: number;
  fallback?: any;
}
