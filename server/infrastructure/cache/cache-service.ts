/**
 * Unified Cache Service
 * Enterprise-grade caching with multiple cache tiers and automatic cleanup
 */

import { cacheFactory } from '../../../shared/core/src/caching';
import type { CacheAdapter } from '../../../shared/core/src/caching';
import { logger } from '../../utils/shared-core-fallback.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  maxMemoryMB?: number;
  cleanupIntervalMs?: number;
}

export interface CacheStats {
  size: number;
  hits?: number;
  misses?: number;
  memoryUsage?: number;
  namespace?: string | undefined;
}

/**
 * Base cache implementation with in-memory fallback
 */
export class CacheService {
  private cache = new Map<string, { value: any; expires: number }>();
  private readonly defaultTTL: number;
  private readonly namespace?: string | undefined;
  private cleanupTimer?: NodeJS.Timeout;
  private stats = { hits: 0, misses: 0 };

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 300;
    this.namespace = options.namespace;
    
    // Auto-cleanup every 60 seconds by default
    const cleanupInterval = options.cleanupIntervalMs || 60000;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.cache.get(fullKey);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }
      
      if (Date.now() > item.expires) {
        this.cache.delete(fullKey);
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return item.value as T;
    } catch (error) {
      logger.error('Cache get error', { key }, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const expires = Date.now() + ((ttl || this.defaultTTL) * 1000);
      
      this.cache.set(fullKey, { value, expires });
    } catch (error) {
      logger.error('Cache set error', { key }, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      this.cache.delete(fullKey);
    } catch (error) {
      logger.error('Cache delete error', { key }, error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      logger.error('Cache clear error', {}, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      if (pattern === '*') {
        await this.clear();
        return;
      }
      
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const keysToDelete: string[] = [];
      
      for (const key of Array.from(this.cache.keys())) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
    } catch (error) {
      logger.error('Cache deletePattern error', { pattern }, error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.cache.get(fullKey);
      
      if (!item) return false;
      
      if (Date.now() > item.expires) {
        this.cache.delete(fullKey);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Cache has error', { key }, error);
      return false;
    }
  }

  private getFullKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      namespace: this.namespace
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

/**
 * Server Cache Service
 * Multi-tier caching for server-side operations
 */
export class ServerCacheService {
  private static instance: ServerCacheService;
  private apiCache: CacheAdapter;
  private sessionCache: CacheAdapter;
  private queryCache: CacheAdapter;

  private constructor() {
    // API response cache - 5 minutes default TTL
    this.apiCache = cacheFactory.createCache('api-responses', {
      provider: 'memory',
      defaultTtlSec: 300,
      maxMemoryMB: 50,
      keyPrefix: 'api:'
    });

    // Session cache - 30 minutes default TTL
    this.sessionCache = cacheFactory.createCache('sessions', {
      provider: 'memory',
      defaultTtlSec: 1800,
      maxMemoryMB: 20,
      keyPrefix: 'session:'
    });

    // Database query cache - 10 minutes default TTL
    this.queryCache = cacheFactory.createCache('db-queries', {
      provider: 'memory',
      defaultTtlSec: 600,
      maxMemoryMB: 100,
      keyPrefix: 'query:'
    });
  }

  static getInstance(): ServerCacheService {
    if (!ServerCacheService.instance) {
      ServerCacheService.instance = new ServerCacheService();
    }
    return ServerCacheService.instance;
  }

  // API Response Methods
  async cacheApiResponse<T>(key: string, data: T, ttlSec?: number): Promise<void> {
    await this.apiCache.set(key, data, ttlSec);
  }

  async getApiResponse<T>(key: string): Promise<T | null> {
    return await this.apiCache.get<T>(key);
  }

  async invalidateApiResponse(key: string): Promise<void> {
    await this.apiCache.del(key);
  }

  // Session Methods
  async cacheSession<T>(session_id: string, sessionData: T, ttlSec?: number): Promise<void> {
    await this.sessionCache.set(session_id, sessionData, ttlSec);
  }

  async getSession<T>(session_id: string): Promise<T | null> {
    return await this.sessionCache.get<T>(session_id);
  }

  async invalidateSession(session_id: string): Promise<void> {
    await this.sessionCache.del(session_id);
  }

  async extendSession(session_id: string, ttlSec: number = 1800): Promise<void> {
    const session = await this.getSession(session_id);
    if (session) {
      await this.cacheSession(session_id, session, ttlSec);
    }
  }

  // Query Cache Methods
  async cacheQuery<T>(queryKey: string, result: T, ttlSec?: number): Promise<void> {
    await this.queryCache.set(queryKey, result, ttlSec);
  }

  async getCachedQuery<T>(queryKey: string): Promise<T | null> {
    return await this.queryCache.get<T>(queryKey);
  }

  async invalidateQuery(queryKey: string): Promise<void> {
    await this.queryCache.del(queryKey);
  }

  async invalidateQueryPattern(pattern: string): Promise<void> {
    if (pattern === '*') {
      await this.queryCache.clear?.();
    } else {
      // Pattern matching would need to be implemented in CacheAdapter
      logger.warn('Pattern-based invalidation not fully supported', { pattern });
    }
  }

  // Utility Methods
  getCacheStats() {
    return {
      api: this.apiCache.getMetrics?.() ?? null,
      sessions: this.sessionCache.getMetrics?.() ?? null,
      queries: this.queryCache.getMetrics?.() ?? null
    };
  }

  async healthCheck() {
    const checks = await Promise.allSettled([
      (this.apiCache as any).healthCheck?.() ?? Promise.resolve({ status: 'healthy' }),
      (this.sessionCache as any).healthCheck?.() ?? Promise.resolve({ status: 'healthy' }),
      (this.queryCache as any).healthCheck?.() ?? Promise.resolve({ status: 'healthy' })
    ]);

    return {
      api: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy' },
      sessions: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy' },
      queries: checks[2].status === 'fulfilled' ? checks[2].value : { status: 'unhealthy' },
      overall: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded'
    };
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.apiCache.clear?.() ?? Promise.resolve(),
      this.sessionCache.clear?.() ?? Promise.resolve(),
      this.queryCache.clear?.() ?? Promise.resolve()
    ]);
  }

  async shutdown(): Promise<void> {
    await cacheFactory.shutdown();
  }
}

// Export singleton instances
export const serverCache = ServerCacheService.getInstance();
export const cacheService = new CacheService();

// Export factory function for creating custom cache instances
export function createCache(options: CacheOptions): CacheService {
  return new CacheService(options);
}