/**
 * Unified Error Management System
 *
 * This module consolidates all error handling functionality under the observability umbrella,
 * providing a single source of truth for error management across the application.
 */

// Core error types and base classes
export * from './errors/base-error';
export * from './errors/specialized-errors';

// Error handlers and processing
export * from './handlers/error-handler-chain';
// Note: React error boundaries are exported conditionally for React environments
// Only export types when in a React environment to avoid JSX compilation issues
// export type { ErrorBoundaryProps, ErrorBoundaryState } from './handlers/error-boundary.tsx';
// export type { ErrorBoundaryProps } from './handlers/error-boundary.tsx';

// Error patterns and resilience
export * from './patterns/circuit-breaker';
export * from './patterns/retry-patterns';

// Monitoring and analytics
export * from './monitoring/error-monitor';
export * from './analytics/error-analytics';
export * from './reporting/user-error-reporter';
export * from './recovery/error-recovery-engine';

// Integrations
export * from './integrations/error-tracking-integration';

// Middleware for different platforms
export * from './middleware/express-error-middleware';


// Types and interfaces
export type {
  ErrorHandler as ErrorHandlerInterface,
  ErrorReporter,
  ErrorRecovery,
  ErrorContext,
  ErrorMetrics,
  ErrorAggregation,
  UserErrorReport,
  RecoveryOption,
  UserFeedback,
  ErrorAnalytics,
  ErrorMonitor,
  ErrorRecoveryEngine,
  RecoverySuggestion,
  ErrorBoundaryConfig,
  ErrorTrackingIntegration,
  ErrorDashboardData
} from './types';

// Default exports for common use cases
export { BaseError } from './errors/base-error';
export { ErrorHandlerChain } from './handlers/error-handler-chain';
export { CircuitBreaker } from './patterns/circuit-breaker';
export { RealTimeErrorMonitor, createErrorMonitor } from './monitoring/error-monitor';
export { ErrorAnalyticsEngine, createErrorAnalyticsEngine } from './analytics/error-analytics';
export { UserErrorReporter, createUserErrorReporter } from './reporting/user-error-reporter';
export { AutomatedErrorRecoveryEngine, createErrorRecoveryEngine } from './recovery/error-recovery-engine';
export {
  createSentryIntegration,
  createRollbarIntegration,
  createBugsnagIntegration,
  createConsoleIntegration,
  createIntegrationManager
} from './integrations/error-tracking-integration';
// React components are conditionally exported for React environments
// export { ErrorBoundary, withErrorBoundary } from './handlers/error-boundary.tsx';

// Global error handlers setup
export function setupGlobalErrorHandlers() {
  // Setup global unhandled promise rejection handler
  if (typeof process !== 'undefined') {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
  }

  // Setup global error handler for browser
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
}




