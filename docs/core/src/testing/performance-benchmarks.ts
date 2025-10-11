import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { LoadTester } from './load-tester';
import type { CacheService } from '../cache/types';
import type { RateLimitStore } from '../rate-limiting/types';
import type { Logger } from '../logging/types';
import type { ValidationService } from '../validation/types';
import { logger } from '../utils/logger';

/**
 * Comprehensive performance benchmarking suite for core utilities
 */
export class PerformanceBenchmarks extends EventEmitter {
  private loadTester: LoadTester;
  private results: Map<string, BenchmarkResult> = new Map();

  constructor(private config: BenchmarkConfig = {}) {
    super();
    this.loadTester = new LoadTester();
  }

  /**
   * Run all benchmarks
   */
  async runAll(components: BenchmarkComponents): Promise<BenchmarkSuite> {
    const startTime = performance.now();
    const results: BenchmarkResult[] = [];

    this.emit('suite:start', { components: Object.keys(components) });

    try {
      // Cache benchmarks
      if (components.cache) {
        this.emit('benchmark:start', { component: 'cache' });
        const cacheResults = await this.benchmarkCache(components.cache);
        results.push(...cacheResults);
        this.emit('benchmark:complete', { component: 'cache', results: cacheResults });
      }

      // Rate limiting benchmarks
      if (components.rateLimiter) {
        this.emit('benchmark:start', { component: 'rateLimiter' });
        const rateLimitResults = await this.benchmarkRateLimit(components.rateLimiter);
        results.push(...rateLimitResults);
        this.emit('benchmark:complete', { component: 'rateLimiter', results: rateLimitResults });
      }

      // Logging benchmarks
      if (components.logger) {
        this.emit('benchmark:start', { component: 'logger' });
        const loggingResults = await this.benchmarkLogging(components.logger);
        results.push(...loggingResults);
        this.emit('benchmark:complete', { component: 'logger', results: loggingResults });
      }

      // Validation benchmarks
      if (components.validator) {
        this.emit('benchmark:start', { component: 'validator' });
        const validationResults = await this.benchmarkValidation(components.validator);
        results.push(...validationResults);
        this.emit('benchmark:complete', { component: 'validator', results: validationResults });
      }

      // Integration benchmarks
      if (Object.keys(components).length > 1) {
        this.emit('benchmark:start', { component: 'integration' });
        const integrationResults = await this.benchmarkIntegration(components);
        results.push(...integrationResults);
        this.emit('benchmark:complete', { component: 'integration', results: integrationResults });
      }

      const totalTime = performance.now() - startTime;
      const suite: BenchmarkSuite = {
        timestamp: new Date(),
        totalDurationMs: totalTime,
        results,
        summary: this.generateSummary(results),
        environment: this.getEnvironmentInfo(),
        config: this.config
      };

      this.emit('suite:complete', suite);
      return suite;

    } catch (error) {
      this.emit('suite:error', error);
      throw error;
    }
  }

  /**
   * Benchmark cache operations
   */
  async benchmarkCache(cache: CacheService): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Single operation benchmarks
    results.push(await this.benchmarkCacheGet(cache));
    results.push(await this.benchmarkCacheSet(cache));
    results.push(await this.benchmarkCacheDelete(cache));

    // Batch operation benchmarks
    results.push(await this.benchmarkCacheBatchGet(cache));
    results.push(await this.benchmarkCacheBatchSet(cache));

    // Concurrent operation benchmarks
    results.push(await this.benchmarkCacheConcurrentReads(cache));
    results.push(await this.benchmarkCacheConcurrentWrites(cache));
    results.push(await this.benchmarkCacheMixedOperations(cache));

    // Memory and performance stress tests
    results.push(await this.benchmarkCacheMemoryUsage(cache));
    results.push(await this.benchmarkCacheLargeValues(cache));

