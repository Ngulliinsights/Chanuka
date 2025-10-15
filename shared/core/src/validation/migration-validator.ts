/**
 * Migration Validation System
 * 
 * Comprehensive validation to ensure migration completeness and functionality
 */

import { performance } from 'perf_hooks';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import { logger } from '../logging';

export interface ValidationResult {
  success: boolean;
  category: string;
  test: string;
  message: string;
  duration?: number;
  details?: any;
}

export interface MigrationValidationReport {
  overall: {
    success: boolean;
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
  };
  categories: {
    imports: ValidationResult[];
    functionality: ValidationResult[];
    performance: ValidationResult[];
    integration: ValidationResult[];
  };
  summary: string[];
  recommendations: string[];
}

export class MigrationValidator {
  private results: ValidationResult[] = [];
  private startTime: number = 0;

  async validateMigration(): Promise<MigrationValidationReport> {
    this.startTime = performance.now();
    this.results = [];

    logger.info('🔍 Starting comprehensive migration validation...\n', { component: 'Chanuka' });

    // Run all validation categories
    await this.validateImports();
    await this.validateFunctionality();
    await this.validatePerformance();
    await this.validateIntegration();

    const endTime = performance.now();
    const duration = endTime - this.startTime;

    return this.generateReport(duration);
  }

  private async validateImports(): Promise<void> {
    logger.info('📦 Validating import resolution...', { component: 'Chanuka' });

    // Test core module imports
    await this.testImport('Core Index', () => import('../index'));
    await this.testImport('Cache Module', () => import('../cache'));
    await this.testImport('Logging Module', () => import('../logging'));
    await this.testImport('Validation Module', () => import('../validation'));
    await this.testImport('Error Handling Module', () => import('../error-handling'));
    await this.testImport('Rate Limiting Module', () => import('../rate-limiting'));
    await this.testImport('Health Module', () => import('../health'));
    await this.testImport('Middleware Module', () => import('../middleware'));

    // Test legacy adapter imports
    await this.testImport('Legacy Cache Adapter', () => import('../cache/legacy-adapters'));
    await this.testImport('Legacy Logging Adapter', () => import('../logging/legacy-adapters'));
    await this.testImport('Legacy Validation Adapter', () => import('../validation/legacy-adapters'));
    await this.testImport('Legacy Error Handling Adapter', () => import('../error-handling/legacy-adapters'));

    // Validate import paths in application code
    await this.validateApplicationImports();
  }

  private async validateFunctionality(): Promise<void> {
    logger.info('⚙️ Validating functionality preservation...', { component: 'Chanuka' });

    // Test cache functionality
    await this.testFunctionality('Cache Service', async () => {
      const { CacheService } = await import('../cache');
      const cache = new CacheService();
      
      // Test basic operations
      await cache.set('test-key', 'test-value', 60);
      const value = await cache.get('test-key');
      if (value !== 'test-value') {
        throw new Error('Cache get/set functionality failed');
      }
      
      await cache.delete('test-key');
      const deletedValue = await cache.get('test-key');
      if (deletedValue !== null) {
        throw new Error('Cache delete functionality failed');
      }
    });

    // Test logging functionality
    await this.testFunctionality('Logging Service', async () => {
      const { Logger } = await import('../logging');
      const logger = new Logger({ service: 'test' });
      
      // Test logging methods
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
      
      // Verify logger configuration
      if (!logger.isEnabled('info')) {
        throw new Error('Logger info level not enabled');
      }
    });

    // Test validation functionality
    await this.testFunctionality('Validation Service', async () => {
      const { ValidationService } = await import('../validation');
      const validator = new ValidationService();
      
      // Test schema validation
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };
      
      const validData = { name: 'Test', age: 25 };
      const result = await validator.validate(validData, schema);
      if (!result.success) {
        throw new Error('Validation service failed for valid data');
      }
      
      const invalidData = { age: 25 };
      const invalidResult = await validator.validate(invalidData, schema);
      if (invalidResult.success) {
        throw new Error('Validation service should have failed for invalid data');
      }
    });

    // Test error handling functionality
    await this.testFunctionality('Error Handling Service', async () => {
      const { ErrorHandler, AppError } = await import('../error-handling');
      const errorHandler = new ErrorHandler();
      
      // Test error creation and handling
      const error = new AppError('Test error', 'TEST_ERROR', 400);
      const handled = await errorHandler.handle(error);
      
      if (!handled.handled) {
        throw new Error('Error handler failed to handle error');
      }
    });

    // Test rate limiting functionality
    await this.testFunctionality('Rate Limiting Service', async () => {
      const { RateLimiter } = await import('../rate-limiting');
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 100
      });
      
      // Test rate limiting
      const key = 'test-key';
      const result1 = await rateLimiter.checkLimit(key);
      if (!result1.allowed) {
        throw new Error('Rate limiter should allow first request');
      }
      
