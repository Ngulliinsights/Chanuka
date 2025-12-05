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
    return {
      id: this.generateErrorId(),
      type: ErrorDomain.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: (context?.component as string) || 'network',
        operation: (context?.operation as string) || 'request',
        timestamp: Date.now(),
        ...context
      } as ErrorContext,
      recoverable: true,
      retryable: true,
      timestamp: Date.now()
    };
  }

  /**
   * Creates an authentication-related error
   */
  static createAuthError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return {
      id: this.generateErrorId(),
      type: ErrorDomain.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message,
      details,
      context: {
        component: (context?.component as string) || 'auth',
        operation: (context?.operation as string) || 'authenticate',
        timestamp: Date.now(),
        ...context
      } as ErrorContext,
      recoverable: false,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Creates a validation error
   */
  static createValidationError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return {
      id: this.generateErrorId(),
      type: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      details,
      context: {
        component: (context?.component as string) || 'validation',
        operation: (context?.operation as string) || 'validate',
        timestamp: Date.now(),
        ...context
      } as ErrorContext,
      recoverable: true,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Creates a business logic error
   */
  static createBusinessError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return {
      id: this.generateErrorId(),
      type: ErrorDomain.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message,
      details,
      context: {
        component: (context?.component as string) || 'business',
        operation: (context?.operation as string) || 'process',
        timestamp: Date.now(),
        ...context
      } as ErrorContext,
      recoverable: false,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Creates a system error
   */
  static createSystemError(
    message: string,
    details?: Record<string, unknown>,
    context?: Partial<ErrorContext>
  ): AppError {
    return {
      id: this.generateErrorId(),
      type: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message,
      details,
      context: {
        component: (context?.component as string) || 'system',
        operation: (context?.operation as string) || 'unknown',
        timestamp: Date.now(),
        ...context
      } as ErrorContext,
      recoverable: true,
      retryable: false,
      timestamp: Date.now()
    };
  }

  private static generateErrorId(): string {
    return `core_err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}