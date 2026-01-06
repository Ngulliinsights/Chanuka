/**
 * Error Factory
 *
 * Factory class for creating well-formed unified errors.
 * Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { ErrorDomain, ErrorSeverity } from './constants';
import { AppError, ErrorContext } from './types';

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
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return new AppError(message, 'NETWORK_ERROR', ErrorDomain.NETWORK, ErrorSeverity.MEDIUM, {
      details,
      context: {
        component: (context?.component as string) || 'network',
        operation: (context?.operation as string) || 'request',
        timestamp: Date.now(),
        ...context,
      } as ErrorContext,
      recoverable: true,
      retryable: true,
      correlationId: this.generateErrorId(),
    });
  }

  /**
   * Creates an authentication-related error
   */
  static createAuthError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return new AppError(message, 'AUTH_ERROR', ErrorDomain.AUTHENTICATION, ErrorSeverity.HIGH, {
      details,
      context: {
        component: (context?.component as string) || 'auth',
        operation: (context?.operation as string) || 'authenticate',
        timestamp: Date.now(),
        ...context,
      } as ErrorContext,
      recoverable: false,
      retryable: false,
      correlationId: this.generateErrorId(),
    });
  }

  /**
   * Creates a validation error
   */
  static createValidationError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return new AppError(message, 'VALIDATION_ERROR', ErrorDomain.VALIDATION, ErrorSeverity.LOW, {
      details,
      context: {
        component: (context?.component as string) || 'validation',
        operation: (context?.operation as string) || 'validate',
        timestamp: Date.now(),
        ...context,
      } as ErrorContext,
      recoverable: true,
      retryable: false,
      correlationId: this.generateErrorId(),
    });
  }

  /**
   * Creates a business logic error
   */
  static createBusinessError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return new AppError(
      message,
      'BUSINESS_ERROR',
      ErrorDomain.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      {
        details,
        context: {
          component: (context?.component as string) || 'business',
          operation: (context?.operation as string) || 'process',
          timestamp: Date.now(),
          ...context,
        } as ErrorContext,
        recoverable: false,
        retryable: false,
        correlationId: this.generateErrorId(),
      }
    );
  }

  /**
   * Creates a system error
   */
  static createSystemError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return new AppError(message, 'SYSTEM_ERROR', ErrorDomain.SYSTEM, ErrorSeverity.HIGH, {
      details,
      context: {
        component: (context?.component as string) || 'system',
        operation: (context?.operation as string) || 'unknown',
        timestamp: Date.now(),
        ...context,
      } as ErrorContext,
      recoverable: true,
      retryable: false,
      correlationId: this.generateErrorId(),
    });
  }

  private static generateErrorId(): string {
    return `core_err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
