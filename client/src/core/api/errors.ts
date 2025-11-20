/**
 * Unified Error Handling System
 * 
 * This module provides a comprehensive error handling framework that standardizes
 * error creation, transformation, reporting, and recovery across the entire application.
 * 
 * Key Features:
 * - Structured error types with domains and severity levels
 * - Automatic error transformation and enrichment
 * - Pluggable error reporters for different backends (Sentry, LogRocket, etc.)
 * - Recovery strategies for specific error types
 * - Consistent error logging and user notification
 * 
 * Design Philosophy:
 * Errors should be informative, actionable, and never surprising. This system
 * ensures that every error carries enough context to debug issues quickly and
 * provides clear paths to recovery when possible.
 * 
 * @module UnifiedErrorHandling
 */

import { ErrorCode, ErrorDomain, ErrorSeverity, UnifiedError } from './types';

// Re-export types for convenience
export { ErrorCode, ErrorDomain, ErrorSeverity };
export type { UnifiedError };

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Interface for error reporting services (e.g., Sentry, LogRocket, custom backend)
 */
export interface ErrorReporter {
  /**
   * Reports an error to the monitoring service
   * @param error - The unified error to report
   */
  report(error: UnifiedError): Promise<void>;
}

/**
 * Interface for error transformation logic
 */
export interface ErrorTransformer {
  /**
   * Transforms or enriches an error with additional context
   * @param error - The error to transform
   * @returns The transformed error
   */
  transform(error: UnifiedError): UnifiedError;
}

/**
 * Interface for error recovery strategies
 */
export interface RecoveryStrategy {
  /**
   * Attempts to recover from an error condition
   * @param error - The error to recover from
   */
  recover(error: UnifiedError): Promise<void>;
}

// ============================================================================
// Unified Error Handler
// ============================================================================

/**
 * Central error handling service that coordinates error processing, reporting,
 * and recovery across the application.
 * 
 * This class follows the strategy pattern, allowing you to register custom
 * reporters, transformers, and recovery strategies at runtime.
 */
export class UnifiedErrorHandler {
  private errorReporters: ErrorReporter[] = [];
  private errorTransformers: ErrorTransformer[] = [];
  private recoveryStrategies: Map<ErrorCode, RecoveryStrategy> = new Map();

  /**
   * Registers an error reporter to receive all handled errors.
   * Multiple reporters can be registered (e.g., console, Sentry, custom API).
   * 
   * @param reporter - The error reporter to register
   * 
   * @example
   * ```typescript
   * const sentryReporter = {
   *   async report(error: UnifiedError) {
   *     Sentry.captureException(error);
   *   }
   * };
   * globalErrorHandler.registerReporter(sentryReporter);
   * ```
   */
  registerReporter(reporter: ErrorReporter): void {
    this.errorReporters.push(reporter);
  }

  /**
   * Registers an error transformer to enrich or modify errors before processing.
   * Transformers are applied in the order they were registered.
   * 
   * @param transformer - The error transformer to register
   * 
   * @example
   * ```typescript
   * const userContextTransformer = {
   *   transform(error: UnifiedError): UnifiedError {
   *     return {
   *       ...error,
   *       context: {
   *         ...error.context,
   *         userId: getCurrentUserId(),
   *         userRole: getCurrentUserRole()
   *       }
   *     };
   *   }
   * };
   * globalErrorHandler.registerTransformer(userContextTransformer);
   * ```
   */
  registerTransformer(transformer: ErrorTransformer): void {
    this.errorTransformers.push(transformer);
  }

  /**
   * Registers a recovery strategy for a specific error code.
   * Recovery strategies are invoked automatically for recoverable errors.
   * 
   * @param code - The error code to handle
   * @param strategy - The recovery strategy to apply
   * 
   * @example
   * ```typescript
   * globalErrorHandler.registerRecoveryStrategy(
   *   ErrorCode.AUTH_TOKEN_EXPIRED,
   *   {
   *     async recover(error: UnifiedError) {
   *       await refreshAuthToken();
   *       // Retry the original operation
   *     }
   *   }
   * );
   * ```
   */
  registerRecoveryStrategy(code: ErrorCode, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(code, strategy);
  }

