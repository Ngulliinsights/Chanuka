/**
 * Cache Adapter
 * 
 * In-memory cache with type safety, error handling, and TTL support.
 */
import { logger } from '@server/infrastructure/observability';
import { CACHE_CONFIG } from '../config/graph-config';

export interface CacheEntry<T> {
  value: T;
  expires: number;
  created: number;
}

export class CacheAdapter<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number;

  constructor(ttl: number = CACHE_CONFIG.DEFAULT_TTL * 1000) {
    this.ttl = ttl;
  }

  set(key: string, value: T, ttl?: number): void {
    const effectiveTtl = ttl || this.ttl;
    const now = Date.now();
    
    this.cache.set(key, {
      value,
      expires: now + effectiveTtl,
      created: now,
    });
    
    logger.debug({ key, ttl: effectiveTtl }, 'Cache set');
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug({ key }, 'Cache miss');
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      logger.debug({ key }, 'Cache expired');
      return null;
    }
    
    logger.debug({ key }, 'Cache hit');
    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    return this.cache.size;
  }

  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

export default CacheAdapter;
