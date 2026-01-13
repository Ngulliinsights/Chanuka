/**
 * RUNTIME VALIDATION TEST UTILITIES
 *
 * Runtime validation utilities for testing type safety and data integrity
 * at runtime, complementing TypeScript's compile-time type checking
 */

// ============================================================================
// Core Runtime Validation Utilities
// ============================================================================

export interface TestRuntimeValidator<T> {
  (value: unknown): value is T;
  readonly name: string;
  readonly description?: string;
}

export interface TestValidationResult {
  readonly valid: boolean;
  readonly errors?: TestValidationError[];
  readonly warnings?: TestValidationWarning[];
  readonly timestamp: number;
}

export interface TestValidationError {
  readonly path: string;
  readonly message: string;
  readonly expectedType: string;
  readonly actualType: string;
  readonly severity: 'error' | 'critical';
  readonly code: string;
}

export interface TestValidationWarning {
  readonly path: string;
  readonly message: string;
  readonly expectedType: string;
  readonly actualType: string;
  readonly severity: 'warning' | 'info';
  readonly code: string;
}

export interface TestValidationContext {
  readonly strictMode: boolean;
  readonly path: string;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Basic Type Validators
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// ============================================================================
// Complex Type Validators
// ============================================================================

export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function isUUID(value: unknown): value is string {
  return isString(value) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isEmail(value: unknown): value is string {
  return isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isURL(value: unknown): value is string {
  try {
    return isString(value) && new URL(value).protocol.startsWith('http');
  } catch {
    return false;
  }
}

// ============================================================================
// Object Schema Validation
// ============================================================================

export interface ObjectSchema {
  [key: string]: TestRuntimeValidator<unknown> | ObjectSchema | unknown;
}

export function validateObjectSchema(
  value: unknown,
  schema: ObjectSchema,
  context: TestValidationContext = { strictMode: true, path: 'root' }
): TestValidationResult {
  if (!isObject(value)) {
    return {
      valid: false,
      errors: [{
        path: context.path,
        message: 'Expected object',
        expectedType: 'object',
        actualType: typeof value,
        severity: 'error',
        code: 'TYPE_MISMATCH',
      }],
      timestamp: Date.now(),
    };
  }

  const errors: TestValidationError[] = [];
  const warnings: TestValidationWarning[] = [];

  for (const [key, validator] of Object.entries(schema)) {
    const currentPath = context.path === 'root' ? key : `${context.path}.${key}`;
    const fieldValue = value[key];

    if (validator instanceof Function && 'name' in validator) {
      // It's a runtime validator
      const runtimeValidator = validator as TestRuntimeValidator<unknown>;
      if (!runtimeValidator(fieldValue)) {
        errors.push({
          path: currentPath,
          message: `Validation failed for ${key}`,
          expectedType: runtimeValidator.name,
          actualType: typeof fieldValue,
          severity: 'error',
          code: 'VALIDATION_FAILED',
        });
      }
    } else if (typeof validator === 'object' && validator !== null) {
      // It's a nested schema
      const nestedResult = validateObjectSchema(fieldValue, validator as ObjectSchema, {
        ...context,
        path: currentPath,
      });

      if (!nestedResult.valid) {
        errors.push(...(nestedResult.errors ?? []));
        warnings.push(...(nestedResult.warnings ?? []));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : ([] as TestValidationError[]),
    warnings: warnings.length > 0 ? warnings : ([] as TestValidationWarning[]),
    timestamp: Date.now(),
  };
}

// ============================================================================
// Array Validation
// ============================================================================

export function validateArray<T>(
  value: unknown,
  itemValidator: TestRuntimeValidator<T>,
  context: TestValidationContext = { strictMode: true, path: 'root' }
): TestValidationResult {
  if (!isArray(value)) {
    return {
      valid: false,
      errors: [{
        path: context.path,
        message: 'Expected array',
        expectedType: 'array',
        actualType: typeof value,
        severity: 'error',
        code: 'TYPE_MISMATCH',
      }],
      timestamp: Date.now(),
    };
  }

  const errors: TestValidationError[] = [];

  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    const itemPath = `${context.path}[${i}]`;

    if (!itemValidator(item)) {
      errors.push({
        path: itemPath,
        message: `Array item validation failed at index ${i}`,
        expectedType: itemValidator.name,
        actualType: typeof item,
        severity: 'error',
        code: 'ARRAY_ITEM_VALIDATION_FAILED',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Type Guard Utilities
// ============================================================================

export function createTypeGuard<T>(
  validator: TestRuntimeValidator<T>
): (value: unknown) => value is T {
  return validator;
}

export function createSchemaValidator<T extends ObjectSchema>(
  schema: T
): TestRuntimeValidator<{ [K in keyof T]: unknown }> {
  const validator: TestRuntimeValidator<{ [K in keyof T]: unknown }> = (
    value: unknown
  ): value is { [K in keyof T]: unknown } => {
    const result = validateObjectSchema(value, schema);
    return result.valid;
  };

  const typedValidator = validator as TestRuntimeValidator<{ [K in keyof T]: unknown }> & {
    name: string;
    description: string;
  };
  typedValidator.name = `SchemaValidator<${Object.keys(schema).join(', ')}>`;
  typedValidator.description = `Validates objects against schema with keys: ${Object.keys(schema).join(', ')}`;

  return typedValidator;
}

// ============================================================================
// Validation Result Utilities
// ============================================================================

export function combineValidationResults(
  results: TestValidationResult[]
): TestValidationResult {
  const allErrors: TestValidationError[] = [];
  const allWarnings: TestValidationWarning[] = [];

  for (const result of results) {
    if (result.errors) {
      allErrors.push(...result.errors);
    }
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    timestamp: Date.now(),
  };
}

export function formatValidationErrors(errors: TestValidationError[]): string {
  return errors
    .map((error) => `
  - ${error.path}: ${error.message}
    Expected: ${error.expectedType}, Got: ${error.actualType}
    Code: ${error.code}`)
    .join('\n');
}

// ============================================================================
// Test Data Generation
// ============================================================================

export interface TestDataGenerator<T> {
  (): T;
  readonly name: string;
  readonly description?: string;
}

export function createTestDataGenerator<T>(
  generator: () => T,
  name: string,
  description?: string
): TestDataGenerator<T> {
  const generatorFn = generator as TestDataGenerator<T> & {
    name: string;
    description?: string;
  };
  generatorFn.name = name;
  if (description !== undefined) {
    generatorFn.description = description;
  }
  return generatorFn;
}

export function generateValidTestData<T>(
  validator: TestRuntimeValidator<T>
): TestDataGenerator<T> {
  // This is a placeholder - actual implementation would depend on the validator
  return createTestDataGenerator(
    () => ({} as T),
    `ValidTestDataGenerator<${validator.name}>`,
    `Generates valid test data for ${validator.name}`
  );
}

export function generateInvalidTestData<T>(
  validator: TestRuntimeValidator<T>
): TestDataGenerator<unknown> {
  // This is a placeholder - actual implementation would depend on the validator
  return createTestDataGenerator(
    () => ({ invalid: 'data' } as unknown),
    `InvalidTestDataGenerator<${validator.name}>`,
    `Generates invalid test data for ${validator.name}`
  );
}

// ============================================================================
// Version and Metadata
// ============================================================================

export const RUNTIME_VALIDATION_VERSION = '1.0.0' as const;

export const RUNTIME_VALIDATION_FEATURES = {
  basicTypeValidation: true,
  complexTypeValidation: true,
  objectSchemaValidation: true,
  arrayValidation: true,
  typeGuards: true,
  validationResultUtilities: true,
  testDataGeneration: true,
} as const;