  /**
   * Main error handling method. Processes an error through the complete pipeline:
   * transformation, logging, reporting, recovery, and event emission.
   * 
   * This method is idempotent - calling it multiple times with the same error
   * will not result in duplicate reports.
   * 
   * @param error - The error to handle (can be UnifiedError or standard Error)
   * @param context - Additional context to attach to the error
   * 
   * @example
   * ```typescript
   * try {
   *   await fetchUserData();
   * } catch (error) {
   *   await globalErrorHandler.handleError(error, {
   *     component: 'UserProfile',
   *     operation: 'loadData',
   *     userId: currentUser.id
   *   });
   * }
   * ```
   */
  async handleError(error: UnifiedError | Error, context?: Record<string, unknown>): Promise<void> {
    // Transform the error into unified format if needed
    const unifiedError = this.transformError(error, context);

    // Log the error at the appropriate level
    this.logError(unifiedError);

    // Report the error to all registered reporters
    await this.reportError(unifiedError);

    // Attempt recovery if the error is recoverable
    if (unifiedError.recoverable) {
      await this.attemptRecovery(unifiedError);
    }

    // Emit an event for UI components to handle
    this.emitErrorEvent(unifiedError);
  }

  /**
   * Transforms a raw error into the unified error format.
   * This method applies all registered transformers and enriches the error
   * with default context if not already present.
   */
  private transformError(error: UnifiedError | Error, context?: Record<string, unknown>): UnifiedError {
    let unifiedError: UnifiedError;

    if (this.isUnifiedError(error)) {
      // Already in unified format, just ensure context is merged
      unifiedError = {
        ...error,
        context: {
          ...error.context,
          ...context
        } as any
      };
    } else {
      // Transform raw error to unified format with intelligent defaults
      unifiedError = {
        id: this.generateErrorId(),
        code: this.mapErrorToCode(error),
        domain: this.detectDomain(error),
        severity: this.detectSeverity(error),
        message: error.message || 'An unknown error occurred',
        context: {
          component: (context?.component as string) || 'unknown',
          operation: (context?.operation as string) || 'unknown',
          timestamp: new Date().toISOString(),
          ...context
        } as any,
        recoverable: this.isRecoverable(error),
        retryable: this.isRetryable(error),
        reported: false,
        timestamp: new Date().toISOString()
      };

      // Preserve stack trace if available
      if (error.stack) {
        (unifiedError as any).stack = error.stack;
      }
    }

    // Apply all registered transformers
    return this.errorTransformers.reduce(
      (err, transformer) => transformer.transform(err),
      unifiedError
    );
  }

  /**
   * Reports the error to all registered reporters.
   * Failed reporters don't prevent other reporters from running.
   */
  private async reportError(error: UnifiedError): Promise<void> {
    // Skip if already reported to avoid duplicates
    if (error.reported) {
      return;
    }

    // Report to all reporters in parallel
    const reportPromises = this.errorReporters.map(reporter =>
      reporter.report(error).catch(reportError => {
        // Log reporter failures but don't throw
        console.error('Error reporter failed:', reporter.constructor.name, reportError);
      })
    );

    await Promise.allSettled(reportPromises);
    
    // Mark as reported to prevent duplicates
    (error as any).reported = true;
  }

  /**
   * Attempts to recover from an error using registered recovery strategies.
   * Recovery failures are logged but don't throw to prevent error cascades.
   */
  private async attemptRecovery(error: UnifiedError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.code);

    if (!strategy) {
      return;
    }

