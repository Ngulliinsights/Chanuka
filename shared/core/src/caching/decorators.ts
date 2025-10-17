/**
 * Cache Decorators
 *
 * Decorators for method-level caching
 */

import { getDefaultCache } from './factory';

export function Cache(options: {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  skipCondition?: (...args: any[]) => boolean;
  tags?: string[];
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = getDefaultCache();

      // Skip caching if condition is met
      if (options.skipCondition && options.skipCondition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      try {
        // Try to get from cache first
        const cached = await cache.get(key);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store result in cache
        await cache.set(key, result, options.ttl);

        // Add tags if specified
        if (options.tags && cache.invalidateByTags) {
          // Note: This would require extending the cache interface to support tagging during set
          // For now, we'll just store the result
        }

        return result;
      } catch (error) {
        // If caching fails, still execute the original method
        return originalMethod.apply(this, args);
      }
    };
  };
}

export function InvalidateCache(options: {
  keys?: string[];
  patterns?: string[];
  tags?: string[];
  keyGenerator?: (...args: any[]) => string[];
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        const cache = getDefaultCache();

        // Invalidate specific keys
        if (options.keys) {
          await Promise.all(options.keys.map(key => cache.del(key)));
        }

        // Invalidate by patterns
        if (options.patterns && cache.invalidateByPattern) {
          await Promise.all(options.patterns.map(pattern => cache.invalidateByPattern!(pattern)));
        }

        // Invalidate by tags
        if (options.tags && cache.invalidateByTags) {
          await cache.invalidateByTags(options.tags);
        }

        // Invalidate generated keys
        if (options.keyGenerator) {
          const keys = options.keyGenerator(...args);
          await Promise.all(keys.map(key => cache.del(key)));
        }
      } catch (error) {
        // Log error but don't fail the operation
        console.warn('Cache invalidation failed:', error);
      }

      return result;
    };
  };
}