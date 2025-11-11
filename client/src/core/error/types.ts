/**
 * Unified Error Types for Client-Side Cross-Cutting Concerns
 *
 * This module defines the core error types and interfaces used across
 * all client-side error handling, aligned with the unified error management
 * system from shared/core but adapted for client-side React usage.
 */

import { ErrorDomain, ErrorSeverity } from '../../utils/logger';

// ============================================================================
// Core Error Types
// ============================================================================

/**
 * Error context information for client-side errors
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  route?: string;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Core error interface for client-side error handling
 */
export interface AppError {
  id: string;
  type: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: number;
  context?: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
  retryCount?: number;
  recovered?: boolean;
  recoveryStrategy?: string;
  stack?: string;
  cause?: Error;
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  priority: number;
  maxRetries?: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  maxErrors?: number;
  enableGlobalHandlers?: boolean;
  enableRecovery?: boolean;
  notificationDebounceMs?: number;
  logErrors?: boolean;
  enableAnalytics?: boolean;
}

/**
 * Error listener callback type
 */
export type ErrorListener = (error: AppError) => void;

/**
 * Error statistics interface
 */
export interface ErrorStats {
  total: number;
  byType: Record<ErrorDomain, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recent: {
    lastHour: number;
    last24Hours: number;
    last7Days: number;
  };
  recovered: number;
  retryable: number;
}

/**
 * React error boundary error info
 */
export interface ReactErrorInfo {
  componentStack: string;
}

/**
 * Error boundary props interface
 */
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
  enableRecovery?: boolean;
  context?: string;
  showTechnicalDetails?: boolean;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ReactErrorInfo;
  resetError: () => void;
  context?: string;
  showTechnicalDetails?: boolean;
}

/**
 * Recovery action types
 */
export enum RecoveryAction {
  RETRY = 'retry',
  CACHE_CLEAR = 'cache_clear',
  RELOAD = 'reload',
  REDIRECT = 'redirect',
  IGNORE = 'ignore',
}

/**
 * Recovery result interface
 */
export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message?: string;
  nextAction?: RecoveryAction;
}

// ============================================================================
// Re-export shared error types for convenience
// ============================================================================

export { ErrorDomain, ErrorSeverity } from '../../utils/logger';

