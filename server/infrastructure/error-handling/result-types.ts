/**
 * Result Types
 *
 * The functional error-handling layer. Provides the Result monad for the
 * service layer, safe wrappers for operations that can throw, and
 * bidirectional conversion between Boom errors and StandardizedError.
 *
 * Design contract:
 *  - Does NOT create errors from scratch — use error-factory.ts for that.
 *  - Does NOT log or track — callers decide when to observe errors.
 *  - Does NOT import Express or any HTTP framework.
 *  - The Boom ↔ StandardizedError conversions here are the *only* place
 *    that mapping logic exists. Both error-standardization.ts and
 *    result-adapter.ts previously duplicated it; it now lives here once.
 *
 * Dependency rule: result-types.ts → types.ts, error-factory.ts
 */

import Boom from '@hapi/boom';
import { err, ok, Result } from 'neverthrow';

import {
  createError,
  createSystemError,
  httpStatusForCategory,
  severityForCategory,
  userMessageForCategory,
} from './error-factory';
import {
  ErrorCategory,
  ErrorContext,
  ErrorSeverity,
  StandardizedError,
} from './types';

// Re-export the primitives so callers only need one import
export { ok, err, Result } from 'neverthrow';

// ─────────────────────────────────────────────────────────────────────────────
// Core Type Aliases
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The standard Result type used throughout the service layer.
 * Success carries `T`; failure carries a fully-formed StandardizedError that
 * already contains category, severity, HTTP status, and a user-safe message.
 *
 * Using StandardizedError (not Boom) as the error channel keeps the service
 * layer free of HTTP framework dependencies. Boom errors are produced at the
 * HTTP boundary only (see http-error-handler.ts).
 */
export type ServiceResult<T>      = Result<T, StandardizedError>;
export type AsyncServiceResult<T> = Promise<ServiceResult<T>>;

// ─────────────────────────────────────────────────────────────────────────────
// Safe Wrappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps an async operation that may throw. Any thrown value — whether an Error,
 * a Boom instance, a string, or an unknown primitive — is normalised into a
 * StandardizedError so callers always deal with a consistent type.
 *
 * @example
 * const result = await safeAsync(
 *   () => db.query('SELECT ...'),
 *   { service: 'BillService', operation: 'fetchBill' },
 * );
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context:   Partial<ErrorContext>,
): AsyncServiceResult<T> {
  try {
    return ok(await operation());
  } catch (thrown) {
    return err(normaliseThrown(thrown, context));
  }
}

/**
 * Wraps a synchronous operation that may throw.
 */
