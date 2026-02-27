// ============================================================================
// RESULT TYPE - Explicit Error Handling
// ============================================================================
// Provides Result<T, E> type for explicit error handling without exceptions.
// Inspired by Rust's Result type and functional programming patterns.

/**
 * Result type representing either success (Ok) or failure (Err).
 * 
 * @template T - Success value type
 * @template E - Error type
 * 
 * @example Basic Usage
 * ```typescript
 * function divide(a: number, b: number): Result<number, Error> {
 *   if (b === 0) {
 *     return Err(new Error('Division by zero'));
 *   }
 *   return Ok(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (result.isOk) {
 *   console.log('Result:', result.value); // 5
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 * 
 * @example With Pattern Matching
 * ```typescript
 * const result = divide(10, 0);
 * const message = result.isOk
 *   ? `Result: ${result.value}`
 *   : `Error: ${result.error.message}`;
 * ```
 * 
 * @example Chaining Operations
 * ```typescript
 * function parseAndDivide(a: string, b: string): Result<number, Error> {
 *   const numA = parseInt(a);
 *   const numB = parseInt(b);
 *   
 *   if (isNaN(numA) || isNaN(numB)) {
 *     return Err(new Error('Invalid number'));
 *   }
 *   
 *   return divide(numA, numB);
 * }
 * ```
 */
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

/**
 * Success variant of Result type.
 * 
 * @template T - Success value type
 */
export class Ok<T> {
  readonly isOk = true as const;
  readonly isErr = false as const;

  constructor(readonly value: T) {}

  /**
   * Unwrap the value (safe because this is Ok)
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Unwrap the value or return default (returns value)
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Map the success value to a new value
   */
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  /**
   * Map the error (no-op for Ok)
   */
  mapErr<F extends Error>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  /**
   * Chain another Result-returning operation
   */
  andThen<U, F extends Error>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }

  /**
   * Return this Ok or execute function (returns this)
   */
  orElse<F extends Error>(_fn: (error: never) => Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }
}

/**
 * Error variant of Result type.
 * 
 * @template E - Error type
 */
export class Err<E extends Error = Error> {
  readonly isOk = false as const;
  readonly isErr = true as const;

  constructor(readonly error: E) {}

  /**
   * Unwrap the value (throws because this is Err)
   */
  unwrap(): never {
    throw this.error;
  }

  /**
   * Unwrap the value or return default (returns default)
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Map the success value (no-op for Err)
   */
  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  /**
   * Map the error to a new error
   */
  mapErr<F extends Error>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  /**
   * Chain another Result-returning operation (no-op for Err)
   */
  andThen<U, F extends Error>(_fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this as unknown as Result<U, E | F>;
  }

  /**
   * Return this Err or execute function
   */
  orElse<F extends Error>(fn: (error: E) => Result<never, F>): Result<never, F> {
    return fn(this.error);
  }
}

/**
 * Type guard to check if Result is Ok
 * 
 * @example
 * ```typescript
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.value); // TypeScript knows this is Ok<number>
 * }
 * ```
 */
export function isOk<T, E extends Error>(result: Result<T, E>): result is Ok<T> {
  return result.isOk;
}

/**
 * Type guard to check if Result is Err
 * 
 * @example
 * ```typescript
 * const result = divide(10, 0);
 * if (isErr(result)) {
 *   console.error(result.error); // TypeScript knows this is Err<Error>
 * }
 * ```
 */
export function isErr<T, E extends Error>(result: Result<T, E>): result is Err<E> {
  return result.isErr;
}

/**
 * Unwrap Result value or throw error
 * 
 * @example
 * ```typescript
 * const result = divide(10, 2);
 * const value = unwrap(result); // 5 or throws
 * ```
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  return result.unwrap();
}

/**
 * Unwrap Result value or return default
 * 
 * @example
 * ```typescript
 * const result = divide(10, 0);
 * const value = unwrapOr(result, 0); // 0
 * ```
 */
export function unwrapOr<T, E extends Error>(result: Result<T, E>, defaultValue: T): T {
  return result.unwrapOr(defaultValue);
}

/**
 * Combine multiple Results into a single Result containing an array
 * 
 * @example
 * ```typescript
 * const results = [
 *   divide(10, 2),
 *   divide(20, 4),
 *   divide(30, 6)
 * ];
 * 
 * const combined = combineResults(results);
 * if (combined.isOk) {
 *   console.log(combined.value); // [5, 5, 5]
 * }
 * ```
 */
export function combineResults<T, E extends Error>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isErr) {
      return result as unknown as Result<T[], E>;
    }
    values.push(result.value);
  }
  
  return new Ok(values);
}

/**
 * Execute an async function and wrap result in Result type
 * 
 * @example
 * ```typescript
 * const result = await fromPromise(
 *   fetch('https://api.example.com/data')
 * );
 * 
 * if (result.isOk) {
 *   console.log('Response:', result.value);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return new Ok(value);
  } catch (error) {
    return new Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Execute a function and wrap result in Result type
 * 
 * @example
 * ```typescript
 * const result = fromThrowable(() => {
 *   return JSON.parse(jsonString);
 * });
 * 
 * if (result.isOk) {
 *   console.log('Parsed:', result.value);
 * } else {
 *   console.error('Parse error:', result.error);
 * }
 * ```
 */
export function fromThrowable<T>(fn: () => T): Result<T, Error> {
  try {
    return new Ok(fn());
  } catch (error) {
    return new Err(error instanceof Error ? error : new Error(String(error)));
  }
}
