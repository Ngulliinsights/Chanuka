/**
 * Legacy Cache Service Adapter
 * 
 * Provides backward compatibility for existing cache service implementations
 * This adapter wraps the old cache service to work with the new unified interface
 */

import { CacheService, CacheMetrics, CacheHealthStatus } from '../core/interfaces.js';

// Legacy cache service interface (what the old system expected)
interface LegacyCacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear?(): Promise<void>;
  size?(): Promise<number>;
  keys?(): Promise<string[]>;
}

// Legacy cache configuration
interface LegacyCacheConfig {
  provider?: string;
  ttl?: number;
  maxSize?: number;
  prefix?: string;
}

/**
 * Adapter that wraps legacy cache services to work with the new unified interface
 */
export class LegacyCacheServiceAdapter implements CacheService {
  private legacyService: LegacyCacheService;
  private config: LegacyCacheConfig;
  private metrics: CacheMetrics;

  constructor(legacyService: LegacyCacheService, config: LegacyCacheConfig = {}) {
    this.legacyService = legacyService;
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.legacyService.get(this.formatKey(key));
      this.updateMetrics('hit');
      return result || null;
    } catch (error) {
      this.updateMetrics('miss');
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.config.ttl;
      await this.legacyService.set(this.formatKey(key), value, ttl);
      this.updateMetrics('set');
    } catch (error) {
      this.updateMetrics('error');
      throw error;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.legacyService.delete(this.formatKey(key));
      this.updateMetrics('delete');
      return result;
    } catch (error) {
      this.updateMetrics('error');
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.legacyService.has(this.formatKey(key));
    } catch (error) {
      return false;
    }
  }

  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    // Legacy services don't typically support batch operations
    // Fall back to individual gets
    const results = await Promise.all(keys.map(key => this.get<T>(key)));
    return results;
  }

  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    // Legacy services don't typically support batch operations
    // Fall back to individual sets
    await Promise.all(entries.map(({ key, value, ttl }) => this.set(key, value, ttl)));
  }

  async mdel(keys: string[]): Promise<number> {
    // Legacy services don't typically support batch operations
    // Fall back to individual deletes
    const results = await Promise.all(keys.map(key => this.del(key)));
    return results.filter(Boolean).length;
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    // Legacy services might not support atomic increment
    // Implement using get/set (not atomic, but functional)
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, delta: number = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    // Legacy services might not support changing TTL
    // Try to get the value and re-set it with new TTL
    try {
      const value = await this.get(key);
      if (value === null) return false;
      await this.set(key, value, ttlSeconds);
      return true;
    } catch {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    // Legacy services typically don't support TTL queries
    return -1;
  }

  async clear(): Promise<void> {
    if (this.legacyService.clear) {
      await this.legacyService.clear();
    } else {
      // Fallback: get all keys and delete them
      if (this.legacyService.keys) {
        const keys = await this.legacyService.keys();
        await Promise.all(keys.map(key => this.del(key)));
      }
    }
  }

  async size(): Promise<number> {
    if (this.legacyService.size) {
      return await this.legacyService.size();
    }
    
    // Fallback: count keys if available
    if (this.legacyService.keys) {
      const keys = await this.legacyService.keys();
      return keys.length;
    }
    
    return 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.legacyService.keys) {
      return [];
    }
    
    const keys = await this.legacyService.keys();
    
    if (!pattern) return keys;
    
    // Simple pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    const results = await Promise.all(keys.map(key => this.del(key)));
    return results.filter(Boolean).length;
  }

  async getHealth(): Promise<CacheHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      const latency = Date.now() - startTime;
      
      return {
        status: result === 'test' ? 'healthy' : 'degraded',
        latency,
        connectionStatus: 'connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        connectionStatus: 'disconnected',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Private helper methods
  private formatKey(key: string): string {
    return this.config.prefix ? `${this.config.prefix}${key}` : key;
  }

  private updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete' | 'error'): void {
    this.metrics.operations++;
    
    switch (operation) {
      case 'hit':
        this.metrics.hits++;
        break;
      case 'miss':
        this.metrics.misses++;
        break;
      case 'error':
        this.metrics.errors++;
        break;
    }

    // Update hit rate
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      errors: 0,
      memoryUsage: 0,
      keyCount: 0,
      avgLatency: 0,
      maxLatency: 0,
      minLatency: 0
    };
  }
}

/**
 * Factory function to create a legacy cache adapter
 */
export function createLegacyCacheAdapter(
  legacyService: LegacyCacheService, 
  config?: LegacyCacheConfig
): CacheService {
  return new LegacyCacheServiceAdapter(legacyService, config);
}

/**
 * Helper to detect if a service is a legacy cache service
 */
export function isLegacyCacheService(service: any): service is LegacyCacheService {
  return (
    service &&
    typeof service.get === 'function' &&
    typeof service.set === 'function' &&
    typeof service.delete === 'function'
  );
}

/**
 * Migration helper to wrap existing cache services
 */
export function migrateLegacyCacheService(service: any, config?: LegacyCacheConfig): CacheService {
  if (isLegacyCacheService(service)) {
    console.warn(
      '[MIGRATION] Wrapping legacy cache service. ' +
      'Consider migrating to the new unified cache interface for better performance and features.'
    );
    return createLegacyCacheAdapter(service, config);
  }
  
  throw new Error('Service does not implement the legacy cache interface');
}