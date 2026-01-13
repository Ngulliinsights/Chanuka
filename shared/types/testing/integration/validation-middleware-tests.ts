/**
 * VALIDATION MIDDLEWARE INTEGRATION TESTS
 *
 * Integration testing for validation middleware compatibility
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

import { z } from 'zod';
import { createValidatedType, ValidatedType } from '../../core/validation';
import { Result, ValidationError } from '../../core/errors';
import { TypeCompatibilityTestSuite, TypeCompatibilityTestSuiteResult, runTypeCompatibilityTestSuite } from './comprehensive-type-tests';

// ============================================================================
// Validation Middleware Test Framework
// ============================================================================

export interface ValidationMiddlewareTestSuite {
  readonly suiteName: string;
  readonly description: string;
  readonly middlewareTests: ValidationMiddlewareTest[];
  readonly version: string;
}

export interface ValidationMiddlewareTest {
  readonly testName: string;
  readonly description: string;
  readonly validatedType: ValidatedType<unknown>;
  readonly middlewareValidator: ValidationMiddlewareValidator;
  readonly expectedResult: 'success' | 'failure' | 'partial';
  readonly testData: unknown;
}

export interface ValidationMiddlewareTestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly middlewareValidationPassed: boolean;
  readonly typeValidationPassed: boolean;
  readonly compatibilityConfirmed: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly timestamp: number;
}

export interface ValidationMiddlewareTestSuiteResult {
  readonly suiteName: string;
  readonly passed: number;
  readonly failed: number;
  readonly total: number;
  readonly compatibilityIssues: number;
  readonly tests: ValidationMiddlewareTestResult[];
  readonly timestamp: number;
  readonly version: string;
}

export interface ValidationMiddlewareValidator {
  (data: unknown): Result<unknown, ValidationError>;
}

// ============================================================================
// Validation Middleware Test Implementation
// ============================================================================

export function createValidationMiddlewareTestResult(
  testName: string,
  passed: boolean,
  middlewareValidationPassed: boolean,
  typeValidationPassed: boolean,
  compatibilityConfirmed: boolean,
  errors?: string[],
  warnings?: string[]
): ValidationMiddlewareTestResult {
  return {
    testName,
    passed,
    middlewareValidationPassed,
    typeValidationPassed,
    compatibilityConfirmed,
    errors,
    warnings,
    timestamp: Date.now(),
  };
}

export function createValidationMiddlewareTestSuiteResult(
  suiteName: string,
  tests: ValidationMiddlewareTestResult[],
  version: string
): ValidationMiddlewareTestSuiteResult {
  const passed = tests.filter((test) => test.passed).length;
  const failed = tests.filter((test) => !test.passed).length;
  const compatibilityIssues = tests.filter((test) => !test.compatibilityConfirmed).length;

  return {
    suiteName,
    passed,
    failed,
    total: tests.length,
    compatibilityIssues,
    tests,
    timestamp: Date.now(),
    version,
  };
}

// ============================================================================
// Core Validation Middleware Testing Functions
// ============================================================================

export function runValidationMiddlewareTest(
  test: ValidationMiddlewareTest
): ValidationMiddlewareTestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Test middleware validation
  const middlewareResult = test.middlewareValidator(test.testData);
  const middlewareValidationPassed = middlewareResult.success;

  if (!middlewareValidationPassed) {
    errors.push(`Middleware validation failed: ${middlewareResult.error?.message}`);
  }

  // Test type validation
  const typeResult = test.validatedType.validate(test.testData);
  const typeValidationPassed = typeResult.success;

  if (!typeValidationPassed) {
    errors.push(`Type validation failed: ${typeResult.error?.message}`);
  }

  // Check compatibility
  const compatibilityConfirmed = middlewareValidationPassed === typeValidationPassed;

  if (!compatibilityConfirmed) {
    warnings.push('Middleware and type validation results are inconsistent');
  }

  // Determine overall test result
  const expectedSuccess = test.expectedResult === 'success';
  const expectedFailure = test.expectedResult === 'failure';

  let passed = false;

  if (expectedSuccess && middlewareValidationPassed && typeValidationPassed) {
    passed = true;
  } else if (expectedFailure && !middlewareValidationPassed && !typeValidationPassed) {
    passed = true;
  } else if (test.expectedResult === 'partial' && compatibilityConfirmed) {
    passed = true;
  }

  return createValidationMiddlewareTestResult(
    test.testName,
    passed,
    middlewareValidationPassed,
    typeValidationPassed,
    compatibilityConfirmed,
    errors.length > 0 ? errors : [],
    warnings.length > 0 ? warnings : []
  );
}

export function runValidationMiddlewareTestSuite(
  suite: ValidationMiddlewareTestSuite
): ValidationMiddlewareTestSuiteResult {
  const testResults: ValidationMiddlewareTestResult[] = [];

  for (const test of suite.middlewareTests) {
    const result = runValidationMiddlewareTest(test);
    testResults.push(result);
  }

  return createValidationMiddlewareTestSuiteResult(suite.suiteName, testResults, suite.version);
}

// ============================================================================
// Backward Compatibility Testing
// ============================================================================

export interface BackwardCompatibilityTest {
  readonly testName: string;
  readonly description: string;
  readonly currentType: ValidatedType<unknown>;
  readonly legacyType: ValidatedType<unknown>;
  readonly legacyData: unknown[];
  readonly expectedCompatibility: 'full' | 'partial' | 'none';
}

export interface BackwardCompatibilityTestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly dataCompatibility: boolean;
  readonly schemaCompatibility: boolean;
  readonly breakingChanges: string[];
  readonly warnings: string[];
  readonly timestamp: number;
}

export function runBackwardCompatibilityTest(
  test: BackwardCompatibilityTest
): BackwardCompatibilityTestResult {
  const breakingChanges: string[] = [];
  const warnings: string[] = [];

  // Test data compatibility
  let dataCompatibility = true;
  for (const legacyData of test.legacyData) {
    const validationResult = test.currentType.validate(legacyData);
    if (!validationResult.success) {
      dataCompatibility = false;
      breakingChanges.push(`Legacy data validation failed: ${validationResult.error?.message}`);
    }
  }

  // Test schema compatibility
  const schemaCompatibilityResult = validateSchemaCompatibility(
    test.legacyType.schema,
    test.currentType.schema
  );

  if (!schemaCompatibilityResult.success) {
    breakingChanges.push(`Schema compatibility issue: ${schemaCompatibilityResult.error?.message}`);
  }

  const schemaCompatibility = schemaCompatibilityResult.success;

  // Determine overall result
  const expectedFullCompatibility = test.expectedCompatibility === 'full';
  const hasBreakingChanges = breakingChanges.length > 0;

  const passed = expectedFullCompatibility
    ? !hasBreakingChanges && dataCompatibility && schemaCompatibility
    : !hasBreakingChanges;

  return {
    testName: test.testName,
    passed,
    dataCompatibility,
    schemaCompatibility,
    breakingChanges: breakingChanges.length > 0 ? breakingChanges : [],
    warnings: warnings.length > 0 ? warnings : undefined,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Schema Compatibility Validation
// ============================================================================

export function validateSchemaCompatibility(
  legacySchema: z.ZodSchema,
  currentSchema: z.ZodSchema
): Result<boolean, ValidationError> {
  try {
    // This is a simplified compatibility check
    // In a real implementation, this would do a more thorough analysis

    // Check if legacy schema type is compatible with current schema
    const legacyType = getSchemaType(legacySchema);
    const currentType = getSchemaType(currentSchema);

    if (legacyType !== currentType) {
      return {
        success: false,
        error: new ValidationError(
          `Schema type mismatch: legacy ${legacyType} vs current ${currentType}`,
          undefined,
          { legacyType, currentType }
        )
      };
    }

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error: new ValidationError(
        `Schema compatibility validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { legacySchema: legacySchema.description, currentSchema: currentSchema.description }
      )
    };
  }
}

function getSchemaType(schema: z.ZodSchema): string {
  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodObject) return 'object';
  if (schema instanceof z.ZodArray) return 'array';
  return 'unknown';
}

// ============================================================================
// Integration Test Suite
// ============================================================================

export interface CompleteIntegrationTestSuite {
  readonly suiteName: string;
  readonly description: string;
  readonly typeCompatibilityTests: TypeCompatibilityTestSuite;
  readonly middlewareTests: ValidationMiddlewareTestSuite;
  readonly backwardCompatibilityTests: BackwardCompatibilityTest[];
  readonly version: string;
}

export interface CompleteIntegrationTestSuiteResult {
  readonly suiteName: string;
  readonly typeCompatibilityResult: TypeCompatibilityTestSuiteResult;
  readonly middlewareResult: ValidationMiddlewareTestSuiteResult;
  readonly backwardCompatibilityResults: BackwardCompatibilityTestResult[];
  readonly overallPassed: boolean;
  readonly timestamp: number;
  readonly version: string;
}

export function runCompleteIntegrationTestSuite(
  suite: CompleteIntegrationTestSuite
): CompleteIntegrationTestSuiteResult {
  const typeCompatibilityResult = runTypeCompatibilityTestSuite(suite.typeCompatibilityTests);
  const middlewareResult = runValidationMiddlewareTestSuite(suite.middlewareTests);

  const backwardCompatibilityResults: BackwardCompatibilityTestResult[] = [];
  for (const test of suite.backwardCompatibilityTests) {
    const result = runBackwardCompatibilityTest(test);
    backwardCompatibilityResults.push(result);
  }

  const overallPassed =
    typeCompatibilityResult.failed === 0 &&
    middlewareResult.failed === 0 &&
    backwardCompatibilityResults.every(r => r.passed);

  return {
    suiteName: suite.suiteName,
    typeCompatibilityResult,
    middlewareResult,
    backwardCompatibilityResults,
    overallPassed,
    timestamp: Date.now(),
    version: suite.version,
  };
}

// ============================================================================
// Version and Metadata
// ============================================================================

export const VALIDATION_MIDDLEWARE_TESTS_VERSION = '1.0.0' as const;

export const VALIDATION_MIDDLEWARE_TESTS_FEATURES = {
  middlewareIntegrationTesting: true,
  backwardCompatibilityTesting: true,
  schemaCompatibilityValidation: true,
  completeIntegrationTesting: true,
  resultReporting: true,
} as const;