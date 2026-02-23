import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database/pool';

export interface StorageConfig {
  prefix?: string;
  defaultTTL?: number; // Seconds
}

interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * Lightweight Base Storage with In-Memory Caching.
 * Decoupled from legacy infrastructure.
 */
export abstract class BaseStorage<T> {
  // Simple in-memory cache to replace Redis for MVP
  protected cache: Map<string, CacheEntry<T | T[]>> = new Map();
  protected config: StorageConfig;
  protected cleanupInterval: NodeJS.Timeout;

  constructor(config: StorageConfig = {}) {
    this.config = {
      defaultTTL: 300, // 5 minutes default
      ...config
    };
    
    // Auto-cleanup interval (every 5 mins) to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 300000);
  }

  /**
   * Access to the Unified Drizzle Instance
   */
  protected get db() {
    return db;
  }

  /**
   * Smart Caching Wrapper
   * 1. Checks memory cache
   * 2. If missing, executes the fetchFn (DB query)
   * 3. Stores result in cache and returns it
   */
  protected async getCached<R>(
    key: string, 
    fetchFn: () => Promise<R>, 
    ttl: number = this.config.defaultTTL!
  ): Promise<R> {
    // Prefix keys to avoid collisions between User/Bill storage
    const fullKey = this.config.prefix ? `${this.config.prefix}:${key}` : key;
    const cached = this.cache.get(fullKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data as unknown as R;
    }

    try {
      const data = await fetchFn();
      
      if (data !== undefined && data !== null) {
        this.cache.set(fullKey, {
          data: data as unknown as T | T[],
          expires: Date.now() + (ttl * 1000)
        });
      }
      return data;
    } catch (error) {
      logger.error(`Storage Fetch Error [${fullKey}]`, { error });
      throw error;
    }
  }

  /**
   * Invalidates cache keys matching a specific pattern (prefix)
   */
  protected async invalidateCache(pattern: string): Promise<void> {
    const prefix = this.config.prefix ? `${this.config.prefix}:` : '';
    const fullPattern = pattern.startsWith(prefix) ? pattern : `${prefix}${pattern}`;
    
    // Simple prefix matching
    for (const key of this.cache.keys()) {
      if (key === fullPattern || key.startsWith(fullPattern.replace('*', ''))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Graceful Shutdown
   */
  public shutdown() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, val] of this.cache.entries()) {
      if (val.expires < now) this.cache.delete(key);
    }
  }
}