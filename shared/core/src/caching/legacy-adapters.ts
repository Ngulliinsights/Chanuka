/**
 * Legacy Cache Adapters
 * 
 * Adapters to integrate existing cache implementations with the core cache system
 */

import { CacheService, CacheEntry, CacheOptions } from './types';
import { logger } from '../../shared/core/src/utils/logger';

// Re-export the new legacy adapters
export { LegacyCacheService, cacheService } from './legacy-adapters/cache-service-adapter';
export type { LegacyCacheEntry, LegacyCacheConfig, LegacyCacheStats } from './legacy-adapters/cache-service-adapter';

/**
 * Adapter for the existing CacheService from src/shared/services/CacheService.ts
 */
export class LegacyCacheServiceAdapter implements CacheService {
  private legacyCache: any;

  constructor(legacyCache: any) {
    this.legacyCache = legacyCache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.legacyCache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    const options = ttlSec ? { ttl: ttlSec * 1000 } : {}; // Convert to milliseconds
    this.legacyCache.set(key, value, options);
  }

  async del(key: string): Promise<boolean> {
    return this.legacyCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.legacyCache.has(key);
  }

  async clear(): Promise<void> {
    this.legacyCache.clear();
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    this.legacyCache.invalidateByTags(tags);
  }

  getMetrics() {
    return this.legacyCache.getStats();
  }

  async getHealth() {
    return { status: 'healthy' as const };
  }
}

/**
 * Adapter for the UnifiedCacheManager
 */
export class UnifiedCacheManagerAdapter implements CacheService {
  private unifiedCache: any;

  constructor(unifiedCache: any) {
    this.unifiedCache = unifiedCache;
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.unifiedCache.get<T>(key);
    return result.hit ? result.value : null;
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    const options = ttlSec ? { l1Ttl: ttlSec * 1000, l2Ttl: ttlSec } : {};
    await this.unifiedCache.set(key, value, options);
  }

  async del(key: string): Promise<boolean> {
    return await this.unifiedCache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.unifiedCache.get(key);
    return result.hit;
  }

  async clear(): Promise<void> {
    await this.unifiedCache.clear();
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    await this.unifiedCache.invalidateByTags(tags);
  }

  getMetrics() {
    return this.unifiedCache.getStats();
  }

  async getHealth() {
    const stats = this.unifiedCache.getStats();
    return {
      status: stats.l2.connected ? 'healthy' as const : 'degraded' as const,
      details: stats
    };
  }
}

/**
 * Property Cache Service Adapter
 */
export class PropertyCacheServiceAdapter {
  private cacheService: CacheService;
  private readonly CACHE_PREFIXES = {
    SIMILAR_PROPERTIES: 'similar_props:',
    PROPERTY_DETAILS: 'property:',
    PROPERTY_STATS: 'prop_stats:',
    OWNER_PROPERTIES: 'owner_props:',
  } as const;

  private readonly CACHE_TTL = {
    SIMILAR_PROPERTIES: 5 * 60, // 5 minutes
    PROPERTY_DETAILS: 10 * 60, // 10 minutes
    PROPERTY_STATS: 15 * 60, // 15 minutes
    OWNER_PROPERTIES: 5 * 60, // 5 minutes
  } as const;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  async cacheSimilarProperties(
    params: {
      propertyType?: string;
      city?: string;
      minPrice?: string;
      maxPrice?: string;
      limit?: string;
    },
    properties: any[]
  ): Promise<void> {
    const cacheKey = this.generateSimilarPropertiesKey(params);
    await this.cacheService.set(cacheKey, properties, this.CACHE_TTL.SIMILAR_PROPERTIES);
  }

  async getCachedSimilarProperties(params: {
    propertyType?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    limit?: string;
  }): Promise<any[] | null> {
    const cacheKey = this.generateSimilarPropertiesKey(params);
    return await this.cacheService.get<any[]>(cacheKey);
  }

  async cachePropertyDetails(propertyId: string, property: any): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIXES.PROPERTY_DETAILS}${propertyId}`;
    await this.cacheService.set(cacheKey, property, this.CACHE_TTL.PROPERTY_DETAILS);
  }

  async getCachedPropertyDetails(propertyId: string): Promise<any | null> {
    const cacheKey = `${this.CACHE_PREFIXES.PROPERTY_DETAILS}${propertyId}`;
    return await this.cacheService.get<any>(cacheKey);
  }

  async invalidatePropertyCache(propertyId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIXES.PROPERTY_DETAILS}${propertyId}`;
    await this.cacheService.del(cacheKey);
    // Note: Pattern-based invalidation would require additional implementation
  }

  private generateSimilarPropertiesKey(params: {
    propertyType?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    limit?: string;
  }): string {
    const { propertyType = '', city = '', minPrice = '', maxPrice = '', limit = '10' } = params;
    const keyParts = [
      this.CACHE_PREFIXES.SIMILAR_PROPERTIES,
      propertyType,
      city.toLowerCase().replace(/\s+/g, '_'),
      minPrice,
      maxPrice,
      limit
    ];
    return keyParts.join('');
  }
}






