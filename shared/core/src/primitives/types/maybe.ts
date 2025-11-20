/**
 * Maybe<T> type for handling optional values in a type-safe way
 * Similar to Option in Rust or Optional in other languages
 */
export type Maybe<T> = Some<T> | None;

/**
 * Present value variant
 */
export class Some<T> {
  readonly _tag = 'Some' as const;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /**
   * Check if this is a Some value
   */
  isSome(): this is Some<T> {
    return true;
  }

  /**
   * Check if this is a None value
   */
  isNone(): false {
    return false;
  }

  /**
   * Get the value, throwing if it's None
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Get the value with a default if it's None
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
  map<U>(fn: (value: T) => U): Maybe<U> {
    return new Some(fn(this.value));
  }

  /**
   * Chain operations that return Maybe values
   */
  andThen<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return fn(this.value);
  }

  /**
   * Handle both Some and None cases
   */
  match<U>(onSome: (value: T) => U, onNone: () => U): U {
    return onSome(this.value);
  }

  /**
   * Filter the value based on a predicate
   */
  filter(predicate: (value: T) => boolean): Maybe<T> {
    return predicate(this.value) ? this : none;
  }
}

/**
 * Absent value variant
 */
export class None {
  readonly _tag = 'None' as const;

  /**
   * Check if this is a Some value
   */
  isSome(): false {
    return false;
  }

  /**
   * Check if this is a None value
   */
  isNone(): this is None {
    return true;
  }

  /**
   * Get the value, throwing if it's None
   */
  unwrap(): never {
    throw new Error('Called unwrap on None');
  }

  /**
   * Get the value with a default if it's None
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Get the value or throw with a custom message
   */
  expect(message: string): never {
    throw new Error(message);
  }

  /**
   * Transform the value (no-op for None)
   */
  map<U>(fn: (value: never) => U): Maybe<U> {
    return none;
  }

  /**
   * Chain operations that return Maybe values (no-op for None)
   */
  andThen<U>(fn: (value: never) => Maybe<U>): Maybe<U> {
    return none;
  }

  /**
   * Handle both Some and None cases
   */
  match<U>(onSome: (value: never) => U, onNone: () => U): U {
    return onNone();
  }

  /**
   * Filter the value (no-op for None)
   */
  filter(predicate: (value: never) => boolean): Maybe<never> {
    return none;
  }
}

/**
 * Singleton None instance
 */
export const none = new None();

/**
 * Create a Some value
 */
export function some<T>(value: T): Maybe<T> {
  return new Some(value);
}

/**
 * Type guard for Some values
 */
export function isSome<T>(maybe: Maybe<T>): maybe is Some<T> {
  return maybe._tag === 'Some';
}

/**
 * Type guard for None values
 */
export function isNone<T>(maybe: Maybe<T>): maybe is None {
  return maybe._tag === 'None';
}

/**
 * Convert a value to Maybe, treating null/undefined as None
 */
export function fromNullable<T>(value: T | null | undefined): Maybe<T> {
  return value == null ? none : some(value);
}

/**
 * Convert a Maybe back to nullable value
 */
export function toNullable<T>(maybe: Maybe<T>): T | null {
  return maybe.isSome() ? maybe.value : null;
}

/**
 * Convert a Maybe back to undefined value
 */
export function toUndefined<T>(maybe: Maybe<T>): T | undefined {
  return maybe.isSome() ? maybe.value : undefined;
}








































