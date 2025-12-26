/**
 * Consolidated Cache Service - Uses shared/core caching system
 * This file provides backward compatibility while using the unified caching system
 */

import { logger } from '@server/utils/shared-core-fallback.ts';
import type { CacheAdapter } from '@shared/core/caching';
import { cacheFactory } from '@shared/core/caching';

// Re-export types for backward compatibility
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
 * Server Cache Service - Uses shared/core caching system
 * Multi-tier caching for server-side operations with backward compatibility
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

// Create a default cache service instance for backward compatibility
const defaultCacheService = cacheFactory.createCache('default', {
  provider: 'memory',
  defaultTtlSec: 300,
  maxMemoryMB: 50
});

export const cacheService = defaultCacheService;

// Export factory function for creating custom cache instances
export function createCache(options: CacheOptions): CacheAdapter {
  const config: any = {
    provider: 'memory',
    defaultTtlSec: options.ttl || 300,
    maxMemoryMB: options.maxMemoryMB || 50
  };

  if (options.namespace) {
    config.keyPrefix = options.namespace;
  }

  return cacheFactory.createCache(`custom-${Date.now()}`, config);
}
