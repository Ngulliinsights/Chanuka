/**
 * System Validation Module - Validators for architecture and migrations
 * 
 * This module consolidates system-level validation functionality:
 * - Import validation: Ensures all critical modules are available
 * - Migration validation: Verifies security, error handling, and compatibility
 * - Architecture validation: Checks service registration and design patterns
 * 
 * Migrated from: client/src/utils/testing.ts
 * Usage: Import for CI/CD validation scripts, pre-deployment checks, or manual validation
 * 
 * Examples:
 *   // Check if migration is complete
 *   const validator = new MigrationValidator();
 *   const results = await validator.runValidation();
 *   
 *   // Validate architecture design patterns
 *   const archResult = await ArchitectureValidator.validate();
 *   if (!archResult.isValid) {
 *     console.error('Architecture issues found:', archResult.errors);
 *   }
 */

// Note: These validators are designed to work with the application's logger,
// but they can be used in Node.js contexts (e.g., CI/CD) where these modules
// might not be available. Error handling is built in for graceful degradation.

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the result of a single validation test.
 * Each test checks one specific aspect of the system.
 */
export interface ValidationResult {
  category: string;    // Grouping category (e.g., "Security", "Imports")
  test: string;        // Specific test name
  passed: boolean;     // Whether the test passed
  message: string;     // Descriptive message about the result
}

/**
 * Results from comprehensive architecture validation.
 * Includes overall validity, specific issues, and a numeric score.
 */
export interface ArchitectureValidationResult {
  isValid: boolean;      // True if no critical errors found
  errors: string[];      // Critical issues that must be fixed
  warnings: string[];    // Non-critical issues to be aware of
  score: number;         // Overall health score (0-100)
}

/**
 * Summary statistics for a collection of validation results.
 * Useful for quickly understanding test outcomes.
 */
export interface ValidationSummary {
  passed: number;        // Number of tests that passed
  total: number;         // Total number of tests run
  passRate: number;      // Percentage of tests that passed
  results: ValidationResult[];  // All individual test results
}

// Safe logger helper - uses console if logger unavailable
function safeLog(type: 'info' | 'error' | 'warn', message: string, meta?: unknown) {
  try {
    const logger = require('../../../client/src/utils/logger').logger;
    if (logger && typeof logger[type] === 'function') {
      logger[type](message, meta);
      return;
    }
  } catch (e) {
    // Logger not available, fall through to console
  }
  
  const consoleMethod = type === 'info' ? 'log' : type;
  console[consoleMethod as 'log' | 'error' | 'warn'](message, meta);
}

// ============================================================================
// IMPORT VALIDATION
// ============================================================================

/**
 * Validates that all critical module imports are working correctly.
 * This is the first line of defense in ensuring the application can start.
 */
export class ImportValidator {
  /**
   * Tests all critical imports to ensure they're available and functional.
   * Returns an array of results showing which imports succeeded or failed.
   */
  static validateImports(): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Test logger import - critical for debugging and monitoring
    try {
      const { logger } = require('../../../client/src/utils/logger');
      if (typeof logger?.info === 'function') {
        results.push({
          category: 'Imports',
          test: 'Logger import',
          passed: true,
          message: 'Logger import successful'
        });
      } else {
        results.push({
          category: 'Imports',
          test: 'Logger import',
          passed: false,
          message: 'Logger methods not available'
        });
      }
    } catch (error) {
      results.push({
        category: 'Imports',
        test: 'Logger import',
        passed: false,
        message: `Logger import failed: ${error}`
      });
    }

    // Test token manager import - critical for authentication
    try {
      const { tokenManager } = require('../../../client/src/utils/storage');
      if (typeof tokenManager?.isTokenValid === 'function') {
        results.push({
          category: 'Imports',
          test: 'Token manager import',
          passed: true,
          message: 'Token manager import successful'
        });
      } else {
        results.push({
          category: 'Imports',
          test: 'Token manager import',
          passed: false,
          message: 'Token manager methods not available'
        });
      }
    } catch (error) {
      results.push({
        category: 'Imports',
        test: 'Token manager import',
        passed: false,
        message: `Token manager import failed: ${error}`
      });
    }

    // Test session manager import - critical for user sessions
    try {
      const { sessionManager } = require('../../../client/src/utils/storage');
      if (typeof sessionManager?.isSessionValid === 'function') {
        results.push({
          category: 'Imports',
          test: 'Session manager import',
          passed: true,
          message: 'Session manager import successful'
        });
      } else {
        results.push({
          category: 'Imports',
          test: 'Session manager import',
          passed: false,
          message: 'Session manager methods not available'
        });
      }
    } catch (error) {
      results.push({
        category: 'Imports',
        test: 'Session manager import',
        passed: false,
        message: `Session manager import failed: ${error}`
      });
    }

