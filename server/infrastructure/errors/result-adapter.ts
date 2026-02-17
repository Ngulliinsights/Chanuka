/**
 * Result Type Adapter for Boom Integration
 * 
 * This module provides integration between neverthrow Result types and @hapi/boom
 * error handling, maintaining API compatibility while introducing functional error handling.
 */

import * as Boom from '@hapi/boom';
import { err,ok, Result } from 'neverthrow';

import { 
  ErrorCategory, 
  errorHandler, 
  ErrorResponse, 
  ErrorSeverity,
  StandardizedError} from './error-standardization';

// Re-export Result types for convenience
export { Result, ok, err } from 'neverthrow';

/**
 * Service Result type that wraps data with standardized error handling
 */
export type ServiceResult<T> = Result<T, StandardizedError>;

/**
 * Async Service Result type for promise-based operations
 */
export type AsyncServiceResult<T> = Promise<ServiceResult<T>>;

/**
 * Error Conversion Adapter
 * 
 * Provides utilities to convert between different error formats while
 * maintaining API compatibility and consistent error responses.
 */
export class ResultAdapter {
  /**
   * Convert a Boom error to a StandardizedError
   */
  static fromBoom(boomError: Boom.Boom, context: { service: string; operation: string }): StandardizedError {
    const category = this.mapBoomToCategory(boomError);
    const severity = this.mapBoomToSeverity(boomError);
    
    return errorHandler.createError(
      boomError.message,
      category,
      context,
      {
        code: boomError.output.payload.error || 'BOOM_ERROR',
        severity,
        userMessage: boomError.message,
        retryable: this.isBoomRetryable(boomError),
        httpStatusCode: boomError.output.statusCode
      }
    );
  }

  /**
   * Convert a StandardizedError to a Boom error
   */
  static toBoom(standardizedError: StandardizedError): Boom.Boom {
    const statusCode = standardizedError.httpStatusCode;
    
    // Create appropriate Boom error based on status code
    let boomError: Boom.Boom;
    
    switch (statusCode) {
      case 400:
        boomError = Boom.badRequest(standardizedError.userMessage);
        break;
      case 401:
        boomError = Boom.unauthorized(standardizedError.userMessage);
        break;
      case 403:
        boomError = Boom.forbidden(standardizedError.userMessage);
        break;
      case 404:
        boomError = Boom.notFound(standardizedError.userMessage);
        break;
      case 409:
        boomError = Boom.conflict(standardizedError.userMessage);
        break;
      case 429:
        boomError = Boom.tooManyRequests(standardizedError.userMessage);
        break;
      case 500:
        boomError = Boom.internal(standardizedError.userMessage);
        break;
      case 503:
        boomError = Boom.serverUnavailable(standardizedError.userMessage);
        break;
      default:
        boomError = Boom.badImplementation(standardizedError.userMessage);
    }

    // Add additional error metadata
    boomError.output.payload.errorId = standardizedError.id;
    boomError.output.payload.code = standardizedError.code;
    boomError.output.payload.category = standardizedError.category;
    boomError.output.payload.retryable = standardizedError.retryable;
    boomError.output.payload.timestamp = standardizedError.context.timestamp.toISOString();

    return boomError;
  }

  /**
   * Convert a ServiceResult to an ErrorResponse for API compatibility
   */
  static toErrorResponse(result: ServiceResult<any>): ErrorResponse | null {
    if (result.isOk()) {
      return null;
    }

    return errorHandler.toErrorResponse(result.error);
  }

  /**
   * Wrap a function that might throw into a Result
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    context: { service: string; operation: string }
  ): AsyncServiceResult<T> {
    try {
      const result = await operation();
      return ok(result);
    } catch (error) {
      if (Boom.isBoom(error)) {
        return err(this.fromBoom(error, context));
      }
      
      const standardizedError = errorHandler.createError(
        error instanceof Error ? error : String(error),
        ErrorCategory.SYSTEM,
        context
      );
      
      return err(standardizedError);
    }
  }

  /**
   * Wrap a synchronous function that might throw into a Result
   */
  static safe<T>(
    operation: () => T,
    context: { service: string; operation: string }
  ): ServiceResult<T> {
    try {
      const result = operation();
      return ok(result);
    } catch (error) {
      if (Boom.isBoom(error)) {
        return err(this.fromBoom(error, context));
      }
      
      const standardizedError = errorHandler.createError(
        error instanceof Error ? error : String(error),
        ErrorCategory.SYSTEM,
        context
      );
      
      return err(standardizedError);
    }
  }

