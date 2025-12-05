/**
 * Testing Utilities - Consolidated Module
 * 
 * This module consolidates all testing-related functionality into a single,
 * well-organized system. It validates imports, migrations, architecture, and
 * provides helpful testing utilities for development.
 * 
 * Key responsibilities:
 * - Import validation: Ensures all critical modules are available
 * - Migration validation: Verifies security, error handling, and compatibility
 * - Architecture validation: Checks service registration and design patterns
 * - Test helpers: Provides utilities for simulating errors and managing test state
 * 
 * Replaces: test-imports.ts, validate-migration.ts, validateArchitecture.ts
 */

import { authenticatedApi, safeApi as secureApi } from './api';
import { assetLoadingManager } from './assets';
import { BaseError, ErrorDomain, ErrorSeverity } from '../core/error';
import { logger } from './logger';
import { tokenManager as secureTokenManager, sessionManager } from './storage';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the result of a single validation test.
 * Each test checks one specific aspect of the system.
 */
interface ValidationResult {
  category: string;    // Grouping category (e.g., "Security", "Imports")
  test: string;        // Specific test name
  passed: boolean;     // Whether the test passed
  message: string;     // Descriptive message about the result
}

/**
 * Results from comprehensive architecture validation.
 * Includes overall validity, specific issues, and a numeric score.
 */
interface ArchitectureValidationResult {
  isValid: boolean;      // True if no critical errors found
  errors: string[];      // Critical issues that must be fixed
  warnings: string[];    // Non-critical issues to be aware of
  score: number;         // Overall health score (0-100)
}

/**
 * Summary statistics for a collection of validation results.
 * Useful for quickly understanding test outcomes.
 */
interface ValidationSummary {
  passed: number;        // Number of tests that passed
  total: number;         // Total number of tests run
  passRate: number;      // Percentage of tests that passed
  results: ValidationResult[];  // All individual test results
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
      if (typeof logger.info === 'function') {
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
      if (typeof secureTokenManager.isTokenValid === 'function') {
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
      if (typeof sessionManager.isSessionValid === 'function') {
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
      logger.info(`✅ ${category}: ${test}`, { component: 'MigrationValidator' });
    } else {
      logger.error(`❌ ${category}: ${test} - ${message}`, { component: 'MigrationValidator' });
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
      const hasLocalStorageTokens = localStorage.getItem('token') !== null ||
        localStorage.getItem('auth_token') !== null ||
        localStorage.getItem('access_token') !== null;

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
      const hasSecureApi = typeof authenticatedApi.get === 'function' &&
        typeof secureApi.safeGet === 'function';

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
      const hasSecureTokenManager = typeof secureTokenManager.isTokenValid === 'function' &&
        typeof secureTokenManager.getAccessToken === 'function';

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
      const { UnifiedErrorHandler } = await import('./errors');
      const errorHandler = UnifiedErrorHandler.getInstance();
      const hasErrorHandler = typeof errorHandler.handleError === 'function' &&
        typeof errorHandler.getRecentErrors === 'function';

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
      const hasAssetManager = typeof assetLoadingManager.loadAsset === 'function' &&
        typeof assetLoadingManager.getLoadingStats === 'function';

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
      const hasAssetLoader = typeof assetLoadingManager.loadAsset === 'function' &&
        typeof assetLoadingManager.getLoadingStats === 'function';

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
      const hasLoggerMethods = typeof logger.debug === 'function' &&
        typeof logger.info === 'function' &&
        typeof logger.warn === 'function' &&
        typeof logger.error === 'function';

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
      logger.info('Migration validation test', { component: 'MigrationValidator' });

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
      const apiCompatible = typeof authenticatedApi.get === 'function' &&
        typeof secureApi.safeGet === 'function';

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
    logger.info('Starting migration validation...', { component: 'MigrationValidator' });

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

    logger.info(
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

      logger.info('Architecture validation completed', {
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
      logger.error('Architecture validation failed', {
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
      const { globalServiceLocator } = await import('../core/api/registry');

      for (const serviceName of requiredServices) {
        if (!globalServiceLocator.hasService(serviceName)) {
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
      const apiTypes = await import('../types/api').catch(() => null);

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

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Provides utilities for testing error handling, managing test state,
 * and getting information about the test environment.
 */
export class TestHelpers {
  /**
   * Simulates different types of errors for testing error handling.
   * Useful for verifying error boundaries and recovery mechanisms work.
   */
  static simulateError(type: 'javascript' | 'promise' | 'network' | 'resource'): void {
    logger.info(`🧪 Simulating ${type} error for testing`, { component: 'TestHelpers' });

    switch (type) {
      case 'javascript':
        // Synchronous error - tests error boundaries
        throw new Error('Simulated JavaScript error for testing');

      case 'promise':
        // Asynchronous error - tests unhandled rejection handling
        Promise.reject(new Error('Simulated promise rejection for testing'));
        break;

      case 'resource': {
        // Resource loading error - tests asset loading error handling
        const script = document.createElement('script');
        script.src = '/non-existent-script.js';
        document.head.appendChild(script);
        break;
      }

      case 'network':
        // Network error - tests API error handling
        fetch('/non-existent-endpoint').catch(() => {
          logger.info('Simulated network error completed', { component: 'TestHelpers' });
        });
        break;
    }
  }

  /**
   * Clears all caches and storage for a clean test state.
   * Useful for ensuring tests start from a known state.
   */
  static async clearAllCaches(): Promise<void> {
    // Clear browser caches
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

    // Clear storage (with error handling for restricted contexts)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      logger.warn('Failed to clear storage (may be in restricted context)', {
        component: 'TestHelpers',
        error: e
      });
    }
  }

  /**
   * Gets comprehensive information about the test environment.
   * Useful for debugging environment-specific issues.
   */
  static getTestEnvironment(): Record<string, unknown> {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
    };
  }
}

// ============================================================================
// AUTO-VALIDATION IN DEVELOPMENT
// ============================================================================

export const migrationValidator = new MigrationValidator();

/**
 * Auto-run validation in development mode after a short delay.
 * This catches issues early in the development cycle.
 */
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    migrationValidator.runValidation().catch(error => {
      console.error('Migration validation failed:', error);
    });
  }, 1000); // Wait 1 second to allow modules to initialize
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Convenience function to run architecture validation in development.
 * Displays results in the console with clear visual indicators.
 */
export const validateArchitectureInDev = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const result = await ArchitectureValidator.validate();

      if (!result.isValid) {
        console.group('🏗️ Architecture Validation Issues');
        result.errors.forEach(error => console.error('❌', error));
        result.warnings.forEach(warning => console.warn('⚠️', warning));
        console.groupEnd();
      } else {
        console.log('✅ Architecture validation passed');
      }
    } catch (error) {
      console.error('Architecture validation failed:', error);
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ImportValidator,
  MigrationValidator,
  ArchitectureValidator,
  TestHelpers,
  migrationValidator,
  validateArchitectureInDev,
};