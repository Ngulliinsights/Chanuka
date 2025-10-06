/**
 * ValidationService - Comprehensive validation framework with Zod integration
 * 
 * Provides schema-based validation with caching, preprocessing, and comprehensive error handling
 */

import { ZodSchema, ZodError } from 'zod';
import crypto from 'crypto';
import {
  ValidationError,
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
 * Main validation service class with schema registration and caching capabilities
 */
export class ValidationService {
  private schemaRegistry = new Map<string, SchemaRegistration>();
  private validationCache = new Map<string, CachedValidationResult<any>>();
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

    // Start cache cleanup interval
    if (this.config.cache?.enabled) {
      setInterval(() => this.cleanupExpiredCache(), 60000); // Cleanup every minute
    }
  }

  /**
   * Register a schema with the validation service
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
      description: options.description,
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.schemaRegistry.set(name, registration);
  }

  /**
   * Get a registered schema by name
   */
  getSchema(name: string): ZodSchema | undefined {
    const registration = this.schemaRegistry.get(name);
    return registration?.schema;
  }

  /**
   * Get all registered schemas
   */
  getRegisteredSchemas(): SchemaRegistration[] {
    return Array.from(this.schemaRegistry.values());
  }

  /**
   * Validate data against a schema with comprehensive error handling
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
      // Check cache first if enabled
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        const cached = this.getFromCache<T>(cacheKey);
        
        if (cached) {
          this.updateMetrics('cacheHit', startTime);
          if (cached.success && cached.data) {
            return cached.data;
          } else if (!cached.success && cached.error) {
            throw cached.error;
          }
        } else {
          this.updateMetrics('cacheMiss');
        }
      }

      // Preprocess data if enabled
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Perform validation
      const result = schema.parse(processedData);

      // Cache successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, { success: true, data: result }, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime, context);
      return result;

    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(error);
        
        // Cache validation error
        if (mergedOptions.useCache && this.config.cache?.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          this.setCache(cacheKey, { success: false, error: validationError }, mergedOptions.cacheTtl);
        }

        this.updateMetrics('failure', startTime, context, validationError);
        throw validationError;
      }
      
      // Re-throw non-validation errors
      this.updateMetrics('failure', startTime, context);
      throw error;
    }
  }

  /**
   * Validate data safely without throwing errors
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
      // Check cache first if enabled
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

      // Preprocess data if enabled
      let processedData = data;
      if (mergedOptions.preprocess) {
        processedData = this.preprocessData(data);
      }

      // Perform validation
      const result = schema.parse(processedData);
      const successResult = { success: true, data: result } as ValidationResult<T>;

      // Cache successful result
      if (mergedOptions.useCache && this.config.cache?.enabled) {
        const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
        this.setCache(cacheKey, successResult, mergedOptions.cacheTtl);
      }

      this.updateMetrics('success', startTime, context);
      return successResult;

    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError(error);
        const errorResult = { success: false, error: validationError } as ValidationResult<T>;
        
        // Cache validation error
        if (mergedOptions.useCache && this.config.cache?.enabled) {
          const cacheKey = this.generateCacheKey(schema, data, mergedOptions);
          this.setCache(cacheKey, errorResult, mergedOptions.cacheTtl);
        }

        this.updateMetrics('failure', startTime, context, validationError);
        return errorResult;
      }
      
      // Convert non-validation errors to ValidationError
      const validationError = new ValidationError(new ZodError([{
        code: 'custom',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        path: [],
      }]));
      const errorResult = { success: false, error: validationError } as ValidationResult<T>;
      
      this.updateMetrics('failure', startTime, context, validationError);
      return errorResult;
    }
  }

  /**
   * Validate multiple objects in batch with separate valid/invalid results
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

    // Process all items
    const results = await Promise.allSettled(
      dataArray.map((data, index) => 
        this.validateSafe(schema, data, options, context).then(result => ({ result, index, data }))
      )
    );

    // Separate valid and invalid results
    results.forEach((promiseResult) => {
      if (promiseResult.status === 'fulfilled') {
        const { result, index, data } = promiseResult.value;
        if (result.success && result.data) {
          valid.push(result.data);
        } else if (!result.success && result.error) {
          invalid.push({
            index,
            data,
            error: result.error,
          });
        }
      } else {
        // Handle promise rejection (shouldn't happen with validateSafe, but just in case)
        const error = new ValidationError(new ZodError([{
          code: 'custom',
          message: 'Batch validation promise rejected',
          path: [],
        }]));
        invalid.push({
          index: -1,
          data: null,
          error,
        });
      }
    });

    return {
      valid,
      invalid,
      totalCount: dataArray.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    };
  }

  /**
   * Preprocess data before validation
   */
  private preprocessData(data: unknown): unknown {
    if (!this.config.preprocessing) {
      return data;
    }

    const config = this.config.preprocessing;

    // Apply built-in preprocessing
    let processed = this.applyBuiltInPreprocessing(data, config);

    // Apply custom preprocessors
    if (config.customPreprocessors) {
      for (const preprocessor of config.customPreprocessors) {
        processed = preprocessor(processed);
      }
    }

    return processed;
  }

  /**
   * Apply built-in preprocessing rules
   */
  private applyBuiltInPreprocessing(data: unknown, config: PreprocessingConfig): unknown {
    if (data === null || data === undefined) {
      if (config.undefinedToNull && data === undefined) {
        return null;
      }
      return data;
    }

    if (typeof data === 'string') {
      let processed = data;

      // Trim strings first
      if (config.trimStrings) {
        processed = processed.trim();
      }

      // Convert empty strings to null
      if (config.emptyStringToNull && processed === '') {
        return null;
      }

      // Coerce booleans (check this before numbers to handle '1'/'0')
      if (config.coerceBooleans) {
        const lower = processed.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
          return false;
        }
      }

      // Coerce numbers (only if not already converted to boolean)
      if (config.coerceNumbers && /^-?\d+(\.\d+)?$/.test(processed)) {
        const num = Number(processed);
        if (!isNaN(num) && isFinite(num)) {
          return num;
        }
      }

      return processed;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.applyBuiltInPreprocessing(item, config));
    }

    if (typeof data === 'object' && data !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.applyBuiltInPreprocessing(value, config);
      }
      return processed;
    }

    return data;
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(
    schema: ZodSchema,
    data: unknown,
    options: ValidationOptions
  ): string {
    if (options.cacheKeyGenerator) {
      return options.cacheKeyGenerator(schema, data);
    }

    // Default cache key generation
    const schemaHash = this.hashObject(schema);
    const dataHash = this.hashObject(data);
    const optionsHash = this.hashObject(options);
    
    return `validation:${schemaHash}:${dataHash}:${optionsHash}`;
  }

  /**
   * Hash an object for cache key generation
   */
  private hashObject(obj: unknown): string {
    const str = JSON.stringify(obj, Object.keys(obj as object).sort());
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Get validation result from cache
   */
  private getFromCache<T>(key: string): ValidationResult<T> | null {
    const cached = this.validationCache.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now > cached.timestamp + (cached.ttl * 1000)) {
      this.validationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Set validation result in cache
   */
  private setCache<T>(key: string, result: ValidationResult<T>, ttl?: number): void {
    if (!this.config.cache?.enabled) {
      return;
    }

    const cacheTtl = ttl || this.config.cache.defaultTtl;
    
    // Check cache size limit
    if (this.validationCache.size >= (this.config.cache.maxSize || 1000)) {
      // Remove oldest entries (simple LRU-like behavior)
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey) {
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
   * Clean up expired cache entries
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
   * Update validation metrics
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

    // Update average validation time
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      this.metrics.avgValidationTime = 
        (this.metrics.avgValidationTime * (this.metrics.totalValidations - 1) + duration) / 
        this.metrics.totalValidations;
    }
  }

  /**
   * Track error patterns for analytics
   */
  private trackErrorPatterns(error: ValidationError): void {
    for (const errorDetail of error.errors) {
      // Track errors by field
      this.metrics.errorsByField[errorDetail.field] = 
        (this.metrics.errorsByField[errorDetail.field] || 0) + 1;

      // Track errors by code
      this.metrics.errorsByCode[errorDetail.code] = 
        (this.metrics.errorsByCode[errorDetail.code] || 0) + 1;
    }
  }

  /**
   * Get current validation metrics
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset validation metrics
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
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics
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
}

/**
 * Default validation service instance
 */
export const validationService = new ValidationService();

/**
 * Create a new validation service with custom configuration
 */
export function createValidationService(config: ValidationServiceConfig): ValidationService {
  return new ValidationService(config);
}