    return results;
  }
}

// ============================================================================
// MIGRATION VALIDATION
// ============================================================================

/**
 * Validates that migrations from old systems to new architecture are complete.
 * This ensures security improvements, error handling, and compatibility are in place.
 */
export class MigrationValidator {
  private results: ValidationResult[] = [];

  /**
   * Helper method to record a validation result and log it appropriately.
   * Keeps all result tracking and logging in one place for consistency.
   */
  private addResult(category: string, test: string, passed: boolean, message: string): void {
    this.results.push({ category, test, passed, message });

    if (passed) {
      safeLog('info', `✅ ${category}: ${test}`, { component: 'MigrationValidator' });
    } else {
      safeLog('error', `❌ ${category}: ${test} - ${message}`, { component: 'MigrationValidator' });
    }
  }

  /**
   * Validates security improvements from migration.
   * Ensures tokens aren't stored insecurely and secure APIs are available.
   */
  validateSecurity(): void {
    const category = 'Security';

    // Test 1: Ensure no localStorage token access (security anti-pattern)
    try {
      const hasLocalStorageTokens = typeof localStorage !== 'undefined' && (
        localStorage.getItem('token') !== null ||
        localStorage.getItem('auth_token') !== null ||
        localStorage.getItem('access_token') !== null
      );

      this.addResult(
        category,
        'No localStorage token storage',
        !hasLocalStorageTokens,
        hasLocalStorageTokens ? 'Found tokens in localStorage' : 'No tokens found in localStorage'
      );
    } catch (error) {
      this.addResult(category, 'localStorage access check', false, 'Failed to check localStorage');
    }

    // Test 2: Verify secure API exists and is functional
    try {
      const { authenticatedApi } = require('../../../client/src/utils/api');
      const { safeApi: secureApi } = require('../../../client/src/utils/api');

      const hasSecureApi = typeof authenticatedApi?.get === 'function' &&
        typeof secureApi?.safeGet === 'function';

      this.addResult(
        category,
        'Secure API availability',
        hasSecureApi,
        hasSecureApi ? 'Secure API methods available' : 'Secure API methods missing'
      );
    } catch (error) {
      this.addResult(category, 'Secure API check', false, 'Failed to verify secure API');
    }

    // Test 3: Verify secure token manager with proper methods
    try {
      const { tokenManager } = require('../../../client/src/utils/storage');
      const hasSecureTokenManager = typeof tokenManager?.isTokenValid === 'function' &&
        typeof tokenManager?.getAccessToken === 'function';

      this.addResult(
        category,
        'Secure token manager',
        hasSecureTokenManager,
        hasSecureTokenManager ? 'Secure token manager available' : 'Secure token manager missing'
      );
    } catch (error) {
      this.addResult(category, 'Token manager check', false, 'Failed to verify token manager');
    }
  }

  /**
   * Validates error handling infrastructure.
   * Ensures unified error handling and proper error class hierarchy exist.
   */
  async validateErrorHandling(): Promise<void> {
    const category = 'Error Handling';

    // Test 1: Verify unified error handler singleton
    try {
      const { UnifiedErrorHandler } = require('../../../client/src/core/error');
      const errorHandler = UnifiedErrorHandler?.getInstance?.();
      const hasErrorHandler = typeof errorHandler?.handleError === 'function' &&
        typeof errorHandler?.getRecentErrors === 'function';

      this.addResult(
        category,
        'Unified error handler',
        hasErrorHandler,
        hasErrorHandler ? 'Error handler available' : 'Error handler missing'
      );
    } catch (error) {
      this.addResult(category, 'Error handler check', false, 'Failed to verify error handler');
    }

    // Test 2: Verify error classes work correctly
    try {
      const { BaseError, ErrorDomain, ErrorSeverity } = require('../../../client/src/core/error');

      const testError = new BaseError('Test error', {
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW
      });

      const hasErrorClasses = testError instanceof BaseError &&
        testError.domain === ErrorDomain.SYSTEM;

      this.addResult(
        category,
        'Error classes',
        hasErrorClasses,
        hasErrorClasses ? 'Error classes working' : 'Error classes not working'
      );
    } catch (error) {
      this.addResult(category, 'Error classes check', false, 'Failed to verify error classes');
    }
  }

