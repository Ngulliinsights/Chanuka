/**
 * Result<T, E> type for functional error handling
 * Provides a type-safe way to handle operations that may succeed or fail
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

/**
 * Successful result variant
 */
export class Ok<T, E = Error> {
  readonly _tag = 'Ok' as const;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /**
   * Check if this is an Ok result
   */
  isOk(): this is Ok<T, E> {
    return true;
  }

  /**
   * Check if this is an Err result
   */
  isErr(): false {
    return false;
  }

  /**
   * Get the value, throwing if it's an error
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Get the value with a default if it's an error
   */
  unwrapOr(defaultValue: T): T {
    return this.value;
  }

  /**
   * Get the value or throw with a custom message
   */
  expect(message: string): T {
    return this.value;
  }

  /**
   * Transform the value using a function
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok<U, E>(fn(this.value));
  }

  /**
   * Transform the error (no-op for Ok)
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Ok<T, F>(this.value);
  }

  /**
   * Chain operations that return Results
   */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  /**
   * Handle both Ok and Err cases
   */
  match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
    return onOk(this.value);
  }
}

/**
 * Error result variant
 */
export class Err<T = unknown, E = Error> {
  readonly _tag = 'Err' as const;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  /**
   * Check if this is an Ok result
   */
  isOk(): false {
    return false;
  }

  /**
   * Check if this is an Err result
   */
  isErr(): this is Err<T, E> {
    return true;
  }

  /**
   * Get the value, throwing if it's an error
   */
  unwrap(): never {
    throw this.error;
  }

  /**
   * Get the value with a default if it's an error
   */
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Get the value or throw with a custom message
   */
  expect(message: string): never {
    throw new Error(`${message}: ${this.error}`);
  }

  /**
   * Transform the value (no-op for Err)
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  /**
   * Transform the error using a function
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err<T, F>(fn(this.error));
  }

  /**
   * Chain operations that return Results (no-op for Err)
   */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  /**
   * Handle both Ok and Err cases
   */
  match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
    return onErr(this.error);
  }
}

/**
 * Create an Ok result
 */
export function ok<T>(value: T): Result<T, never> {
  return new Ok(value);
}

/**
 * Create an Err result
 */
export function err<E>(error: E): Result<never, E> {
  return new Err(error);
}

/**
 * Type guard for Ok results
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result._tag === 'Ok';
}

/**
 * Type guard for Err results
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E> {
  return result._tag === 'Err';
}




































