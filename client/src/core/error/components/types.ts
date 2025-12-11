/**
 * Unified Error Boundary Component Types
 *
 * TypeScript interfaces and types for the consolidated error boundary components
 * supporting different display modes, recovery actions, and accessibility features.
 */

import React from 'react';

import { AppError } from '../types';

/**
 * User feedback data structure for error reporting
 */
export interface UserFeedback {
  /** User's rating of the error experience (1-5) */
  rating?: number;
  /** User's comment about the error */
  comment?: string;
  /** Timestamp when feedback was submitted */
  timestamp?: Date;
  /** User's browser user agent string */
  userAgent?: string;
  /** Session identifier for tracking */
  sessionId?: string;
}

/**
 * Error metrics for monitoring and analytics
 */
export interface ErrorMetrics {
  errorId: string;
  timestamp: Date;
  component: string;
  errorType: string;
  severity: string;
  recoveryAttempts: number;
  recoverySuccessful: boolean;
  userFeedbackProvided: boolean;
  browserInfo?: Record<string, unknown>;
  performanceMetrics?: Record<string, unknown>;
  context?: string;
}

// ============================================================================
// Display Modes and Variants
// ============================================================================

export type ErrorDisplayMode = 'inline' | 'overlay' | 'page' | 'toast';

export type ErrorFallbackVariant =
  | 'minimal'
  | 'detailed'
  | 'user-friendly'
  | 'technical'
  | 'custom';

export type RecoveryUIVariant =
  | 'buttons'
  | 'dropdown'
  | 'modal'
  | 'inline-actions';

// ============================================================================
// Error Boundary Props and State
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  displayMode?: ErrorDisplayMode;
  fallbackVariant?: ErrorFallbackVariant;
  recoveryVariant?: RecoveryUIVariant;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  enableLogging?: boolean;
  enableFeedback?: boolean;
  maxRetries?: number;
  maxRecoveryAttempts?: number;
  recoveryTimeout?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: unknown[];
  context?: string;
  showTechnicalDetails?: boolean;
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
  onRecovery?: (error: AppError, strategy: string) => void;
  onRetry?: (attemptNumber: number) => void;
  onReport?: (error: AppError) => void;
  onFeedback?: (feedback: UserFeedback) => void;
  onMetricsCollected?: (metrics: ErrorMetrics) => void;
  customFallback?: React.ComponentType<ErrorFallbackProps>;
  customRecoveryUI?: React.ComponentType<RecoveryUIProps>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  displayMode: ErrorDisplayMode;
  retryCount: number;
  isRecovering: boolean;
  recoveryAttempts: Array<{
    strategy: string;
    timestamp: Date;
    success: boolean;
  }>;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  userFeedbackSubmitted: boolean;
}

// ============================================================================
// Error Fallback Component Props
// ============================================================================

export interface ErrorFallbackProps {
  error: AppError;
  errorInfo?: React.ErrorInfo;
  displayMode: ErrorDisplayMode;
  variant: ErrorFallbackVariant;
  onRetry?: () => void;
  onReport?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  isDevelopment?: boolean;
  context?: string;
  className?: string;
}

// ============================================================================
// Recovery UI Component Props
// ============================================================================

export interface RecoveryUIProps {
  error: AppError;
  variant: RecoveryUIVariant;
  onRetry: () => void;
  onRefresh: () => void;
  onGoHome: () => void;
  onReport: () => void;
  onCustomAction?: (actionId: string) => void;
  isRecovering: boolean;
  retryCount: number;
  maxRetries: number;
  availableActions?: RecoveryAction[];
  className?: string;
}

export interface RecoveryAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ErrorBoundaryConfig {
  displayMode: ErrorDisplayMode;
  fallbackVariant: ErrorFallbackVariant;
  recoveryVariant: RecoveryUIVariant;
  enableRecovery: boolean;
  enableReporting: boolean;
  enableLogging: boolean;
  maxRetries: number;
  showErrorDetails: boolean;
  autoRetry: boolean;
  retryDelay: number;
}

export interface ErrorDisplayConfig {
  showStackTrace: boolean;
  showComponentStack: boolean;
  showErrorCode: boolean;
  showTimestamp: boolean;
  showUserId: boolean;
  showSessionId: boolean;
  truncateMessage: boolean;
  maxMessageLength: number;
}

// ============================================================================
// Accessibility Types
// ============================================================================

export interface ErrorBoundaryAriaLabels {
  errorMessage: string;
  retryButton: string;
  reportButton: string;
  dismissButton: string;
  recoverySection: string;
  errorDetails: string;
}

export interface ErrorBoundaryAriaProps {
  role?: 'alert' | 'alertdialog' | 'region';
  'aria-live'?: 'off' | 'assertive' | 'polite';
  'aria-atomic'?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseErrorBoundaryReturn {
  error: AppError | null;
  hasError: boolean;
  retryCount: number;
  isRecovering: boolean;
  resetError: () => void;
  retry: () => void;
  reportError: () => void;
  recoveryHistory: Array<{
    strategy: string;
    timestamp: Date;
    success: boolean;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ErrorBoundaryContextValue = {
  error: AppError | null;
  hasError: boolean;
  retryCount: number;
  resetError: () => void;
  retry: () => void;
  reportError: () => void;
  config: ErrorBoundaryConfig;
};

export type ErrorBoundaryProviderProps = {
  children: React.ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
};