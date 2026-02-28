/**
 * Cache Test Utilities
 * Helper functions and mocks for testing cache functionality
 */

import type { ICachingService } from './icaching-service';
import type { CacheMetrics } from './core/interfaces';

/**
 * Mock cache service for testing
 */
export class MockCacheService implements ICachingService {
  private store = new Map<string, { value: any; expiry?: number }>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    errors: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    keyCount: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
  };

  async get<T>(key: string): Promise<T | null> {
    this.metrics.operations++;
    const item = this.store.get(key);
    
    if (!item) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    this.metrics.hits++;
    this.updateHitRate();
    return item.value as T;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.metrics.operations++;
    const expiry = ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expiry });
    this.metrics.keyCount = this.store.size;
  }

  async del(key: string): Promise<void> {
    this.metrics.operations++;
    this.store.delete(key);
    this.metrics.keyCount = this.store.size;
  }

  async clear(): Promise<void> {
    this.metrics.operations++;
    this.store.clear();
    this.metrics.keyCount = 0;
  }

  async has(key: string): Promise<boolean> {
    this.metrics.operations++;
    const item = this.store.get(key);
    
    if (!item) return false;
    
    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  async getMetrics(): Promise<CacheMetrics> {
    return { ...this.metrics };
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    this.metrics.operations++;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.store.delete(key);
    }
    
    this.metrics.keyCount = this.store.size;
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    this.metrics.operations++;
    // Mock implementation - in real cache, tags would be tracked
    for (const tag of tags) {
      await this.invalidateByPattern(`*:${tag}:*`);
    }
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  // Test helper methods
  getStore(): Map<string, { value: any; expiry?: number }> {
    return this.store;
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      errors: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      keyCount: this.store.size,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: 0,
    };
  }
}

/**
 * Create a spy cache that wraps another cache and tracks calls
 */
export class SpyCacheService implements ICachingService {
  public getCalls: Array<{ key: string; result: any }> = [];
  public setCalls: Array<{ key: string; value: any; ttl?: number }> = [];
  public delCalls: string[] = [];
  public clearCalls: number = 0;

  constructor(private wrapped: ICachingService) {}

  async get<T>(key: string): Promise<T | null> {
    const result = await this.wrapped.get<T>(key);
    this.getCalls.push({ key, result });
    return result;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.setCalls.push({ key, value, ttl });
    return this.wrapped.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    this.delCalls.push(key);
    return this.wrapped.del(key);
  }

  async clear(): Promise<void> {
    this.clearCalls++;
    return this.wrapped.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.wrapped.has(key);
  }

  async getMetrics(): Promise<CacheMetrics> {
    return this.wrapped.getMetrics();
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    return this.wrapped.invalidateByPattern?.(pattern);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    return this.wrapped.invalidateByTags?.(tags);
  }

  reset(): void {
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
    this.clearCalls = 0;
  }
}

/**
 * Test data generators
 */
export class CacheTestDataGenerator {
  /**
   * Generate random cache key
   */
  static generateKey(prefix: string = 'test'): string {
    return `${prefix}:${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate multiple cache keys
   */
  static generateKeys(count: number, prefix: string = 'test'): string[] {
    return Array.from({ length: count }, () => this.generateKey(prefix));
  }

  /**
   * Generate test data
   */
  static generateData(size: 'small' | 'medium' | 'large' = 'small'): any {
    const sizes = {
      small: 10,
      medium: 100,
      large: 1000,
    };

    const length = sizes[size];
    return {
      id: Math.random().toString(36).substring(7),
      data: Array.from({ length }, (_, i) => ({
        index: i,
        value: Math.random(),
      })),
    };
  }

  /**
   * Generate cache entries for bulk testing
   */
  static generateEntries(count: number): Array<{ key: string; value: any }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `test:entry:${i}`,
      value: { id: i, data: `value-${i}` },
    }));
  }
}

/**
 * Cache test assertions
 */
export class CacheTestAssertions {
  /**
   * Assert cache hit rate meets threshold
   */
  static async assertHitRate(
    cache: ICachingService,
    minHitRate: number
  ): Promise<void> {
    const metrics = await cache.getMetrics();
    if (metrics.hitRate < minHitRate) {
      throw new Error(
        `Cache hit rate ${metrics.hitRate.toFixed(2)}% is below threshold ${minHitRate}%`
      );
    }
  }

  /**
   * Assert cache contains key
   */
  static async assertHasKey(
    cache: ICachingService,
    key: string
  ): Promise<void> {
    const has = await cache.has(key);
    if (!has) {
      throw new Error(`Cache does not contain key: ${key}`);
    }
  }

  /**
   * Assert cache does not contain key
   */
  static async assertNotHasKey(
    cache: ICachingService,
    key: string
  ): Promise<void> {
    const has = await cache.has(key);
    if (has) {
      throw new Error(`Cache unexpectedly contains key: ${key}`);
    }
  }

  /**
   * Assert cache value equals expected
   */
  static async assertValue<T>(
    cache: ICachingService,
    key: string,
    expected: T
  ): Promise<void> {
    const value = await cache.get<T>(key);
    if (JSON.stringify(value) !== JSON.stringify(expected)) {
      throw new Error(
        `Cache value mismatch for key ${key}. Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(value)}`
      );
    }
  }
}

/**
 * Performance testing utilities
 */
export class CachePerformanceTest {
  /**
   * Measure cache operation latency
   */
  static async measureLatency(
    operation: () => Promise<void>
  ): Promise<number> {
    const start = performance.now();
    await operation();
    return performance.now() - start;
  }

  /**
   * Run performance benchmark
   */
  static async benchmark(
    cache: ICachingService,
    operations: number = 1000
  ): Promise<{
    avgSetLatency: number;
    avgGetLatency: number;
    avgDelLatency: number;
  }> {
    const setLatencies: number[] = [];
    const getLatencies: number[] = [];
    const delLatencies: number[] = [];

    // Benchmark SET operations
    for (let i = 0; i < operations; i++) {
      const key = `bench:${i}`;
      const value = { data: `value-${i}` };
      const latency = await this.measureLatency(() => cache.set(key, value));
      setLatencies.push(latency);
    }

    // Benchmark GET operations
    for (let i = 0; i < operations; i++) {
      const key = `bench:${i}`;
      const latency = await this.measureLatency(() => cache.get(key));
      getLatencies.push(latency);
    }

    // Benchmark DEL operations
    for (let i = 0; i < operations; i++) {
      const key = `bench:${i}`;
      const latency = await this.measureLatency(() => cache.del(key));
      delLatencies.push(latency);
    }

    return {
      avgSetLatency: setLatencies.reduce((a, b) => a + b, 0) / setLatencies.length,
      avgGetLatency: getLatencies.reduce((a, b) => a + b, 0) / getLatencies.length,
      avgDelLatency: delLatencies.reduce((a, b) => a + b, 0) / delLatencies.length,
    };
  }
}

/**
 * Wait for cache operation to complete
 */
export async function waitForCache(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a cache with pre-populated data
 */
export async function createPopulatedCache(
  cache: ICachingService,
  entries: Array<{ key: string; value: any; ttl?: number }>
): Promise<ICachingService> {
  for (const entry of entries) {
    await cache.set(entry.key, entry.value, entry.ttl);
  }
  return cache;
}