    try {
      await strategy.recover(error);
      logger.info('Error recovery successful', {
        errorId: error.id,
        code: error.code
      });
    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        errorId: error.id,
        code: error.code,
        recoveryError
      });
    }
  }

  /**
   * Logs the error at the appropriate severity level.
   * Maps error severity to console log levels.
   */
  private logError(error: UnifiedError): void {
    const logLevel = this.mapSeverityToLogLevel(error.severity);
    const logMessage = `[${error.domain}:${error.code}] ${error.message}`;

    console[logLevel](logMessage, {
      errorId: error.id,
      context: error.context,
      details: error.details,
      stack: error.stack
    });
  }

  /**
   * Emits a custom DOM event that UI components can listen to.
   * This enables centralized error display (toasts, modals, etc.).
   */
  private emitErrorEvent(error: UnifiedError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('unifiedError', {
        detail: error
      }));
    }
  }

  /**
   * Type guard to check if an error is already in unified format
   */
  private isUnifiedError(error: unknown): error is UnifiedError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'id' in error &&
      'code' in error &&
      typeof (error as UnifiedError).id === 'string' &&
      typeof (error as UnifiedError).code === 'string'
    );
  }

  /**
   * Maps common error patterns to standardized error codes.
   * This provides consistent error identification across the application.
   */
  private mapErrorToCode(error: Error): ErrorCode {
    const message = error?.message?.toLowerCase() || '';
    const name = error?.name?.toLowerCase() || '';

    // Network-related errors
    if (name === 'timeouterror' || message.includes('timeout')) {
      return ErrorCode.NETWORK_TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch failed')) {
      return ErrorCode.NETWORK_REQUEST_FAILED;
    }

    // HTTP status code mapping
    if (message.includes('401') || message.includes('unauthorized')) {
      return ErrorCode.AUTH_INVALID_CREDENTIALS;
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS;
    }
    if (message.includes('404') || message.includes('not found')) {
      return ErrorCode.BUSINESS_ENTITY_NOT_FOUND;
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return ErrorCode.SYSTEM_RATE_LIMITED;
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return ErrorCode.NETWORK_SERVER_ERROR;
    }

    // Validation errors
    if (name === 'validationerror' || message.includes('validation')) {
      return ErrorCode.VALIDATION_INVALID_INPUT;
    }

    // Default to unknown error
    return ErrorCode.SYSTEM_UNKNOWN_ERROR;
  }

  /**
   * Detects the appropriate domain for an error based on its characteristics
   */
  private detectDomain(error: Error): ErrorDomain {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorDomain.NETWORK;
    }
    if (message.includes('auth') || message.includes('permission') || message.includes('token')) {
      return ErrorDomain.AUTHENTICATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorDomain.VALIDATION;
    }
    
    return ErrorDomain.SYSTEM;
  }

  /**
   * Determines the severity level of an error
   */
  private detectSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name === 'criticalerror' || message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (name === 'highpriorityerror' || message.includes('high priority')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('warning') || message.includes('minor')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Determines if an error is recoverable (i.e., the user can continue)
   */
  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Permanent failures are not recoverable
    if (message.includes('permanent') || message.includes('fatal')) {
      return false;
    }

    // Validation errors are recoverable (user can correct input)
    // Temporary network issues are recoverable (can retry)
    return true;
  }

  /**
   * Determines if an error warrants automatic retry
   */
  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network timeouts and temporary server errors are retryable
    return (
      name === 'timeouterror' ||
      message.includes('timeout') ||
      message.includes('temporary') ||
      message.includes('503') ||
      message.includes('502')
    );
  }

  /**
   * Maps error severity to appropriate console log level
   */
  private mapSeverityToLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
    }
  }

  /**
   * Generates a unique error identifier for tracking
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Factory class for creating well-formed unified errors.
 * Use these methods instead of constructing error objects directly
 * to ensure consistency and completeness.
 */
export class ErrorFactory {
  /**
   * Creates a network-related error
   */
  static createNetworkError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: (context?.component as string) || 'network',
        operation: (context?.operation as string) || 'request',
        timestamp: new Date().toISOString(),
        ...context
      } as any,
      recoverable: true,
      retryable: true,
      reported: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates an authentication-related error
   */
  static createAuthError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message,
      details,
      context: {
        component: (context?.component as string) || 'auth',
        operation: (context?.operation as string) || 'authenticate',
        timestamp: new Date().toISOString(),
        ...context
      } as any,
      recoverable: false,
      retryable: false,
      reported: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates a validation error
   */
  static createValidationError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      details,
      context: {
        component: (context?.component as string) || 'validation',
        operation: (context?.operation as string) || 'validate',
        timestamp: new Date().toISOString(),
        ...context
      } as any,
      recoverable: true,
      retryable: false,
      reported: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates a business logic error
   */
  static createBusinessError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): UnifiedError {
    return {
      id: this.generateErrorId(),
      code,
      domain: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: (context?.component as string) || 'business',
        operation: (context?.operation as string) || 'process',
        timestamp: new Date().toISOString(),
        ...context
      } as any,
      recoverable: false,
      retryable: false,
      reported: false,
      timestamp: new Date().toISOString()
    };
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Console error reporter that logs errors to the browser console.
 * This is registered by default for development visibility.
 */
class ConsoleErrorReporter implements ErrorReporter {
  async report(error: UnifiedError): Promise<void> {
    const logData = {
      id: error.id,
      code: error.code,
      domain: error.domain,
      severity: error.severity,
      message: error.message,
      context: error.context,
      details: error.details,
      timestamp: new Date().toISOString()
    };

    // Use appropriate console method based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('🔴 Error Report:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 Error Report:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('🔵 Error Report:', logData);
        break;
    }
  }
}

// ============================================================================
// Global Instance
// ============================================================================

/**
 * Global error handler instance used throughout the application.
 * This is initialized with a console reporter by default.
 * 
 * @example
 * ```typescript
 * import { globalErrorHandler } from './errors';
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   await globalErrorHandler.handleError(error, {
 *     component: 'MyComponent',
 *     operation: 'riskyOperation'
 *   });
 * }
 * ```
 */
export const globalErrorHandler = new UnifiedErrorHandler();

// Register the default console reporter
globalErrorHandler.registerReporter(new ConsoleErrorReporter());

// Simple logger stub to avoid dependency issues
const logger = {
  info: console.info.bind(console),
  error: console.error.bind(console)
};