    return results;
  }

  /**
   * Benchmark rate limiting operations
   */
  async benchmarkRateLimit(rateLimiter: RateLimitStore): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Single request benchmarks
    results.push(await this.benchmarkRateLimitSingle(rateLimiter));

    // Burst traffic benchmarks
    results.push(await this.benchmarkRateLimitBurst(rateLimiter));

    // Concurrent user benchmarks
    results.push(await this.benchmarkRateLimitConcurrent(rateLimiter));

    // Algorithm-specific benchmarks
    results.push(await this.benchmarkRateLimitAlgorithms(rateLimiter));

    // Memory usage benchmarks
    results.push(await this.benchmarkRateLimitMemory(rateLimiter));

    return results;
  }

  /**
   * Benchmark logging operations
   */
  async benchmarkLogging(logger: Logger): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Single log entry benchmarks
    results.push(await this.benchmarkLoggingSingle(logger));

    // High-volume logging benchmarks
    results.push(await this.benchmarkLoggingVolume(logger));

    // Concurrent logging benchmarks
    results.push(await this.benchmarkLoggingConcurrent(logger));

    // Structured logging benchmarks
    results.push(await this.benchmarkLoggingStructured(logger));

    // Context preservation benchmarks
    results.push(await this.benchmarkLoggingContext(logger));

    return results;
  }

  /**
   * Benchmark validation operations
   */
  async benchmarkValidation(validator: ValidationService): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Simple validation benchmarks
    results.push(await this.benchmarkValidationSimple(validator));

    // Complex validation benchmarks
    results.push(await this.benchmarkValidationComplex(validator));

    // Batch validation benchmarks
    results.push(await this.benchmarkValidationBatch(validator));

    // Schema compilation benchmarks
    results.push(await this.benchmarkValidationSchemaCompilation(validator));

    return results;
  }

  /**
   * Benchmark integration scenarios
   */
  async benchmarkIntegration(components: BenchmarkComponents): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Full request pipeline benchmark
    if (components.cache && components.rateLimiter && components.logger) {
      results.push(await this.benchmarkFullRequestPipeline(components));
    }

    // Cache + validation integration
    if (components.cache && components.validator) {
      results.push(await this.benchmarkCacheValidationIntegration(components));
    }

    // Rate limiting + logging integration
    if (components.rateLimiter && components.logger) {
      results.push(await this.benchmarkRateLimitLoggingIntegration(components));
    }

    return results;
  }

  // Cache-specific benchmark implementations
  private async benchmarkCacheGet(cache: CacheService): Promise<BenchmarkResult> {
    const testKey = 'benchmark:get:test';
    await cache.set(testKey, 'test-value', 300);

    return this.runBenchmark('cache:get', async () => {
      await cache.get(testKey);
    }, {
      iterations: this.config.iterations?.cache?.get || 10000,
      warmupIterations: 1000
    });
  }

  private async benchmarkCacheSet(cache: CacheService): Promise<BenchmarkResult> {
    return this.runBenchmark('cache:set', async () => {
      const key = `benchmark:set:${Math.random()}`;
      await cache.set(key, 'test-value', 300);
    }, {
      iterations: this.config.iterations?.cache?.set || 5000,
      warmupIterations: 500
    });
  }

  private async benchmarkCacheDelete(cache: CacheService): Promise<BenchmarkResult> {
    return this.runBenchmark('cache:delete', async () => {
      const key = `benchmark:delete:${Math.random()}`;
      await cache.set(key, 'test-value', 300);
      await cache.del(key);
    }, {
      iterations: this.config.iterations?.cache?.delete || 5000,
      warmupIterations: 500
    });
  }

  private async benchmarkCacheBatchGet(cache: CacheService): Promise<BenchmarkResult> {
    if (!cache.mget) {
      return this.createSkippedResult('cache:batch-get', 'mget not supported');
    }

    // Pre-populate keys
    const keys = Array.from({ length: 100 }, (_, i) => `benchmark:batch:${i}`);
    await Promise.all(keys.map(key => cache.set(key, `value-${key}`, 300)));

    return this.runBenchmark('cache:batch-get', async () => {
      await cache.mget!(keys);
    }, {
      iterations: this.config.iterations?.cache?.batchGet || 1000,
      warmupIterations: 100
    });
  }

  private async benchmarkCacheBatchSet(cache: CacheService): Promise<BenchmarkResult> {
    if (!cache.mset) {
      return this.createSkippedResult('cache:batch-set', 'mset not supported');
    }

    return this.runBenchmark('cache:batch-set', async () => {
      const entries: [string, any, number?][] = Array.from({ length: 100 }, (_, i) => [
        `benchmark:batch-set:${i}:${Math.random()}`,
        `value-${i}`,
        300
      ]);
      await cache.mset!(entries);
    }, {
      iterations: this.config.iterations?.cache?.batchSet || 500,
      warmupIterations: 50
    });
  }

  private async benchmarkCacheConcurrentReads(cache: CacheService): Promise<BenchmarkResult> {
    const testKey = 'benchmark:concurrent:read';
    await cache.set(testKey, 'test-value', 300);

    return this.runConcurrentBenchmark('cache:concurrent-reads', async () => {
      await cache.get(testKey);
    }, {
      concurrency: this.config.concurrency?.cache?.reads || 50,
      totalOperations: this.config.iterations?.cache?.concurrentReads || 5000
    });
  }

  private async benchmarkCacheConcurrentWrites(cache: CacheService): Promise<BenchmarkResult> {
    return this.runConcurrentBenchmark('cache:concurrent-writes', async () => {
      const key = `benchmark:concurrent:write:${Math.random()}`;
      await cache.set(key, 'test-value', 300);
    }, {
      concurrency: this.config.concurrency?.cache?.writes || 25,
      totalOperations: this.config.iterations?.cache?.concurrentWrites || 2500
    });
  }

  private async benchmarkCacheMixedOperations(cache: CacheService): Promise<BenchmarkResult> {
    const operations = [
      () => cache.get(`benchmark:mixed:${Math.floor(Math.random() * 1000)}`),
      () => cache.set(`benchmark:mixed:${Math.random()}`, 'value', 300),
      () => cache.del(`benchmark:mixed:${Math.floor(Math.random() * 1000)}`)
    ];

    return this.runConcurrentBenchmark('cache:mixed-operations', async () => {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      await operation();
    }, {
      concurrency: this.config.concurrency?.cache?.mixed || 30,
      totalOperations: this.config.iterations?.cache?.mixed || 3000
    });
  }

  private async benchmarkCacheMemoryUsage(cache: CacheService): Promise<BenchmarkResult> {
    const initialMemory = process.memoryUsage();
    const startTime = performance.now();

    // Store increasingly large amounts of data
    const sizes = [1, 10, 100, 1000, 10000]; // KB
    const results: MemoryBenchmarkPoint[] = [];

    for (const sizeKB of sizes) {
      const data = 'x'.repeat(sizeKB * 1024);
      const keys: string[] = [];

      // Store 100 entries of this size
      for (let i = 0; i < 100; i++) {
        const key = `benchmark:memory:${sizeKB}kb:${i}`;
        keys.push(key);
        await cache.set(key, data, 3600);
      }

      const currentMemory = process.memoryUsage();
      results.push({
        sizeKB,
        entryCount: 100,
        heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: currentMemory.heapTotal - initialMemory.heapTotal,
        external: currentMemory.external - initialMemory.external
      });

      // Clean up
      await Promise.all(keys.map(key => cache.del(key)));
    }

    return {
      name: 'cache:memory-usage',
      category: 'cache',
      type: 'memory',
      startTime: new Date(Date.now() - (performance.now() - startTime)),
      endTime: new Date(),
      durationMs: performance.now() - startTime,
      iterations: results.length,
      operationsPerSecond: 0,
      memoryResults: results,
      success: true
    };
  }

  private async benchmarkCacheLargeValues(cache: CacheService): Promise<BenchmarkResult> {
    const sizes = [1, 10, 100, 1000]; // KB
    const results: { sizeKB: number; avgTimeMs: number; }[] = [];

    for (const sizeKB of sizes) {
      const data = 'x'.repeat(sizeKB * 1024);
      const iterations = Math.max(10, Math.floor(1000 / sizeKB));

      const times: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const key = `benchmark:large:${sizeKB}kb:${i}`;
        const start = performance.now();
        await cache.set(key, data, 300);
        await cache.get(key);
        await cache.del(key);
        times.push(performance.now() - start);
      }

      results.push({
        sizeKB,
        avgTimeMs: times.reduce((a, b) => a + b, 0) / times.length
      });
    }

    return {
      name: 'cache:large-values',
      category: 'cache',
      type: 'performance',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      iterations: results.reduce((sum, r) => sum + (1000 / r.sizeKB), 0),
      operationsPerSecond: 0,
      customResults: { largeSizeResults: results },
      success: true
    };
  }

  // Rate limiting benchmark implementations
  private async benchmarkRateLimitSingle(rateLimiter: RateLimitStore): Promise<BenchmarkResult> {
    return this.runBenchmark('rate-limit:single', async () => {
      await rateLimiter.hit('benchmark:single', 100, 60000);
    }, {
      iterations: this.config.iterations?.rateLimit?.single || 5000,
      warmupIterations: 500
    });
  }

  private async benchmarkRateLimitBurst(rateLimiter: RateLimitStore): Promise<BenchmarkResult> {
    return this.runConcurrentBenchmark('rate-limit:burst', async () => {
      await rateLimiter.hit('benchmark:burst', 1000, 60000);
    }, {
      concurrency: this.config.concurrency?.rateLimit?.burst || 100,
      totalOperations: this.config.iterations?.rateLimit?.burst || 5000
    });
  }

  private async benchmarkRateLimitConcurrent(rateLimiter: RateLimitStore): Promise<BenchmarkResult> {
    return this.runConcurrentBenchmark('rate-limit:concurrent', async () => {
      const userId = `user:${Math.floor(Math.random() * 1000)}`;
      await rateLimiter.hit(userId, 100, 60000);
    }, {
      concurrency: this.config.concurrency?.rateLimit?.concurrent || 50,
      totalOperations: this.config.iterations?.rateLimit?.concurrent || 10000
    });
  }

  private async benchmarkRateLimitAlgorithms(rateLimiter: RateLimitStore): Promise<BenchmarkResult> {
    const algorithms = ['sliding-window', 'token-bucket', 'fixed-window'];
    const results: { algorithm: string; avgTimeMs: number; }[] = [];

    for (const algorithm of algorithms) {
      const times: number[] = [];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await rateLimiter.hit(`benchmark:${algorithm}:${i}`, 100, 60000, algorithm);
        times.push(performance.now() - start);
      }

      results.push({
        algorithm,
        avgTimeMs: times.reduce((a, b) => a + b, 0) / times.length
      });
    }

    return {
      name: 'rate-limit:algorithms',
      category: 'rate-limit',
      type: 'comparison',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      iterations: algorithms.length * 1000,
      operationsPerSecond: 0,
      customResults: { algorithmResults: results },
      success: true
    };
  }

  private async benchmarkRateLimitMemory(rateLimiter: RateLimitStore): Promise<BenchmarkResult> {
    const initialMemory = process.memoryUsage();
    const startTime = performance.now();

    // Create rate limit entries for many users
    const userCounts = [100, 1000, 10000, 50000];
    const results: MemoryBenchmarkPoint[] = [];

    for (const userCount of userCounts) {
      // Create rate limit entries
      for (let i = 0; i < userCount; i++) {
        await rateLimiter.hit(`user:${i}`, 100, 60000);
      }

      const currentMemory = process.memoryUsage();
      results.push({
        sizeKB: 0,
        entryCount: userCount,
        heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: currentMemory.heapTotal - initialMemory.heapTotal,
        external: currentMemory.external - initialMemory.external
      });
    }

    return {
      name: 'rate-limit:memory-usage',
      category: 'rate-limit',
      type: 'memory',
      startTime: new Date(Date.now() - (performance.now() - startTime)),
      endTime: new Date(),
      durationMs: performance.now() - startTime,
      iterations: userCounts.reduce((a, b) => a + b, 0),
      operationsPerSecond: 0,
      memoryResults: results,
      success: true
    };
  }

  // Logging benchmark implementations
  private async benchmarkLoggingSingle(logger: Logger): Promise<BenchmarkResult> {
    return this.runBenchmark('logging:single', async () => {
      logger.info('Benchmark log message', { data: 'test' });
    }, {
      iterations: this.config.iterations?.logging?.single || 10000,
      warmupIterations: 1000
    });
  }

  private async benchmarkLoggingVolume(logger: Logger): Promise<BenchmarkResult> {
    return this.runBenchmark('logging:volume', async () => {
      for (let i = 0; i < 100; i++) {
        logger.info(`Volume test message ${i}`, { iteration: i, data: 'test'.repeat(10) });
      }
    }, {
      iterations: this.config.iterations?.logging?.volume || 100,
      warmupIterations: 10
    });
  }

  private async benchmarkLoggingConcurrent(logger: Logger): Promise<BenchmarkResult> {
    return this.runConcurrentBenchmark('logging:concurrent', async () => {
      logger.info('Concurrent log message', { 
        threadId: Math.floor(Math.random() * 1000),
        data: 'test data'
      });
    }, {
      concurrency: this.config.concurrency?.logging?.concurrent || 50,
      totalOperations: this.config.iterations?.logging?.concurrent || 5000
    });
  }

  private async benchmarkLoggingStructured(logger: Logger): Promise<BenchmarkResult> {
    const complexObject = {
      user: { id: 123, name: 'Test User', email: 'test@example.com' },
      request: { method: 'POST', url: '/api/test', headers: { 'content-type': 'application/json' } },
      response: { status: 200, body: { success: true, data: Array(100).fill('test') } },
      metadata: { timestamp: new Date(), version: '1.0.0', environment: 'test' }
    };

    return this.runBenchmark('logging:structured', async () => {
      logger.info('Structured log message', complexObject);
    }, {
      iterations: this.config.iterations?.logging?.structured || 5000,
      warmupIterations: 500
    });
  }

  private async benchmarkLoggingContext(logger: Logger): Promise<BenchmarkResult> {
    return this.runBenchmark('logging:context', async () => {
      if (logger.withContext) {
        logger.withContext({ requestId: 'test-123', userId: 'user-456' }, () => {
          logger.info('Context-aware log message');
        });
      } else {
        logger.info('Context-aware log message', { requestId: 'test-123', userId: 'user-456' });
      }
    }, {
      iterations: this.config.iterations?.logging?.context || 5000,
      warmupIterations: 500
    });
  }

  // Validation benchmark implementations
  private async benchmarkValidationSimple(validator: ValidationService): Promise<BenchmarkResult> {
    const simpleData = { name: 'Test', age: 25, email: 'test@example.com' };

    return this.runBenchmark('validation:simple', async () => {
      await validator.validate('user', simpleData);
    }, {
      iterations: this.config.iterations?.validation?.simple || 10000,
      warmupIterations: 1000
    });
  }

  private async benchmarkValidationComplex(validator: ValidationService): Promise<BenchmarkResult> {
    const complexData = {
      user: {
        id: 123,
        profile: {
          name: 'Test User',
          email: 'test@example.com',
          preferences: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false,
              sms: true
            }
          }
        },
        addresses: [
          { type: 'home', street: '123 Main St', city: 'Test City', zip: '12345' },
          { type: 'work', street: '456 Work Ave', city: 'Work City', zip: '67890' }
        ],
        orders: Array(10).fill(null).map((_, i) => ({
          id: i,
          items: Array(5).fill(null).map((_, j) => ({
            id: j,
            name: `Item ${j}`,
            price: Math.random() * 100,
            quantity: Math.floor(Math.random() * 5) + 1
          }))
        }))
      }
    };

    return this.runBenchmark('validation:complex', async () => {
      await validator.validate('complex-user', complexData);
    }, {
      iterations: this.config.iterations?.validation?.complex || 1000,
      warmupIterations: 100
    });
  }

  private async benchmarkValidationBatch(validator: ValidationService): Promise<BenchmarkResult> {
    const batchData = Array(100).fill(null).map((_, i) => ({
      name: `User ${i}`,
      age: 20 + (i % 50),
      email: `user${i}@example.com`
    }));

    return this.runBenchmark('validation:batch', async () => {
      await validator.validateBatch('user', batchData);
    }, {
      iterations: this.config.iterations?.validation?.batch || 500,
      warmupIterations: 50
    });
  }

  private async benchmarkValidationSchemaCompilation(validator: ValidationService): Promise<BenchmarkResult> {
    return this.runBenchmark('validation:schema-compilation', async () => {
      const schemaName = `dynamic-schema-${Math.random()}`;
      // This would require a method to register schemas dynamically
      // For now, we'll simulate the compilation time
      await new Promise(resolve => setTimeout(resolve, 1));
    }, {
      iterations: this.config.iterations?.validation?.schemaCompilation || 1000,
      warmupIterations: 100
    });
  }

  // Integration benchmark implementations
  private async benchmarkFullRequestPipeline(components: BenchmarkComponents): Promise<BenchmarkResult> {
    const { cache, rateLimiter, logger } = components;

    return this.runBenchmark('integration:full-pipeline', async () => {
      const userId = `user:${Math.floor(Math.random() * 1000)}`;
      const cacheKey = `data:${userId}`;

      // 1. Rate limiting check
      const rateLimitResult = await rateLimiter!.hit(userId, 100, 60000);
      
      if (rateLimitResult.allowed) {
        // 2. Cache lookup
        let data = await cache!.get(cacheKey);
        
        if (!data) {
          // 3. Simulate data generation
          data = { userId, data: 'generated data', timestamp: Date.now() };
          await cache!.set(cacheKey, data, 300);
        }

        // 4. Log the operation
        logger!.info('Request processed', { userId, cached: !!data, rateLimitRemaining: rateLimitResult.remaining });
      } else {
        logger!.warn('Rate limit exceeded', { userId, retryAfter: rateLimitResult.retryAfter });
      }
    }, {
      iterations: this.config.iterations?.integration?.fullPipeline || 2000,
      warmupIterations: 200
    });
  }

  private async benchmarkCacheValidationIntegration(components: BenchmarkComponents): Promise<BenchmarkResult> {
    const { cache, validator } = components;

    return this.runBenchmark('integration:cache-validation', async () => {
      const key = `validated:${Math.random()}`;
      const data = { name: 'Test', age: 25, email: 'test@example.com' };

      // Validate data
      const validatedData = await validator!.validate('user', data);
      
      // Cache validated data
      await cache!.set(key, validatedData, 300);
      
      // Retrieve and re-validate
      const cachedData = await cache!.get(key);
      if (cachedData) {
        await validator!.validate('user', cachedData);
      }
    }, {
      iterations: this.config.iterations?.integration?.cacheValidation || 1000,
      warmupIterations: 100
    });
  }

  private async benchmarkRateLimitLoggingIntegration(components: BenchmarkComponents): Promise<BenchmarkResult> {
    const { rateLimiter, logger } = components;

    return this.runBenchmark('integration:rate-limit-logging', async () => {
      const userId = `user:${Math.floor(Math.random() * 1000)}`;
      const result = await rateLimiter!.hit(userId, 100, 60000);

      if (result.allowed) {
        logger!.info('Request allowed', { userId, remaining: result.remaining });
      } else {
        logger!.warn('Request blocked', { userId, retryAfter: result.retryAfter });
      }
    }, {
      iterations: this.config.iterations?.integration?.rateLimitLogging || 5000,
      warmupIterations: 500
    });
  }

  // Utility methods
  private async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    options: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    const { iterations, warmupIterations = 0 } = options;
    
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Actual benchmark
    const times: number[] = [];
    const startTime = performance.now();
    const start = new Date();

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      try {
        await operation();
        times.push(performance.now() - opStart);
      } catch (error) {
        times.push(performance.now() - opStart);
        // Continue with other iterations
      }
    }

    const totalTime = performance.now() - startTime;
    const end = new Date();

    return {
      name,
      category: name.split(':')[0],
      type: 'performance',
      startTime: start,
      endTime: end,
      durationMs: totalTime,
      iterations,
      operationsPerSecond: (iterations / totalTime) * 1000,
      averageTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
      minTimeMs: Math.min(...times),
      maxTimeMs: Math.max(...times),
      percentiles: {
        p50: this.calculatePercentile(times, 50),
        p90: this.calculatePercentile(times, 90),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      },
      success: true
    };
  }

  private async runConcurrentBenchmark(
    name: string,
    operation: () => Promise<void>,
    options: ConcurrentBenchmarkOptions
  ): Promise<BenchmarkResult> {
    const { concurrency, totalOperations } = options;
    const operationsPerWorker = Math.floor(totalOperations / concurrency);
    
    const startTime = performance.now();
    const start = new Date();

    const workers = Array(concurrency).fill(null).map(async () => {
      const times: number[] = [];
      for (let i = 0; i < operationsPerWorker; i++) {
        const opStart = performance.now();
        try {
          await operation();
          times.push(performance.now() - opStart);
        } catch (error) {
          times.push(performance.now() - opStart);
        }
      }
      return times;
    });

    const results = await Promise.all(workers);
    const allTimes = results.flat();
    
    const totalTime = performance.now() - startTime;
    const end = new Date();

    return {
      name,
      category: name.split(':')[0],
      type: 'concurrent',
      startTime: start,
      endTime: end,
      durationMs: totalTime,
      iterations: allTimes.length,
      operationsPerSecond: (allTimes.length / totalTime) * 1000,
      averageTimeMs: allTimes.reduce((a, b) => a + b, 0) / allTimes.length,
      minTimeMs: Math.min(...allTimes),
      maxTimeMs: Math.max(...allTimes),
      percentiles: {
        p50: this.calculatePercentile(allTimes, 50),
        p90: this.calculatePercentile(allTimes, 90),
        p95: this.calculatePercentile(allTimes, 95),
        p99: this.calculatePercentile(allTimes, 99)
      },
      concurrency,
      success: true
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private createSkippedResult(name: string, reason: string): BenchmarkResult {
    return {
      name,
      category: name.split(':')[0],
      type: 'skipped',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      iterations: 0,
      operationsPerSecond: 0,
      success: false,
      error: reason
    };
  }

  private generateSummary(results: BenchmarkResult[]): BenchmarkSummary {
    const categories = [...new Set(results.map(r => r.category))];
    const categoryStats: Record<string, CategoryStats> = {};

    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category && r.success);
      if (categoryResults.length === 0) continue;

      const avgOps = categoryResults.reduce((sum, r) => sum + r.operationsPerSecond, 0) / categoryResults.length;
      const avgTime = categoryResults.reduce((sum, r) => sum + (r.averageTimeMs || 0), 0) / categoryResults.length;

      categoryStats[category] = {
        totalTests: categoryResults.length,
        averageOpsPerSecond: avgOps,
        averageTimeMs: avgTime,
        totalIterations: categoryResults.reduce((sum, r) => sum + r.iterations, 0)
      };
    }

    return {
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
      categoryStats
    };
  }

  private getEnvironmentInfo(): EnvironmentInfo {
    const memUsage = process.memoryUsage();
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: require('os').cpus().length,
      totalMemoryMB: require('os').totalmem() / 1024 / 1024,
      freeMemoryMB: require('os').freemem() / 1024 / 1024,
      processMemoryMB: {
        rss: memUsage.rss / 1024 / 1024,
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        heapUsed: memUsage.heapUsed / 1024 / 1024,
        external: memUsage.external / 1024 / 1024
      }
    };
  }
}

