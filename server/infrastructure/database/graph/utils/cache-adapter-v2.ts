/**
 * Cache Adapter V2 (REFACTORED)
 * IMPROVEMENTS: Type safety, error handling, TTL support
 */
import { logger } from '@server/infrastructure/observability';
import { CACHE_CONFIG } from './config/graph-config';

export interface CacheEntry<T> {
  value: T;
  expires: number;
  created: number;
}

export class CacheAdapterV2<T = any> {
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
    
    logger.debug('Cache set', { key, ttl: effectiveTtl });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug('Cache miss', { key });
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      logger.debug('Cache expired', { key });
      return null;
    }
    
    logger.debug('Cache hit', { key });
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

export default CacheAdapterV2;
