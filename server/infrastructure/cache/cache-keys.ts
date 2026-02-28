/**
 * Cache Key Generator
 * 
 * Centralized cache key generation for consistent caching across features.
 * Provides standardized key formats and TTL recommendations.
 */

import crypto from 'crypto';

export class CacheKeyGenerator {
  /**
   * Generate cache key for entity
   */
  entity(type: string, id: string | number): string {
    return `entity:${type}:${id}`;
  }

  /**
   * Generate cache key for list with filters
   */
  list(type: string, filters?: Record<string, any>): string {
    const filterKey = filters ? `:${this.hashFilters(filters)}` : '';
    return `list:${type}${filterKey}`;
  }

  /**
   * Generate cache key for query result
   */
  query(queryId: string, params?: Record<string, any>): string {
    const paramKey = params ? `:${this.hashParams(params)}` : '';
    return `query:${queryId}${paramKey}`;
  }

  /**
   * Generate cache key for user-specific data
   */
  user(userId: string, dataType: string): string {
    return `user:${userId}:${dataType}`;
  }

  /**
   * Generate cache key for search results
   */
  search(query: string, filters?: Record<string, any>): string {
    const filterKey = filters ? `:${this.hashFilters(filters)}` : '';
    return `search:${this.hashString(query)}${filterKey}`;
  }

  /**
   * Generate cache key for analytics
   */
  analytics(metric: string, params?: Record<string, any>): string {
    const paramKey = params ? `:${this.hashParams(params)}` : '';
    return `analytics:${metric}${paramKey}`;
  }

  /**
   * Generate cache key for recommendations
   */
  recommendation(userId: string, type: string): string {
    return `recommendation:${userId}:${type}`;
  }

  /**
   * Generate cache key for bill-related data
   */
  bill(billId: string | number, dataType?: string): string {
    const suffix = dataType ? `:${dataType}` : '';
    return `bill:${billId}${suffix}`;
  }

  /**
   * Generate cache key for community content
   */
  community(type: 'comment' | 'vote' | 'thread', id: string | number): string {
    return `community:${type}:${id}`;
  }

  /**
   * Hash filters for consistent cache keys
   */
  private hashFilters(filters: Record<string, any>): string {
    return this.hashString(JSON.stringify(this.sortObject(filters)));
  }

  /**
   * Hash parameters for consistent cache keys
   */
  private hashParams(params: Record<string, any>): string {
    return this.hashString(JSON.stringify(this.sortObject(params)));
  }

  /**
   * Hash a string to create a short, consistent identifier
   */
  private hashString(str: string): string {
    return crypto
      .createHash('md5')
      .update(str)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Sort object keys for consistent hashing
   */
  private sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as Record<string, any>);
  }
}

/**
 * Cache invalidation service
 */
export class CacheInvalidationService {
  constructor(private cacheService: any) {}

  /**
   * Invalidate entity cache
   */
  async invalidateEntity(type: string, id: string | number): Promise<void> {
    const key = cacheKeys.entity(type, id);
    await this.cacheService.delete(key);
    
    // Also invalidate related lists
    await this.invalidateList(type);
  }

  /**
   * Invalidate list cache
   */
  async invalidateList(type: string): Promise<void> {
    const pattern = `list:${type}:*`;
    if (typeof this.cacheService.deletePattern === 'function') {
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;
    if (typeof this.cacheService.deletePattern === 'function') {
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearch(): Promise<void> {
    const pattern = 'search:*';
    if (typeof this.cacheService.deletePattern === 'function') {
      await this.cacheService.deletePattern(pattern);
    }
  }

  /**
   * Invalidate on entity update
   */
  async onEntityUpdate(type: string, id: string | number): Promise<void> {
    await Promise.all([
      this.invalidateEntity(type, id),
      this.invalidateList(type)
    ]);
  }

  /**
   * Invalidate bill-related caches
   */
  async invalidateBill(billId: string | number): Promise<void> {
    const patterns = [
      `bill:${billId}:*`,
      'list:bill:*',
      'search:*',
      'recommendation:*'
    ];

    for (const pattern of patterns) {
      if (typeof this.cacheService.deletePattern === 'function') {
        await this.cacheService.deletePattern(pattern);
      }
    }
  }

  /**
   * Invalidate community-related caches
   */
  async invalidateCommunity(type: 'comment' | 'vote' | 'thread', id: string | number): Promise<void> {
    const key = cacheKeys.community(type, id);
    await this.cacheService.delete(key);
  }
}

/**
 * Recommended TTL values (in seconds)
 */
export const CACHE_TTL = {
  // Short-lived data (1-5 minutes)
  SHORT: 60,              // 1 minute
  MEDIUM: 300,            // 5 minutes
  
  // Medium-lived data (15-30 minutes)
  LONG: 900,              // 15 minutes
  HALF_HOUR: 1800,        // 30 minutes
  
  // Long-lived data (1+ hours)
  HOUR: 3600,             // 1 hour
  DAY: 86400,             // 24 hours
  
  // Feature-specific recommendations
  BILLS: 300,             // 5 minutes (frequently updated)
  USERS: 1800,            // 30 minutes (moderately stable)
  SEARCH: 300,            // 5 minutes (dynamic)
  ANALYTICS: 900,         // 15 minutes (aggregated data)
  RECOMMENDATIONS: 1800,  // 30 minutes (ML-based)
  COMMUNITY: 180,         // 3 minutes (highly dynamic)
  SPONSORS: 3600,         // 1 hour (stable)
  GOVERNMENT_DATA: 3600,  // 1 hour (external API)
} as const;

// Export singleton instance
export const cacheKeys = new CacheKeyGenerator();

// Export factory for invalidation service
export function createCacheInvalidation(cacheService: any): CacheInvalidationService {
  return new CacheInvalidationService(cacheService);
}
