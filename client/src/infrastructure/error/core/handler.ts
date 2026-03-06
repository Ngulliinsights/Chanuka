/**
 * Consolidated Error Handler
 * Merges legacy and unified handler functionality
 */

import { observability } from '@client/infrastructure/observability';
import { logger } from '@client/infrastructure/observability/logging';
import { ErrorSeverity } from '@shared/core';
import type { ClientError, ErrorMetrics, ErrorListener } from './types';
import { ErrorDomain } from '@shared/core';

/**
 * ErrorHandler - Centralized error handling with side effects
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: ClientError[] = [];
  private listeners: ErrorListener[] = [];
  private readonly maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with all side effects
   */
  handleError(error: ClientError): ClientError {
    // Track in observability
    this.trackError(error);

    // Log with structured logger
    this.logError(error);

    // Store in history
    this.storeError(error);

    // Notify listeners
    this.notifyListeners(error);

    return error;
  }

  /**
   * Track error in observability
   */
  private trackError(error: ClientError): void {
    try {
      const errorObj = new Error(error.message);
      errorObj.name = error.code;
      errorObj.stack = error.stack;

      observability.trackError(errorObj, {
        component: error.context.component || 'unknown',
        operation: error.context.operation || 'unknown',
        userId: error.context.userId,
        metadata: {
          errorId: error.id,
          errorType: error.type,
          errorSeverity: error.severity,
          errorCode: error.code,
          correlationId: error.correlationId,
          recoverable: error.recoverable,
          retryable: error.retryable,
          statusCode: error.statusCode,
          ...error.context.metadata,
        },
      });
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  }

  /**
   * Log error with structured logger
   */
  private logError(error: ClientError): void {
    try {
      const logContext = {
        component: error.context.component || 'unknown',
        operation: error.context.operation || 'unknown',
        userId: error.context.userId,
        errorId: error.id,
        errorType: error.type,
        errorCode: error.code,
        correlationId: error.correlationId,
      };

      const errorObj = new Error(error.message);
      errorObj.name = error.code;
      errorObj.stack = error.stack;

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
      console.error('Failed to log error:', loggingError);
    }
  }

  /**
   * Store error in history
   */
  private storeError(error: ClientError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(error: ClientError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });
  }

  /**
   * Add error listener
   */
  addListener(listener: ErrorListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeListener(listener: ErrorListener): boolean {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    const countByDomain: Record<ErrorDomain, number> = {} as Record<ErrorDomain, number>;
    const countBySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;

    this.errorHistory.forEach(error => {
      countByDomain[error.type] = (countByDomain[error.type] || 0) + 1;
      countBySeverity[error.severity] = (countBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalCount: this.errorHistory.length,
      countByDomain,
      countBySeverity,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): ClientError[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorDomain, limit = 10): ClientError[] {
    return this.errorHistory.filter(e => e.type === type).slice(-limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity, limit = 10): ClientError[] {
    return this.errorHistory.filter(e => e.severity === severity).slice(-limit);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Reset handler (for testing)
   */
  reset(): void {
    this.errorHistory = [];
    this.listeners = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
