/**
 * Result Monad Pattern (Strategic - Future Use)
 * 
 * Provides type-safe error handling without exceptions.
 * Server uses this extensively (AsyncServiceResult<T>).
 * Available for gradual client adoption.
 * 
 * @example
 * // Type-safe API call
 * async function fetchBillSafely(id: string): Promise<ClientResult<Bill>> {
 *   return safeAsync(
 *     () => billsApiService.getBillById(id),
 *     error => ErrorFactory.createFromError(error)
 *   );
 * }
 * 
 * // Caller gets type-safe error handling
 * const result = await fetchBillSafely('123');
 * if (result.success) {
 *   console.log(result.value); // Bill
 * } else {
 *   console.error(result.error); // ClientError
 * }
 */

import type { ClientError } from '../core/types';

/**
 * Result type - Either success (Ok) or failure (Err)
 */
export type ClientResult<T> = Ok<T> | Err;

/**
 * Success result
 */
export interface Ok<T> {
  readonly success: true;
  readonly value: T;
}

/**
 * Failure result
 */
export interface Err {
  readonly success: false;
  readonly error: ClientError;
}

/**
 * Create a success result
 */
export function ok<T>(value: T): Ok<T> {
  return {
    success: true,
    value,
  };
}

/**
 * Create a failure result
 */
export function err(error: ClientError): Err {
  return {
    success: false,
    error,
  };
}

/**
 * Type guard for Ok result
 */
export function isOk<T>(result: ClientResult<T>): result is Ok<T> {
  return result.success === true;
}

/**
 * Type guard for Err result
 */
export function isErr<T>(result: ClientResult<T>): result is Err {
  return result.success === false;
}

/**
 * Wrap an async operation in a Result
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorConverter: (error: Error) => ClientError
): Promise<ClientResult<T>> {
  try {
    const value = await operation();
    return ok(value);
  } catch (error) {
    const clientError = errorConverter(error as Error);
    return err(clientError);
  }
}

/**
 * Wrap a sync operation in a Result
 */
export function safe<T>(
  operation: () => T,
  errorConverter: (error: Error) => ClientError
): ClientResult<T> {
  try {
    const value = operation();
    return ok(value);
  } catch (error) {
    const clientError = errorConverter(error as Error);
    return err(clientError);
  }
}

/**
 * Map a Result value
 */
export function map<T, U>(result: ClientResult<T>, fn: (value: T) => U): ClientResult<U> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a Result error
 */
export function mapError<T>(
  result: ClientResult<T>,
  fn: (error: ClientError) => ClientError
): ClientResult<T> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain Result operations (flatMap)
 */
export function andThen<T, U>(
  result: ClientResult<T>,
  fn: (value: T) => ClientResult<U>
): ClientResult<U> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Unwrap a Result value or throw
 */
export function unwrap<T>(result: ClientResult<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a Result value or return default
 */
export function unwrapOr<T>(result: ClientResult<T>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Match on a Result
 */
export function match<T, U>(
  result: ClientResult<T>,
  handlers: {
    ok: (value: T) => U;
    err: (error: ClientError) => U;
  }
): U {
  if (isOk(result)) {
    return handlers.ok(result.value);
  }
  return handlers.err(result.error);
}

/**
 * Combine multiple Results
 */
export function combine<T>(results: ClientResult<T>[]): ClientResult<T[]> {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }

  return ok(values);
}

/**
 * Convert a Promise to a Result
 */
export async function fromPromise<T>(
  promise: Promise<T>,
  errorConverter: (error: Error) => ClientError
): Promise<ClientResult<T>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    const clientError = errorConverter(error as Error);
    return err(clientError);
  }
}

/**
 * Tap into a Result without changing it
 */
export function tap<T>(result: ClientResult<T>, fn: (value: T) => void): ClientResult<T> {
  if (isOk(result)) {
    fn(result.value);
  }
  return result;
}

/**
 * Tap into an error without changing it
 */
export function tapError<T>(
  result: ClientResult<T>,
  fn: (error: ClientError) => void
): ClientResult<T> {
  if (isErr(result)) {
    fn(result.error);
  }
  return result;
}
