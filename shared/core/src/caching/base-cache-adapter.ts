/**
 * Base Cache Adapter Implementation
 * 
 * Abstract base class providing common functionality for cache adapters using Result types.
 * This replaces the existing BaseCacheAdapter with a more robust design that follows
 * functional programming principles and explicit error handling.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { Result, ok, err } from '../primitives/types/result';
import type {
  CacheAdapter,
  CacheMetrics,
  HealthStatus,
  CacheEvent,
  CacheEventType,
  BaseCacheConfig,
  CacheOperationOptions,
  CacheValidationResult
} from './interfaces';

/**
 * Abstract base class for cache adapters
 * 
 * Provides common functionality including metrics collection, event emission,
 * validation, and error handling using Result types.
 */
export abstract class BaseCacheAdapter extends EventEmitter implements CacheAdapter {
  protected readonly config: BaseCacheConfig;
  protected metrics: CacheMetrics;
  protected isInitialized: boolean = false;
  protected isShutdown: boolean = false;
  protected responseTimes: number[] = [];
  protected readonly maxResponseTimeHistory = 1000;

  constructor(config: BaseCacheConfig) {
    super();
    this.config = { ...config };
    this.metrics = this.createInitialMetrics();
    this.setMaxListeners(50); // Allow multiple listeners for monitoring
  }

  // Abstract methods that must be implemented by concrete adapters
  
  /**
   * Abstract method for retrieving values from the underlying cache
   * Concrete implementations should handle the actual cache retrieval logic
   */
  protected abstract doGet<T>(key: string): Promise<Result<T | null, Error>>;
  
  /**
   * Abstract method for storing values in the underlying cache
   * Concrete implementations should handle the actual cache storage logic
   */
  protected abstract doSet<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>>;
  
  /**
   * Abstract method for deleting values from the underlying cache
   * Concrete implementations should handle the actual cache deletion logic
   */
  protected abstract doDelete(key: string): Promise<Result<void, Error>>;
  
  /**
   * Abstract method for clearing all values from the underlying cache
   * Concrete implementations should handle the actual cache clearing logic
   */
  protected abstract doClear(): Promise<Result<void, Error>>;
  
  /**
   * Abstract method for checking if a key exists in the underlying cache
   * Concrete implementations should handle the actual existence checking logic
   */
  protected abstract doExists(key: string): Promise<Result<boolean, Error>>;
  
  /**
   * Abstract method for initializing the underlying cache
   * Concrete implementations should handle connection setup, validation, etc.
   */
  protected abstract doInitialize(): Promise<Result<void, Error>>;
  
  /**
   * Abstract method for shutting down the underlying cache
   * Concrete implementations should handle cleanup, connection closing, etc.
   */
  protected abstract doShutdown(): Promise<Result<void, Error>>;

  // Public interface methods with common functionality

  /**
   * Retrieve a value from the cache with metrics and validation
   */
  async get<T>(key: string): Promise<Result<T | null, Error>> {
    if (this.isShutdown) {
      return err(new Error('Cache adapter has been shutdown'));
    }

    const validationResult = this.validateKey(key);
    if (!validationResult.isValid) {
      return err(new Error(`Invalid cache key: ${validationResult.errors.join(', ')}`));
    }

    const formattedKey = this.formatKey(key);
    
    return this.measureOperation(
      () => this.doGet<T>(formattedKey),
      'get',
      key,
      (result) => {
        if (result.isOk() && result.value !== null) {
          this.recordHit(key);
        } else if (result.isOk() && result.value === null) {
          this.recordMiss(key);
        }
      }
    );
  }

  /**
   * Store a value in the cache with metrics and validation
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<Result<void, Error>> {
    if (this.isShutdown) {
      return err(new Error('Cache adapter has been shutdown'));
    }

    const keyValidation = this.validateKey(key);
    if (!keyValidation.isValid) {
      return err(new Error(`Invalid cache key: ${keyValidation.errors.join(', ')}`));
    }

    const ttlValidation = this.validateTtl(ttl);
    if (!ttlValidation.isValid) {
      return err(new Error(`Invalid TTL: ${ttlValidation.errors.join(', ')}`));
    }

    const formattedKey = this.formatKey(key);
    const validatedTtl = ttl !== undefined ? ttl : this.config.defaultTtl;
    
    return this.measureOperation(
      () => this.doSet(formattedKey, value, validatedTtl),
      'set',
      key,
      (result) => {
        if (result.isOk()) {
          this.recordSet(key, this.calculateSize(value));
        }
      }
    );
  }

  /**
   * Delete a value from the cache with metrics and validation
   */
  async delete(key: string): Promise<Result<void, Error>> {
    if (this.isShutdown) {
      return err(new Error('Cache adapter has been shutdown'));
    }

    const validationResult = this.validateKey(key);
    if (!validationResult.isValid) {
      return err(new Error(`Invalid cache key: ${validationResult.errors.join(', ')}`));
    }

    const formattedKey = this.formatKey(key);
    
    return this.measureOperation(
      () => this.doDelete(formattedKey),
      'delete',
      key,
      (result) => {
        if (result.isOk()) {
          this.recordDelete(key);
        }
      }
    );
  }

