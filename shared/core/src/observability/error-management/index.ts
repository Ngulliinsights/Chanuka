/**
 * Unified Error Management System
 *
 * This module consolidates all error handling functionality under the observability umbrella,
 * providing a single source of truth for error management across the application.
 */

// Core error types and base classes
export * from './errors/base-error.js';
export * from './errors/specialized-errors.js';

// Error handlers and processing
export * from './handlers/error-handler-chain.js';
export * from './handlers/error-boundary.js';
export * from './handlers/enhanced-error-boundary.js';

// Error patterns and resilience
export * from './patterns/circuit-breaker.js';
export * from './patterns/retry-patterns.js';

// Monitoring and analytics
export * from './monitoring/error-monitor.js';
export * from './analytics/error-analytics.js';
export * from './reporting/user-error-reporter.js';
export * from './recovery/error-recovery-engine.js';

// Integrations
export * from './integrations/error-tracking-integration.js';

// Middleware for different platforms
export * from './middleware/express-error-middleware.js';


// Types and interfaces
export * from './types.js';

// Default exports for common use cases
export { BaseError } from './errors/base-error.js';
export { ErrorHandlerChain } from './handlers/error-handler-chain.js';
export { CircuitBreaker } from './patterns/circuit-breaker.js';
export { RealTimeErrorMonitor, createErrorMonitor } from './monitoring/error-monitor.js';
export { ErrorAnalyticsEngine, createErrorAnalyticsEngine } from './analytics/error-analytics.js';
export { UserErrorReporter, createUserErrorReporter } from './reporting/user-error-reporter.js';
export { AutomatedErrorRecoveryEngine, createErrorRecoveryEngine } from './recovery/error-recovery-engine.js';
export {
  createSentryIntegration,
  createRollbarIntegration,
  createBugsnagIntegration,
  createConsoleIntegration,
  createIntegrationManager
} from './integrations/error-tracking-integration.js';
export { EnhancedErrorBoundary, withEnhancedErrorBoundary } from './handlers/enhanced-error-boundary.js';

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

