/**
 * INTEGRATION TEST RUNNER
 *
 * Test runner for executing comprehensive integration tests
 * Demonstrates integration with existing validation middleware
 * Following the exemplary patterns from loading.ts and base-types.ts
 */

import { runAllIntegrationTests, formatIntegrationTestResults } from './comprehensive-integration-test';
import { validateMiddlewareMigration } from '../../../../server/middleware/migration-wrapper';

// ============================================================================
// Integration Test Runner
// ============================================================================

export class IntegrationTestRunner {
  private readonly testName: string;
  private readonly description: string;
  private readonly version: string;

  constructor(
    testName: string = 'Comprehensive Integration Tests',
    description: string = 'Complete integration testing suite',
    version: string = '1.0.0'
  ) {
    this.testName = testName;
    this.description = description;
    this.version = version;
  }

  // ============================================================================
  // Main Test Execution
  // ============================================================================

  async runAllTests(): Promise<IntegrationTestRunnerResult> {
    console.log(`🚀 Starting ${this.testName} v${this.version}`);
    console.log(`📋 ${this.description}`);
    console.log('');

    const startTime = Date.now();

    try {
      // Run comprehensive integration tests
      const integrationResults = await runAllIntegrationTests();

      // Test middleware migration validation
      const middlewareMigrationValid = await validateMiddlewareMigration();

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Generate detailed report
      const detailedReport = formatIntegrationTestResults(integrationResults);

      // Create summary
      const overallSuccess =
        integrationResults.completeIntegrationResult.overallPassed &&
        middlewareMigrationValid;

      const summary: IntegrationTestRunnerSummary = {
        testName: this.testName,
        version: this.version,
        timestamp: endTime,
        executionTime,
        overallSuccess,
        middlewareMigrationValid,
        typeCompatibilityPassed: integrationResults.typeCompatibilityResult.failed === 0,
        middlewareTestsPassed: integrationResults.middlewareResult.failed === 0,
        backwardCompatibilityPassed: integrationResults.backwardCompatibilityResults.every(r => r.passed),
        domainPatternValidationPassed: integrationResults.domainPatternValidationResult.failedRules === 0,
      };

      console.log(detailedReport);

      return {
        success: overallSuccess,
        summary,
        detailedReport,
        integrationResults,
        middlewareMigrationValid,
      };

    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.error('❌ Integration test runner failed:', error);

      return {
        success: false,
        summary: {
          testName: this.testName,
          version: this.version,
          timestamp: endTime,
          executionTime,
          overallSuccess: false,
          middlewareMigrationValid: false,
          typeCompatibilityPassed: false,
          middlewareTestsPassed: false,
          backwardCompatibilityPassed: false,
          domainPatternValidationPassed: false,
        },
        detailedReport: `Integration test runner failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        integrationResults: null,
        middlewareMigrationValid: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  // ============================================================================
  // Individual Test Execution Methods
  // ============================================================================

  async runTypeCompatibilityTests(): Promise<IntegrationTestRunnerResult> {
    console.log('🔄 Running Type Compatibility Tests...');

    try {
      const { runTypeCompatibilityTestSuite, TYPE_COMPATIBILITY_TEST_SUITE } = await import('./comprehensive-integration-test');

      const result = runTypeCompatibilityTestSuite(TYPE_COMPATIBILITY_TEST_SUITE);

      return {
        success: result.failed === 0,
        summary: {
          testName: 'Type Compatibility Tests',
          version: this.version,
          timestamp: Date.now(),
          executionTime: 0,
          overallSuccess: result.failed === 0,
          middlewareMigrationValid: false,
          typeCompatibilityPassed: result.failed === 0,
          middlewareTestsPassed: false,
          backwardCompatibilityPassed: false,
          domainPatternValidationPassed: false,
        },
        detailedReport: `Type Compatibility Tests: ${result.passed}/${result.total} passed`,
        integrationResults: null,
        middlewareMigrationValid: false,
      };
    } catch (error) {
      return this.handleTestError('Type Compatibility Tests', error);
    }
  }

  async runMiddlewareTests(): Promise<IntegrationTestRunnerResult> {
    console.log('🔒 Running Validation Middleware Tests...');

    try {
      const { runValidationMiddlewareTestSuite, VALIDATION_MIDDLEWARE_TEST_SUITE } = await import('./comprehensive-integration-test');

      const result = runValidationMiddlewareTestSuite(VALIDATION_MIDDLEWARE_TEST_SUITE);

      return {
        success: result.failed === 0,
        summary: {
          testName: 'Validation Middleware Tests',
          version: this.version,
          timestamp: Date.now(),
          executionTime: 0,
          overallSuccess: result.failed === 0,
          middlewareMigrationValid: false,
          typeCompatibilityPassed: false,
          middlewareTestsPassed: result.failed === 0,
          backwardCompatibilityPassed: false,
          domainPatternValidationPassed: false,
        },
        detailedReport: `Validation Middleware Tests: ${result.passed}/${result.total} passed`,
        integrationResults: null,
        middlewareMigrationValid: false,
      };
    } catch (error) {
      return this.handleTestError('Validation Middleware Tests', error);
    }
  }

  async runBackwardCompatibilityTests(): Promise<IntegrationTestRunnerResult> {
    console.log('🔙 Running Backward Compatibility Tests...');

    try {
      const { BACKWARD_COMPATIBILITY_TESTS, runBackwardCompatibilityTest } = await import('./comprehensive-integration-test');

      const results = BACKWARD_COMPATIBILITY_TESTS.map(test => runBackwardCompatibilityTest(test));
      const passed = results.filter(r => r.passed).length;

      return {
        success: passed === BACKWARD_COMPATIBILITY_TESTS.length,
        summary: {
          testName: 'Backward Compatibility Tests',
          version: this.version,
          timestamp: Date.now(),
          executionTime: 0,
          overallSuccess: passed === BACKWARD_COMPATIBILITY_TESTS.length,
          middlewareMigrationValid: false,
          typeCompatibilityPassed: false,
          middlewareTestsPassed: false,
          backwardCompatibilityPassed: passed === BACKWARD_COMPATIBILITY_TESTS.length,
          domainPatternValidationPassed: false,
        },
        detailedReport: `Backward Compatibility Tests: ${passed}/${BACKWARD_COMPATIBILITY_TESTS.length} passed`,
        integrationResults: null,
        middlewareMigrationValid: false,
      };
    } catch (error) {
      return this.handleTestError('Backward Compatibility Tests', error);
    }
  }

  async runDomainPatternValidation(): Promise<IntegrationTestRunnerResult> {
    console.log('📋 Running Domain Pattern Validation...');

    try {
      const { DOMAIN_TYPES_FOR_PATTERN_VALIDATION, BUILTIN_DOMAIN_TYPE_PATTERN_RULES, validateDomainTypePatterns } = await import('./comprehensive-integration-test');

      const result = validateDomainTypePatterns(
        DOMAIN_TYPES_FOR_PATTERN_VALIDATION,
        BUILTIN_DOMAIN_TYPE_PATTERN_RULES
      );

      return {
        success: result.failedRules === 0,
        summary: {
          testName: 'Domain Pattern Validation',
          version: this.version,
          timestamp: Date.now(),
          executionTime: 0,
          overallSuccess: result.failedRules === 0,
          middlewareMigrationValid: false,
          typeCompatibilityPassed: false,
          middlewareTestsPassed: false,
          backwardCompatibilityPassed: false,
          domainPatternValidationPassed: result.failedRules === 0,
        },
        detailedReport: `Domain Pattern Validation: ${result.passedRules}/${result.totalRules} rules passed`,
        integrationResults: null,
        middlewareMigrationValid: false,
      };
    } catch (error) {
      return this.handleTestError('Domain Pattern Validation', error);
    }
  }

  async testMiddlewareMigration(): Promise<IntegrationTestRunnerResult> {
    console.log('🔄 Testing Middleware Migration...');

    try {
      const middlewareMigrationValid = await validateMiddlewareMigration();

      return {
        success: middlewareMigrationValid,
        summary: {
          testName: 'Middleware Migration Test',
          version: this.version,
          timestamp: Date.now(),
          executionTime: 0,
          overallSuccess: middlewareMigrationValid,
          middlewareMigrationValid,
          typeCompatibilityPassed: false,
          middlewareTestsPassed: false,
          backwardCompatibilityPassed: false,
          domainPatternValidationPassed: false,
        },
        detailedReport: `Middleware Migration: ${middlewareMigrationValid ? '✅ Valid' : '❌ Invalid'}`,
        integrationResults: null,
        middlewareMigrationValid,
      };
    } catch (error) {
      return this.handleTestError('Middleware Migration Test', error);
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleTestError(testName: string, error: unknown): IntegrationTestRunnerResult {
    console.error(`❌ ${testName} failed:`, error);

    return {
      success: false,
      summary: {
        testName,
        version: this.version,
        timestamp: Date.now(),
        executionTime: 0,
        overallSuccess: false,
        middlewareMigrationValid: false,
        typeCompatibilityPassed: false,
        middlewareTestsPassed: false,
        backwardCompatibilityPassed: false,
        domainPatternValidationPassed: false,
      },
      detailedReport: `${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      integrationResults: null,
      middlewareMigrationValid: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }

  // ============================================================================
  // Reporting and Formatting
  // ============================================================================

  formatRunnerSummary(summary: IntegrationTestRunnerSummary): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push(`INTEGRATION TEST RUNNER SUMMARY: ${summary.testName}`);
    lines.push('='.repeat(60));
    lines.push(`Version: ${summary.version}`);
    lines.push(`Timestamp: ${new Date(summary.timestamp).toISOString()}`);
    lines.push(`Execution Time: ${summary.executionTime}ms`);
    lines.push('');

    const overallStatus = summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE';
    lines.push(`Overall Result: ${overallStatus}`);
    lines.push('');

    lines.push('Component Results:');
    lines.push(`  Type Compatibility: ${summary.typeCompatibilityPassed ? '✅' : '❌'}`);
    lines.push(`  Middleware Tests: ${summary.middlewareTestsPassed ? '✅' : '❌'}`);
    lines.push(`  Backward Compatibility: ${summary.backwardCompatibilityPassed ? '✅' : '❌'}`);
    lines.push(`  Domain Pattern Validation: ${summary.domainPatternValidationPassed ? '✅' : '❌'}`);
    lines.push(`  Middleware Migration: ${summary.middlewareMigrationValid ? '✅' : '❌'}`);
    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  // ============================================================================
  // Static Utility Methods
  // ============================================================================

  static async runQuickIntegrationTest(): Promise<IntegrationTestRunnerResult> {
    const runner = new IntegrationTestRunner(
      'Quick Integration Test',
      'Quick test of core integration functionality'
    );

    return runner.runAllTests();
  }

  static async runMiddlewareIntegrationTest(): Promise<IntegrationTestRunnerResult> {
    const runner = new IntegrationTestRunner(
      'Middleware Integration Test',
      'Focused test on middleware integration'
    );

    const result = await runner.testMiddlewareMigration();

    if (result.success) {
      // If middleware migration is valid, run middleware tests
      return runner.runMiddlewareTests();
    }

    return result;
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface IntegrationTestRunnerSummary {
  readonly testName: string;
  readonly version: string;
  readonly timestamp: number;
  readonly executionTime: number;
  readonly overallSuccess: boolean;
  readonly middlewareMigrationValid: boolean;
  readonly typeCompatibilityPassed: boolean;
  readonly middlewareTestsPassed: boolean;
  readonly backwardCompatibilityPassed: boolean;
  readonly domainPatternValidationPassed: boolean;
}

export interface IntegrationTestRunnerResult {
  readonly success: boolean;
  readonly summary: IntegrationTestRunnerSummary;
  readonly detailedReport: string;
  readonly integrationResults: Awaited<ReturnType<typeof runAllIntegrationTests>> | null;
  readonly middlewareMigrationValid: boolean;
  readonly error?: Error;
}

// ============================================================================
// Version and Metadata
// ============================================================================

export const INTEGRATION_TEST_RUNNER_VERSION = '1.0.0' as const;

export const INTEGRATION_TEST_RUNNER_FEATURES = {
  comprehensiveTestExecution: true,
  individualTestExecution: true,
  middlewareIntegrationTesting: true,
  backwardCompatibilityTesting: true,
  domainPatternValidation: true,
  resultFormatting: true,
  errorHandling: true,
  staticUtilityMethods: true,
} as const;