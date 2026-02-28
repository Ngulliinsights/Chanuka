/**
 * Feature Integration Helper
 * 
 * Provides a unified interface for integrating infrastructure services
 * (security, caching, error handling, validation) into features.
 */

import { Result, ok, err } from 'neverthrow';
import { secureQueryBuilderService } from '@server/features/security';
import { cacheService } from '@server/infrastructure/cache';
import { cacheKeys, createCacheInvalidation, CACHE_TTL } from '@server/infrastructure/cache/cache-keys';
import { logger } from '@server/infrastructure/observability';
import { z } from 'zod';
import { validateData } from '@server/infrastructure/validation/validation-helpers';

const cacheInvalidation = createCacheInvalidation(cacheService);

/**
 * Options for secure query execution
 */
export interface SecureQueryOptions {
  auditLog?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  validateOutput?: boolean;
}

/**
 * Options for cached operations
 */
export interface CachedOperationOptions<T> {
  key: string;
  ttl: number;
  operation: () => Promise<T>;
  validateOutput?: boolean;
}

/**
 * Feature Integration Helper Class
 */
export class FeatureIntegrationHelper {
  /**
   * Execute a secure query with caching
   */
  async executeSecureQuery<T>(
    template: string,
    params: Record<string, any>,
    options: SecureQueryOptions = {}
  ): Promise<Result<T, Error>> {
    try {
      // Check cache first if cache key provided
      if (options.cacheKey) {
        const cached = await cacheService.get<T>(options.cacheKey);
        if (cached !== null) {
          logger.debug({ cacheKey: options.cacheKey }, 'Cache hit');
          return ok(cached);
        }
      }

      // Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(template, params);

      // Execute query (this would be done by the caller with their DB connection)
      // For now, we return the query object
      // The caller should execute: await db.execute(query.sql, query.params)
      
      // Note: Actual execution should be done by the feature
      // This helper provides the infrastructure integration
      
      return ok(query as any);
    } catch (error) {
      logger.error('Secure query execution failed', { error, template });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute a cached operation with error handling
   */
  async executeCached<T>(
    options: CachedOperationOptions<T>
  ): Promise<Result<T, Error>> {
    try {
      // Check cache
      const cached = await cacheService.get<T>(options.key);
      if (cached !== null) {
        logger.debug({ cacheKey: options.key }, 'Cache hit');
        return ok(cached);
      }

      // Execute operation
      const result = await options.operation();

      // Validate output if requested
      if (options.validateOutput) {
        const sanitized = secureQueryBuilderService.sanitizeOutput(result);
        await cacheService.set(options.key, sanitized, options.ttl);
        return ok(sanitized as T);
      }

      // Cache result
      await cacheService.set(options.key, result, options.ttl);
      return ok(result);
    } catch (error) {
      logger.error('Cached operation failed', { error, key: options.key });
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate input data against schema
   */
  async validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<Result<T, Error>> {
    const result = await validateData(schema, data);
    
    if (result.success && result.data) {
      return ok(result.data);
    }
    
    const errorMessage = result.errors
      ?.map(e => `${e.field}: ${e.message}`)
      .join(', ') || 'Validation failed';
    
    return err(new Error(errorMessage));
  }

  /**
   * Invalidate cache for entity
   */
  async invalidateEntity(type: string, id: string | number): Promise<void> {
    await cacheInvalidation.invalidateEntity(type, id);
  }

  /**
   * Invalidate cache for list
   */
  async invalidateList(type: string): Promise<void> {
    await cacheInvalidation.invalidateList(type);
  }

  /**
   * Invalidate cache on entity update
   */
  async onEntityUpdate(type: string, id: string | number): Promise<void> {
    await cacheInvalidation.onEntityUpdate(type, id);
  }

  /**
   * Build secure parameterized query
   */
  buildSecureQuery(template: string, params: Record<string, any>) {
    return secureQueryBuilderService.buildParameterizedQuery(template, params);
  }

  /**
   * Sanitize output data
   */
  sanitizeOutput<T>(data: T): T {
    return secureQueryBuilderService.sanitizeOutput(data) as T;
  }

  /**
   * Create safe LIKE pattern for search
   */
  createSafeLikePattern(searchTerm: string): string {
    return secureQueryBuilderService.createSafeLikePattern(searchTerm);
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page?: string, limit?: string) {
    return secureQueryBuilderService.validatePaginationParams(page, limit);
  }

  /**
   * Get cache keys helper
   */
  get cacheKeys() {
    return cacheKeys;
  }

  /**
   * Get cache TTL constants
   */
  get cacheTTL() {
    return CACHE_TTL;
  }
}

/**
 * Create a feature-specific integration helper
 */
export function createFeatureHelper(featureName: string) {
  const helper = new FeatureIntegrationHelper();
  
  return {
    ...helper,
    
    /**
     * Log feature-specific info
     */
    log: {
      info: (message: string, meta?: any) => 
        logger.info({ feature: featureName, ...meta }, message),
      error: (message: string, meta?: any) => 
        logger.error({ feature: featureName, ...meta }, message),
      debug: (message: string, meta?: any) => 
        logger.debug({ feature: featureName, ...meta }, message),
      warn: (message: string, meta?: any) => 
        logger.warn({ feature: featureName, ...meta }, message),
    },
    
    /**
     * Create feature-specific cache key
     */
    createCacheKey: (type: string, id?: string | number) => {
      if (id) {
        return `${featureName}:${type}:${id}`;
      }
      return `${featureName}:${type}`;
    },
  };
}

// Export singleton instance
export const integrationHelper = new FeatureIntegrationHelper();

/**
 * Decorator for caching method results
 */
export function Cacheable(keyGenerator: (...args: any[]) => string, ttl: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args);
      
      // Check cache
      const cached = await cacheService.get(key);
      if (cached !== null) {
        logger.debug({ cacheKey: key, method: propertyKey }, 'Cache hit');
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Cache result
      await cacheService.set(key, result, ttl);
      logger.debug({ cacheKey: key, method: propertyKey }, 'Cache set');

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator for invalidating cache after method execution
 */
export function InvalidateCache(keyGenerator: (...args: any[]) => string | string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache
      const keys = keyGenerator(...args);
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      for (const key of keyArray) {
        await cacheService.delete(key);
        logger.debug({ cacheKey: key, method: propertyKey }, 'Cache invalidated');
      }

      return result;
    };

    return descriptor;
  };
}
