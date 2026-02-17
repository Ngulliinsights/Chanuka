import { logger } from '@server/infrastructure/observability';

/**
 * Simple in-memory cache service for application-level caching
 */
class SimpleCacheService {
  private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.hits++;
      logger.debug('Cache hit', { component: 'simple-cache', key });
      return entry.value as T;
    }
    
    this.misses++;
    logger.debug('Cache miss', { component: 'simple-cache', key });
    return null;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: unknown): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    logger.debug('Cache set', { component: 'simple-cache', key });
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug('Cache delete', { component: 'simple-cache', key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared', { component: 'simple-cache', entriesCleared: size });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const simpleCacheService = new SimpleCacheService();
