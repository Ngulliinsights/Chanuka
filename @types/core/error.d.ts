/**
 * Core error type declarations
 */

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
}

export interface AppError extends Error {
  code?: string | number;
  context?: ErrorContext;
  recoverable?: boolean;
}
