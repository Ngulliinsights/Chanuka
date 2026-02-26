/**
 * Result Monad for Client Operations
 *
 * Provides functional error handling using the Result pattern.
 * Offers both functional (Result) and imperative (try/catch) patterns.
 *
 * Based on neverthrow library patterns but implemented directly
 * to avoid external dependencies.
 *
 * Requirements: 22.10
 */

import type { ClientError } from './unified-types';

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
 *
 * @param value - Success value
 * @returns Ok result
 */
export function ok<T>(value: T): Ok<T> {
  return {
    success: true,
    value,
  };
}

/**
 * Create a failure result
 *
 * @param error - ClientError
 * @returns Err result
 */
export function err(error: ClientError): Err {
  return {
    success: false,
    error,
  };
}

/**
 * Type guard for Ok result
 *
 * @param result - Result to check
 * @returns True if Ok
 */
export function isOk<T>(result: ClientResult<T>): result is Ok<T> {
  return result.success === true;
}

/**
 * Type guard for Err result
 *
 * @param result - Result to check
 * @returns True if Err
 */
export function isErr<T>(result: ClientResult<T>): result is Err {
  return result.success === false;
}

/**
 * Wrap an async operation in a Result
 *
 * Catches errors and converts them to ClientError.
 *
 * @param operation - Async operation to wrap
 * @param errorConverter - Function to convert Error to ClientError
 * @returns Result of the operation
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
 *
 * Catches errors and converts them to ClientError.
 *
 * @param operation - Sync operation to wrap
 * @param errorConverter - Function to convert Error to ClientError
 * @returns Result of the operation
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
 *
 * Transforms the success value if Ok, passes through if Err.
 *
 * @param result - Result to map
 * @param fn - Mapping function
 * @returns Mapped result
 */
export function map<T, U>(result: ClientResult<T>, fn: (value: T) => U): ClientResult<U> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a Result error
 *
 * Transforms the error if Err, passes through if Ok.
 *
 * @param result - Result to map
 * @param fn - Mapping function
 * @returns Mapped result
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
 *
 * Chains operations that return Results.
 *
 * @param result - Result to chain
 * @param fn - Function that returns a Result
 * @returns Chained result
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
 *
 * Returns the value if Ok, throws the error if Err.
 *
 * @param result - Result to unwrap
 * @returns The value
 * @throws ClientError if Err
 */
export function unwrap<T>(result: ClientResult<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a Result value or return default
 *
 * Returns the value if Ok, returns default if Err.
 *
 * @param result - Result to unwrap
 * @param defaultValue - Default value to return if Err
 * @returns The value or default
 */
export function unwrapOr<T>(result: ClientResult<T>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Unwrap a Result value or compute default
 *
 * Returns the value if Ok, computes default if Err.
 *
 * @param result - Result to unwrap
 * @param fn - Function to compute default value
 * @returns The value or computed default
 */
export function unwrapOrElse<T>(result: ClientResult<T>, fn: (error: ClientError) => T): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}

/**
 * Match on a Result
 *
 * Executes one of two functions based on Result state.
 *
 * @param result - Result to match
 * @param handlers - Ok and Err handlers
 * @returns Result of the handler
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
 *
 * Returns Ok with array of values if all are Ok,
 * returns first Err if any are Err.
 *
 * @param results - Array of Results
 * @returns Combined result
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
 * Combine multiple Results with different types
 *
 * Returns Ok with tuple of values if all are Ok,
 * returns first Err if any are Err.
 *
 * @param results - Tuple of Results
 * @returns Combined result
 */
export function combineWith<T extends readonly ClientResult<unknown>[]>(
  ...results: T
): ClientResult<{ [K in keyof T]: T[K] extends ClientResult<infer U> ? U : never }> {
  const values: unknown[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push((result as Ok<unknown>).value);
  }

  return ok(values as { [K in keyof T]: T[K] extends ClientResult<infer U> ? U : never });
}

/**
 * Convert a Promise to a Result
 *
 * Useful for converting existing Promise-based code.
 *
 * @param promise - Promise to convert
 * @param errorConverter - Function to convert Error to ClientError
 * @returns Result promise
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
 * Convert a Result to a Promise
 *
 * Useful for integrating with Promise-based code.
 *
 * @param result - Result to convert
 * @returns Promise that resolves with value or rejects with error
 */
export function toPromise<T>(result: ClientResult<T>): Promise<T> {
  if (isOk(result)) {
    return Promise.resolve(result.value);
  }
  return Promise.reject(result.error);
}

/**
 * Tap into a Result without changing it
 *
 * Useful for side effects like logging.
 *
 * @param result - Result to tap
 * @param fn - Function to execute
 * @returns Same result
 */
export function tap<T>(result: ClientResult<T>, fn: (value: T) => void): ClientResult<T> {
  if (isOk(result)) {
    fn(result.value);
  }
  return result;
}

/**
 * Tap into an error without changing it
 *
 * Useful for side effects like logging errors.
 *
 * @param result - Result to tap
 * @param fn - Function to execute
 * @returns Same result
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
