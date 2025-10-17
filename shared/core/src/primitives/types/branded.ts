/**
 * Branded types for type-safe primitive values
 * Uses TypeScript's nominal typing to create distinct types for the same underlying primitive
 */

/**
 * Base brand symbol type
 */
export type Brand<T, Brand> = T & { readonly __brand: Brand };

/**
 * Create a branded type constructor
 */
export function brand<T, B extends string>(value: T, brand: B): Brand<T, B> {
  return value as Brand<T, B>;
}

/**
 * Check if a value is of a specific branded type
 */
export function isBranded<T, B extends string>(value: unknown, brand: B): value is Brand<T, B> {
  return typeof value === 'object' && value !== null && '__brand' in value && (value as any).__brand === brand;
}

/**
 * Unbrand a value to get the underlying type
 */
export function unbrand<T, B>(branded: Brand<T, B>): T {
  return branded as T;
}

/**
 * Common branded types for domain-specific values
 */

// User ID - ensures user IDs are properly typed
export type UserId = Brand<string, 'UserId'>;

/**
 * Create a UserId from a string
 */
export function UserId(value: string): UserId {
  if (!value || value.trim() === '') {
    throw new Error('UserId cannot be empty');
  }
  return brand(value, 'UserId');
}

// Email - ensures emails are properly validated and typed
export type Email = Brand<string, 'Email'>;

/**
 * Create an Email from a string (basic validation)
 */
export function Email(value: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new Error('Invalid email format');
  }
  return brand(value, 'Email');
}

// Positive integer - ensures numbers are positive integers
export type PositiveInt = Brand<number, 'PositiveInt'>;

/**
 * Create a PositiveInt from a number
 */
export function PositiveInt(value: number): PositiveInt {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Value must be a positive integer');
  }
  return brand(value, 'PositiveInt');
}

// Non-negative integer - ensures numbers are non-negative integers
export type NonNegativeInt = Brand<number, 'NonNegativeInt'>;

/**
 * Create a NonNegativeInt from a number
 */
export function NonNegativeInt(value: number): NonNegativeInt {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Value must be a non-negative integer');
  }
  return brand(value, 'NonNegativeInt');
}

// URL - ensures strings are valid URLs
export type Url = Brand<string, 'Url'>;

/**
 * Create a Url from a string
 */
export function Url(value: string): Url {
  try {
    new URL(value);
    return brand(value, 'Url');
  } catch {
    throw new Error('Invalid URL format');
  }
}

// UUID - ensures strings are valid UUIDs
export type Uuid = Brand<string, 'Uuid'>;

/**
 * Create a Uuid from a string
 */
export function Uuid(value: string): Uuid {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error('Invalid UUID format');
  }
  return brand(value, 'Uuid');
}

// Timestamp - ensures numbers are valid timestamps
export type Timestamp = Brand<number, 'Timestamp'>;

/**
 * Create a Timestamp from a number
 */
export function Timestamp(value: number): Timestamp {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Invalid timestamp');
  }
  return brand(value, 'Timestamp');
}

// Percentage - ensures numbers are valid percentages (0-100)
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Create a Percentage from a number
 */
export function Percentage(value: number): Percentage {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  return brand(value, 'Percentage');
}