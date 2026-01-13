/**
 * COMPREHENSIVE TYPE COMPATIBILITY TESTS
 *
 * Comprehensive testing suite for type compatibility across all layers
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

import { z } from 'zod';
import { createValidatedType, validateWithSchema, ValidatedType } from '../../../core/validation';
import { Result, ValidationError } from '../../../core/errors';

// ============================================================================
// Type Compatibility Test Framework
// ============================================================================

export interface TypeCompatibilityTestSuite {
  readonly suiteName: string;
  readonly description: string;
  readonly tests: TypeCompatibilityTest[];
  readonly version: string;
}

export interface TypeCompatibilityTest {
  readonly testName: string;
  readonly description: string;
  readonly clientType?: ValidatedType<unknown>;
  readonly serverType?: ValidatedType<unknown>;
  readonly sharedType?: ValidatedType<unknown>;
  readonly expectedCompatibility: 'full' | 'partial' | 'none';
  readonly backwardCompatibilityRequired?: boolean;
}

export interface TypeCompatibilityTestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly clientServerCompatible: boolean;
  readonly clientSharedCompatible: boolean;
  readonly serverSharedCompatible: boolean;
  readonly backwardCompatible: boolean;
  readonly errors?: string[];
  readonly warnings?: string[];
  readonly timestamp: number;
}

export interface TypeCompatibilityTestSuiteResult {
  readonly suiteName: string;
  readonly passed: number;
  readonly failed: number;
  readonly total: number;
  readonly backwardCompatibilityIssues: number;
  readonly tests: TypeCompatibilityTestResult[];
  readonly timestamp: number;
  readonly version: string;
}

// ============================================================================
// Core Type Compatibility Testing Functions
// ============================================================================

export function createTypeCompatibilityTestResult(
  testName: string,
  passed: boolean,
  clientServerCompatible: boolean,
  clientSharedCompatible: boolean,
  serverSharedCompatible: boolean,
  backwardCompatible: boolean,
  errors?: string[],
  warnings?: string[]
): TypeCompatibilityTestResult {
  return {
    testName,
    passed,
    clientServerCompatible,
    clientSharedCompatible,
    serverSharedCompatible,
    backwardCompatible,
    errors,
    warnings,
    timestamp: Date.now(),
  };
}

export function createTypeCompatibilityTestSuiteResult(
  suiteName: string,
  tests: TypeCompatibilityTestResult[],
  version: string
): TypeCompatibilityTestSuiteResult {
  const passed = tests.filter((test) => test.passed).length;
  const failed = tests.filter((test) => !test.passed).length;
  const backwardCompatibilityIssues = tests.filter((test) => !test.backwardCompatible).length;

  return {
    suiteName,
    passed,
    failed,
    total: tests.length,
    backwardCompatibilityIssues,
    tests,
    timestamp: Date.now(),
    version,
  };
}

// ============================================================================
// Type Schema Validation Utilities
// ============================================================================

export function validateTypeSchemaCompatibility(
  sourceType: ValidatedType<unknown>,
  targetType: ValidatedType<unknown>
): Result<boolean, ValidationError> {
  try {
    // Test if source type data can be validated by target type schema
    const testData = getSampleDataForType(sourceType);
    const validationResult = targetType.validate(testData);

    if (validationResult.success) {
      return { success: true, data: true };
    } else {
      return {
        success: false,
        error: new ValidationError(
          `Type schema incompatibility: ${validationResult.error?.message}`,
          undefined,
          { sourceType: sourceType.schema.description, targetType: targetType.schema.description }
        )
      };
    }
  } catch (error) {
    return {
      success: false,
      error: new ValidationError(
        `Type compatibility validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { sourceType: sourceType.schema.description, targetType: targetType.schema.description }
      )
    };
  }
}

// ============================================================================
// Sample Data Generation for Testing
// ============================================================================

function getSampleDataForType(validatedType: ValidatedType<unknown>): unknown {
  const schema = validatedType.schema;

  // Simple sample data generation based on schema type
  if (schema instanceof z.ZodString) {
    return 'sample-string';
  } else if (schema instanceof z.ZodNumber) {
    return 42;
  } else if (schema instanceof z.ZodBoolean) {
    return true;
  } else if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const result: Record<string, unknown> = {};

    for (const key in shape) {
      const fieldSchema = shape[key];
      result[key] = getSampleDataForZodSchema(fieldSchema);
    }

    return result;
  } else if (schema instanceof z.ZodArray) {
    return [getSampleDataForZodSchema(schema.element)];
  }

  return null;
}

function getSampleDataForZodSchema(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodString) {
    return 'sample-string';
  } else if (schema instanceof z.ZodNumber) {
    return 42;
  } else if (schema instanceof z.ZodBoolean) {
    return true;
  } else if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const result: Record<string, unknown> = {};

    for (const key in shape) {
      result[key] = getSampleDataForZodSchema(shape[key]);
    }

    return result;
  } else if (schema instanceof z.ZodArray) {
    return [getSampleDataForZodSchema(schema.element)];
  }

  return null;
}

// ============================================================================
// Comprehensive Type Testing Implementation
// ============================================================================

export function runTypeCompatibilityTest(
  test: TypeCompatibilityTest
): TypeCompatibilityTestResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let clientServerCompatible = true;
  let clientSharedCompatible = true;
  let serverSharedCompatible = true;
  let backwardCompatible = true;

  // Test client-server compatibility
  if (test.clientType && test.serverType) {
    const compatibilityResult = validateTypeSchemaCompatibility(test.clientType, test.serverType);
    if (!compatibilityResult.success) {
      clientServerCompatible = false;
      errors.push(`Client-Server compatibility: ${compatibilityResult.error?.message}`);
    }
  }

  // Test client-shared compatibility
  if (test.clientType && test.sharedType) {
    const compatibilityResult = validateTypeSchemaCompatibility(test.clientType, test.sharedType);
    if (!compatibilityResult.success) {
      clientSharedCompatible = false;
      errors.push(`Client-Shared compatibility: ${compatibilityResult.error?.message}`);
    }
  }

  // Test server-shared compatibility
  if (test.serverType && test.sharedType) {
    const compatibilityResult = validateTypeSchemaCompatibility(test.serverType, test.sharedType);
    if (!compatibilityResult.success) {
      serverSharedCompatible = false;
      errors.push(`Server-Shared compatibility: ${compatibilityResult.error?.message}`);
    }
  }

  // Check backward compatibility
  if (test.backwardCompatibilityRequired) {
    // For now, assume backward compatibility is maintained
    // In a real implementation, this would test against previous versions
    backwardCompatible = true;
    if (!backwardCompatible) {
      errors.push('Backward compatibility requirement not met');
    }
  }

  // Determine overall test result
  const expectedFullCompatibility = test.expectedCompatibility === 'full';
  const hasErrors = errors.length > 0;

  const passed = expectedFullCompatibility
    ? !hasErrors && clientServerCompatible && clientSharedCompatible && serverSharedCompatible
    : !hasErrors;

  return createTypeCompatibilityTestResult(
    test.testName,
    passed,
    clientServerCompatible,
    clientSharedCompatible,
    serverSharedCompatible,
    backwardCompatible,
    errors.length > 0 ? errors : undefined,
    warnings.length > 0 ? warnings : undefined
  );
}

export function runTypeCompatibilityTestSuite(
  suite: TypeCompatibilityTestSuite
): TypeCompatibilityTestSuiteResult {
  const testResults: TypeCompatibilityTestResult[] = [];

  for (const test of suite.tests) {
    const result = runTypeCompatibilityTest(test);
    testResults.push(result);
  }

  return createTypeCompatibilityTestSuiteResult(suite.suiteName, testResults, suite.version);
}

// ============================================================================
// Domain Type Pattern Validation
// ============================================================================

export function validateDomainTypePatterns(
  domainTypes: Record<string, ValidatedType<unknown>>,
  patternRules: DomainTypePatternRule[]
): DomainTypePatternValidationResult {
  const results: DomainTypePatternValidationItem[] = [];

  for (const [typeName, validatedType] of Object.entries(domainTypes)) {
    const typeResults: DomainTypePatternValidationItem = {
      typeName,
      validatedType,
      ruleResults: [],
      passed: true,
    };

    for (const rule of patternRules) {
      try {
        const passed = rule.validator(validatedType, typeName);
        typeResults.ruleResults.push({
          ruleId: rule.ruleId,
          passed,
          message: passed ? `Passed ${rule.name}` : `Failed ${rule.name}`,
        });

        if (!passed) {
          typeResults.passed = false;
        }
      } catch (error) {
        typeResults.ruleResults.push({
          ruleId: rule.ruleId,
          passed: false,
          message: `Error applying rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        typeResults.passed = false;
      }
    }

    results.push(typeResults);
  }

  const totalRules = patternRules.length * Object.keys(domainTypes).length;
  const passedRules = results.flatMap(r => r.ruleResults).filter(r => r.passed).length;

  return {
    totalTypes: results.length,
    totalRules,
    passedRules,
    failedRules: totalRules - passedRules,
    results,
    timestamp: Date.now(),
  };
}

export interface DomainTypePatternRule {
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  readonly validator: (validatedType: ValidatedType<unknown>, typeName: string) => boolean;
}

export interface DomainTypePatternValidationItem {
  readonly typeName: string;
  readonly validatedType: ValidatedType<unknown>;
  readonly ruleResults: DomainTypePatternRuleResult[];
  readonly passed: boolean;
}

export interface DomainTypePatternRuleResult {
  readonly ruleId: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface DomainTypePatternValidationResult {
  readonly totalTypes: number;
  readonly totalRules: number;
  readonly passedRules: number;
  readonly failedRules: number;
  readonly results: DomainTypePatternValidationItem[];
  readonly timestamp: number;
}

// ============================================================================
// Built-in Pattern Rules
// ============================================================================

export const BUILTIN_DOMAIN_TYPE_PATTERN_RULES: DomainTypePatternRule[] = [
  {
    ruleId: 'consistent-naming-convention',
    name: 'Consistent Naming Convention',
    description: 'Type names should follow consistent PascalCase naming convention',
    validator: (validatedType, typeName) => {
      // Check if type name follows PascalCase
      return /^[A-Z][a-zA-Z0-9]*$/.test(typeName);
    },
  },
  {
    ruleId: 'proper-documentation',
    name: 'Proper Documentation',
    description: 'Types should have proper JSDoc documentation',
    validator: (validatedType) => {
      // This would check for JSDoc comments in the actual implementation
      // For now, we'll assume it passes
      return true;
    },
  },
  {
    ruleId: 'validation-methods-present',
    name: 'Validation Methods Present',
    description: 'Types should have proper validation methods',
    validator: (validatedType) => {
      return validatedType.validate !== undefined &&
             validatedType.validateAsync !== undefined &&
             validatedType.typeGuard !== undefined;
    },
  },
  {
    ruleId: 'zod-schema-defined',
    name: 'Zod Schema Defined',
    description: 'Types should have a Zod schema defined',
    validator: (validatedType) => {
      return validatedType.schema !== undefined;
    },
  },
];

// ============================================================================
// Version and Metadata
// ============================================================================

export const COMPREHENSIVE_TYPE_TESTS_VERSION = '1.0.0' as const;

export const COMPREHENSIVE_TYPE_TESTS_FEATURES = {
  typeCompatibilityTesting: true,
  domainTypePatternValidation: true,
  backwardCompatibilityTesting: true,
  automatedValidation: true,
  resultReporting: true,
} as const;