/**
 * Cache Test Utilities
 * Helper functions and mocks for testing cache functionality
 */

import { err, Ok, ok, type Result } from '@shared/core/primitives/types/result';

import type { ICachingService } from './caching-service';
import type { CacheConfig, CacheMetrics, CacheOperationOptions, HealthStatus } from './interfaces';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Unwrap a Result<T> produced by this module's cache methods. */
function unwrapOk<T>(result: Result<T>, fallback: T): T {
  return result instanceof Ok ? (result as Ok<T>).value : fallback;
}

function makeEmptyMetrics(entryCount = 0): CacheMetrics {
  return {
    hits: 0,
    misses: 0,
    hitRate: 0,
    averageLatency: 0,
    errors: 0,
    totalOperations: 0,
    entryCount,
    memoryUsage: 0,
    lastUpdated: new Date(),
  };
}

// ---------------------------------------------------------------------------
// MockCacheService
// ---------------------------------------------------------------------------

/**
 * In-memory mock of ICachingService for unit tests.
 *
 * Design notes:
 * - Every public method counts exactly one `totalOperations` tick.
 * - `getOrSet` avoids calling `this.get` so it doesn't double-count.
 * - Expiry is evaluated lazily on every read, matching real-cache semantics.
 */
export class MockCacheService implements ICachingService {
  private store = new Map<string, { value: unknown; expiry?: number }>();
  private metrics: CacheMetrics = makeEmptyMetrics();

  // -------------------------------------------------------------------------
  // Core reads
  // -------------------------------------------------------------------------

  async get<T>(key: string, _options?: CacheOperationOptions): Promise<Result<T | null>> {
    this.metrics.totalOperations++;

    const item = this.store.get(key);

    if (!item || this.isExpired(key, item)) {
      this.metrics.misses++;
      this.updateHitRate();
      return ok<T | null>(null);
    }

    this.metrics.hits++;
    this.updateHitRate();
    return ok(item.value as T);
  }

  async getMany<T>(
    keys: string[],
    _options?: CacheOperationOptions
  ): Promise<Result<Map<string, T | null>>> {
    this.metrics.totalOperations++;
    const result = new Map<string, T | null>();

    for (const key of keys) {
      const item = this.store.get(key);

      if (!item || this.isExpired(key, item)) {
        result.set(key, null);
        this.metrics.misses++;
      } else {
        result.set(key, item.value as T);
        this.metrics.hits++;
      }
    }

    this.updateHitRate();
    return ok(result);
  }

  // -------------------------------------------------------------------------
  // Core writes
  // -------------------------------------------------------------------------

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<Result<void>> {
    this.metrics.totalOperations++;
    this.store.set(key, { value, expiry: this.expiryFrom(options?.ttl) });
    this.metrics.entryCount = this.store.size;
    return ok(undefined);
  }

  async setMany<T>(entries: Map<string, T>, options?: CacheOperationOptions): Promise<Result<void>> {
    this.metrics.totalOperations++;
    const expiry = this.expiryFrom(options?.ttl);

    for (const [key, value] of entries) {
      this.store.set(key, { value, expiry });
    }

    this.metrics.entryCount = this.store.size;
    return ok(undefined);
  }

  // -------------------------------------------------------------------------
  // Deletes
  // -------------------------------------------------------------------------

  async delete(key: string): Promise<Result<void>> {
    this.metrics.totalOperations++;
    this.store.delete(key);
    this.metrics.entryCount = this.store.size;
    return ok(undefined);
  }

  async deleteMany(keys: string[]): Promise<Result<void>> {
    this.metrics.totalOperations++;

    for (const key of keys) {
      this.store.delete(key);
    }

    this.metrics.entryCount = this.store.size;
    return ok(undefined);
  }

  async clear(): Promise<Result<void>> {
    this.metrics.totalOperations++;
    this.store.clear();
    this.metrics.entryCount = 0;
    return ok(undefined);
  }

  // -------------------------------------------------------------------------
  // Existence check
  // -------------------------------------------------------------------------

  async exists(key: string): Promise<Result<boolean>> {
    this.metrics.totalOperations++;
    const item = this.store.get(key);

    if (!item || this.isExpired(key, item)) return ok(false);

    return ok(true);
  }

