/**
 * Unified Error Types for Client-Side Cross-Cutting Concerns
 *
 * This module defines the core error types and interfaces used across
 * all client-side error handling, migrated from utils/errors.ts with
 * enhanced modular architecture.
 */

import { ErrorDomain, ErrorSeverity } from './constants';

// ============================================================================
// Core Error Types (Enhanced from utils/errors.ts)
// ============================================================================

/**
 * Contextual information that helps with debugging and error correlation.
 * This data travels with the error through the entire handling pipeline.
 */
export interface ErrorContext {
  component?: string;      // Component where error originated
  operation?: string;      // Operation being performed
  userId?: string;         // User context
  sessionId?: string;      // Session identifier
  requestId?: string;      // Request tracking ID
  url?: string;           // Current URL
  userAgent?: string;     // Browser information
  retryCount?: number;    // Number of retry attempts
  route?: string;         // Current route
  timestamp?: number;     // Error timestamp
  [key: string]: unknown; // Additional custom context
}

/**
 * Complete metadata package for error tracking and analysis
 */
export interface ErrorMetadata {
  domain: ErrorDomain;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: ErrorContext;
  retryable: boolean;
  recoverable: boolean;
  correlationId?: string;
  cause?: Error | unknown;
  code: string;
}

/**
 * Application error representation used throughout the error handling system
 * Enhanced with metadata and correlation capabilities from utils/errors.ts
 */
export interface AppError {
  id: string;
  type: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  context?: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
  retryCount?: number;
  recovered?: boolean;
  recoveryStrategy?: string;
  stack?: string;
  cause?: Error;
  metadata?: ErrorMetadata;
  correlationId?: string;
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

import { RecoveryAction } from './constants';

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
// Analytics and Reporting Interfaces (from utils/errors.ts)
// ============================================================================

/**
 * Interface for error analytics providers (e.g., Sentry, DataDog)
 */
export interface ErrorAnalyticsProvider {
  name: string;
  track: (error: AppError) => Promise<void>;
  isEnabled: () => boolean;
}

/**
 * Interface for error reporting services
 */
export interface ErrorReporter {
  report(error: AppError): Promise<void>;
}

/**
 * Interface for error transformation logic
 */
export interface ErrorTransformer {
  transform(error: AppError): AppError;
}

// ============================================================================
// Navigation Error Types (from utils/errors.ts)
// ============================================================================

/**
 * Navigation-specific error types for handling routing and navigation failures
 */
export enum NavigationErrorType {
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  NAVIGATION_ITEM_NOT_FOUND = 'NAVIGATION_ITEM_NOT_FOUND',
  INVALID_NAVIGATION_PATH = 'INVALID_NAVIGATION_PATH',
  NAVIGATION_ACCESS_DENIED = 'NAVIGATION_ACCESS_DENIED',
  NAVIGATION_VALIDATION_ERROR = 'NAVIGATION_VALIDATION_ERROR',
  NAVIGATION_CONFIGURATION_ERROR = 'NAVIGATION_CONFIGURATION_ERROR'
}

// ============================================================================
// Re-export shared error types for convenience
// ============================================================================

export { ErrorDomain, ErrorSeverity, RecoveryAction } from './constants';