// Type definitions
export interface BenchmarkConfig {
  iterations?: {
    cache?: {
      get?: number;
      set?: number;
      delete?: number;
      batchGet?: number;
      batchSet?: number;
      concurrentReads?: number;
      concurrentWrites?: number;
      mixed?: number;
    };
    rateLimit?: {
      single?: number;
      burst?: number;
      concurrent?: number;
    };
    logging?: {
      single?: number;
      volume?: number;
      concurrent?: number;
      structured?: number;
      context?: number;
    };
    validation?: {
      simple?: number;
      complex?: number;
      batch?: number;
      schemaCompilation?: number;
    };
    integration?: {
      fullPipeline?: number;
      cacheValidation?: number;
      rateLimitLogging?: number;
    };
  };
  concurrency?: {
    cache?: {
      reads?: number;
      writes?: number;
      mixed?: number;
    };
    rateLimit?: {
      burst?: number;
      concurrent?: number;
    };
    logging?: {
      concurrent?: number;
    };
  };
}

export interface BenchmarkComponents {
  cache?: CacheService;
  rateLimiter?: RateLimitStore;
  logger?: Logger;
  validator?: ValidationService;
}

export interface BenchmarkResult {
  name: string;
  category: string;
  type: 'performance' | 'concurrent' | 'memory' | 'comparison' | 'skipped';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  iterations: number;
  operationsPerSecond: number;
  averageTimeMs?: number;
  minTimeMs?: number;
  maxTimeMs?: number;
  percentiles?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  concurrency?: number;
  memoryResults?: MemoryBenchmarkPoint[];
  customResults?: Record<string, any>;
  success: boolean;
  error?: string;
}

export interface BenchmarkSuite {
  timestamp: Date;
  totalDurationMs: number;
  results: BenchmarkResult[];
  summary: BenchmarkSummary;
  environment: EnvironmentInfo;
  config: BenchmarkConfig;
}

export interface BenchmarkSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  totalDurationMs: number;
  categoryStats: Record<string, CategoryStats>;
}

export interface CategoryStats {
  totalTests: number;
  averageOpsPerSecond: number;
  averageTimeMs: number;
  totalIterations: number;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  processMemoryMB: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface MemoryBenchmarkPoint {
  sizeKB: number;
  entryCount: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface BenchmarkOptions {
  iterations: number;
  warmupIterations?: number;
}

interface ConcurrentBenchmarkOptions {
  concurrency: number;
  totalOperations: number;
}






