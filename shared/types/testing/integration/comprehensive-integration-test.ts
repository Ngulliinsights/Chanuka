/**
 * COMPREHENSIVE INTEGRATION TEST IMPLEMENTATION
 *
 * Complete implementation demonstrating all integration testing capabilities
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

import { z } from 'zod';
import { createValidatedType } from '../../core/validation';
import { Result, ValidationError } from '../../core/errors';
import {
  TypeCompatibilityTestSuite,
  runTypeCompatibilityTestSuite,
  validateDomainTypePatterns,
  BUILTIN_DOMAIN_TYPE_PATTERN_RULES,
  ValidationMiddlewareTestSuite,
  runValidationMiddlewareTestSuite,
  BackwardCompatibilityTest,
  runBackwardCompatibilityTest,
  CompleteIntegrationTestSuite,
  runCompleteIntegrationTestSuite
} from './index';

// ============================================================================
// Sample Validated Types for Testing
// ============================================================================

// Client-side User type
const ClientUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'guest']),
  clientSpecificField: z.string().optional(),
});

export const ClientUserType = createValidatedType(
  ClientUserSchema,
  'ClientUser'
);

// Server-side User type
const ServerUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'guest']),
  serverSpecificField: z.number().optional(),
  createdAt: z.date(),
});

export const ServerUserType = createValidatedType(
  ServerUserSchema,
  'ServerUser'
);

// Shared User type
const SharedUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'guest']),
  sharedField: z.boolean().optional(),
});

export const SharedUserType = createValidatedType(
  SharedUserSchema,
  'SharedUser'
);

// Legacy User type (for backward compatibility testing)
const LegacyUserSchema = z.object({
  userId: z.string(), // Different field name
  username: z.string(), // Different field name
  emailAddress: z.string(), // Different field name
  userRole: z.string(), // Different field name
});

export const LegacyUserType = createValidatedType(
  LegacyUserSchema,
  'LegacyUser'
);

// ============================================================================
// Sample Middleware Validator
// ============================================================================

export function sampleMiddlewareValidator(data: unknown): Result<unknown, ValidationError> {
  try {
    // Simple middleware validation logic
    if (typeof data === 'object' && data !== null && 'id' in data) {
      return { success: true, data };
    }
    return {
      success: false,
      error: new ValidationError('Invalid data structure for middleware', undefined, { data })
    };
  } catch (error) {
    return {
      success: false,
      error: new ValidationError(
        `Middleware validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { data }
      )
    };
  }
}

// ============================================================================
// Type Compatibility Test Suite
// ============================================================================

export const TYPE_COMPATIBILITY_TEST_SUITE: TypeCompatibilityTestSuite = {
  suiteName: 'User Type Compatibility Tests',
  description: 'Comprehensive tests for user type compatibility across layers',
  version: '1.0.0',
  tests: [
    {
      testName: 'Client-Server-Shared User Compatibility',
      description: 'Test compatibility between client, server, and shared user types',
      clientType: ClientUserType,
      serverType: ServerUserType,
      sharedType: SharedUserType,
      expectedCompatibility: 'partial',
      backwardCompatibilityRequired: true,
    },
    {
      testName: 'Shared Type Consistency',
      description: 'Test that shared types maintain consistency',
      sharedType: SharedUserType,
      expectedCompatibility: 'full',
    },
  ],
};

// ============================================================================
// Validation Middleware Test Suite
// ============================================================================

export const VALIDATION_MIDDLEWARE_TEST_SUITE: ValidationMiddlewareTestSuite = {
  suiteName: 'User Validation Middleware Tests',
  description: 'Tests for validation middleware integration with user types',
  version: '1.0.0',
  middlewareTests: [
    {
      testName: 'Client User Middleware Validation',
      description: 'Test client user type with middleware validation',
      validatedType: ClientUserType,
      middlewareValidator: sampleMiddlewareValidator,
      expectedResult: 'success',
      testData: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      },
    },
    {
      testName: 'Server User Middleware Validation',
      description: 'Test server user type with middleware validation',
      validatedType: ServerUserType,
      middlewareValidator: sampleMiddlewareValidator,
      expectedResult: 'success',
      testData: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
      },
    },
    {
      testName: 'Invalid Data Middleware Validation',
      description: 'Test middleware validation with invalid data',
      validatedType: SharedUserType,
      middlewareValidator: sampleMiddlewareValidator,
      expectedResult: 'failure',
      testData: {
        // Missing required 'id' field
        name: 'Invalid User',
        email: 'invalid@example.com',
      },
    },
  ],
};

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

export const BACKWARD_COMPATIBILITY_TESTS: BackwardCompatibilityTest[] = [
  {
    testName: 'Legacy User Type Compatibility',
    description: 'Test backward compatibility with legacy user types',
    currentType: SharedUserType,
    legacyType: LegacyUserType,
    legacyData: [
      {
        userId: 'legacy-123',
        username: 'Legacy User',
        emailAddress: 'legacy@example.com',
        userRole: 'user',
      },
    ],
    expectedCompatibility: 'none',
  },
];

// ============================================================================
// Domain Type Pattern Validation
// ============================================================================

export const DOMAIN_TYPES_FOR_PATTERN_VALIDATION = {
  ClientUser: ClientUserType,
  ServerUser: ServerUserType,
  SharedUser: SharedUserType,
  LegacyUser: LegacyUserType,
};

// ============================================================================
// Complete Integration Test Suite
// ============================================================================

export const COMPLETE_INTEGRATION_TEST_SUITE: CompleteIntegrationTestSuite = {
  suiteName: 'Complete User Type Integration Tests',
  description: 'Comprehensive integration tests covering all aspects of user type compatibility',
  version: '1.0.0',
  typeCompatibilityTests: TYPE_COMPATIBILITY_TEST_SUITE,
  middlewareTests: VALIDATION_MIDDLEWARE_TEST_SUITE,
  backwardCompatibilityTests: BACKWARD_COMPATIBILITY_TESTS,
};

// ============================================================================
// Test Execution Functions
// ============================================================================

export async function runAllIntegrationTests(): Promise<{
  typeCompatibilityResult: ReturnType<typeof runTypeCompatibilityTestSuite>;
  middlewareResult: ReturnType<typeof runValidationMiddlewareTestSuite>;
  backwardCompatibilityResults: ReturnType<typeof runBackwardCompatibilityTest>[];
  completeIntegrationResult: ReturnType<typeof runCompleteIntegrationTestSuite>;
  domainPatternValidationResult: ReturnType<typeof validateDomainTypePatterns>;
}> {
  // Run type compatibility tests
  const typeCompatibilityResult = runTypeCompatibilityTestSuite(TYPE_COMPATIBILITY_TEST_SUITE);

  // Run middleware tests
  const middlewareResult = runValidationMiddlewareTestSuite(VALIDATION_MIDDLEWARE_TEST_SUITE);

  // Run backward compatibility tests
  const backwardCompatibilityResults = BACKWARD_COMPATIBILITY_TESTS.map(test =>
    runBackwardCompatibilityTest(test)
  );

  // Run complete integration test suite
  const completeIntegrationResult = runCompleteIntegrationTestSuite(COMPLETE_INTEGRATION_TEST_SUITE);

  // Run domain pattern validation
  const domainPatternValidationResult = validateDomainTypePatterns(
    DOMAIN_TYPES_FOR_PATTERN_VALIDATION,
    BUILTIN_DOMAIN_TYPE_PATTERN_RULES
  );

  return {
    typeCompatibilityResult,
    middlewareResult,
    backwardCompatibilityResults,
    completeIntegrationResult,
    domainPatternValidationResult,
  };
}

// ============================================================================
// Test Result Formatting and Reporting
// ============================================================================

export function formatIntegrationTestResults(results: Awaited<ReturnType<typeof runAllIntegrationTests>>): string {
  const reportLines: string[] = [];

  reportLines.push('='.repeat(80));
  reportLines.push('COMPREHENSIVE INTEGRATION TEST RESULTS');
  reportLines.push('='.repeat(80));
  reportLines.push('');

  // Type Compatibility Results
  reportLines.push('🔄 TYPE COMPATIBILITY TESTS');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Suite: ${results.typeCompatibilityResult.suiteName}`);
  reportLines.push(`Total: ${results.typeCompatibilityResult.total}`);
  reportLines.push(`Passed: ${results.typeCompatibilityResult.passed}`);
  reportLines.push(`Failed: ${results.typeCompatibilityResult.failed}`);
  reportLines.push(`Backward Compatibility Issues: ${results.typeCompatibilityResult.backwardCompatibilityIssues}`);
  reportLines.push('');

  // Middleware Results
  reportLines.push('🔒 VALIDATION MIDDLEWARE TESTS');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Suite: ${results.middlewareResult.suiteName}`);
  reportLines.push(`Total: ${results.middlewareResult.total}`);
  reportLines.push(`Passed: ${results.middlewareResult.passed}`);
  reportLines.push(`Failed: ${results.middlewareResult.failed}`);
  reportLines.push(`Compatibility Issues: ${results.middlewareResult.compatibilityIssues}`);
  reportLines.push('');

  // Backward Compatibility Results
  reportLines.push('🔙 BACKWARD COMPATIBILITY TESTS');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Total Tests: ${results.backwardCompatibilityResults.length}`);
  const backwardPassed = results.backwardCompatibilityResults.filter(r => r.passed).length;
  reportLines.push(`Passed: ${backwardPassed}`);
  reportLines.push(`Failed: ${results.backwardCompatibilityResults.length - backwardPassed}`);

  for (const result of results.backwardCompatibilityResults) {
    const status = result.passed ? '✅' : '❌';
    reportLines.push(`  ${status} ${result.testName}`);
    if (result.breakingChanges.length > 0) {
      reportLines.push(`    Breaking Changes: ${result.breakingChanges.join(', ')}`);
    }
  }
  reportLines.push('');

  // Complete Integration Results
  reportLines.push('🎯 COMPLETE INTEGRATION TEST SUITE');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Suite: ${results.completeIntegrationResult.suiteName}`);
  reportLines.push(`Overall Result: ${results.completeIntegrationResult.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  reportLines.push(`Type Compatibility: ${results.completeIntegrationResult.typeCompatibilityResult.passed}/${results.completeIntegrationResult.typeCompatibilityResult.total} passed`);
  reportLines.push(`Middleware Tests: ${results.completeIntegrationResult.middlewareResult.passed}/${results.completeIntegrationResult.middlewareResult.total} passed`);
  reportLines.push(`Backward Compatibility: ${results.completeIntegrationResult.backwardCompatibilityResults.filter(r => r.passed).length}/${results.completeIntegrationResult.backwardCompatibilityResults.length} passed`);
  reportLines.push('');

  // Domain Pattern Validation Results
  reportLines.push('📋 DOMAIN TYPE PATTERN VALIDATION');
  reportLines.push('-'.repeat(40));
  reportLines.push(`Total Types: ${results.domainPatternValidationResult.totalTypes}`);
  reportLines.push(`Total Rules: ${results.domainPatternValidationResult.totalRules}`);
  reportLines.push(`Passed Rules: ${results.domainPatternValidationResult.passedRules}`);
  reportLines.push(`Failed Rules: ${results.domainPatternValidationResult.failedRules}`);
  reportLines.push('');

  for (const typeResult of results.domainPatternValidationResult.results) {
    const status = typeResult.passed ? '✅' : '❌';
    reportLines.push(`  ${status} ${typeResult.typeName}`);

    for (const ruleResult of typeResult.ruleResults) {
      const ruleStatus = ruleResult.passed ? '✓' : '✗';
      reportLines.push(`    ${ruleStatus} ${ruleResult.message}`);
    }
  }

  reportLines.push('');
  reportLines.push('='.repeat(80));
  reportLines.push('INTEGRATION TESTING COMPLETE');
  reportLines.push('='.repeat(80));

  return reportLines.join('\n');
}

// ============================================================================
// Version and Metadata
// ============================================================================

export const COMPREHENSIVE_INTEGRATION_TEST_VERSION = '1.0.0' as const;

export const COMPREHENSIVE_INTEGRATION_TEST_FEATURES = {
  typeCompatibilityTesting: true,
  validationMiddlewareTesting: true,
  backwardCompatibilityTesting: true,
  domainPatternValidation: true,
  completeIntegrationTesting: true,
  resultFormatting: true,
  automatedTestExecution: true,
} as const;