export function safe<T>(
  operation: () => T,
  context:   Partial<ErrorContext>,
): ServiceResult<T> {
  try {
    return ok(operation());
  } catch (thrown) {
    return err(normaliseThrown(thrown, context));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Combinators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all results in sequence and returns a Result containing an array of
 * values, or the first error encountered.
 *
 * Does not short-circuit at the type level when collecting all errors is needed;
 * use `partitionResults` for that.
 */
export function combineResults<T>(
  results: ServiceResult<T>[],
): ServiceResult<T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) return result as unknown as ServiceResult<T[]>;
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Splits a list of results into successes and failures. Useful when you want
 * to process as many items as possible and report all failures together.
 */
export function partitionResults<T>(results: ServiceResult<T>[]): {
  successes: T[];
  failures:  StandardizedError[];
} {
  const successes: T[]                 = [];
  const failures:  StandardizedError[] = [];
  for (const result of results) {
    if (result.isOk())  successes.push(result.value);
    else                failures.push(result.error);
  }
  return { successes, failures };
}

/**
 * Converts a nullable value to a ServiceResult. Avoids inline null-checks
 * scattered across service methods.
 *
 * @example
 * const result = fromNullable(
 *   await repo.findById(id),
 *   () => createNotFoundError('Bill', id, ctx),
 * );
 */
export function fromNullable<T>(
  value:        T | null | undefined,
  errorFactory: () => StandardizedError,
): ServiceResult<T> {
  return value == null ? err(errorFactory()) : ok(value);
}

/**
 * Lifts a `Promise<T | null>` into `AsyncServiceResult<T>`.
 */
export async function fromNullableAsync<T>(
  promise:      Promise<T | null | undefined>,
  errorFactory: () => StandardizedError,
): AsyncServiceResult<T> {
  const value = await promise;
  return fromNullable(value, errorFactory);
}

// ─────────────────────────────────────────────────────────────────────────────
// Boom ↔ StandardizedError Conversions
// ─────────────────────────────────────────────────────────────────────────────
// These are the only two places this mapping occurs. The full conversion logic
// that was duplicated across error-standardization.ts, error-adapter.ts, and
// result-adapter.ts is now in one place.

/**
 * Converts a Boom error produced by a third-party library (or legacy code)
 * into a StandardizedError.
 *
 * When Boom data carries category/code/retryable metadata that was set by our
 * own createBoomFrom() (below), those values are recovered faithfully.
 * For Boom errors from external sources those fields are inferred from the
 * HTTP status code via the factory's tables.
 */
export function standardizedFromBoom(
  boomError: Boom.Boom,
  context:   Partial<ErrorContext>,
): StandardizedError {
  // Our own Boom errors carry structured metadata in .data
  const data: Record<string, unknown> =
    boomError.data != null && typeof boomError.data === 'object'
      ? (boomError.data as Record<string, unknown>)
      : {};

  const category = (data['category'] as ErrorCategory | undefined)
    ?? categoryFromHttpStatus(boomError.output.statusCode);

  const code = (data['code'] as string | undefined)
    ?? boomError.output.payload.error
    ?? codeFromHttpStatus(boomError.output.statusCode);

  const retryable  = (data['retryable'] as boolean | undefined)
    ?? retryableFromStatus(boomError.output.statusCode);

  const severity   = severityForCategory(category);
  const userMessage = (data['userMessage'] as string | undefined)
    ?? userMessageForCategory(category);

  return {
    id:            (data['errorId'] as string | undefined) ?? generateId(),
    code,
    category,
    severity,
    message:       boomError.message,
    userMessage,
    context:       {
      service:   'unknown',
      operation: 'unknown',
      timestamp: new Date(),
      ...context,
    },
    retryable,
    httpStatusCode: boomError.output.statusCode,
    originalError:  new Error(boomError.message),
    ...(boomError.stack != null && { stackTrace: boomError.stack }),
  };
}

/**
 * Converts a StandardizedError into a Boom error.
 *
 * All our metadata (category, errorId, retryable, userMessage) is embedded
 * in `boomError.data` so that `standardizedFromBoom` can recover it if the
 * error crosses back into a context that needs a StandardizedError.
 *
 * The `boomError.output.payload` (what clients actually see) only contains
 * the user-safe message plus the structured fields. Internal messages and
 * stack traces are never placed in the payload.
 */
export function boomFromStandardized(error: StandardizedError): Boom.Boom {
  const boomError = createBoomForStatus(error.httpStatusCode, error.userMessage);

  // Stamp the payload with fields we want in the API JSON response
  Object.assign(boomError.output.payload, {
    errorId:   error.id,
    code:      error.code,
    category:  error.category,
    retryable: error.retryable,
    timestamp: error.context.timestamp.toISOString(),
  });

  // Stash full metadata for round-tripping (never serialised directly)
  boomError.data = {
    errorId:     error.id,
    code:        error.code,
    category:    error.category,
    retryable:   error.retryable,
    userMessage: error.userMessage,
    service:     error.context.service,
    operation:   error.context.operation,
  };

  return boomError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Boom-based Result Helpers
// ─────────────────────────────────────────────────────────────────────────────
// For codebases still using Boom as the error channel in Results.

export type BoomResult<T>      = Result<T, Boom.Boom>;
export type AsyncBoomResult<T> = Promise<BoomResult<T>>;

/**
 * Wraps an async operation and returns a Boom-typed Result.
 * Useful in migration contexts where the calling code expects Boom errors.
 */
export async function safeAsyncBoom<T>(
  operation: () => Promise<T>,
  context:   Partial<ErrorContext>,
): AsyncBoomResult<T> {
  try {
    return ok(await operation());
  } catch (thrown) {
    if (Boom.isBoom(thrown)) return err(thrown);
    const standardized = normaliseThrown(thrown, context);
    return err(boomFromStandardized(standardized));
  }
}

/**
 * Converts a ServiceResult (StandardizedError channel) into a BoomResult
 * for code paths that still consume Boom.
 */
export function toBoomResult<T>(result: ServiceResult<T>): BoomResult<T> {
  if (result.isOk()) return ok(result.value);
  return err(boomFromStandardized(result.error));
}

/**
 * Converts a BoomResult into a ServiceResult.
 */
export function toServiceResult<T>(
  result:  BoomResult<T>,
  context: Partial<ErrorContext>,
): ServiceResult<T> {
  if (result.isOk()) return ok(result.value);
  return err(standardizedFromBoom(result.error, context));
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises anything that can be thrown into a StandardizedError.
 * This is intentionally exhaustive so `safeAsync` / `safe` can guarantee
 * the error type even when third-party code throws strings or objects.
 */
function normaliseThrown(
  thrown:  unknown,
  context: Partial<ErrorContext>,
): StandardizedError {
  if (thrown instanceof Error && !Boom.isBoom(thrown)) {
    return createSystemError(thrown, context);
  }

  if (Boom.isBoom(thrown)) {
    return standardizedFromBoom(thrown, context);
  }

  const message = typeof thrown === 'string'
    ? thrown
    : JSON.stringify(thrown) ?? 'Unknown error';

  return createSystemError(new Error(message), context);
}

function createBoomForStatus(statusCode: number, message: string): Boom.Boom {
  switch (statusCode) {
    case 400: return Boom.badRequest(message);
    case 401: return Boom.unauthorized(message);
    case 403: return Boom.forbidden(message);
    case 404: return Boom.notFound(message);
    case 409: return Boom.conflict(message);
    case 422: return Boom.badData(message);
    case 429: return Boom.tooManyRequests(message);
    case 502: return Boom.badGateway(message);
    case 503: return Boom.serverUnavailable(message);
    case 504: return Boom.gatewayTimeout(message);
    default:  return Boom.internal(message);
  }
}

function categoryFromHttpStatus(status: number): ErrorCategory {
  if (status === 400) return ErrorCategory.VALIDATION;
  if (status === 401) return ErrorCategory.AUTHENTICATION;
  if (status === 403) return ErrorCategory.AUTHORIZATION;
  if (status === 404) return ErrorCategory.NOT_FOUND;
  if (status === 409) return ErrorCategory.CONFLICT;
  if (status === 422) return ErrorCategory.BUSINESS_LOGIC;
  if (status === 429) return ErrorCategory.RATE_LIMIT;
  if (status === 503 || status === 502 || status === 504)
    return ErrorCategory.EXTERNAL_SERVICE;
  return ErrorCategory.SYSTEM;
}

function codeFromHttpStatus(status: number): string {
  const map: Record<number, string> = {
    400: 'VALIDATION_FAILED',
    401: 'AUTH_REQUIRED',
    403: 'ACCESS_DENIED',
    404: 'RESOURCE_NOT_FOUND',
    409: 'RESOURCE_CONFLICT',
    422: 'BUSINESS_RULE_VIOLATION',
    429: 'RATE_LIMIT_EXCEEDED',
    502: 'EXTERNAL_SERVICE_ERROR',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? 'UNKNOWN_ERROR';
}

function retryableFromStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function generateId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}