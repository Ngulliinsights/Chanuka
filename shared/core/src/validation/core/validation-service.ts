/**
 * Core Validation Service
 *
 * Abstract base class implementing the core validation service interface
 * with schema caching, preprocessing, and metrics collection
 */

import crypto from 'crypto';
import { logger } from '../../logging';
import { ValidationError } from '../../observability/error-management/errors/specialized-errors';
import {
  IValidationService,
  IValidationResult,
  IBatchValidationResult,
  IValidationOptions,
  IValidationContext,
  IValidationServiceConfig,
  IValidationMetrics,
  ICachedValidationResult,
  ISchemaRegistration,
  IPreprocessingConfig,
  ICachingConfig,
} from './interfaces';

/**
 * Abstract base validation service implementing core functionality
 * 
 * This class provides the foundation for all validation adapters (Zod, Joi, etc.)
 * by implementing common concerns like caching, preprocessing, and metrics tracking.
 * Concrete implementations only need to implement the actual validation logic.
 */
export abstract class CoreValidationService implements ValidationService {
  // Schema registry stores all registered schemas by name for quick lookup
  protected schemaRegistry = new Map<string, ISchemaRegistration>();
  
  // Validation cache stores recently validated data to improve performance
  protected validationCache = new Map<string, ICachedValidationResult<any>>();
  
