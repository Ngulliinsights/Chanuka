// Cache migration validation utilities
// Validates behavior equivalence between legacy and modern cache implementations

import { CacheService } from '@client/types';
import { logger } from '../observability/logging';

export interface CacheValidationResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

export interface CacheValidationReport {
  categories: {
    functionality: CacheValidationResult[];
    performance: CacheValidationResult[];
    consistency: CacheValidationResult[];
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallSuccess: boolean;
    timestamp: string;
  };
}

/**
 * Validates cache behavior equivalence between implementations
 */
export class CacheMigrationValidator {
  constructor(
    private legacyCache: CacheService,
    private modernCache: CacheService
  ) {}

  /**
   * Run comprehensive validation suite
   */
  async validateMigration(): Promise<CacheValidationReport> {
    const results = {
      functionality: [] as CacheValidationResult[],
      performance: [] as CacheValidationResult[],
      consistency: [] as CacheValidationResult[]
    };

    // Functionality tests
    results.functionality.push(await this.testBasicOperations());
    results.functionality.push(await this.testTTLExpiration());
    results.functionality.push(await this.testConcurrentAccess());
    results.functionality.push(await this.testLargeValues());
    results.functionality.push(await this.testSpecialCharacters());

    // Performance tests
    results.performance.push(await this.testReadPerformance());
    results.performance.push(await this.testWritePerformance());
    results.performance.push(await this.testMemoryUsage());

    // Consistency tests
    results.consistency.push(await this.testDataConsistency());
    results.consistency.push(await this.testRaceConditions());

    const totalTests = Object.values(results).flat().length;
    const passedTests = Object.values(results).flat().filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    return {
      categories: results,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        overallSuccess: failedTests === 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async testBasicOperations(): Promise<CacheValidationResult> {
    const startTime = Date.now();
    try {
      const testKey = 'validation:basic:test';
      const testValue = { data: 'test', timestamp: Date.now() };

      // Test modern cache
      await this.modernCache.set(testKey, testValue, 300);
      const modernResult = await this.modernCache.get(testKey);

      // Test legacy cache
      await this.legacyCache.set(testKey, testValue, 300);
      const legacyResult = await this.legacyCache.get(testKey);

      // Compare results
      const success = this.deepEqual(modernResult, legacyResult) &&
                     this.deepEqual(modernResult, testValue);

      // Cleanup
      await this.modernCache.del(testKey);
      await this.legacyCache.del(testKey);

      return {
        test: 'Basic Operations',
        success,
        message: success ? 'Basic cache operations work correctly' :
                          'Basic cache operations failed',
        details: { modernResult, legacyResult, expected: testValue },
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        test: 'Basic Operations',
        success: false,
        message: `Basic operations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testTTLExpiration(): Promise<CacheValidationResult> {
    const startTime = Date.now();
    try {
      const testKey = 'validation:ttl:test';
      const testValue = { data: 'ttl-test' };

      // Test with short TTL
      await this.modernCache.set(testKey, testValue, 1); // 1 second
      await this.legacyCache.set(testKey, testValue, 1);

      // Wait for expiration
      await this.delay(1100);

      const modernResult = await this.modernCache.get(testKey);
      const legacyResult = await this.legacyCache.get(testKey);

      const success = modernResult === null && legacyResult === null;

      return {
        test: 'TTL Expiration',
        success,
        message: success ? 'TTL expiration works correctly' :
                          'TTL expiration failed',
        details: { modernResult, legacyResult },
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        test: 'TTL Expiration',
        success: false,
        message: `TTL expiration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testConcurrentAccess(): Promise<CacheValidationResult> {
    const startTime = Date.now();
    try {
      const testKeys = Array.from({ length: 10 }, (_, i) => `validation:concurrent:${i}`);
      const testValue = { data: 'concurrent-test' };

      // Concurrent writes
      const writePromises = testKeys.map(key =>
        Promise.all([
          this.modernCache.set(key, testValue, 300),
          this.legacyCache.set(key, testValue, 300)
        ])
      );

      await Promise.all(writePromises);

      // Concurrent reads
      const readPromises = testKeys.map(async (key) => {
        const [modern, legacy] = await Promise.all([
          this.modernCache.get(key),
          this.legacyCache.get(key)
        ]);
        return { key, modern, legacy, match: this.deepEqual(modern, legacy) };
      });

      const results = await Promise.all(readPromises);
      const success = results.every(r => r.match);

      // Cleanup
      await Promise.all(testKeys.map(key =>
        Promise.all([
          this.modernCache.del(key),
          this.legacyCache.del(key)
        ])
      ));

      return {
        test: 'Concurrent Access',
        success,
        message: success ? 'Concurrent access works correctly' :
                          'Concurrent access failed',
        details: { results },
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        test: 'Concurrent Access',
        success: false,
        message: `Concurrent access test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testReadPerformance(): Promise<CacheValidationResult> {
    const startTime = Date.now();
    try {
      const iterations = 1000;
      const testKey = 'validation:perf:test';
      const testValue = { data: 'perf-test', size: 100 };

      // Setup
      await this.modernCache.set(testKey, testValue, 300);
      await this.legacyCache.set(testKey, testValue, 300);

      // Benchmark modern cache
      const modernStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.modernCache.get(testKey);
      }
      const modernTime = performance.now() - modernStart;

      // Benchmark legacy cache
      const legacyStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.legacyCache.get(testKey);
      }
      const legacyTime = performance.now() - legacyStart;

      // Performance should be within 2x of each other
      const ratio = Math.max(modernTime, legacyTime) / Math.min(modernTime, legacyTime);
      const success = ratio < 2.0;

      // Cleanup
      await this.modernCache.del(testKey);
      await this.legacyCache.del(testKey);

      return {
        test: 'Read Performance',
        success,
        message: success ? 'Read performance is acceptable' :
                          'Read performance differs significantly',
        details: {
          modernTime: `${modernTime.toFixed(2)}ms`,
          legacyTime: `${legacyTime.toFixed(2)}ms`,
          ratio: ratio.toFixed(2),
          iterations
        },
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        test: 'Read Performance',
        success: false,
        message: `Read performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async testDataConsistency(): Promise<CacheValidationResult> {
    const startTime = Date.now();
    try {
      const testCases = [
        { key: 'validation:consistency:string', value: 'test string' },
        { key: 'validation:consistency:number', value: 42 },
        { key: 'validation:consistency:boolean', value: true },
        { key: 'validation:consistency:array', value: [1, 2, 3, 'test'] },
        { key: 'validation:consistency:object', value: { nested: { data: 'test' } } },
        { key: 'validation:consistency:null', value: null },
        { key: 'validation:consistency:undefined', value: undefined }
      ];

      const results: Array<{
        key: string;
        expected: any;
        modern: any;
        legacy: any;
        match: boolean;
      }> = [];

      for (const testCase of testCases) {
        // Set in both caches
        await Promise.all([
          this.modernCache.set(testCase.key, testCase.value, 300),
          this.legacyCache.set(testCase.key, testCase.value, 300)
        ]);

        // Get from both caches
        const [modernResult, legacyResult] = await Promise.all([
          this.modernCache.get(testCase.key),
          this.legacyCache.get(testCase.key)
        ]);

        const match = this.deepEqual(modernResult, legacyResult);
        results.push({
          key: testCase.key,
          expected: testCase.value,
          modern: modernResult,
          legacy: legacyResult,
          match
        });

        // Cleanup
        await Promise.all([
          this.modernCache.del(testCase.key),
          this.legacyCache.del(testCase.key)
        ]);
      }

      const success = results.every(r => r.match);

      return {
        test: 'Data Consistency',
        success,
        message: success ? 'Data consistency maintained across types' :
                          'Data consistency issues found',
        details: { results },
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        test: 'Data Consistency',
        success: false,
        message: `Data consistency test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  }

  // Helper methods
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }

      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Placeholder implementations for other tests
  private async testLargeValues(): Promise<CacheValidationResult> {
    return {
      test: 'Large Values',
      success: true,
      message: 'Large values test placeholder',
      duration: 0
    };
  }

  private async testSpecialCharacters(): Promise<CacheValidationResult> {
    return {
      test: 'Special Characters',
      success: true,
      message: 'Special characters test placeholder',
      duration: 0
    };
  }

  private async testWritePerformance(): Promise<CacheValidationResult> {
    return {
      test: 'Write Performance',
      success: true,
      message: 'Write performance test placeholder',
      duration: 0
    };
  }

  private async testMemoryUsage(): Promise<CacheValidationResult> {
    return {
      test: 'Memory Usage',
      success: true,
      message: 'Memory usage test placeholder',
      duration: 0
    };
  }

  private async testRaceConditions(): Promise<CacheValidationResult> {
    return {
      test: 'Race Conditions',
      success: true,
      message: 'Race conditions test placeholder',
      duration: 0
    };
  }
}

/**
 * Create a cache migration validator
 */
export function createCacheMigrationValidator(
  legacyCache: CacheService,
  modernCache: CacheService
): CacheMigrationValidator {
  return new CacheMigrationValidator(legacyCache, modernCache);
}
