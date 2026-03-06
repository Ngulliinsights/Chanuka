/**
 * Consolidated Error Types
 * Merges legacy and unified type systems
 */

import { ErrorDomain, ErrorSeverity } from '@shared/core';
import type { ErrorCode } from '@shared/constants';

/**
 * BaseError - Aligned with server StandardizedError
 */
export interface BaseError {
  readonly id: string;
  readonly code: ErrorCode;
  readonly type: ErrorDomain;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly context: ErrorContext;
  readonly statusCode?: number;
  readonly details?: Record<string, unknown>;
  readonly stack?: string;
}

/**
 * ClientError - Extends BaseError with client concerns
 */
export interface ClientError extends BaseError {
  readonly recoverable: boolean;
  readonly retryable: boolean;
}

/**
 * ErrorContext - Where/when error occurred
 */
export interface ErrorContext {
  readonly component?: string;
  readonly operation?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * ErrorMetrics - Basic error statistics
 */
export interface ErrorMetrics {
  totalCount: number;
  countByDomain: Record<ErrorDomain, number>;
  countBySeverity: Record<ErrorSeverity, number>;
  lastUpdated: Date;
}

/**
 * ErrorListener - For error notifications
 */
export type ErrorListener = (error: ClientError) => void;

/**
 * ApiErrorResponse - HTTP boundary format
 */
export interface ApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly id: string;
    readonly code: string;
    readonly message: string;
    readonly type: string;
    readonly timestamp: string;
    readonly statusCode?: number;
    readonly details?: Record<string, unknown>;
    readonly correlationId?: string;
  };
}

// Type guards
export function isBaseError(error: unknown): error is BaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'id' in error &&
    'code' in error &&
    'type' in error &&
    'message' in error
  );
}

export function isClientError(error: unknown): error is ClientError {
  return isBaseError(error) && 'recoverable' in error && 'retryable' in error;
}

export function isApiErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  );
}