  // Metrics track validation performance and patterns over time
  protected metrics: IValidationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgValidationTime: 0,
    schemaUsageCount: {},
    errorsByField: {},
    errorsByCode: {},
  };
  
  // Configuration controls all aspects of validation behavior
  protected config: IValidationServiceConfig;

  /**
   * Initialize the validation service with configuration
   * 
   * The configuration is merged with sensible defaults to ensure
   * the service works out of the box while remaining highly customizable
   */
  constructor(config: IValidationServiceConfig = {}) {
    // Build complete configuration by merging provided config with defaults
    // This ensures that all nested objects exist even if not provided
    this.config = {
      defaultOptions: {
        preprocess: true,
        useCache: true,
        cacheTtl: 300, // 5 minutes default cache lifetime
        stripUnknown: false,
        abortEarly: false,
        ...config.defaultOptions,
      },
      preprocessing: {
        trimStrings: true,
        coerceNumbers: true,
        coerceBooleans: true,
        emptyStringToNull: false,
        undefinedToNull: false,
        customPreprocessors: [],
        ...config.preprocessing,
      },
      cache: {
        enabled: true,
        defaultTtl: 300,
        maxSize: 1000,
        ...config.cache,
      },
      metrics: {
        enabled: true,
        trackSchemaUsage: true,
        trackErrorPatterns: true,
        ...config.metrics,
      },
    };

    // Start periodic cache cleanup to prevent memory leaks from stale entries
    // This runs every minute and removes expired cache entries
    if (this.config.cache?.enabled) {
      setInterval(() => this.cleanupExpiredCache(), 60000);
    }
  }

  /**
   * Validate data against a schema, returning the typed result or throwing an error
   * 
   * This is the "throw on error" version - it's convenient when you want to
   * use try-catch for error handling rather than checking a result object
   * 
   * @abstract Must be implemented by concrete validation service
   */
  abstract validate<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<T>;

  /**
   * Validate data safely, always returning a result object with success status
   * 
   * This is the "never throw" version - it's useful when you want to handle
   * validation errors as data rather than exceptions
   * 
   * @abstract Must be implemented by concrete validation service
   */
  abstract validateSafe<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IValidationResult<T>>;

  /**
   * Validate multiple data items against the same schema efficiently
   * 
   * This method optimizes batch validation by reusing the schema compilation
   * and collecting all results into a single response object
   * 
   * @abstract Must be implemented by concrete validation service
   */
  abstract validateBatch<T>(
    schema: any,
    dataArray: unknown[],
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IBatchValidationResult<T>>;

  /**
   * Register a schema with a human-readable name for later retrieval
   * 
   * Schema registration is useful when you have schemas that are used frequently
   * across your application. Instead of passing the schema object every time,
   * you can register it once and reference it by name.
   */
  registerSchema(
    name: string,
    schema: any,
    options: {
      version?: string;
      description?: string;
      tags?: string[];
    } = {}
  ): void {
    const registration: ISchemaRegistration = {
      name,
      schema,
      version: options.version || '1.0.0',
      description: options.description || '',
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.schemaRegistry.set(name, registration);
  }

  /**
   * Retrieve a previously registered schema by name
   * 
   * Returns undefined if no schema with that name exists, allowing you
   * to handle missing schemas gracefully
   */
  getSchema(name: string): any | undefined {
    const registration = this.schemaRegistry.get(name);
    return registration?.schema;
  }

  /**
   * Get all registered schemas with their metadata
   * 
   * This is useful for building schema catalogs, documentation, or
   * administrative interfaces that need to list available schemas
   */
  getRegisteredSchemas(): ISchemaRegistration[] {
    return Array.from(this.schemaRegistry.values());
  }

  /**
   * Get current validation metrics for monitoring and observability
   * 
   * Returns a copy of the metrics object to prevent external modification
   * of the internal metrics state
   */
  getMetrics(): IValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all validation metrics to zero
   * 
   * Useful for testing or when you want to track metrics for a specific
   * time period without the historical data
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgValidationTime: 0,
      schemaUsageCount: {},
      errorsByField: {},
      errorsByCode: {},
    };
  }

  /**
   * Clear all entries from the validation cache
   * 
   * This is useful when you need to force fresh validation of all data,
   * for example after a schema change or during testing
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics for monitoring cache effectiveness
   * 
   * The hit rate is particularly important - a low hit rate might indicate
   * that caching isn't beneficial for your usage pattern
   */
  getCacheStats() {
    return {
      size: this.validationCache.size,
      maxSize: this.config.cache?.maxSize || 1000,
      hitRate: this.metrics.totalValidations > 0
        ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
        : 0,
    };
  }

  /**
   * Preprocess data before validation according to configured rules
   * 
   * Preprocessing normalizes data into a consistent format before validation.
   * This can handle things like trimming whitespace, converting string "true"
   * to boolean true, or converting string numbers to actual numbers.
   */
  protected preprocessData(data: unknown): unknown {
    if (!this.config.preprocessing) {
      return data;
    }

    const config = this.config.preprocessing;

    // First apply the built-in preprocessing rules
    let processed = this.applyBuiltInPreprocessing(data, config);

    // Then apply any custom preprocessors in the order they were registered
    if (config.customPreprocessors) {
      for (const preprocessor of config.customPreprocessors) {
        processed = preprocessor(processed);
      }
    }

    return processed;
  }

  /**
   * Apply built-in preprocessing rules recursively through data structures
   * 
   * This method handles the standard transformations like trimming and coercion.
   * It recursively processes arrays and objects to ensure all nested data
   * gets preprocessed consistently.
   */
  private applyBuiltInPreprocessing(data: unknown, config: IPreprocessingConfig): unknown {
    // Handle null and undefined at the top level
    if (data === null || data === undefined) {
      if (config.undefinedToNull && data === undefined) {
        return null;
      }
      return data;
    }

    // String preprocessing is where most of the magic happens
    if (typeof data === 'string') {
      let processed = data;

      // Trimming should happen first to remove leading/trailing whitespace
      if (config.trimStrings) {
        processed = processed.trim();
      }

      // After trimming, check if we should convert empty strings to null
      if (config.emptyStringToNull && processed === '') {
        return null;
      }

      // Try boolean coercion before number coercion
      // This ensures "1" and "0" can become booleans if that's configured
      if (config.coerceBooleans) {
        const lower = processed.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
          return false;
        }
      }

      // Number coercion only happens if the string looks like a valid number
      if (config.coerceNumbers && /^-?\d+(\.\d+)?$/.test(processed)) {
        const num = Number(processed);
        if (!isNaN(num) && isFinite(num)) {
          return num;
        }
      }

      return processed;
    }

    // Recursively process arrays, maintaining the same order
    if (Array.isArray(data)) {
      return data.map(item => this.applyBuiltInPreprocessing(item, config));
    }

    // Recursively process objects, maintaining all keys
    if (typeof data === 'object' && data !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.applyBuiltInPreprocessing(value, config);
      }
      return processed;
    }

    // For all other types (numbers, booleans, etc.), return as-is
    return data;
  }

  /**
   * Generate a cache key for storing/retrieving validation results
   * 
   * The cache key must uniquely identify the combination of schema, data, and
   * options. If any of these change, we need a different cache key to ensure
   * we don't return stale results.
   */
  protected generateCacheKey(
    schema: any,
    data: unknown,
    options: IValidationOptions
  ): string {
    // If a custom cache key generator is provided, use it
    // This allows for application-specific caching strategies
    if (options.cacheKeyGenerator) {
      return options.cacheKeyGenerator(schema, data);
    }

    // Default implementation: hash all three components and combine them
    const schemaHash = this.hashObject(schema);
    const dataHash = this.hashObject(data);
    const optionsHash = this.hashObject(options);

    return `validation:${schemaHash}:${dataHash}:${optionsHash}`;
  }

  /**
   * Create a short hash of an object for use in cache keys
   * 
   * We use MD5 here because we don't need cryptographic security,
   * just a reasonably collision-resistant hash for cache key generation.
   * The substring keeps keys short while maintaining good distribution.
   */
  private hashObject(obj: unknown): string {
    // Stringify with sorted keys to ensure consistent hashing
    const str = JSON.stringify(obj, Object.keys(obj as object).sort());
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Attempt to retrieve a validation result from cache
   * 
   * Returns null if the entry doesn't exist or has expired. This method
   * automatically cleans up expired entries as it encounters them.
   */
  protected getFromCache<T>(key: string): IValidationResult<T> | null {
    const cached = this.validationCache.get(key);
    if (!cached) {
      return null;
    }

    // Check if the cached entry has expired based on its TTL
    const now = Date.now();
    if (now > cached.timestamp + (cached.ttl * 1000)) {
      // Entry has expired, remove it and return null
      this.validationCache.delete(key);
      return null;
    }

    // Entry is still valid, return the cached result
    return cached.result;
  }

  /**
   * Store a validation result in the cache with a time-to-live
   * 
   * This implements a simple LRU-like eviction strategy: when the cache is full,
   * we remove the oldest entry. A more sophisticated implementation might use
   * actual LRU tracking or other eviction strategies.
   */
  protected setCache<T>(key: string, result: IValidationResult<T>, ttl?: number): void {
    if (!this.config.cache?.enabled) {
      return;
    }

    const cacheTtl = ttl || this.config.cache.defaultTtl;

    // If we're at the cache size limit, evict the oldest entry
    if (this.validationCache.size >= (this.config.cache.maxSize || 1000)) {
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey) {
        this.validationCache.delete(oldestKey);
      }
    }

    // Store the new cache entry with timestamp and TTL
    this.validationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: cacheTtl,
    });
  }

  /**
   * Periodically clean up expired cache entries
   * 
   * This runs on a timer (started in the constructor) to prevent the cache
   * from growing indefinitely with stale entries. It's more efficient to do
   * periodic cleanup than to check every entry on every cache lookup.
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.validationCache.entries()) {
      if (now > cached.timestamp + (cached.ttl * 1000)) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * Update validation metrics after each operation
   * 
   * This tracks both high-level metrics (success rate, timing) and detailed
   * metrics (error patterns) that help identify issues in your validation logic
   * or common problems in your data.
   */
  protected updateMetrics(
    type: 'success' | 'failure' | 'cacheHit' | 'cacheMiss',
    startTime?: number,
    context?: IValidationContext,
    error?: ValidationError
  ): void {
    if (!this.config.metrics?.enabled) {
      return;
    }

    this.metrics.totalValidations++;

    switch (type) {
      case 'success':
        this.metrics.successfulValidations++;
        break;
      case 'failure':
        this.metrics.failedValidations++;
        // Track error patterns to identify common validation issues
        if (error && this.config.metrics.trackErrorPatterns) {
          this.trackErrorPatterns(error);
        }
        break;
      case 'cacheHit':
        this.metrics.cacheHits++;
        break;
      case 'cacheMiss':
        this.metrics.cacheMisses++;
        break;
    }

    // Update the rolling average validation time using the mathematical formula
    // for incrementally updating an average: new_avg = (old_avg * (n-1) + new_value) / n
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      this.metrics.avgValidationTime =
        (this.metrics.avgValidationTime * (this.metrics.totalValidations - 1) + duration) /
        this.metrics.totalValidations;
    }
  }

  /**
   * Track error patterns for analytics and debugging
   * 
   * This helps identify which types of validation errors occur most frequently,
   * allowing you to improve either your validation schemas or your data quality
   * processes.
   */
  private trackErrorPatterns(error: ValidationError): void {
    // Track errors by their code or message to identify patterns
    // In a production system, you'd want more sophisticated error categorization
    const errorCode = error.message.toLowerCase();
    this.metrics.errorsByCode[errorCode] = (this.metrics.errorsByCode[errorCode] || 0) + 1;
  }
}