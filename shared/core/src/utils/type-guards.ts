/**
 * Type Guards Utilities Module
 *
 * Provides comprehensive type checking and validation utilities
 * for runtime type safety and data validation.
 *
 * This module consolidates type guard utilities from various sources
 * into a unified, framework-agnostic interface.
 */

import { logger } from '../observability/logging';

// ==================== Type Definitions ====================

export interface TypeValidationResult<T = any> {
  isValid: boolean;
  value?: T;
  errors?: string[];
}

export interface SchemaValidationOptions {
  strict?: boolean;
  allowExtraKeys?: boolean;
  requiredFields?: string[];
}

// ==================== Basic Type Guards ====================

export class TypeGuards {
  static isNullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined;
  }

  static isString(value: any): value is string {
    return typeof value === 'string';
  }

  static isNonEmptyString(value: any): value is string {
    return this.isString(value) && value.trim().length > 0;
  }

  static isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  static isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
  }

  static isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  static isObject(value: any): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  // ==================== Advanced Type Guards ====================

  /**
   * Checks if value is a plain object (not a class instance).
   */
  static isPlainObject(value: any): value is Record<string, any> {
    if (!this.isObject(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  }

  /**
   * Checks if value is a function.
   */
  static isFunction(value: any): value is Function {
    return typeof value === 'function';
  }

  /**
   * Checks if value is a class constructor.
   */
  static isClass(value: any): boolean {
    return this.isFunction(value) && /^\s*class\s+/.test(value.toString());
  }

  /**
   * Checks if value is a Promise.
   */
  static isPromise(value: any): value is Promise<any> {
    return value instanceof Promise ||
           (this.isObject(value) && typeof (value as any).then === 'function');
  }

  /**
   * Checks if value is a Date object.
   */
  static isDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Checks if value is a valid JSON string.
   */
  static isJsonString(value: any): boolean {
    if (!this.isString(value)) return false;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if value is a valid email string.
   */
  static isEmail(value: any): boolean {
    if (!this.isString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Checks if value is a valid URL string.
   */
  static isUrl(value: any): boolean {
    if (!this.isString(value)) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if value is a valid UUID string.
   */
  static isUuid(value: any): boolean {
    if (!this.isString(value)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  // ==================== Schema Validation ====================

  /**
   * Validates an object against a schema.
   */
  static validateSchema<T extends Record<string, any>>(
    obj: any,
    schema: Record<string, (value: any) => boolean>,
    options: SchemaValidationOptions = {}
  ): TypeValidationResult<T> {
    const errors: string[] = [];

    if (!this.isObject(obj)) {
      return { isValid: false, errors: ['Value must be an object'] };
    }

    // Check required fields
    if (options.requiredFields) {
      for (const field of options.requiredFields) {
        if (!(field in obj)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Validate each field in the schema
    for (const [field, validator] of Object.entries(schema)) {
      if (field in obj) {
        try {
          if (!validator(obj[field])) {
            errors.push(`Field '${field}' failed validation`);
          }
        } catch (error) {
          errors.push(`Field '${field}' validation threw error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (options.strict && !options.requiredFields?.includes(field)) {
        // In strict mode, all schema fields must be present
        errors.push(`Field '${field}' is required in strict mode`);
      }
    }

    // Check for extra keys in strict mode
    if (options.strict && !options.allowExtraKeys) {
      const schemaKeys = new Set(Object.keys(schema));
      for (const key of Object.keys(obj)) {
        if (!schemaKeys.has(key)) {
          errors.push(`Extra field '${key}' not allowed in strict mode`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      value: errors.length === 0 ? obj as T : undefined,
      errors
    };
  }

  // ==================== Array Type Guards ====================

  /**
   * Checks if value is an array of specific type.
   */
  static isArrayOf<T>(
    value: any,
    typeGuard: (item: any) => item is T
  ): value is T[] {
    if (!Array.isArray(value)) return false;
    return value.every(typeGuard);
  }

  /**
   * Checks if value is an array of strings.
   */
  static isStringArray(value: any): value is string[] {
    return this.isArrayOf(value, this.isString);
  }

  /**
   * Checks if value is an array of numbers.
   */
  static isNumberArray(value: any): value is number[] {
    return this.isArrayOf(value, this.isNumber);
  }

  /**
   * Checks if value is an array of booleans.
   */
  static isBooleanArray(value: any): value is boolean[] {
    return this.isArrayOf(value, this.isBoolean);
  }

  // ==================== Utility Functions ====================

  /**
   * Safely gets the type name of a value.
   */
  static getTypeName(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;
    if (type !== 'object') return type;

    if (Array.isArray(value)) return 'array';

    return value.constructor?.name || 'object';
  }

  /**
   * Checks if a value is of a specific type by name.
   */
  static isType(value: any, typeName: string): boolean {
    return this.getTypeName(value) === typeName;
  }

  /**
   * Asserts that a value is of a specific type, throwing an error if not.
   */
  static assertType<T>(
    value: any,
    typeGuard: (value: any) => value is T,
    errorMessage?: string
  ): asserts value is T {
    if (!typeGuard(value)) {
      throw new Error(errorMessage || `Type assertion failed. Expected specific type, got ${this.getTypeName(value)}`);
    }
  }
}












































