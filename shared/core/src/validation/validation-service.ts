/**
 * ValidationService - Comprehensive validation framework with Zod integration
 * 
 * Provides schema-based validation with caching, preprocessing, and comprehensive error handling.
 * This version includes performance optimizations, improved error handling, and better resource management.
 */

import { ZodSchema, ZodError } from 'zod';
import * as crypto from 'crypto';
import { logger } from '../observability/logging';
import { ValidationError } from './types';
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
 * Main validation service class with schema registration and caching capabilities.
 * 
 * Key features:
 * - Schema registration and management
 * - Automatic caching with TTL support
 * - Data preprocessing pipeline
 * - Batch validation with concurrent processing
 * - Comprehensive metrics tracking
 * - Memory-efficient cache management
 */
export class ValidationService {
  private schemaRegistry = new Map<string, SchemaRegistration>();
  private validationCache = new Map<string, CachedValidationResult<any>>();
  private cacheCleanupInterval?: NodeJS.Timeout;
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
  private config: ValidationServiceConfig;

  constructor(config: ValidationServiceConfig = {}) {
    this.config = {
      defaultOptions: {
        preprocess: true,
        useCache: true,
        cacheTtl: 300, // 5 minutes
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

    // Start cache cleanup interval and store reference for proper cleanup
    if (this.config.cache?.enabled) {
      this.cacheCleanupInterval = setInterval(
        () => this.cleanupExpiredCache(), 
        60000 // Cleanup every minute
      );
      // Ensure interval doesn't prevent process from exiting
      this.cacheCleanupInterval.unref();
    }
  }

  /**
   * Register a schema with the validation service.
   * 
   * This allows you to store commonly used schemas by name for easy retrieval.
   * Useful for maintaining a centralized schema registry across your application.
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
    const registration: SchemaRegistration = {
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
   * Get a registered schema by name.
   * Returns undefined if the schema is not found.
   */
  getSchema(name: string): ZodSchema | undefined {
    const registration = this.schemaRegistry.get(name);
    return registration?.schema;
  }

  /**
   * Get all registered schemas.
   * Useful for introspection and documentation generation.
   */
  getRegisteredSchemas(): SchemaRegistration[] {
    return Array.from(this.schemaRegistry.values());
  }

  /**
   * Validate data against a schema with comprehensive error handling.
   * 
   * This method throws a ValidationError if validation fails, making it ideal
   * for scenarios where you want to use try-catch error handling patterns.
   * 
   * The validation process includes:
   * 1. Cache lookup (if enabled)
   * 2. Data preprocessing (if enabled)
   * 3. Schema validation
   * 4. Result caching
   * 5. Metrics tracking
   */
  async validate<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: ValidationOptions = {},
    context?: ValidationContext
  ): Promise<T> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      // Attempt to retrieve from cache first to avoid expensive validations
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);
        
        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          if (cached.success && cached.data !== undefined) {
            return cached.data;
          } else if (!cached.success && cached.error) {
            throw cached.error;
          }
        } else {
          this.updateMetrics('cacheMiss');
        }
      }

      // Preprocess data to normalize format (trim strings, coerce types, etc.)
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Perform the actual Zod validation
      const result = schema.parse(processedData);

      // Cache successful validation to speed up future identical validations
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime, context);
      return result;

    } catch (error) {
      if (error instanceof ZodError) {
        // Transform Zod errors into our custom ValidationError format
        const validationError = new ValidationError(error);
        
        // Cache validation failures to avoid re-validating the same bad data
        if (mergedOptions.useCache && this.config.cache?.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          this.setCache(cacheKey, { success: false, error: validationError }, mergedOptions.cacheTtl);
        }

        this.updateMetrics('failure', startTime, context, validationError);
        throw validationError;
      }
      
      // Re-throw non-validation errors (e.g., system errors) without transformation
      this.updateMetrics('failure', startTime, context);
      throw error;
    }
  }

  /**
   * Validate data safely without throwing errors.
   * 
   * This method returns a result object with a success flag, making it ideal
   * for functional programming patterns where you want to handle both success
   * and failure cases explicitly without try-catch blocks.
   */
  async validateSafe<T>(
    schema: ZodSchema<T>,
    data: unknown,
    options: ValidationOptions = {},
    context?: ValidationContext
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      // Check cache first to avoid redundant validation work
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);
        
        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          return cached;
        } else {
          this.updateMetrics('cacheMiss');
        }
      }

      // Preprocess data to ensure consistent format
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Validate with Zod
      const result = schema.parse(processedData);
      const successResult: ValidationResult<T> = { 
        success: true, 
        data: result 
      };

      // Cache the successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, successResult, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime, context);
      return successResult;

    } catch (error) {
      if (error instanceof ZodError) {
        // Convert Zod errors to our ValidationError format
        const validationError = new ValidationError(error);
        const errorResult: ValidationResult<T> = { 
          success: false, 
          error: validationError 
        };
        
        // Cache validation failures
        if (mergedOptions.useCache && this.config.cache?.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          this.setCache(cacheKey, errorResult, mergedOptions.cacheTtl);
        }

        this.updateMetrics('failure', startTime, context, validationError);
        return errorResult;
      }
      
      // Handle unexpected errors gracefully by converting them to ValidationError
      const validationError = new ValidationError(
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
      
      this.updateMetrics('failure', startTime, context, validationError);
      return errorResult;
    }
  }

  /**
   * Validate multiple objects in batch with separate valid/invalid results.
   * 
   * This method processes all items concurrently for optimal performance and
   * returns a comprehensive result object that separates valid items from
   * invalid ones. This is particularly useful for bulk data imports or
   * processing pipelines where you want to continue processing valid items
   * even if some items fail validation.
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

    // Process all items concurrently for better performance
    const results = await Promise.allSettled(
      dataArray.map((data, index) => 
        this.validateSafe(schema, data, options, context).then(result => ({ result, index, data }))
      )
    );

    // Separate valid and invalid results efficiently
    for (const promiseResult of results) {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        if (result.success && result.data !== undefined) {
          valid.push(result.data);
        } else if (!result.success && result.error) {
          invalid.push({
            index,
            data,
            error: result.error,
          });
        }
      } else {
        // Handle unexpected promise rejections gracefully
        const error = new ValidationError('Batch validation promise rejected', [{
          field: '',
          code: 'custom',
          message: promiseResult.reason instanceof Error 
            ? promiseResult.reason.message 
            : 'Batch validation promise rejected',
        }]);
        invalid.push({
          index: -1,
          data: null,
          error,
        });
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
   * Preprocess data before validation.
   * 
   * This applies a series of transformations to normalize data format:
   * - Trim whitespace from strings
   * - Convert numeric strings to numbers
   * - Convert boolean-like strings to booleans
   * - Handle empty strings and undefined values
   * - Apply custom preprocessors
   */
  private preprocessData(data: unknown): unknown {
    if (!this.config.preprocessing) {
      return data;
    }

    const config = this.config.preprocessing;

    // Apply built-in preprocessing rules first
    let processed = this.applyBuiltInPreprocessing(data, config);

    // Then apply any custom preprocessors in sequence
    if (config.customPreprocessors && config.customPreprocessors.length > 0) {
      for (const preprocessor of config.customPreprocessors) {
        try {
          processed = preprocessor(processed);
        } catch (error) {
          // Log preprocessor errors but continue with original data
          logger.warn('Preprocessor failed, using original data', { error });
        }
      }
    }

    return processed;
  }

  /**
   * Apply built-in preprocessing rules recursively.
   * 
   * This method handles strings, arrays, and objects differently to ensure
   * proper normalization at all levels of the data structure.
   */
  private applyBuiltInPreprocessing(data: unknown, config: PreprocessingConfig): unknown {
    // Handle null and undefined values first
    if (data === null || data === undefined) {
      if (config.undefinedToNull && data === undefined) {
        return null;
      }
      return data;
    }

    // String preprocessing: trim, coerce types, handle empty strings
    if (typeof data === 'string') {
      let processed = data;

      // Trim whitespace first to get clean string
      if (config.trimStrings) {
        processed = processed.trim();
      }

      // Convert empty strings to null if configured
      if (config.emptyStringToNull && processed === '') {
        return null;
      }

      // Try to coerce to boolean (check before numbers to handle '1'/'0')
      if (config.coerceBooleans) {
        const lower = processed.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
          return false;
        }
      }

      // Try to coerce to number (only if still a string and matches number pattern)
      if (config.coerceNumbers && /^-?\d+(\.\d+)?$/.test(processed)) {
        const num = Number(processed);
        if (!isNaN(num) && isFinite(num)) {
          return num;
        }
      }

      return processed;
    }

    // Recursively process arrays
    if (Array.isArray(data)) {
      return data.map(item => this.applyBuiltInPreprocessing(item, config));
    }

    // Recursively process objects
    if (typeof data === 'object' && data !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.applyBuiltInPreprocessing(value, config);
      }
      return processed;
    }

    // Return primitives (numbers, booleans) as-is
    return data;
  }

  /**
   * Generate a unique cache key for validation results.
   * 
   * Uses custom key generator if provided, otherwise generates a hash-based key
   * that considers the schema, data, and options to ensure cache correctness.
   */
  private generateCacheKey(
    schema: ZodSchema,
    data: unknown,
    options: ValidationOptions
  ): string {
    if (options.cacheKeyGenerator) {
      return options.cacheKeyGenerator(schema, data);
    }

    // Generate default cache key using hashes
    try {
      const schemaHash = this.hashObject(schema);
      const dataHash = this.hashObject(data);
      const optionsHash = this.hashObject(options);
      
      return `validation:${schemaHash}:${dataHash}:${optionsHash}`;
    } catch (error) {
      // If hashing fails (e.g., circular reference), generate a simpler key
      logger.warn('Failed to generate cache key, using fallback', { error });
      return `validation:fallback:${Date.now()}:${Math.random()}`;
    }
  }

  /**
   * Hash an object for cache key generation.
   * 
   * Creates a deterministic hash by sorting keys and using MD5.
   * Truncated to 16 characters for efficiency.
   */
  private hashObject(obj: unknown): string {
    try {
      // Sort keys for deterministic stringification
      const str = JSON.stringify(obj, Object.keys(obj as object).sort());
      return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
    } catch (error) {
      // Handle circular references or non-serializable objects
      return crypto.createHash('md5').update(String(obj)).digest('hex').substring(0, 16);
    }
  }

  /**
   * Get validation result from cache.
   * 
   * Returns null if not found or expired. Automatically removes expired entries.
   */
  private getFromCache<T>(key: string): ValidationResult<T> | null {
    const cached = this.validationCache.get(key);
    if (!cached) {
      return null;
    }

    // Check expiration and auto-remove if expired
    const now = Date.now();
    if (now > cached.timestamp + (cached.ttl * 1000)) {
      this.validationCache.delete(key);
      return null;
    }

    return cached.result as ValidationResult<T>;
  }

  /**
   * Set validation result in cache.
   * 
   * Implements simple LRU-like eviction by removing oldest entries when cache is full.
   */
  private setCache<T>(key: string, result: ValidationResult<T>, ttl?: number): void {
    if (!this.config.cache?.enabled) {
      return;
    }

    const cacheTtl = ttl ?? this.config.cache.defaultTtl;
    const maxSize = this.config.cache.maxSize ?? 1000;
    
    // Enforce cache size limit with simple LRU eviction
    if (this.validationCache.size >= maxSize) {
      // Remove the first (oldest) entry from the Map
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.validationCache.delete(oldestKey);
      }
    }

    this.validationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: cacheTtl,
    });
  }

  /**
   * Clean up expired cache entries.
   * 
   * This runs periodically to prevent memory bloat from expired entries.
   * Called automatically by the cleanup interval.
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Collect keys to delete first to avoid modifying Map during iteration
    for (const [key, cached] of this.validationCache.entries()) {
      if (now > cached.timestamp + (cached.ttl * 1000)) {
        keysToDelete.push(key);
      }
    }
    
    // Delete expired entries
    for (const key of keysToDelete) {
      this.validationCache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Update validation metrics.
   * 
   * Tracks success rates, cache performance, timing, and error patterns
   * to help monitor validation service health and performance.
   */
  private updateMetrics(
    type: 'success' | 'failure' | 'cacheHit' | 'cacheMiss',
    startTime?: number,
    context?: ValidationContext,
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

    // Update rolling average of validation time using incremental formula
    if (startTime !== undefined && (type === 'success' || type === 'failure')) {
      const duration = performance.now() - startTime;
      const count = this.metrics.successfulValidations + this.metrics.failedValidations;
      this.metrics.avgValidationTime = 
        (this.metrics.avgValidationTime * (count - 1) + duration) / count;
    }
  }

  /**
   * Track error patterns for analytics.
   * 
   * Records which fields and error codes are most common to help identify
   * data quality issues or schema problems.
   */
  private trackErrorPatterns(error: ValidationError): void {
    for (const errorDetail of error.errors) {
      // Track errors by field path for identifying problematic fields
      const fieldPath = errorDetail.field || 'unknown';
      this.metrics.errorsByField[fieldPath] = 
        (this.metrics.errorsByField[fieldPath] || 0) + 1;

      // Track errors by code for identifying common validation issues
      this.metrics.errorsByCode[errorDetail.code] = 
        (this.metrics.errorsByCode[errorDetail.code] || 0) + 1;
    }
  }

  /**
   * Get current validation metrics.
   * Returns a copy to prevent external modification.
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset validation metrics to zero.
   * Useful for starting fresh measurement periods.
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
   * Useful for forcing fresh validation or managing memory.
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics.
   * Provides insights into cache usage and efficiency.
   */
  getCacheStats() {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    
    return {
      size: this.validationCache.size,
      maxSize: this.config.cache?.maxSize || 1000,
      hitRate: totalCacheRequests > 0 
        ? this.metrics.cacheHits / totalCacheRequests
        : 0,
      utilization: (this.validationCache.size / (this.config.cache?.maxSize || 1000)) * 100,
    };
  }

  /**
   * Destroy the validation service and clean up resources.
   * 
   * This should be called when the service is no longer needed to prevent
   * memory leaks from the cleanup interval. Important for proper shutdown
   * in long-running applications.
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
    this.clearCache();
    this.schemaRegistry.clear();
  }
}

/**
 * Default validation service instance.
 * Use this for simple use cases where you don't need custom configuration.
 */
export const validationService = new ValidationService();

/**
 * Create a new validation service with custom configuration.
 * 
 * Use this when you need multiple validation services with different configurations
 * or when you need fine-grained control over validation behavior.
 */
export function createValidationService(config: ValidationServiceConfig): ValidationService {
  return new ValidationService(config);
}