/**
 * Type Guards for ML Models
 * Provides type-safe utilities for dynamic property access and type conversions
 * 
 * Requirements: 4.1, 16.2
 */

/**
 * Type guard for checking if a value is a valid key of an object
 */
export function isValidKey<T extends object>(
  key: string | number | symbol,
  obj: T
): key is keyof T {
  return key in obj;
}

/**
 * Safe property accessor with fallback
 * Returns the property value if it exists, otherwise returns the fallback
 */
export function safeGet<T extends object, K extends keyof T>(
  obj: T,
  key: string,
  fallback: T[K]
): T[K] {
  if (isValidKey(key, obj)) {
    return obj[key];
  }
  return fallback;
}

/**
 * Type guard for checking if an object has a specific property with a specific type
 */
export function hasProperty<T, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/**
 * Type guard for checking if an object has a confidence property
 */
export function hasConfidence(
  obj: unknown
): obj is { confidence: number } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'confidence' in obj &&
    typeof (obj as { confidence: unknown }).confidence === 'number'
  );
}

/**
 * Type guard for checking if a string is one of the allowed enum values
 */
export function isEnumValue<T extends string>(
  value: string,
  enumValues: readonly T[]
): value is T {
  return enumValues.includes(value as T);
}

/**
 * Safe enum converter with fallback
 * Returns the value if it's a valid enum value, otherwise returns the fallback
 */
export function toEnumValue<T extends string>(
  value: string,
  enumValues: readonly T[],
  fallback: T
): T {
  return isEnumValue(value, enumValues) ? value : fallback;
}