  // -------------------------------------------------------------------------
  // getOrSet — intentionally bypasses this.get() to avoid double-counting
  // -------------------------------------------------------------------------

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOperationOptions
  ): Promise<Result<T>> {
    this.metrics.totalOperations++;

    const item = this.store.get(key);

    if (item && !this.isExpired(key, item)) {
      this.metrics.hits++;
      this.updateHitRate();
      return ok(item.value as T);
    }

    this.metrics.misses++;
    this.updateHitRate();

    try {
      const value = await factory();
      this.store.set(key, { value, expiry: this.expiryFrom(options?.ttl) });
      this.metrics.entryCount = this.store.size;
      return ok(value);
    } catch (error) {
      this.metrics.errors++;
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`getOrSet factory failed: ${message}`));
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle / introspection
  // -------------------------------------------------------------------------

  async healthCheck(): Promise<HealthStatus> {
    const used = this.metrics.entryCount * 100;
    const available = 1024 * 1024 * 100;

    return {
      status: 'healthy',
      latency: 0,
      details: {
        connected: true,
        memory: { used, available, percentage: used / available },
      },
      timestamp: new Date(),
    };
  }

  async shutdown(): Promise<Result<void>> {
    this.store.clear();
    this.metrics = makeEmptyMetrics();
    return ok(undefined);
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getConfig(): CacheConfig {
    return {
      type: 'memory',
      name: 'mock-cache',
      defaultTtl: 3600,
      maxEntries: 1000,
    };
  }

  isReady(): boolean {
    return true;
  }

  // -------------------------------------------------------------------------
  // Test helpers
  // -------------------------------------------------------------------------

  /** Direct access to the internal store for assertion purposes. */
  getStore(): ReadonlyMap<string, { value: unknown; expiry?: number }> {
    return this.store;
  }

  /** Reset metrics without clearing the store. */
  resetMetrics(): void {
    this.metrics = makeEmptyMetrics(this.store.size);
  }

  // -------------------------------------------------------------------------
  // Private utilities
  // -------------------------------------------------------------------------

  /**
   * Returns true and evicts the entry if it has expired.
   * Side-effect: deletes expired key from the store.
   */
  private isExpired(key: string, item: { expiry?: number }): boolean {
    if (item.expiry !== undefined && Date.now() > item.expiry) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  private expiryFrom(ttl?: number): number | undefined {
    return ttl !== undefined ? Date.now() + ttl * 1000 : undefined;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }
}

// ---------------------------------------------------------------------------
// SpyCacheService
// ---------------------------------------------------------------------------

export interface SpyRecord<TArgs, TResult = unknown> {
  args: TArgs;
  /** Populated for read operations; absent for fire-and-forget writes. */
  result?: TResult;
}

/**
 * Wraps any ICachingService and records every method invocation.
 * Useful for verifying interaction patterns without mocking internals.
 */
export class SpyCacheService implements ICachingService {
  readonly calls = {
    get:       [] as SpyRecord<{ key: string; options?: CacheOperationOptions }, Result<unknown>>[],
    set:       [] as SpyRecord<{ key: string; value: unknown; options?: CacheOperationOptions }>[],
    delete:    [] as SpyRecord<{ key: string }>[],
    clear:     [] as SpyRecord<Record<string, never>>[],
    exists:    [] as SpyRecord<{ key: string }, Result<boolean>>[],
    getMany:   [] as SpyRecord<{ keys: string[]; options?: CacheOperationOptions }, Result<Map<string, unknown>>>[],
    setMany:   [] as SpyRecord<{ entries: Map<string, unknown>; options?: CacheOperationOptions }>[],
    deleteMany:[] as SpyRecord<{ keys: string[] }>[],
    getOrSet:  [] as SpyRecord<{ key: string; options?: CacheOperationOptions }>[],
  };

  constructor(private readonly wrapped: ICachingService) {}

  async get<T>(key: string, options?: CacheOperationOptions): Promise<Result<T | null>> {
    const result = await this.wrapped.get<T>(key, options);
    this.calls.get.push({ args: { key, options }, result });
    return result;
  }

  async set<T>(key: string, value: T, options?: CacheOperationOptions): Promise<Result<void>> {
    this.calls.set.push({ args: { key, value, options } });
    return this.wrapped.set(key, value, options);
  }

  async delete(key: string): Promise<Result<void>> {
    this.calls.delete.push({ args: { key } });
    return this.wrapped.delete(key);
  }

  async clear(): Promise<Result<void>> {
    this.calls.clear.push({ args: {} });
    return this.wrapped.clear();
  }

  async exists(key: string): Promise<Result<boolean>> {
    const result = await this.wrapped.exists(key);
    this.calls.exists.push({ args: { key }, result });
    return result;
  }

  async getMany<T>(keys: string[], options?: CacheOperationOptions): Promise<Result<Map<string, T | null>>> {
    const result = await this.wrapped.getMany<T>(keys, options);
    this.calls.getMany.push({ args: { keys, options }, result: result as Result<Map<string, unknown>> });
    return result;
  }

  async setMany<T>(entries: Map<string, T>, options?: CacheOperationOptions): Promise<Result<void>> {
    this.calls.setMany.push({ args: { entries: entries as Map<string, unknown>, options } });
    return this.wrapped.setMany(entries, options);
  }

  async deleteMany(keys: string[]): Promise<Result<void>> {
    this.calls.deleteMany.push({ args: { keys } });
    return this.wrapped.deleteMany(keys);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOperationOptions): Promise<Result<T>> {
    this.calls.getOrSet.push({ args: { key, options } });
    return this.wrapped.getOrSet(key, factory, options);
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.wrapped.healthCheck();
  }

  async shutdown(): Promise<Result<void>> {
    return this.wrapped.shutdown();
  }

  getMetrics(): CacheMetrics {
    return this.wrapped.getMetrics();
  }

  getConfig(): CacheConfig {
    return this.wrapped.getConfig();
  }

  isReady(): boolean {
    return this.wrapped.isReady();
  }

  /** Reset all recorded calls without affecting the wrapped cache. */
  reset(): void {
    for (const list of Object.values(this.calls)) {
      list.length = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// CacheTestDataGenerator
// ---------------------------------------------------------------------------

/**
 * Deterministic and random data generators for cache tests.
 */
export class CacheTestDataGenerator {
  /** Generate a random cache key with optional prefix. */
  static generateKey(prefix = 'test'): string {
    return `${prefix}:${Math.random().toString(36).slice(2, 9)}`;
  }

  /** Generate N unique cache keys. */
  static generateKeys(count: number, prefix = 'test'): string[] {
    return Array.from({ length: count }, () => this.generateKey(prefix));
  }

  /**
   * Generate a plain-object payload of varying size.
   * Useful for stress-testing serialization overhead.
   */
  static generateData(size: 'small' | 'medium' | 'large' = 'small'): object {
    const lengths = { small: 10, medium: 100, large: 1000 } as const;
    return {
      id: Math.random().toString(36).slice(2, 9),
      items: Array.from({ length: lengths[size] }, (_, i) => ({ index: i, value: Math.random() })),
    };
  }

  /**
   * Generate N deterministic key/value pairs for bulk-operation tests.
   * Keys follow the pattern `test:entry:<index>` for easy introspection.
   */
  static generateEntries(count: number): Array<{ key: string; value: { id: number; data: string } }> {
    return Array.from({ length: count }, (_, i) => ({
      key: `test:entry:${i}`,
      value: { id: i, data: `value-${i}` },
    }));
  }
}

// ---------------------------------------------------------------------------
// CacheTestAssertions
// ---------------------------------------------------------------------------

/**
 * Assertion helpers that throw on failure — compatible with any test runner.
 */
export class CacheTestAssertions {
  /** Fail if the cache's current hit rate is below `minHitRate` (0–100). */
  static assertHitRate(cache: ICachingService, minHitRate: number): void {
    const { hitRate } = cache.getMetrics();
    if (hitRate < minHitRate) {
      throw new Error(
        `Hit rate ${hitRate.toFixed(2)}% is below the required threshold of ${minHitRate}%`
      );
    }
  }

  /** Fail if the given key is absent from the cache. */
  static async assertHasKey(cache: ICachingService, key: string): Promise<void> {
    const exists = unwrapOk(await cache.exists(key), false);
    if (!exists) throw new Error(`Expected cache to contain key "${key}" but it was absent`);
  }

  /** Fail if the given key is present in the cache. */
  static async assertNotHasKey(cache: ICachingService, key: string): Promise<void> {
    const exists = unwrapOk(await cache.exists(key), false);
    if (exists) throw new Error(`Expected cache NOT to contain key "${key}" but it was present`);
  }

  /** Fail if the cached value for `key` does not deep-equal `expected`. */
  static async assertValue<T>(cache: ICachingService, key: string, expected: T): Promise<void> {
    const value = unwrapOk(await cache.get<T>(key), null);
    if (JSON.stringify(value) !== JSON.stringify(expected)) {
      throw new Error(
        `Cache value mismatch for key "${key}".\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(value)}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CachePerformanceTest
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  operations: number;
  avgSetLatency: number;
  avgGetLatency: number;
  avgDelLatency: number;
  p95SetLatency: number;
  p95GetLatency: number;
  p95DelLatency: number;
}

/**
 * Performance benchmarking utilities.
 *
 * Includes a warmup phase to avoid JIT skewing early samples and
 * reports both average and p95 latencies.
 */
export class CachePerformanceTest {
  /** Measure the wall-clock duration of a single async operation in ms. */
  static async measureLatency(operation: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await operation();
    return performance.now() - start;
  }

  /**
   * Run a full SET → GET → DELETE benchmark against the provided cache.
   *
   * @param cache       - Cache instance under test.
   * @param operations  - Number of iterations per phase (default 1000).
   * @param warmupRatio - Fraction of `operations` used as a warmup (default 0.1).
   */
  static async benchmark(
    cache: ICachingService,
    operations = 1000,
    warmupRatio = 0.1
  ): Promise<BenchmarkResult> {
    const warmupCount = Math.max(1, Math.floor(operations * warmupRatio));

    // Warmup — discarded
    for (let i = 0; i < warmupCount; i++) {
      await cache.set(`warmup:${i}`, { data: i });
      await cache.get(`warmup:${i}`);
      await cache.delete(`warmup:${i}`);
    }

    const setLatencies: number[] = [];
    const getLatencies: number[] = [];
    const delLatencies: number[] = [];

    for (let i = 0; i < operations; i++) {
      const key = `bench:${i}`;
      const value = { data: `value-${i}` };

      setLatencies.push(await this.measureLatency(() => cache.set(key, value).then(() => undefined)));
      getLatencies.push(await this.measureLatency(() => cache.get(key).then(() => undefined)));
      delLatencies.push(await this.measureLatency(() => cache.delete(key).then(() => undefined)));
    }

    return {
      operations,
      avgSetLatency: avg(setLatencies),
      avgGetLatency: avg(getLatencies),
      avgDelLatency: avg(delLatencies),
      p95SetLatency: percentile(setLatencies, 95),
      p95GetLatency: percentile(getLatencies, 95),
      p95DelLatency: percentile(delLatencies, 95),
    };
  }
}

// ---------------------------------------------------------------------------
// Standalone utilities
// ---------------------------------------------------------------------------

/**
 * Pause execution for `ms` milliseconds.
 * Useful for waiting on TTL expiry in integration tests.
 */
export function waitForCache(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Populate a cache with an array of entries via a single `setMany` call
 * when possible, falling back to serial `set` calls otherwise.
 */
export async function createPopulatedCache(
  cache: ICachingService,
  entries: Array<{ key: string; value: unknown; options?: CacheOperationOptions }>
): Promise<ICachingService> {
  // Group entries that share the same TTL so we can batch with setMany
  const byTtl = new Map<number | undefined, Map<string, unknown>>();

  for (const { key, value, options } of entries) {
    const ttl = options?.ttl;
    const bucket = byTtl.get(ttl) ?? new Map<string, unknown>();
    bucket.set(key, value);
    byTtl.set(ttl, bucket);
  }

  for (const [ttl, batch] of byTtl) {
    await cache.setMany(batch, ttl !== undefined ? { ttl } : undefined);
  }

  return cache;
}

// ---------------------------------------------------------------------------
// Internal math helpers
// ---------------------------------------------------------------------------

function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}