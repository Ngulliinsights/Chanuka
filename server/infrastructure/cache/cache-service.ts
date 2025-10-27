/**
 * Cache Service Implementation
 * Provides caching functionality with fallback support
 */

import { logger } from '../../utils/shared-core-fallback.js';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

export class CacheService {
  private cache = new Map<string, { value: any; expires: number }>();
  private defaultTTL = 300; // 5 minutes

  constructor(private options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 300;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.cache.get(fullKey);
      
      if (!item) {
        return null;
      }
      
      if (Date.now() > item.expires) {
        this.cache.delete(fullKey);
        return null;
      }
      
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
    } catch (error) {
      logger.error('Cache clear error', {}, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern.replace('*', '.*'));
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    } catch (error) {
      logger.error('Cache deletePattern error', { pattern }, error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const item = this.cache.get(fullKey);
      
      if (!item) {
        return false;
      }
      
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
    return this.options.namespace ? `${this.options.namespace}:${key}` : key;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      namespace: this.options.namespace
    };
  }
}

// Default cache service instance
export const cacheService = new CacheService();