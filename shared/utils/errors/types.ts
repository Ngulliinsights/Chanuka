/**
 * Error Type Definitions
 * 
 * Custom error classes with ErrorContext for better debugging and monitoring.
 */

import { ErrorContext } from './context';

export class TransformationError extends Error {
  public override readonly name = 'TransformationError';
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(message);
    this.context = context;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransformationError);
    }
  }
}

export class ValidationError extends Error {
  public override readonly name = 'ValidationError';
  public readonly context: ErrorContext;
  public readonly validationErrors: Array<{
    field: string;
    rule: string;
    message: string;
  }>;

  constructor(
    message: string,
    context: ErrorContext,
    validationErrors: Array<{
      field: string;
      rule: string;
      message: string;
    }>
  ) {
    super(message);
    this.context = context;
    this.validationErrors = validationErrors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

export class NetworkError extends Error {
  public override readonly name = 'NetworkError';
  public readonly context: ErrorContext;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    context: ErrorContext,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.context = context;
    this.statusCode = statusCode;
    this.retryable = retryable;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}
