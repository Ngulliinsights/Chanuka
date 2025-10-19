/**
 * Core Validation Service
 *
 * Abstract base class implementing the core validation service interface
 * with schema caching, preprocessing, and metrics collection
 */

import crypto from 'crypto';
import { logger } from '../../logging';
import { ValidationError } from '../../error-management/errors/specialized/validation-error';
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
 */
export abstract class CoreValidationService implements IValidationService {
  protected schemaRegistry = new Map<string, ISchemaRegistration>();
  protected validationCache = new Map<string, ICachedValidationResult<any>>();
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
  protected config: IValidationServiceConfig;

  constructor(config: IValidationServiceConfig = {}) {
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
   * Abstract method to be implemented by concrete validation services
   */
  abstract validate<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<T>;

  /**
   * Abstract method to be implemented by concrete validation services
   */
  abstract validateSafe<T>(
    schema: any,
    data: unknown,
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IValidationResult<T>>;

  /**
   * Abstract method to be implemented by concrete validation services
   */
  abstract validateBatch<T>(
    schema: any,
    dataArray: unknown[],
    options?: IValidationOptions,
    context?: IValidationContext
  ): Promise<IBatchValidationResult<T>>;

  /**
   * Register a schema with the validation service
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
   * Get a registered schema by name
   */
  getSchema(name: string): any | undefined {
    const registration = this.schemaRegistry.get(name);
    return registration?.schema;
  }

  /**
   * Get all registered schemas
   */
  getRegisteredSchemas(): ISchemaRegistration[] {
    return Array.from(this.schemaRegistry.values());
  }

  /**
   * Get current validation metrics
   */
  getMetrics(): IValidationMetrics {
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

  /**
   * Preprocess data before validation
   */
  protected preprocessData(data: unknown): unknown {
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
  private applyBuiltInPreprocessing(data: unknown, config: IPreprocessingConfig): unknown {
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
  protected generateCacheKey(
    schema: any,
    data: unknown,
    options: IValidationOptions
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
  protected getFromCache<T>(key: string): IValidationResult<T> | null {
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
  protected setCache<T>(key: string, result: IValidationResult<T>, ttl?: number): void {
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
    // Note: This would need to be adapted based on the ValidationError structure
    // For now, we'll track based on the error message
    const errorMessage = error.message.toLowerCase();
    this.metrics.errorsByCode[errorMessage] = (this.metrics.errorsByCode[errorMessage] || 0) + 1;
  }
}




