  /**
   * Create a validation error Result
   */
  static validationError(
    validationErrors: Array<{ field: string; message: string; value?: any }>,
    context: { service: string; operation: string }
  ): ServiceResult<never> {
    const standardizedError = errorHandler.createValidationError(validationErrors, context);
    return err(standardizedError);
  }

  /**
   * Create a not found error Result
   */
  static notFoundError(
    resource: string,
    identifier: string,
    context: { service: string; operation: string }
  ): ServiceResult<never> {
    const standardizedError = errorHandler.createNotFoundError(resource, identifier, context);
    return err(standardizedError);
  }

  /**
   * Create a business logic error Result
   */
  static businessLogicError(
    rule: string,
    details: string,
    context: { service: string; operation: string }
  ): ServiceResult<never> {
    const standardizedError = errorHandler.createBusinessLogicError(rule, details, context);
    return err(standardizedError);
  }

  /**
   * Create an authentication error Result
   */
  static authenticationError(
    reason: 'invalid_token' | 'expired_token' | 'missing_token' | 'invalid_credentials',
    context: { service: string; operation: string }
  ): ServiceResult<never> {
    const standardizedError = errorHandler.createAuthenticationError(reason, context);
    return err(standardizedError);
  }

  /**
   * Create an authorization error Result
   */
  static authorizationError(
    resource: string,
    action: string,
    context: { service: string; operation: string }
  ): ServiceResult<never> {
    const standardizedError = errorHandler.createAuthorizationError(resource, action, context);
    return err(standardizedError);
  }

  // Private helper methods

  private static mapBoomToCategory(boomError: Boom.Boom): ErrorCategory {
    const statusCode = boomError.output.statusCode;
    
    switch (statusCode) {
      case 400:
        return ErrorCategory.VALIDATION;
      case 401:
        return ErrorCategory.AUTHENTICATION;
      case 403:
        return ErrorCategory.AUTHORIZATION;
      case 404:
        return ErrorCategory.NOT_FOUND;
      case 409:
        return ErrorCategory.CONFLICT;
      case 429:
        return ErrorCategory.RATE_LIMIT;
      case 500:
        return ErrorCategory.SYSTEM;
      case 503:
        return ErrorCategory.EXTERNAL_SERVICE;
      default:
        return ErrorCategory.SYSTEM;
    }
  }

  private static mapBoomToSeverity(boomError: Boom.Boom): ErrorSeverity {
    const statusCode = boomError.output.statusCode;
    
    if (statusCode >= 500) {
      return ErrorSeverity.HIGH;
    } else if (statusCode >= 400) {
      return ErrorSeverity.MEDIUM;
    } else {
      return ErrorSeverity.LOW;
    }
  }

  private static isBoomRetryable(boomError: Boom.Boom): boolean {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(boomError.output.statusCode);
  }
}

/**
 * Utility functions for common Result operations
 */

/**
 * Combine multiple Results into a single Result containing an array
 */
export function combineResults<T>(results: ServiceResult<T>[]): ServiceResult<T[]> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    values.push(result.value);
  }
  
  return ok(values);
}

/**
 * Map over a Result value
 */
export function mapResult<T, U>(
  result: ServiceResult<T>,
  mapper: (value: T) => U
): ServiceResult<U> {
  return result.map(mapper);
}

/**
 * Chain Result operations (flatMap)
 */
export function chainResult<T, U>(
  result: ServiceResult<T>,
  chainer: (value: T) => ServiceResult<U>
): ServiceResult<U> {
  return result.andThen(chainer);
}

/**
 * Convert a nullable value to a Result
 */
export function fromNullable<T>(
  value: T | null | undefined,
  errorFactory: () => StandardizedError
): ServiceResult<T> {
  if (value == null) {
    return err(errorFactory());
  }
  return ok(value);
}

/**
 * Execute an operation with Result error handling
 */
export async function withResultHandling<T>(
  operation: () => Promise<T>,
  context: { service: string; operation: string }
): AsyncServiceResult<T> {
  return ResultAdapter.safeAsync(operation, context);
}