  /**
   * Validates asset loading infrastructure.
   * Ensures proper asset management and loading stats are available.
   */
  validateAssetLoading(): void {
    const category = 'Asset Loading';

    // Test 1: Verify asset loading manager with required methods
    try {
      const { assetLoadingManager } = require('../../../client/src/utils/assets');
      const hasAssetManager = typeof assetLoadingManager?.loadAsset === 'function' &&
        typeof assetLoadingManager?.getLoadingStats === 'function';

      this.addResult(
        category,
        'Asset loading manager',
        hasAssetManager,
        hasAssetManager ? 'Asset manager available' : 'Asset manager missing'
      );
    } catch (error) {
      this.addResult(category, 'Asset manager check', false, 'Failed to verify asset manager');
    }

    // Test 2: Verify asset loader functionality (duplicate check serves as redundancy)
    try {
      const { assetLoadingManager } = require('../../../client/src/utils/assets');
      const hasAssetLoader = typeof assetLoadingManager?.loadAsset === 'function' &&
        typeof assetLoadingManager?.getLoadingStats === 'function';

      this.addResult(
        category,
        'Asset loader',
        hasAssetLoader,
        hasAssetLoader ? 'Asset loader available' : 'Asset loader missing'
      );
    } catch (error) {
      this.addResult(category, 'Asset loader check', false, 'Failed to verify asset loader');
    }
  }

  /**
   * Validates logger infrastructure.
   * Ensures all logging methods exist and work correctly.
   */
  validateLogger(): void {
    const category = 'Logger';

    // Test 1: Verify all required logger methods exist
    try {
      const { logger } = require('../../../client/src/utils/logger');
      const hasLoggerMethods = typeof logger?.debug === 'function' &&
        typeof logger?.info === 'function' &&
        typeof logger?.warn === 'function' &&
        typeof logger?.error === 'function';

      this.addResult(
        category,
        'Logger methods',
        hasLoggerMethods,
        hasLoggerMethods ? 'Logger methods available' : 'Logger methods missing'
      );
    } catch (error) {
      this.addResult(category, 'Logger methods check', false, 'Failed to verify logger methods');
    }

    // Test 2: Test logger actually works by attempting to log
    try {
      const { logger } = require('../../../client/src/utils/logger');
      logger?.info('Migration validation test', { component: 'MigrationValidator' });

      this.addResult(
        category,
        'Logger functionality',
        true,
        'Logger working correctly'
      );
    } catch (error) {
      this.addResult(category, 'Logger functionality check', false, 'Logger not working');
    }
  }

  /**
   * Validates backward compatibility with old systems.
   * Ensures new architecture doesn't break existing functionality.
   */
  validateBackwardCompatibility(): void {
    const category = 'Backward Compatibility';

    // Test 1: Verify API compatibility with both old and new patterns
    try {
      const { authenticatedApi } = require('../../../client/src/utils/api');
      const { safeApi: secureApi } = require('../../../client/src/utils/api');

      const apiCompatible = typeof authenticatedApi?.get === 'function' &&
        typeof secureApi?.safeGet === 'function';

      this.addResult(
        category,
        'API compatibility',
        apiCompatible,
        apiCompatible ? 'API imports compatible' : 'API imports not compatible'
      );
    } catch (error) {
      this.addResult(category, 'API compatibility check', false, 'Failed to verify API compatibility');
    }

    // Test 2: Verify error handling compatibility
    try {
      const { BaseError, ErrorDomain, ErrorSeverity } = require('../../../client/src/core/error');

      const errorCompatible = typeof BaseError === 'function' &&
        typeof ErrorDomain === 'object' &&
        typeof ErrorSeverity === 'object';

      this.addResult(
        category,
        'Error handling compatibility',
        errorCompatible,
        errorCompatible ? 'Error handling compatible' : 'Error handling not compatible'
      );
    } catch (error) {
      this.addResult(category, 'Error compatibility check', false, 'Failed to verify error compatibility');
    }
  }

  /**
   * Runs all validation tests and returns comprehensive results.
   * This is the main entry point for migration validation.
   */
  async runValidation(): Promise<ValidationResult[]> {
    safeLog('info', 'Starting migration validation...', { component: 'MigrationValidator' });

    // Run all validation categories
    this.validateSecurity();
    await this.validateErrorHandling();
    this.validateAssetLoading();
    this.validateLogger();
    this.validateBackwardCompatibility();

    // Calculate and log summary statistics
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total) * 100;

    safeLog(
      'info',
      `Migration validation complete: ${passed}/${total} tests passed (${passRate.toFixed(1)}%)`,
      { component: 'MigrationValidator', passed, total, passRate }
    );

    return this.results;
  }

  /**
   * Returns a summary of validation results for easy consumption.
   * Useful for displaying results in UI or generating reports.
   */
  getSummary(): ValidationSummary {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total) * 100;

    return { passed, total, passRate, results: this.results };
  }
}

// ============================================================================
// ARCHITECTURE VALIDATION
// ============================================================================

/**
 * Validates the overall architecture and design patterns.
 * This goes beyond migration to check if the system follows best practices.
 */
