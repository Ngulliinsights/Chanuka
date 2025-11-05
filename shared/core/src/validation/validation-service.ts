/**
 * ValidationService - High-performance validation framework with Zod integration
 * 
 * A production-ready validation service that combines schema-based validation with
 * intelligent caching, data preprocessing, and comprehensive observability.
 * 
 * Key improvements in this version:
 * - Optimized cache key generation using WeakMap for schema references
 * - Reduced memory footprint through efficient cache eviction
 * - Improved type safety with better generic constraints
 * - Enhanced error handling with detailed context
 * - Performance optimizations in preprocessing pipeline
 */

import { ZodSchema, ZodError } from 'zod';
import * as crypto from 'crypto';
import { logger } from '../observability/logging';
import { ValidationError } from './types';
import { commonSchemas } from './schemas/common';
import {
  ValidationOptions,
  ValidationResult,
  BatchValidationResult,
  CachedValidationResult,
  SchemaRegistration,
  ValidationMetrics,
  PreprocessingConfig,
  ValidationServiceConfig,
  ValidationContext,
} from './types';

/**
 * Main validation service providing enterprise-grade validation capabilities.
 * 
 * Architecture highlights:
 * - Schema registry for centralized schema management
 * - Multi-layer caching with TTL and size-based eviction
 * - Configurable preprocessing pipeline for data normalization
 * - Concurrent batch processing for high-throughput scenarios
 * - Real-time metrics for monitoring and optimization
 */
export class ValidationService {
  // Core storage
  private readonly schemaRegistry = new Map<string, SchemaRegistration>();
  private readonly validationCache = new Map<string, CachedValidationResult<any>>();
  
  // Performance optimization: WeakMap for schema identity tracking
  // This allows us to reuse schema hashes without repeated computation
  private readonly schemaHashCache = new WeakMap<ZodSchema, string>();
  
  // Resource management
  private cacheCleanupInterval: NodeJS.Timeout | undefined;
  
