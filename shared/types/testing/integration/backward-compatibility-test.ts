/**
 * BACKWARD COMPATIBILITY TEST IMPLEMENTATION
 *
 * Comprehensive backward compatibility testing
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

import { z } from 'zod';
import { createValidatedType, ValidatedType } from '../../core/validation';
import { Result } from '../../core/errors';
import { BackwardCompatibilityTest, runBackwardCompatibilityTest, BackwardCompatibilityTestResult } from './validation-middleware-tests';

// ============================================================================
// Legacy Type Definitions (for backward compatibility testing)
// ============================================================================

// Legacy Loading State (v1.0)
const LegacyLoadingStateSchema = z.object({
  isLoading: z.boolean(),
  hasError: z.boolean(), // Different field name
  errorMessage: z.string().optional(), // Different field name
  loadingProgress: z.number().optional(), // Different field name
});

export const LegacyLoadingStateType = createValidatedType(
  LegacyLoadingStateSchema,
  'LegacyLoadingState'
);

// Current Loading State (v2.0)
const CurrentLoadingStateSchema = z.object({
  isLoading: z.boolean(),
  hasError: z.boolean(),
  error: z.string().optional(),
  progress: z.number().optional(),
  timestamp: z.number().optional(),
});

export const CurrentLoadingStateType = createValidatedType(
  CurrentLoadingStateSchema,
  'CurrentLoadingState'
);

// ============================================================================
// Backward Compatibility Test Data
// ============================================================================

export const LEGACY_LOADING_STATES: unknown[] = [
  {
    isLoading: true,
    hasError: false,
    loadingProgress: 0.5,
  },
  {
    isLoading: false,
    hasError: true,
    errorMessage: 'Failed to load data',
    loadingProgress: 1.0,
  },
  {
    isLoading: true,
    hasError: false,
    // Missing optional fields
  },
];

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

export const LOADING_STATE_BACKWARD_COMPATIBILITY_TEST: BackwardCompatibilityTest = {
  testName: 'Loading State Backward Compatibility',
  description: 'Test backward compatibility between legacy and current loading state types',
  currentType: CurrentLoadingStateType,
  legacyType: LegacyLoadingStateType,
  legacyData: LEGACY_LOADING_STATES,
  expectedCompatibility: 'partial', // Expect partial compatibility due to field name changes
};

// ============================================================================
// Backward Compatibility Test Runner
// ============================================================================

export class BackwardCompatibilityTestRunner {
  private readonly tests: BackwardCompatibilityTest[];

  constructor(tests: BackwardCompatibilityTest[] = [LOADING_STATE_BACKWARD_COMPATIBILITY_TEST]) {
    this.tests = tests;
  }

  runAllTests(): BackwardCompatibilityTestResult[] {
    console.log('🔙 Running Backward Compatibility Tests...');
    console.log(`Total tests: ${this.tests.length}`);
    console.log('');

    return this.tests.map(test => {
      const result = runBackwardCompatibilityTest(test);

      console.log(`Test: ${test.testName}`);
      console.log(`  Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Data Compatibility: ${result.dataCompatibility ? '✅' : '❌'}`);
      console.log(`  Schema Compatibility: ${result.schemaCompatibility ? '✅' : '❌'}`);

      if (result.breakingChanges.length > 0) {
        console.log(`  Breaking Changes:`);
        result.breakingChanges.forEach(change => console.log(`    - ${change}`));
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log(`  Warnings:`);
        result.warnings.forEach(warning => console.log(`    ⚠️  ${warning}`));
      }

      console.log('');

      return result;
    });
  }

  getSummary(results: BackwardCompatibilityTestResult[]): BackwardCompatibilityTestSummary {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    const dataCompatibilityIssues = results.filter(r => !r.dataCompatibility).length;
    const schemaCompatibilityIssues = results.filter(r => !r.schemaCompatibility).length;

    const allBreakingChanges: string[] = results.flatMap(r => r.breakingChanges);
    const allWarnings: string[] = results.flatMap(r => r.warnings || []);

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      dataCompatibilityIssues,
      schemaCompatibilityIssues,
      totalBreakingChanges: allBreakingChanges.length,
      totalWarnings: allWarnings.length,
      breakingChanges: allBreakingChanges,
      warnings: allWarnings,
      timestamp: Date.now(),
    };
  }

  formatSummary(summary: BackwardCompatibilityTestSummary): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('BACKWARD COMPATIBILITY TEST SUMMARY');
    lines.push('='.repeat(60));
    lines.push(`Total Tests: ${summary.totalTests}`);
    lines.push(`Passed: ${summary.passedTests}`);
    lines.push(`Failed: ${summary.failedTests}`);
    lines.push('');

    lines.push('Compatibility Issues:');
    lines.push(`  Data Compatibility: ${summary.dataCompatibilityIssues}`);
    lines.push(`  Schema Compatibility: ${summary.schemaCompatibilityIssues}`);
    lines.push('');

    lines.push('Breaking Changes:');
    if (summary.breakingChanges.length > 0) {
      summary.breakingChanges.forEach(change => lines.push(`  - ${change}`));
    } else {
      lines.push('  None');
    }

    lines.push('');
    lines.push('Warnings:');
    if (summary.warnings.length > 0) {
      summary.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
    } else {
      lines.push('  None');
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  static async runDefaultTests(): Promise<{
    results: BackwardCompatibilityTestResult[];
    summary: BackwardCompatibilityTestSummary;
    formattedSummary: string;
  }> {
    const runner = new BackwardCompatibilityTestRunner();
    const results = runner.runAllTests();
    const summary = runner.getSummary(results);
    const formattedSummary = runner.formatSummary(summary);

    return { results, summary, formattedSummary };
  }
}

// ============================================================================
// Additional Backward Compatibility Utilities
// ============================================================================

export function createBackwardCompatibilityAdapter<T, U>(
  legacyType: ValidatedType<T>,
  currentType: ValidatedType<U>,
  adapter: (legacyData: T) => U
): BackwardCompatibilityAdapter<T, U> {
  return {
    legacyType,
    currentType,
    adapter,

    adapt(legacyData: T): Result<U, Error> {
      try {
        const adaptedData = this.adapter(legacyData);
        const validationResult = this.currentType.validate(adaptedData);

        if (validationResult.success) {
          return { success: true, data: validationResult.data };
        } else {
          return { success: false, error: validationResult.error };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Adaptation failed')
        };
      }
    },

    adaptMultiple(legacyDataArray: T[]): Result<U[], Error> {
      try {
        const adaptedResults: U[] = [];
        const errors: Error[] = [];

        for (const legacyData of legacyDataArray) {
          const result = this.adapt(legacyData);
          if (result.success) {
            adaptedResults.push(result.data);
          } else {
            errors.push(result.error);
          }
        }

        if (errors.length === 0) {
          return { success: true, data: adaptedResults };
        } else {
          return {
            success: false,
            error: new Error(`Failed to adapt ${errors.length} items: ${errors.map(e => e.message).join(', ')}`)
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Multiple adaptation failed')
        };
      }
    }
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface BackwardCompatibilityTestSummary {
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly dataCompatibilityIssues: number;
  readonly schemaCompatibilityIssues: number;
  readonly totalBreakingChanges: number;
  readonly totalWarnings: number;
  readonly breakingChanges: string[];
  readonly warnings: string[];
  readonly timestamp: number;
}

export interface BackwardCompatibilityAdapter<T, U> {
  readonly legacyType: ValidatedType<T>;
  readonly currentType: ValidatedType<U>;
  readonly adapter: (legacyData: T) => U;

  adapt(legacyData: T): Result<U, Error>;
  adaptMultiple(legacyDataArray: T[]): Result<U[], Error>;
}

// ============================================================================
// Version and Metadata
// ============================================================================

export const BACKWARD_COMPATIBILITY_TEST_VERSION = '1.0.0' as const;

export const BACKWARD_COMPATIBILITY_TEST_FEATURES = {
  backwardCompatibilityTesting: true,
  legacyTypeSupport: true,
  compatibilityAdapters: true,
  breakingChangeDetection: true,
  resultSummarization: true,
  automatedTesting: true,
} as const;