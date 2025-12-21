/**
 * Error Types
 * 
 * Centralized error type definitions for the application
 */

export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface ErrorHandler {
  (error: Error, errorInfo?: ErrorInfo): void;
}

export interface ErrorContextValue {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  clearError: () => void;
  reportError: ErrorHandler;
}

export interface ErrorNotification {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  dismissed: boolean;
}

export interface ErrorTrend {
  date: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class AppError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
  }
}