  // Observability
  private metrics: ValidationMetrics = {
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
  
  private readonly config: Required<ValidationServiceConfig>;

  constructor(config: ValidationServiceConfig = {}) {
    // Merge user config with sensible defaults
    // Using Required<> type ensures all nested properties are defined
    this.config = {
      defaultOptions: {
        preprocess: true,
        useCache: true,
        cacheTtl: 300, // 5 minutes - balances freshness with performance
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
        maxSize: 1000, // Conservative limit to prevent memory issues
        ...config.cache,
      },
      metrics: {
        enabled: true,
        trackSchemaUsage: true,
        trackErrorPatterns: true,
        ...config.metrics,
      },
    } as Required<ValidationServiceConfig>;

    // Initialize background cache maintenance
    // Using unref() ensures this doesn't prevent process shutdown
    if (this.config.cache.enabled) {
      this.cacheCleanupInterval = setInterval(
        () => this.cleanupExpiredCache(), 
        60000 // Clean up every minute to maintain consistent memory usage
      );
      this.cacheCleanupInterval.unref();
    }
  }

  /**
   * Register a schema for reuse across your application.
   * 
   * Schema registration provides several benefits:
   * - Centralized schema definitions prevent duplication
   * - Version tracking helps manage schema evolution
   * - Tags enable categorization and discovery
   * - Timestamps support auditing and debugging
   * 
   * Example usage:
   *   validationService.registerSchema('user', userSchema, {
   *     version: '2.0.0',
   *     description: 'User profile validation',
   *     tags: ['auth', 'profile']
   *   });
   */
  registerSchema(
    name: string,
    schema: ZodSchema,
    options: {
      version?: string;
      description?: string;
      tags?: string[];
    } = {}
  ): void {
    const now = new Date();
    const existing = this.schemaRegistry.get(name);
    
    const registration: SchemaRegistration = {
      name,
      schema,
      version: options.version || '1.0.0',
      description: options.description || '',
      tags: options.tags || [],
      created_at: existing?.created_at || now, // Preserve original creation time
      updated_at: now,
    };

    this.schemaRegistry.set(name, registration);
    
    // Invalidate cache entries using this schema since it changed
    // This prevents stale validation results after schema updates
    if (existing && this.config.cache.enabled) {
      this.invalidateCacheForSchema(name);
    }
  }

  /**
   * Retrieve a registered schema by name.
   * 
   * Returns undefined rather than throwing to support optional schema patterns.
   * This allows you to check for schema existence without try-catch blocks.
   */
  getSchema(name: string): ZodSchema | undefined {
    return this.schemaRegistry.get(name)?.schema;
  }

  /**
   * List all registered schemas for introspection.
   * 
   * Useful for:
   * - Generating API documentation
   * - Building schema exploration UIs
   * - Auditing validation coverage
   * - Debugging schema conflicts
   */
  getRegisteredSchemas(): SchemaRegistration[] {
    return Array.from(this.schemaRegistry.values());
  }

  /**
   * Access pre-built common validation schemas.
   *
   * These schemas handle common validation patterns:
   * - phone: E.164 international phone numbers
   * - email: RFC-compliant email addresses  
   * - uuid: Version 4 UUIDs
   * - url: HTTP/HTTPS URLs with protocol
   * - dateRange: Start/end dates with ordering validation
   * - pagination: Page/limit parameters with sensible bounds
   *
   * Using common schemas ensures consistency across your application.
   */
  getCommonSchema(name: string): ZodSchema | undefined {
    return commonSchemas[name as keyof typeof commonSchemas];
  }

  /**
   * Validate data with comprehensive error handling (throws on failure).
   * 
   * This method implements a multi-stage validation pipeline:
   * 
   * Stage 1 - Cache Lookup: Check if we've validated identical data recently
   * Stage 2 - Preprocessing: Normalize data format (trim, coerce types, etc.)
   * Stage 3 - Schema Validation: Apply Zod schema rules
   * Stage 4 - Caching: Store result for future requests
   * Stage 5 - Metrics: Track performance and error patterns
   * 
   * The throwing behavior makes this ideal for middleware and request handlers
   * where you want validation failures to bubble up as exceptions.
   */
  async validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: ValidationOptions = {},
    context?: ValidationContext
  ): Promise<T> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };
    
    // Track schema usage for analytics
    if (this.config.metrics.trackSchemaUsage && context?.schemaName) {
      this.metrics.schemaUsageCount[context.schemaName] = 
        (this.metrics.schemaUsageCount[context.schemaName] || 0) + 1;
    }

    try {
      // Fast path: Return cached result if available
      if (mergedOptions.useCache && this.config.cache.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);
        
        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          if (cached.success && cached.data !== undefined) {
            return cached.data;
          } else if (!cached.success && cached.error) {
            throw cached.error;
          }
        }
        this.updateMetrics('cacheMiss');
      }

      // Normalize data format before validation
      const processedData = mergedOptions.preprocess 
        ? this.preprocessData(data)
        : data;

      // Execute validation
      const result = schema.parse(processedData);

      // Cache successful validation for performance
      if (mergedOptions.useCache && this.config.cache.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime);
      return result;

    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(error);
        
        // Cache failures to avoid re-validating known bad data
        if (mergedOptions.useCache && this.config.cache.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          this.setCache(
            cacheKey, 
            { success: false, error: validationError }, 
            mergedOptions.cacheTtl
          );
        }

        this.updateMetrics('failure', startTime, validationError);
        throw validationError;
      }
      
      // Preserve non-validation errors (system errors, etc.)
      this.updateMetrics('failure', startTime);
      throw error;
    }
  }

  /**
   * Validate data returning a result object (never throws).
   * 
   * This method provides a functional programming approach to validation
   * where success and failure are both valid outcomes represented in the
   * return type. This eliminates try-catch blocks and makes error handling
   * more explicit.
   * 
   * Use this when:
   * - Building data transformation pipelines
   * - Processing user input where failures are expected
   * - Writing functional-style code
   * - You want to handle errors immediately at the call site
   */
  async validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: ValidationOptions = {},
    context?: ValidationContext
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };
    
    // Track schema usage analytics
    if (this.config.metrics.trackSchemaUsage && context?.schemaName) {
      this.metrics.schemaUsageCount[context.schemaName] = 
        (this.metrics.schemaUsageCount[context.schemaName] || 0) + 1;
    }

    try {
      // Attempt cache retrieval
      if (mergedOptions.useCache && this.config.cache.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);
        
        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          return cached;
        }
        this.updateMetrics('cacheMiss');
      }

      // Preprocess and validate
      const processedData = mergedOptions.preprocess 
        ? this.preprocessData(data)
        : data;
      
      const result = schema.parse(processedData);
      const successResult: ValidationResult<T> = { 
        success: true, 
        data: result 
      };

      // Cache the success
      if (mergedOptions.useCache && this.config.cache.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, successResult, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime);
      return successResult;

    } catch (error) {
      // Convert all errors to ValidationResult format
      const validationError = error instanceof ZodError
        ? new ValidationError(error)
        : new ValidationError(
            error instanceof Error ? error.message : 'Unknown validation error',
            [{
              field: '',
              code: 'custom',
              message: error instanceof Error ? error.message : 'Unknown validation error',
            }]
          );
      
      const errorResult: ValidationResult<T> = { 
        success: false, 
        error: validationError 
      };
      
      // Cache failures
      if (mergedOptions.useCache && this.config.cache.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, errorResult, mergedOptions.cacheTtl);
      }

      this.updateMetrics('failure', startTime, validationError);
      return errorResult;
    }
  }

  /**
   * Validate multiple items concurrently with comprehensive reporting.
   * 
   * This method is optimized for bulk operations and provides:
   * - Concurrent processing using Promise.allSettled for maximum throughput
   * - Separation of valid and invalid items for partial success handling
   * - Detailed error tracking with original indices preserved
   * - Graceful handling of unexpected errors
   * 
   * Perfect for:
   * - Bulk data imports from CSV/Excel
   * - API batch endpoints
   * - Data migration validation
   * - Form array validation
   */
  async validateBatch<T>(
    schema: ZodSchema<T>,
    dataArray: unknown[],
    options: ValidationOptions = {},
    context?: ValidationContext
  ): Promise<BatchValidationResult<T>> {
    const valid: T[] = [];
    const invalid: Array<{
      index: number;
      data: unknown;
      error: ValidationError;
    }> = [];

    // Process all items concurrently for optimal performance
    // allSettled ensures all validations complete even if some fail
    const results = await Promise.allSettled(
      dataArray.map((data, index) => 
        this.validateSafe(schema, data, options, context)
          .then(result => ({ result, index, data }))
      )
    );

    // Categorize results efficiently
    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        
        if (result.success && result.data !== undefined) {
          valid.push(result.data);
        } else if (!result.success && result.error) {
          invalid.push({ index, data, error: result.error });
        }
      } else {
        // Handle catastrophic validation failures
        const error = new ValidationError(
          'Batch validation promise rejected', 
          [{
            field: '',
            code: 'custom',
            message: promiseResult.reason instanceof Error 
              ? promiseResult.reason.message 
              : 'Batch validation promise rejected',
          }]
        );
        invalid.push({ index: -1, data: null, error });
      }
    }

    return {
      valid,
      invalid,
      totalCount: dataArray.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    };
  }

  /**
   * Apply preprocessing transformations to normalize data.
   *
   * Preprocessing solves common data quality issues:
   * - "  john@example.com  " → "john@example.com" (trim)
   * - "42" → 42 (string to number coercion)
   * - "true" → true (string to boolean coercion)
   * - "" → null (empty string handling)
   *
   * This happens before schema validation, allowing your schemas to focus
   * on business rules rather than format normalization.
   */
  private preprocessData(data: unknown): unknown {
    const config = this.config.preprocessing;

    // Apply built-in preprocessing rules recursively
    let processed = this.applyBuiltInPreprocessing(data, config);

    // Chain custom preprocessors if configured
    if (config.customPreprocessors?.length) {
      for (const preprocessor of config.customPreprocessors) {
        try {
          processed = preprocessor(processed);
        } catch (error) {
          logger.warn('Custom preprocessor failed, continuing with partial preprocessing', {
            error,
            processorIndex: config.customPreprocessors?.indexOf(preprocessor)
          });
        }
      }
    }

    return processed;
  }

  /**
   * Recursively apply built-in preprocessing rules.
   * 
   * This method handles different data types appropriately:
   * - Strings: trim, type coercion, empty handling
   * - Arrays: recursive element processing
   * - Objects: recursive property processing
   * - Primitives: pass-through unchanged
   */
  private applyBuiltInPreprocessing(
    data: unknown, 
    config: PreprocessingConfig
  ): unknown {
    // Handle null/undefined early
    if (data === null || data === undefined) {
      return config.undefinedToNull && data === undefined ? null : data;
    }

    // String preprocessing with ordered transformations
    if (typeof data === 'string') {
      let processed = config.trimStrings ? data.trim() : data;

      // Check for empty string conversion
      if (config.emptyStringToNull && processed === '') {
        return null;
      }

      // Boolean coercion (check before number to handle '1'/'0')
      if (config.coerceBooleans) {
        const lower = processed.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }

      // Number coercion (only for valid number strings)
      if (config.coerceNumbers && /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(processed)) {
        const num = Number(processed);
        if (Number.isFinite(num)) return num;
      }

      return processed;
    }

    // Array preprocessing (map maintains array structure)
    if (Array.isArray(data)) {
      return data.map(item => this.applyBuiltInPreprocessing(item, config));
    }

    // Object preprocessing (preserves key-value relationships)
    if (typeof data === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.applyBuiltInPreprocessing(value, config);
      }
      return processed;
    }

    // Pass through primitives unchanged
    return data;
  }

  /**
   * Generate a deterministic cache key for validation results.
   * 
   * The cache key must capture all factors that affect validation:
   * - Schema definition (what rules to apply)
   * - Input data (what to validate)
   * - Options (how to validate)
   * 
   * Performance optimization: Uses WeakMap to cache schema hashes,
   * avoiding repeated stringification of the same schema object.
   */
  private generateCacheKey(
    schema: ZodSchema,
    data: unknown,
    options: ValidationOptions
  ): string {
    // Use custom key generator if provided
    if (options.cacheKeyGenerator) {
      return options.cacheKeyGenerator(schema, data);
    }

    try {
      // Try to get cached schema hash (major performance win)
      let schemaHash = this.schemaHashCache.get(schema);
      if (!schemaHash) {
        schemaHash = this.hashObject(schema);
        this.schemaHashCache.set(schema, schemaHash);
      }
      
      // Hash data and options (these change more frequently)
      const dataHash = this.hashObject(data);
      const optionsHash = this.hashObject({
        preprocess: options.preprocess,
        stripUnknown: options.stripUnknown,
        abortEarly: options.abortEarly,
      });
      
      return `val:${schemaHash}:${dataHash}:${optionsHash}`;
    } catch (error) {
      // Fallback for unhashable objects (circular references, etc.)
      logger.warn('Cache key generation failed, using time-based fallback', { error });
      return `val:fallback:${Date.now()}:${Math.random().toString(36)}`;
    }
  }

  /**
   * Create a fast, deterministic hash of any object.
   * 
   * Uses MD5 for speed (security not needed for cache keys).
   * Truncates to 16 characters to save memory in cache keys.
   * Handles circular references and non-serializable objects gracefully.
   */
  private hashObject(obj: unknown): string {
    try {
      // Stringify with sorted keys for determinism
      const str = JSON.stringify(obj, Object.keys(obj as object).sort());
      return crypto.createHash('md5').update(str).digest('hex').slice(0, 16);
    } catch (error) {
      // Handle circular references or non-JSON objects
      return crypto.createHash('md5').update(String(obj)).digest('hex').slice(0, 16);
    }
  }

  /**
   * Retrieve validation result from cache with automatic expiration.
   * 
   * Returns null for cache misses or expired entries.
   * Automatically cleans up expired entries on access (lazy cleanup).
   */
  private getFromCache<T>(key: string): ValidationResult<T> | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    // Check if entry has expired
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl * 1000) {
      this.validationCache.delete(key); // Lazy cleanup
      return null;
    }

    return cached.result as ValidationResult<T>;
  }

  /**
   * Store validation result in cache with size-based eviction.
   * 
   * Implements a simple FIFO eviction strategy when cache is full.
   * This is simpler and more predictable than LRU for validation caching.
   */
  private setCache<T>(
    key: string, 
    result: ValidationResult<T>, 
    ttl?: number
  ): void {
    if (!this.config.cache.enabled) return;

    const cacheTtl = ttl ?? this.config.cache.defaultTtl;
    const maxSize = this.config.cache.maxSize;
    
    // Enforce size limit with FIFO eviction
    if (this.validationCache.size >= maxSize) {
      const firstKey = this.validationCache.keys().next().value;
      if (firstKey !== undefined) {
        this.validationCache.delete(firstKey);
      }
    }

    this.validationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: cacheTtl,
    });
  }

  /**
   * Remove all cache entries for a specific schema.
   * 
   * Called automatically when a schema is re-registered to prevent
   * stale validation results after schema changes.
   */
  private invalidateCacheForSchema(schemaName: string): void {
    // We'd need to store schema name in cache keys to implement this efficiently
    // For now, clear entire cache on schema updates (conservative approach)
    this.clearCache();
    logger.info(`Cleared validation cache due to schema update: ${schemaName}`);
  }

  /**
   * Periodic cleanup of expired cache entries.
   * 
   * This prevents memory bloat from expired entries that weren't lazily cleaned.
   * Runs on a timer (default 60s) set in the constructor.
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    // Identify expired entries
    for (const [key, cached] of this.validationCache.entries()) {
      if (now - cached.timestamp > cached.ttl * 1000) {
        expired.push(key);
      }
    }
    
    // Batch delete for efficiency
    expired.forEach(key => this.validationCache.delete(key));
    
    if (expired.length > 0) {
      logger.debug(`Cleaned ${expired.length} expired cache entries`);
    }
  }

  /**
   * Update validation metrics for observability.
   * 
   * Tracks multiple dimensions:
   * - Success/failure rates
   * - Cache effectiveness
   * - Performance (response times)
   * - Error patterns (which fields/codes fail most)
   */
  private updateMetrics(
    type: 'success' | 'failure' | 'cacheHit' | 'cacheMiss',
    startTime?: number,
    error?: ValidationError
  ): void {
    if (!this.config.metrics.enabled) return;

    this.metrics.totalValidations++;

    switch (type) {
      case 'success':
        this.metrics.successfulValidations++;
        break;
      case 'failure':
        this.metrics.failedValidations++;
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

    // Update rolling average using incremental formula (avoids recalculating all values)
    if (startTime !== undefined && (type === 'success' || type === 'failure')) {
      const duration = performance.now() - startTime;
      const count = this.metrics.successfulValidations + this.metrics.failedValidations;
      this.metrics.avgValidationTime = 
        (this.metrics.avgValidationTime * (count - 1) + duration) / count;
    }
  }

  /**
   * Record error patterns for analysis.
   * 
   * Tracking error patterns helps identify:
   * - Problematic fields that frequently fail validation
   * - Common error types (required, format, range, etc.)
   * - Data quality issues in upstream systems
   */
  private trackErrorPatterns(error: ValidationError): void {
    for (const detail of error.errors) {
      const field = detail.field || 'unknown';
      const code = detail.code;

      this.metrics.errorsByField[field] = 
        (this.metrics.errorsByField[field] || 0) + 1;
      
      this.metrics.errorsByCode[code] = 
        (this.metrics.errorsByCode[code] || 0) + 1;
    }
  }

  /**
   * Get current metrics snapshot.
   * Returns a copy to prevent external modification of internal state.
   */
  getMetrics(): Readonly<ValidationMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics to zero.
   * Useful for starting fresh measurement periods or after deployment.
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
   * Clear all cached validation results.
   * Use when you need to force fresh validation or manage memory usage.
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get detailed cache performance statistics.
   * 
   * Use these metrics to:
   * - Tune cache size for your workload
   * - Identify if caching is providing value
   * - Monitor memory usage
   * - Detect cache thrashing
   */
  getCacheStats() {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    
    return {
      size: this.validationCache.size,
      maxSize: this.config.cache.maxSize,
      hitRate: totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0,
      hitCount: this.metrics.cacheHits,
      missCount: this.metrics.cacheMisses,
      utilization: (this.validationCache.size / this.config.cache.maxSize) * 100,
      efficiency: totalRequests > 0 
        ? (this.metrics.cacheHits / totalRequests) * 100 
        : 0,
    };
  }

  /**
   * Clean shutdown of the validation service.
   * 
   * Essential for preventing:
   * - Memory leaks from the cleanup interval
   * - Orphaned timers in long-running processes
   * - Resource exhaustion in testing scenarios
   * 
   * Always call this in your application shutdown handler.
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
    this.clearCache();
    this.schemaRegistry.clear();
    
    logger.info('ValidationService destroyed and resources cleaned up');
  }
}

/**
 * Singleton instance for simple use cases.
 * 
 * Use this when you don't need custom configuration.
 * For most applications, this default instance is sufficient.
 */
export const validationService = new ValidationService();

/**
 * Factory function for creating configured validation services.
 * 
 * Use this when you need:
 * - Multiple services with different configurations
 * - Testing with isolated service instances
 * - Fine-grained control over caching and preprocessing
 * - Different validation strategies for different domains
 * 
 * Example:
 *   const strictService = createValidationService({
 *     defaultOptions: { abortEarly: true },
 *     cache: { maxSize: 100 }
 *   });
 */
export function createValidationService(
  config: ValidationServiceConfig
): ValidationService {
  return new ValidationService(config);
}