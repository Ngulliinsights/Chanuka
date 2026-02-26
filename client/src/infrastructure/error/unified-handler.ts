/**
 * Unified Error Handler Service
 *
 * Centralized error handling with explicit side effects.
 * Integrates with observability for error tracking and logger for error logging.
 *
 * This service handles the side effects that were previously in error constructors,
 * following the pattern: pure factory functions + explicit error handling.
 *
 * Requirements: 22.7, 22.8, 22.9
 */

import { observability } from '../observability';
import { logger } from '../logging';
import type { ClientError, ErrorContext, RecoveryStrategy, RecoveryResult } from './unified-types';
import { ErrorSeverity } from '@shared/core';

/**
 * ErrorHandler configuration
 */
export interface ErrorHandlerConfig {
  /** Enable error tracking in observability */
  enableTracking?: boolean;
  /** Enable error logging */
  enableLogging?: boolean;
  /** Enable automatic recovery attempts */
  enableRecovery?: boolean;
  /** Maximum number of recovery attempts */
  maxRecoveryAttempts?: number;
}

/**
 * Unified ErrorHandler Service
 *
 * Handles errors with explicit side effects:
 * - Tracks errors in observability
 * - Logs errors with structured logger
 * - Executes recovery strategies
 */
export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private config: Required<ErrorHandlerConfig>;
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  private constructor(config?: ErrorHandlerConfig) {
    this.config = {
      enableTracking: config?.enableTracking ?? true,
      enableLogging: config?.enableLogging ?? true,
      enableRecovery: config?.enableRecovery ?? true,
      maxRecoveryAttempts: config?.maxRecoveryAttempts ?? 3,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ErrorHandlerConfig): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler(config);
    }
    return UnifiedErrorHandler.instance;
  }

  /**
   * Handle an error with explicit side effects
   *
   * This is the main entry point for error handling.
   * It performs all side effects: tracking, logging, and recovery.
   *
   * @param error - ClientError to handle
   * @returns The same error (for chaining)
   */
  handleError(error: ClientError): ClientError {
    // Track error in observability
    if (this.config.enableTracking) {
      this.trackError(error);
    }

    // Log error with structured logger
    if (this.config.enableLogging) {
      this.logError(error);
    }

    // Attempt recovery if enabled and error is recoverable
    if (this.config.enableRecovery && error.recoverable) {
      this.attemptRecovery(error).catch(recoveryError => {
        logger.error('Recovery attempt failed', {
          component: 'UnifiedErrorHandler',
          operation: 'attemptRecovery',
        }, recoveryError);
      });
    }

    return error;
  }

  /**
   * Track error in observability
   *
   * Sends error to observability module for monitoring and analytics.
   *
   * @param error - ClientError to track
   */
  private trackError(error: ClientError): void {
    try {
      // Convert ClientError to Error for observability
      const errorObj = new Error(error.message);
      errorObj.name = error.code;
      errorObj.stack = error.stack;

      observability.trackError(errorObj, {
        component: error.context.component || 'unknown',
        operation: error.context.operation || 'unknown',
        userId: error.context.userId,
        sessionId: error.context.sessionId,
        requestId: error.context.requestId,
        errorId: error.id,
        errorType: error.type,
        errorSeverity: error.severity,
        errorCode: error.code,
        correlationId: error.correlationId,
        recoverable: error.recoverable,
        retryable: error.retryable,
        statusCode: error.statusCode,
        ...error.context.metadata,
      });
    } catch (trackingError) {
      // Don't let tracking errors break error handling
      console.error('Failed to track error in observability:', trackingError);
    }
  }

  /**
   * Log error with structured logger
   *
   * Logs error with appropriate severity level and context.
   *
   * @param error - ClientError to log
   */
  private logError(error: ClientError): void {
    try {
      const logContext = {
        component: error.context.component || 'unknown',
        operation: error.context.operation || 'unknown',
        userId: error.context.userId,
        sessionId: error.context.sessionId,
        requestId: error.context.requestId,
        errorId: error.id,
        errorType: error.type,
        errorCode: error.code,
        correlationId: error.correlationId,
        recoverable: error.recoverable,
        retryable: error.retryable,
        statusCode: error.statusCode,
      };

      const errorObj = new Error(error.message);
      errorObj.name = error.code;
      errorObj.stack = error.stack;

      // Log with appropriate severity
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          logger.error(error.message, logContext, errorObj);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn(error.message, logContext);
          break;
        case ErrorSeverity.LOW:
          logger.info(error.message, logContext);
          break;
        default:
          logger.error(error.message, logContext, errorObj);
      }
    } catch (loggingError) {
      // Don't let logging errors break error handling
      console.error('Failed to log error:', loggingError);
    }
  }

  /**
   * Attempt to recover from error
   *
   * Executes applicable recovery strategies for the error.
   *
   * @param error - ClientError to recover from
   * @returns Recovery result
   */
  private async attemptRecovery(error: ClientError): Promise<RecoveryResult> {
    // Check if we've exceeded max recovery attempts
    const attemptCount = this.recoveryAttempts.get(error.id) || 0;
    if (attemptCount >= this.config.maxRecoveryAttempts) {
      return {
        success: false,
        message: `Max recovery attempts (${this.config.maxRecoveryAttempts}) exceeded`,
      };
    }

    // Increment attempt count
    this.recoveryAttempts.set(error.id, attemptCount + 1);

    // Get applicable recovery strategies
    const strategies = error.recoveryStrategies.filter(strategy => strategy.automatic);

    // Try each strategy in order
    for (const strategy of strategies) {
      try {
        logger.debug('Attempting recovery strategy', {
          component: 'UnifiedErrorHandler',
          operation: 'attemptRecovery',
          strategyId: strategy.id,
          strategyName: strategy.name,
          errorId: error.id,
        });

        const result = await strategy.execute();

        if (result.success) {
          logger.info('Recovery successful', {
            component: 'UnifiedErrorHandler',
            operation: 'attemptRecovery',
            strategyId: strategy.id,
            strategyName: strategy.name,
            errorId: error.id,
          });

          // Clear attempt count on success
          this.recoveryAttempts.delete(error.id);

          return result;
        }
      } catch (recoveryError) {
        logger.error('Recovery strategy failed', {
          component: 'UnifiedErrorHandler',
          operation: 'attemptRecovery',
          strategyId: strategy.id,
          strategyName: strategy.name,
          errorId: error.id,
        }, recoveryError);
      }
    }

    return {
      success: false,
      message: 'No recovery strategy succeeded',
    };
  }

  /**
   * Register a recovery strategy
   *
   * Adds a recovery strategy that can be used for error recovery.
   *
   * @param strategy - Recovery strategy to register
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
  }

  /**
   * Unregister a recovery strategy
   *
   * Removes a recovery strategy.
   *
   * @param strategyId - ID of strategy to remove
   * @returns True if strategy was removed
   */
  unregisterRecoveryStrategy(strategyId: string): boolean {
    return this.recoveryStrategies.delete(strategyId);
  }

  /**
   * Get all registered recovery strategies
   *
   * @returns Array of recovery strategies
   */
  getRecoveryStrategies(): RecoveryStrategy[] {
    return Array.from(this.recoveryStrategies.values());
  }

  /**
   * Clear recovery attempt count for an error
   *
   * Useful for resetting recovery attempts after a successful operation.
   *
   * @param errorId - Error ID to clear
   */
  clearRecoveryAttempts(errorId: string): void {
    this.recoveryAttempts.delete(errorId);
  }

  /**
   * Update configuration
   *
   * @param config - New configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   *
   * @returns Current configuration
   */
  getConfig(): Readonly<Required<ErrorHandlerConfig>> {
    return { ...this.config };
  }

  /**
   * Reset the handler (useful for testing)
   */
  reset(): void {
    this.recoveryStrategies.clear();
    this.recoveryAttempts.clear();
  }
}

/**
 * Default error handler instance
 */
export const errorHandler = UnifiedErrorHandler.getInstance();

/**
 * Convenience function to handle an error
 *
 * @param error - ClientError to handle
 * @returns The same error (for chaining)
 */
export function handleError(error: ClientError): ClientError {
  return errorHandler.handleError(error);
}