export class ArchitectureValidator {
  /**
   * Performs comprehensive architecture validation.
   * Returns detailed results including errors, warnings, and an overall score.
   */
  static async validate(): Promise<ArchitectureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100; // Start with perfect score and deduct for issues

    try {
      // Check service registration and availability
      const serviceCheck = await this.validateServices();
      errors.push(...serviceCheck.errors);
      warnings.push(...serviceCheck.warnings);
      score -= serviceCheck.penalty;

      // Check type consistency across the codebase
      const typeCheck = await this.validateTypes();
      errors.push(...typeCheck.errors);
      warnings.push(...typeCheck.warnings);
      score -= typeCheck.penalty;

      // Check separation of concerns design pattern
      const separationCheck = this.validateSeparationOfConcerns();
      errors.push(...separationCheck.errors);
      warnings.push(...separationCheck.warnings);
      score -= separationCheck.penalty;

      const isValid = errors.length === 0;

      safeLog('info', 'Architecture validation completed', {
        component: 'ArchitectureValidator',
        isValid,
        score,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid,
        errors,
        warnings,
        score: Math.max(0, score) // Ensure score doesn't go below 0
      };
    } catch (error) {
      safeLog('error', 'Architecture validation failed', {
        component: 'ArchitectureValidator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validates that all required services are registered and can be instantiated.
   * Services are a core architectural pattern for dependency injection.
   */
  private static async validateServices(): Promise<{
    errors: string[];
    warnings: string[];
    penalty: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    const requiredServices = [
      'stateManagementService',
      'billTrackingService',
      'webSocketService'
    ];

    try {
      // Dynamically import the service locator to avoid circular dependencies
      const { globalServiceLocator } = require('../../../client/src/core/api/registry');

      for (const serviceName of requiredServices) {
        if (!globalServiceLocator?.hasService?.(serviceName)) {
          errors.push(`Required service '${serviceName}' is not registered`);
          penalty += 20; // Major issue - missing service
        } else {
          try {
            const service = await globalServiceLocator.getService(serviceName);
            if (!service) {
              errors.push(`Service '${serviceName}' is registered but cannot be instantiated`);
              penalty += 15; // Serious issue - registration exists but broken
            }
          } catch (error) {
            errors.push(`Service '${serviceName}' instantiation failed: ${error}`);
            penalty += 15;
          }
        }
      }
    } catch (importError) {
      warnings.push('Service locator not available - skipping service validation');
      penalty += 5; // Minor issue - validation couldn't run
    }

    return { errors, warnings, penalty };
  }

  /**
   * Validates that standardized types are available and consistent.
   * Type safety is crucial for maintaining code quality.
   */
  private static async validateTypes(): Promise<{
    errors: string[];
    warnings: string[];
    penalty: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    try {
      // Check if standardized types are available
      const apiTypes = await Promise.resolve().then(() => {
        try {
          return require('../../../client/src/types/api');
        } catch {
          return null;
        }
      });

      const requiredTypes = [
        'BillUpdate',
        'BillUpdateData',
        'WebSocketSubscription',
        'WebSocketNotification',
        'BillTrackingPreferences'
      ];

      if (apiTypes) {
        for (const typeName of requiredTypes) {
          if (!(typeName in apiTypes)) {
            errors.push(`Required type '${typeName}' not found in standardized types`);
            penalty += 10; // Moderate issue - missing type definition
          }
        }
      } else {
        warnings.push('Standardized types not available - skipping type validation');
        penalty += 5; // Minor issue - validation couldn't run
      }
    } catch (error) {
      errors.push('Could not load standardized types');
      penalty += 20; // Major issue - type system broken
    }

    return { errors, warnings, penalty };
  }

  /**
   * Validates separation of concerns design pattern.
   * Ensures components don't bypass service layer to access stores directly.
   */
  private static validateSeparationOfConcerns(): {
    errors: string[];
    warnings: string[];
    penalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Check for direct store imports in components (anti-pattern)
    if (typeof window !== 'undefined') {
      const globalStore = (window as Window & { store?: unknown }).store;
      if (globalStore) {
        warnings.push('Global store access detected - ensure components use services');
        penalty += 5; // Minor issue - potential architectural smell
      }
    }

    return { errors, warnings, penalty };
  }

  /**
   * Generates a human-readable report of architecture validation results.
   * Useful for documentation or presenting to stakeholders.
   */
  static async generateReport(): Promise<string> {
    const result = await this.validate();

    let report = '# Architecture Validation Report\n\n';

    report += `**Overall Score**: ${result.score}/100\n`;
    report += `**Status**: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    if (result.errors.length > 0) {
      report += '## ❌ Errors\n\n';
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    return report;
  }
}