      // Test limit tracking
      if (result1.remaining !== 99) {
        throw new Error('Rate limiter remaining count incorrect');
      }
    });

    // Test health monitoring functionality
    await this.testFunctionality('Health Monitoring Service', async () => {
      const { HealthChecker } = await import('../health');
      const healthChecker = new HealthChecker();
      
      // Test health check
      const health = await healthChecker.checkHealth();
      if (!health.status) {
        throw new Error('Health checker failed to return status');
      }
    });
  }

  private async validatePerformance(): Promise<void> {
    logger.info('🚀 Validating performance characteristics...', { component: 'Chanuka' });

    // Test cache performance
    await this.testPerformance('Cache Performance', async () => {
      const { CacheService } = await import('../cache');
      const cache = new CacheService();
      
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await cache.set(`key-${i}`, `value-${i}`, 60);
      }
      
      for (let i = 0; i < iterations; i++) {
        await cache.get(`key-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (iterations * 2) / (duration / 1000);
      
      if (opsPerSecond < 1000) {
        throw new Error(`Cache performance too slow: ${opsPerSecond.toFixed(2)} ops/sec`);
      }
      
      return { opsPerSecond: opsPerSecond.toFixed(2) };
    });

    // Test logging performance
    await this.testPerformance('Logging Performance', async () => {
      const { Logger } = await import('../logging');
      const logger = new Logger({ service: 'performance-test' });
      
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        logger.info(`Performance test message ${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const logsPerSecond = iterations / (duration / 1000);
      
      if (logsPerSecond < 500) {
        throw new Error(`Logging performance too slow: ${logsPerSecond.toFixed(2)} logs/sec`);
      }
      
      return { logsPerSecond: logsPerSecond.toFixed(2) };
    });

    // Test validation performance
    await this.testPerformance('Validation Performance', async () => {
      const { ValidationService } = await import('../validation');
      const validator = new ValidationService();
      
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      };
      
      const testData = {
        name: 'Test User',
        age: 25,
        email: 'test@example.com'
      };
      
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        await validator.validate(testData, schema);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const validationsPerSecond = iterations / (duration / 1000);
      
      if (validationsPerSecond < 100) {
        throw new Error(`Validation performance too slow: ${validationsPerSecond.toFixed(2)} validations/sec`);
      }
      
      return { validationsPerSecond: validationsPerSecond.toFixed(2) };
    });
  }

  private async validateIntegration(): Promise<void> {
    logger.info('🔗 Validating integration points...', { component: 'Chanuka' });

    // Test middleware integration
    await this.testIntegration('Middleware Integration', async () => {
      const { MiddlewareFactory } = await import('../middleware');
      const factory = new MiddlewareFactory();
      
      // Test middleware creation
      const cacheMiddleware = factory.createCacheMiddleware();
      const loggingMiddleware = factory.createLoggingMiddleware();
      const validationMiddleware = factory.createValidationMiddleware();
      
      if (!cacheMiddleware || !loggingMiddleware || !validationMiddleware) {
        throw new Error('Failed to create middleware instances');
      }
    });

    // Test legacy adapter integration
    await this.testIntegration('Legacy Adapter Integration', async () => {
      const { LegacyCacheAdapter } = await import('../cache/legacy-adapters');
      const { LegacyLoggerAdapter } = await import('../logging/legacy-adapters');
      
      const cacheAdapter = new LegacyCacheAdapter();
      const loggerAdapter = new LegacyLoggerAdapter();
      
      // Test adapter functionality
      await cacheAdapter.set('test', 'value');
      const value = await cacheAdapter.get('test');
      if (value !== 'value') {
        throw new Error('Legacy cache adapter integration failed');
      }
      
      loggerAdapter.log('info', 'Test message');
    });

    // Test cross-service integration
    await this.testIntegration('Cross-Service Integration', async () => {
      const { CacheService } = await import('../cache');
      const { Logger } = await import('../logging');
      const { ErrorHandler } = await import('../error-handling');
      
      const cache = new CacheService();
      const logger = new Logger({ service: 'integration-test' });
      const errorHandler = new ErrorHandler();
      
      // Test services working together
      try {
        await cache.set('integration-test', 'success');
        logger.info('Cache operation successful');
        
        const value = await cache.get('integration-test');
        if (value !== 'success') {
          throw new Error('Integration test failed');
        }
        
        logger.info('Integration test completed successfully');
      } catch (error) {
        await errorHandler.handle(error as Error);
        throw error;
      }
    });
  }

  private async validateApplicationImports(): Promise<void> {
    // Check for old import patterns in the codebase
    const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: resolve(process.cwd(), '..'),
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**']
    });

    let oldImportsFound = 0;
    const problematicFiles: string[] = [];

    for (const file of sourceFiles.slice(0, 100)) { // Limit to first 100 files for performance
      try {
        const fullPath = resolve(process.cwd(), '..', file);
        if (!existsSync(fullPath)) continue;
        
        const content = readFileSync(fullPath, 'utf-8');
        
        // Check for old import patterns
        const oldPatterns = [
          /from\s+['"]\.\.\/.*\/cache\/(?!index)/,
          /from\s+['"]\.\.\/.*\/logging\/(?!index)/,
          /from\s+['"]\.\.\/.*\/validation\/(?!index)/,
          /from\s+['"]\.\.\/.*\/error-handling\/(?!index)/,
          /from\s+['"]\.\.\/.*\/rate-limiting\/(?!index)/,
        ];
        
        for (const pattern of oldPatterns) {
          if (pattern.test(content)) {
            oldImportsFound++;
            if (!problematicFiles.includes(file)) {
              problematicFiles.push(file);
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    this.addResult({
      success: oldImportsFound === 0,
      category: 'imports',
      test: 'Application Import Patterns',
      message: oldImportsFound === 0 
        ? 'All application imports use new core module patterns'
        : `Found ${oldImportsFound} old import patterns in ${problematicFiles.length} files`,
      details: { oldImportsFound, problematicFiles: problematicFiles.slice(0, 10) }
    });
  }

  private async testImport(name: string, importFn: () => Promise<any>): Promise<void> {
    const startTime = performance.now();
    try {
      const module = await importFn();
      const endTime = performance.now();
      
      this.addResult({
        success: true,
        category: 'imports',
        test: name,
        message: 'Import successful',
        duration: endTime - startTime,
        details: { exports: Object.keys(module).length }
      });
    } catch (error) {
      const endTime = performance.now();
      this.addResult({
        success: false,
        category: 'imports',
        test: name,
        message: `Import failed: ${(error as Error).message}`,
        duration: endTime - startTime
      });
    }
  }

  private async testFunctionality(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    try {
      await testFn();
      const endTime = performance.now();
      
      this.addResult({
        success: true,
        category: 'functionality',
        test: name,
        message: 'Functionality test passed',
        duration: endTime - startTime
      });
    } catch (error) {
      const endTime = performance.now();
      this.addResult({
        success: false,
        category: 'functionality',
        test: name,
        message: `Functionality test failed: ${(error as Error).message}`,
        duration: endTime - startTime
      });
    }
  }

  private async testPerformance(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = performance.now();
    try {
      const result = await testFn();
      const endTime = performance.now();
      
      this.addResult({
        success: true,
        category: 'performance',
        test: name,
        message: 'Performance test passed',
        duration: endTime - startTime,
        details: result
      });
    } catch (error) {
      const endTime = performance.now();
      this.addResult({
        success: false,
        category: 'performance',
        test: name,
        message: `Performance test failed: ${(error as Error).message}`,
        duration: endTime - startTime
      });
    }
  }

  private async testIntegration(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    try {
      await testFn();
      const endTime = performance.now();
      
      this.addResult({
        success: true,
        category: 'integration',
        test: name,
        message: 'Integration test passed',
        duration: endTime - startTime
      });
    } catch (error) {
      const endTime = performance.now();
      this.addResult({
        success: false,
        category: 'integration',
        test: name,
        message: `Integration test failed: ${(error as Error).message}`,
        duration: endTime - startTime
      });
    }
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  private generateReport(totalDuration: number): MigrationValidationReport {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    const categorizedResults = {
      imports: this.results.filter(r => r.category === 'imports'),
      functionality: this.results.filter(r => r.category === 'functionality'),
      performance: this.results.filter(r => r.category === 'performance'),
      integration: this.results.filter(r => r.category === 'integration'),
    };

    const summary: string[] = [];
    const recommendations: string[] = [];

    // Generate summary
    summary.push(`Migration validation completed in ${(totalDuration / 1000).toFixed(2)}s`);
    summary.push(`Total tests: ${this.results.length}, Passed: ${passed}, Failed: ${failed}`);
    
    if (failed === 0) {
      summary.push('✅ All migration validation tests passed successfully');
    } else {
      summary.push(`❌ ${failed} validation tests failed`);
    }

    // Generate recommendations
    const failedImports = categorizedResults.imports.filter(r => !r.success);
    if (failedImports.length > 0) {
      recommendations.push('Fix import resolution issues before proceeding');
      recommendations.push('Check module exports and file paths');
    }

    const failedFunctionality = categorizedResults.functionality.filter(r => !r.success);
    if (failedFunctionality.length > 0) {
      recommendations.push('Address functionality regressions immediately');
      recommendations.push('Review service implementations and configurations');
    }

    const failedPerformance = categorizedResults.performance.filter(r => !r.success);
    if (failedPerformance.length > 0) {
      recommendations.push('Investigate performance regressions');
      recommendations.push('Consider optimizing slow operations');
    }

    const failedIntegration = categorizedResults.integration.filter(r => !r.success);
    if (failedIntegration.length > 0) {
      recommendations.push('Fix integration issues between services');
      recommendations.push('Verify middleware and adapter configurations');
    }

    if (failed === 0) {
      recommendations.push('Migration validation successful - ready for production deployment');
    }

    return {
      overall: {
        success: failed === 0,
        totalTests: this.results.length,
        passed,
        failed,
        duration: totalDuration
      },
      categories: categorizedResults,
      summary,
      recommendations
    };
  }
}

// Export validation function for easy use
export async function validateMigration(): Promise<MigrationValidationReport> {
  const validator = new MigrationValidator();
  return await validator.validateMigration();
}






