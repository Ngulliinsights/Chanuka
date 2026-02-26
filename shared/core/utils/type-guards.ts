/**
 * Type Guards Utilities Module
 *
 * Provides comprehensive type checking and validation utilities
 * for runtime type safety and data validation.
 *
 * This module consolidates type guard utilities from various sources
 * into a unified, framework-agnostic interface.
 */


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
  static isNullOrUndefined(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  static isNonEmptyString(value: unknown): value is string {
    return this.isString(value) && value.trim().length > 0;
  }

  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  static isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  static isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  // ==================== Advanced Type Guards ====================

  /**
   * Checks if value is a plain object (not a class instance).
   */
  static isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!this.isObject(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  }

  /**
   * Checks if value is a function.
   */
  static isFunction(value: unknown): value is Function {
    return typeof value === 'function';
  }

  /**
   * Checks if value is a class constructor.
   */
  static isClass(value: unknown): boolean {
    return this.isFunction(value) && /^\s*class\s+/.test(value.toString());
  }

  /**
   * Checks if value is a Promise.
   */
  static isPromise(value: unknown): value is Promise<any> {
    return value instanceof Promise ||
           (this.isObject(value) && typeof (value as any).then === 'function');
  }

  /**
   * Checks if value is a Date object.
   */
  static isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Checks if value is a valid JSON string.
   */
  static isJsonString(value: unknown): boolean {
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
  static isEmail(value: unknown): boolean {
    if (!this.isString(value)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Checks if value is a valid URL string.
   */
  static isUrl(value: unknown): boolean {
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
  static isUuid(value: unknown): boolean {
    if (!this.isString(value)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  // ==================== Schema Validation ====================

  /**
   * Validates an object against a schema.
   */
  static validateSchema<T extends Record<string, unknown>>(
    obj: any,
    schema: Record<string, (value: unknown) => boolean>,
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
          if (!validator((obj as any)[field])) {
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

    const result: TypeValidationResult<T> = {
      isValid: errors.length === 0,
      errors
    };
    
    if (errors.length === 0) {
      result.value = obj as T;
    }
    
    return result;
  }

  // ==================== Array Type Guards ====================

  /**
   * Checks if value is an array of specific type.
   */
  static isArrayOf<T>(
    value: any,
    typeGuard: (item: unknown) => item is T
  ): value is T[] {
    if (!Array.isArray(value)) return false;
    return value.every(typeGuard);
  }

  /**
   * Checks if value is an array of strings.
   */
  static isStringArray(value: unknown): value is string[] {
    return this.isArrayOf(value, this.isString);
  }

  /**
   * Checks if value is an array of numbers.
   */
  static isNumberArray(value: unknown): value is number[] {
    return this.isArrayOf(value, this.isNumber);
  }

  /**
   * Checks if value is an array of booleans.
   */
  static isBooleanArray(value: unknown): value is boolean[] {
    return this.isArrayOf(value, this.isBoolean);
  }

  // ==================== Utility Functions ====================

  /**
   * Safely gets the type name of a value.
   */
  static getTypeName(value: unknown): string {
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
  static isType(value: unknown, typeName: string): boolean {
    return this.getTypeName(value) === typeName;
  }

  /**
   * Asserts that a value is of a specific type, throwing an error if not.
   */
  static assertType<T>(
    value: any,
    typeGuard: (value: unknown) => value is T,
    errorMessage?: string
  ): asserts value is T {
    if (!typeGuard(value)) {
      throw new Error(errorMessage || `Type assertion failed. Expected specific type, got ${this.getTypeName(value)}`);
    }
  }
}

// ==================== Enum Converter Utilities ====================

/**
 * Interface for type-safe enum conversion
 */
export interface EnumConverter<T extends string> {
  /**
   * Converts an unknown value to a typed enum value
   * @throws {TypeError} if value is not a string
   * @throws {Error} if value is not a valid enum value
   */
  toEnum(value: unknown): T;
  
  /**
   * Converts an enum value back to a string
   */
  fromEnum(value: T): string;
  
  /**
   * Type guard to check if a value is a valid enum value
   */
  isValid(value: unknown): value is T;
}

/**
 * Creates a type-safe enum converter for a given set of enum values
 * 
 * @param enumValues - Array of valid enum values
 * @param enumName - Name of the enum for error messages
 * @returns EnumConverter instance with type-safe conversion methods
 * 
 * @example
 * ```typescript
 * const statusConverter = createEnumConverter(
 *   ['active', 'inactive', 'suspended'] as const,
 *   'UserStatus'
 * );
 * 
 * const status = statusConverter.toEnum(rawData.status); // Type-safe!
 * ```
 */
export function createEnumConverter<T extends string>(
  enumValues: readonly T[],
  enumName: string
): EnumConverter<T> {
  const validValues = new Set(enumValues);
  
  return {
    toEnum(value: unknown): T {
      if (typeof value !== 'string') {
        throw new TypeError(
          `Expected string for ${enumName}, got ${typeof value}`
        );
      }
      if (!validValues.has(value as T)) {
        throw new Error(
          `Invalid ${enumName}: "${value}". Expected one of: ${Array.from(enumValues).join(', ')}`
        );
      }
      return value as T;
    },
    
    fromEnum(value: T): string {
      return value;
    },
    
    isValid(value: unknown): value is T {
      return typeof value === 'string' && validValues.has(value as T);
    },
  };
}


















































// ==================== Pre-configured Enum Converters ====================

import {
  UserRole,
  UserStatus,
  BillStatus,
  Chamber,
  VoteType,
  ArgumentPosition,
  BillVoteType,
  CommentStatus,
  ModerationStatus,
  NotificationType,
  VerificationStatus,
  AnonymityLevel,
  BillType,
  CommitteeStatus,
  UrgencyLevel,
  ComplexityLevel,
  KenyanCounty,
} from '../../types/core/enums';

/**
 * Type-safe converter for UserRole enum
 * 
 * @example
 * ```typescript
 * const role = userRoleConverter.toEnum(rawData.role);
 * if (userRoleConverter.isValid(someValue)) {
 *   // someValue is UserRole
 * }
 * ```
 */
export const userRoleConverter = createEnumConverter(
  Object.values(UserRole) as readonly UserRole[],
  'UserRole'
);

/**
 * Type-safe converter for UserStatus enum
 */
export const userStatusConverter = createEnumConverter(
  Object.values(UserStatus) as readonly UserStatus[],
  'UserStatus'
);

/**
 * Type-safe converter for BillStatus enum
 */
export const billStatusConverter = createEnumConverter(
  Object.values(BillStatus) as readonly BillStatus[],
  'BillStatus'
);

/**
 * Type-safe converter for Chamber enum
 */
export const chamberConverter = createEnumConverter(
  Object.values(Chamber) as readonly Chamber[],
  'Chamber'
);

/**
 * Type-safe converter for VoteType enum
 */
export const voteTypeConverter = createEnumConverter(
  Object.values(VoteType) as readonly VoteType[],
  'VoteType'
);

/**
 * Type-safe converter for ArgumentPosition enum
 */
export const argumentPositionConverter = createEnumConverter(
  Object.values(ArgumentPosition) as readonly ArgumentPosition[],
  'ArgumentPosition'
);

/**
 * Type-safe converter for BillVoteType enum
 */
export const billVoteTypeConverter = createEnumConverter(
  Object.values(BillVoteType) as readonly BillVoteType[],
  'BillVoteType'
);

/**
 * Type-safe converter for CommentStatus enum
 */
export const commentStatusConverter = createEnumConverter(
  Object.values(CommentStatus) as readonly CommentStatus[],
  'CommentStatus'
);

/**
 * Type-safe converter for ModerationStatus enum
 */
export const moderationStatusConverter = createEnumConverter(
  Object.values(ModerationStatus) as readonly ModerationStatus[],
  'ModerationStatus'
);

/**
 * Type-safe converter for NotificationType enum
 */
export const notificationTypeConverter = createEnumConverter(
  Object.values(NotificationType) as readonly NotificationType[],
  'NotificationType'
);

/**
 * Type-safe converter for VerificationStatus enum
 */
export const verificationStatusConverter = createEnumConverter(
  Object.values(VerificationStatus) as readonly VerificationStatus[],
  'VerificationStatus'
);

/**
 * Type-safe converter for AnonymityLevel enum
 */
export const anonymityLevelConverter = createEnumConverter(
  Object.values(AnonymityLevel) as readonly AnonymityLevel[],
  'AnonymityLevel'
);

/**
 * Type-safe converter for BillType enum
 */
export const billTypeConverter = createEnumConverter(
  Object.values(BillType) as readonly BillType[],
  'BillType'
);

/**
 * Type-safe converter for CommitteeStatus enum
 */
export const committeeStatusConverter = createEnumConverter(
  Object.values(CommitteeStatus) as readonly CommitteeStatus[],
  'CommitteeStatus'
);

/**
 * Type-safe converter for UrgencyLevel enum
 */
export const urgencyLevelConverter = createEnumConverter(
  Object.values(UrgencyLevel) as readonly UrgencyLevel[],
  'UrgencyLevel'
);

/**
 * Type-safe converter for ComplexityLevel enum
 */
export const complexityLevelConverter = createEnumConverter(
  Object.values(ComplexityLevel) as readonly ComplexityLevel[],
  'ComplexityLevel'
);

/**
 * Type-safe converter for KenyanCounty enum
 */
export const kenyanCountyConverter = createEnumConverter(
  Object.values(KenyanCounty) as readonly KenyanCounty[],
  'KenyanCounty'
);
