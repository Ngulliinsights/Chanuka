/**
 * JSON Serialization Utilities
 * 
 * Provides type-safe serialization and deserialization of domain models
 * with proper Date handling and validation.
 * 
 * Feature: comprehensive-bug-fixes
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import { z } from 'zod';

/**
 * Serializes a domain model to JSON-compatible format
 * Converts Date objects to ISO 8601 strings
 * 
 * @param model - Domain model to serialize
 * @returns JSON-compatible object with dates as ISO strings
 */
export function serializeDomainModel<T extends Record<string, unknown>>(
  model: T
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(model)) {
    if (value instanceof Date) {
      // Validate date before serialization
      if (isNaN(value.getTime())) {
        throw new Error(
          `Cannot serialize invalid Date in field "${key}": ${value}`
        );
      }
      serialized[key] = value.toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively serialize nested objects
      serialized[key] = serializeDomainModel(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Handle arrays
      serialized[key] = value.map((item) =>
        item && typeof item === 'object' && !(item instanceof Date)
          ? serializeDomainModel(item as Record<string, unknown>)
          : item instanceof Date
          ? item.toISOString()
          : item
      );
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

/**
 * Deserializes JSON data to a domain model
 * Converts ISO 8601 strings to Date objects
 * Validates structure using Zod schema
 * 
 * @param data - JSON data to deserialize
 * @param schema - Zod schema for validation
 * @returns Validated domain model with Date objects
 */
export function deserializeDomainModel<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T {
  // First validate the structure
  const validationResult = schema.safeParse(data);

  if (!validationResult.success) {
    const errors = validationResult.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    throw new Error(`Deserialization validation failed: ${errors}`);
  }

  // Convert ISO strings to Date objects
  const converted = convertISOStringsToDates(validationResult.data);

  return converted as T;
}

/**
 * Recursively converts ISO 8601 strings to Date objects
 * 
 * @param obj - Object to process
 * @returns Object with Date objects instead of ISO strings
 */
function convertISOStringsToDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string' && isISODateString(obj)) {
    return new Date(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertISOStringsToDates(item)) as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertISOStringsToDates(value);
    }
    return converted as T;
  }

  return obj;
}

/**
 * Checks if a string is a valid ISO 8601 date string
 * 
 * @param str - String to check
 * @returns True if string is a valid ISO date
 */
function isISODateString(str: string): boolean {
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or with timezone offset
  // Also handles negative years (BCE dates) like -000001-12-31T23:59:59.999Z
  // And extended years (beyond 9999) like +010000-01-01T00:00:00.000Z
  const isoDateRegex =
    /^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;

  if (!isoDateRegex.test(str)) {
    return false;
  }

  // Verify it's a valid date (this catches invalid dates like 2024-02-30)
  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Additional validation: ensure the date string round-trips correctly
  // This catches cases like "2024-02-30" which JavaScript converts to "2024-03-02"
  const roundTripped = date.toISOString();
  
  // Extract the date parts (ignoring timezone differences)
  const originalDatePart = str.substring(0, 10); // YYYY-MM-DD
  const roundTrippedDatePart = roundTripped.substring(0, 10);
  
  return originalDatePart === roundTrippedDatePart;
}

/**
 * Helper to create a Zod schema that accepts both Date objects and ISO strings
 * Useful for schemas that need to work with both serialized and deserialized data
 * 
 * @returns Zod schema that accepts Date or ISO string
 */
export function dateOrISOString() {
  return z.union([
    z.date(),
    z.string().refine(isISODateString, {
      message: 'Must be a valid ISO 8601 date string',
    }),
  ]);
}

/**
 * Helper to create a Zod schema for optional dates
 * 
 * @returns Zod schema that accepts Date, ISO string, null, or undefined
 */
export function optionalDateOrISOString() {
  return z
    .union([
      z.date(),
      z.string().refine(isISODateString, {
        message: 'Must be a valid ISO 8601 date string',
      }),
    ])
    .nullable()
    .optional();
}