  /**
   * Clear all values from the cache with metrics
   */
  async clear(): Promise<Result<void, Error>> {
    if (this.isShutdown) {
      return err(new Error('Cache adapter has been shutdown'));
    }

    return this.measureOperation(
      () => this.doClear(),
      'clear',
      '*',
      (result) => {
        if (result.isOk()) {
          this.resetOperationalMetrics();
        }
      }
    );
  }

  /**
   * Check if a key exists in the cache with metrics and validation
   */
  async exists(key: string): Promise<Result<boolean, Error>> {
    if (this.isShutdown) {
      return err(new Error('Cache adapter has been shutdown'));
    }

    const validationResult = this.validateKey(key);
    if (!validationResult.isValid) {
      return err(new Error(`Invalid cache key: ${validationResult.errors.join(', ')}`));
    }

    const formattedKey = this.formatKey(key);
    
    return this.measureOperation(
      () => this.doExists(formattedKey),
      'exists',
      key
    );
  }

  /**
   * Initialize the cache adapter with validation
   */
  async initialize(): Promise<Result<void, Error>> {
    if (this.isInitialized) {
      return ok(undefined);
    }

    if (this.isShutdown) {
      return err(new Error('Cannot initialize a shutdown cache adapter'));
    }

    const configValidation = this.validateConfig();
    if (!configValidation.isValid) {
      return err(new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`));
    }

    const result = await this.measureOperation(
      () => this.doInitialize(),
      'initialization',
      this.config.name
    );

    if (result.isOk()) {
      this.isInitialized = true;
      this.emitCacheEvent('initialization', this.config.name);
    }

    return result;
  }

  /**
   * Perform a health check on the cache adapter
   */
  async healthCheck(): Promise<HealthStatus> {
    const start = performance.now();
    const details: HealthStatus['details'] = {};

    try {
      // Test basic operations if initialized
      if (this.isInitialized && !this.isShutdown) {
        const testKey = `health_check_${Date.now()}_${Math.random()}`;
        const testValue = 'health_check_value';
        
        // Test set operation
        const setResult = await this.set(testKey, testValue, 60);
        if (setResult.isErr()) {
          details.lastError = {
            message: `Set operation failed: ${setResult.error.message}`,
            timestamp: new Date(),
            code: 'HEALTH_CHECK_SET_FAILED'
          };
        }

        // Test get operation
        const getResult = await this.get<string>(testKey);
        if (getResult.isErr()) {
          details.lastError = {
            message: `Get operation failed: ${getResult.error.message}`,
            timestamp: new Date(),
            code: 'HEALTH_CHECK_GET_FAILED'
          };
        } else if (getResult.value !== testValue) {
          details.lastError = {
            message: 'Get operation returned incorrect value',
            timestamp: new Date(),
            code: 'HEALTH_CHECK_VALUE_MISMATCH'
          };
        }

        // Clean up test key
        await this.delete(testKey);
      }

      const latency = performance.now() - start;
      const metrics = this.getMetrics();

      // Determine health status
      let status: HealthStatus['status'] = 'healthy';
      
      if (this.isShutdown) {
        status = 'unhealthy';
        details.lastError = {
          message: 'Cache adapter is shutdown',
          timestamp: new Date(),
          code: 'ADAPTER_SHUTDOWN'
        };
      } else if (!this.isInitialized) {
        status = 'unhealthy';
        details.lastError = {
          message: 'Cache adapter is not initialized',
          timestamp: new Date(),
          code: 'ADAPTER_NOT_INITIALIZED'
        };
      } else if (details.lastError) {
        status = 'degraded';
      } else if (metrics.errors > 0 && metrics.errors / metrics.totalOperations > 0.05) {
        status = 'degraded';
        details.lastError = {
          message: `High error rate: ${((metrics.errors / metrics.totalOperations) * 100).toFixed(2)}%`,
          timestamp: new Date(),
          code: 'HIGH_ERROR_RATE'
        };
      }

      // Add memory information if available
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        details.memory = {
          used: memUsage.heapUsed,
          available: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
        };
      }

      this.emitCacheEvent('health_check', this.config.name, { duration: latency });

      return {
        status,
        latency,
        details,
        timestamp: new Date()
      };

    } catch (error) {
      const latency = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      details.lastError = {
        message: errorMessage,
        timestamp: new Date(),
        code: 'HEALTH_CHECK_EXCEPTION'
      };

      return {
        status: 'unhealthy',
        latency,
        details,
        timestamp: new Date()
      };
    }
  }

  /**
   * Gracefully shutdown the cache adapter
   */
  async shutdown(): Promise<Result<void, Error>> {
    if (this.isShutdown) {
      return ok(undefined);
    }

    const result = await this.measureOperation(
      () => this.doShutdown(),
      'shutdown',
      this.config.name
    );

    if (result.isOk()) {
      this.isShutdown = true;
      this.isInitialized = false;
      this.removeAllListeners();
      this.emitCacheEvent('shutdown', this.config.name);
    }

    return result;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    // Update calculated fields
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    this.metrics.averageLatency = this.calculateAverageLatency();
    this.metrics.lastUpdated = new Date();

    return { ...this.metrics };
  }

  // Protected helper methods

  /**
   * Format cache key with prefix
   */
  protected formatKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Validate cache key format and constraints
   */
  protected validateKey(key: string): CacheValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!key || typeof key !== 'string') {
      errors.push('Key must be a non-empty string');
    } else {
      if (key.length > 250) {
        errors.push('Key cannot exceed 250 characters');
      }
      
      if (/[\r\n\t\f\v\0]/.test(key)) {
        errors.push('Key contains invalid control characters');
      }
      
      if (key.includes('  ')) {
        warnings.push('Key contains multiple consecutive spaces');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate TTL value
   */
  protected validateTtl(ttl?: number): CacheValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (ttl !== undefined) {
      if (typeof ttl !== 'number' || !Number.isFinite(ttl)) {
        errors.push('TTL must be a finite number');
      } else if (ttl < 0) {
        errors.push('TTL cannot be negative');
      } else if (ttl > 86400 * 365) { // 1 year
        warnings.push('TTL exceeds 1 year, consider if this is intentional');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate cache configuration
   */
  protected validateConfig(): CacheValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.name || typeof this.config.name !== 'string') {
      errors.push('Cache name must be a non-empty string');
    }

    if (typeof this.config.defaultTtl !== 'number' || this.config.defaultTtl < 0) {
      errors.push('Default TTL must be a non-negative number');
    }

    if (this.config.maxEntries !== undefined && 
        (typeof this.config.maxEntries !== 'number' || this.config.maxEntries < 0)) {
      errors.push('Max entries must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Measure operation performance and handle common concerns
   */
  protected async measureOperation<T>(
    operation: () => Promise<Result<T, Error>>,
    eventType: CacheEventType,
    key: string,
    onComplete?: (result: Result<T, Error>) => void
  ): Promise<Result<T, Error>> {
    const start = performance.now();
    this.metrics.totalOperations++;

    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.updateResponseTimes(duration);
      
      if (result.isErr()) {
        this.metrics.errors++;
        this.emitCacheEvent('error', key, { 
          duration, 
          error: result.error,
          eventType 
        });
      } else {
        this.emitCacheEvent(eventType, key, { duration });
      }

      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const cacheError = error instanceof Error ? error : new Error(String(error));
      
      this.metrics.errors++;
      this.updateResponseTimes(duration);
      this.emitCacheEvent('error', key, { 
        duration, 
        error: cacheError,
        eventType 
      });
      
      return err(cacheError);
    }
  }

  /**
   * Record cache hit for metrics
   */
  protected recordHit(key: string): void {
    if (this.config.enableMetrics !== false) {
      this.metrics.hits++;
    }
  }

  /**
   * Record cache miss for metrics
   */
  protected recordMiss(key: string): void {
    if (this.config.enableMetrics !== false) {
      this.metrics.misses++;
    }
  }

  /**
   * Record cache set operation for metrics
   */
  protected recordSet(key: string, size?: number): void {
    if (this.config.enableMetrics !== false) {
      this.metrics.entryCount++;
      if (size !== undefined) {
        this.metrics.memoryUsage += size;
      }
    }
  }

  /**
   * Record cache delete operation for metrics
   */
  protected recordDelete(key: string): void {
    if (this.config.enableMetrics !== false) {
      this.metrics.entryCount = Math.max(0, this.metrics.entryCount - 1);
    }
  }

  /**
   * Emit cache event for monitoring
   */
  protected emitCacheEvent(
    type: CacheEventType,
    key: string,
    data: Partial<CacheEvent> = {}
  ): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: new Date(),
      ...data
    };

    this.emit('cache:event', event);
    this.emit(`cache:${type}`, event);
  }

  /**
   * Calculate size of data for metrics
   */
  protected calculateSize(data: any): number {
    try {
      if (typeof data === 'string') {
        return Buffer.byteLength(data, 'utf8');
      }
      
      if (Buffer.isBuffer(data)) {
        return data.length;
      }
      
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      // Fallback for complex objects
      return JSON.stringify(data).length * 2;
    }
  }

  /**
   * Update response time tracking
   */
  private updateResponseTimes(duration: number): void {
    this.responseTimes.push(duration);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  /**
   * Calculate average latency from response times
   */
  private calculateAverageLatency(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }
    
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimes.length;
  }

  /**
   * Create initial metrics object
   */
  private createInitialMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      averageLatency: 0,
      errors: 0,
      totalOperations: 0,
      entryCount: 0,
      memoryUsage: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Reset operational metrics (hits, misses, etc.) but keep structural metrics
   */
  private resetOperationalMetrics(): void {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    this.metrics.hitRate = 0;
    this.metrics.entryCount = 0;
    this.metrics.memoryUsage = 0;
    this.responseTimes = [];
  }
}