/**
 * Base Cache Adapter
 * 
 * Abstract base class providing common functionality for cache adapters
 * Includes metrics collection, event emission, and error handling
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type { 
  CacheAdapter, 
  CacheMetrics, 
  CacheEvent, 
  CacheEventType,
  CacheOptions,
  CacheTierStats 
} from './types';

export abstract class BaseCacheAdapter extends EventEmitter implements CacheAdapter {
  protected metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    avgResponseTime: 0,
    errors: 0,
    totalSize: 0,
    totalEntries: 0,
  };

  protected responseTimes: number[] = [];
  protected readonly maxResponseTimeHistory = 1000;
  protected enableMetrics: boolean;
  protected keyPrefix: string;

  constructor(
    protected config: {
      enableMetrics?: boolean;
      keyPrefix?: string;
    } = {}
  ) {
    super();
    this.enableMetrics = config.enableMetrics ?? true;
    this.keyPrefix = config.keyPrefix ?? '';
    this.setMaxListeners(20); // Allow multiple listeners
  }

  // Abstract methods that must be implemented by concrete adapters
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttlSec?: number): Promise<void>;
  abstract del(key: string): Promise<void>;

  /**
   * Format cache key with prefix
   */
  protected formatKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  /**
   * Measure operation performance and update metrics
   */
  protected async measureOperation<T>(
    operation: () => Promise<T>,
    eventType: CacheEventType,
    key: string,
    tier?: 'L1' | 'L2'
  ): Promise<T> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      this.updateMetrics(duration, true);
      this.emitCacheEvent(eventType, key, { duration, tier });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.updateMetrics(duration, false);
      this.emitCacheEvent('error', key, { 
        duration, 
        tier, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
      
      throw error;
    }
  }

  /**
   * Update performance metrics
   */
  protected updateMetrics(responseTime: number, success: boolean): void {
    if (!this.enableMetrics) return;

    // Update response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Calculate average response time
    this.metrics.avgResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

    // Update error count
    if (!success) {
      this.metrics.errors++;
    }

    // Update hit rate
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Record cache hit
   */
  protected recordHit(key: string, tier?: 'L1' | 'L2'): void {
    if (!this.enableMetrics) return;
    
    this.metrics.hits++;
    this.emitCacheEvent('hit', key, { tier });
  }

  /**
   * Record cache miss
   */
  protected recordMiss(key: string, tier?: 'L1' | 'L2'): void {
    if (!this.enableMetrics) return;
    
    this.metrics.misses++;
    this.emitCacheEvent('miss', key, { tier });
  }

  /**
   * Record cache set operation
   */
  protected recordSet(key: string, size?: number, tier?: 'L1' | 'L2'): void {
    if (!this.enableMetrics) return;
    
    this.emitCacheEvent('set', key, { size, tier });
  }

  /**
   * Record cache delete operation
   */
  protected recordDelete(key: string, tier?: 'L1' | 'L2'): void {
    if (!this.enableMetrics) return;
    
    this.emitCacheEvent('delete', key, { tier });
  }

  /**
   * Emit cache event for monitoring
   */
  protected emitCacheEvent(
    type: CacheEventType, 
    key: string, 
    data: Partial<CacheEvent> = {}
  ): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: new Date(),
      ...data,
    };

    this.emit('cache:event', event);
    this.emit(`cache:${type}`, event);
  }

  /**
   * Calculate data size for metrics
   */
  protected calculateSize(data: any): number {
    try {
      if (typeof data === 'string') {
        return Buffer.byteLength(data, 'utf8');
      }
      
      const serialized = JSON.stringify(data);
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      // Fallback for complex objects
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Check if data should be compressed
   */
  protected shouldCompress(data: string | Buffer, threshold: number): boolean {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    return size > threshold;
  }

  /**
   * Validate TTL value
   */
  protected validateTtl(ttl?: number): number {
    if (ttl === undefined || ttl === null) {
      return 0; // No expiration
    }
    
    if (ttl < 0) {
      throw new Error('TTL cannot be negative');
    }
    
    if (ttl > 86400 * 365) { // 1 year
      throw new Error('TTL cannot exceed 1 year');
    }
    
    return Math.floor(ttl);
  }

  /**
   * Validate cache key
   */
  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Cache key must be a non-empty string');
    }
    
    if (key.length > 250) {
      throw new Error('Cache key cannot exceed 250 characters');
    }
    
    // Check for invalid characters
    if (/[\r\n\t\f\v\0]/.test(key)) {
      throw new Error('Cache key contains invalid characters');
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      avgResponseTime: 0,
      errors: 0,
      totalSize: 0,
      totalEntries: 0,
    };
    this.responseTimes = [];
  }

  /**
   * Get cache statistics for a specific tier
   */
  protected getTierStats(tier: 'L1' | 'L2'): CacheTierStats {
    // This will be overridden by multi-tier implementations
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: 0, // Will be tracked separately
      deletes: 0, // Will be tracked separately
      errors: this.metrics.errors,
      hitRate: this.metrics.hitRate,
      avgResponseTime: this.metrics.avgResponseTime,
      totalSize: this.metrics.totalSize || 0,
      totalEntries: this.metrics.totalEntries || 0,
    };
  }

  /**
   * Enable or disable metrics collection
   */
  setMetricsEnabled(enabled: boolean): void {
    this.enableMetrics = enabled;
    if (!enabled) {
      this.resetMetrics();
    }
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{
    connected: boolean;
    latency: number;
    memory?: any;
    stats: CacheMetrics;
    errors?: string[];
  }> {
    const start = performance.now();
    const errors: string[] = [];
    
    try {
      // Test basic operation
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      if (result !== 'test') {
        errors.push('Basic cache operations failed');
      }
      
      const latency = performance.now() - start;
      
      return {
        connected: true,
        latency,
        stats: this.getMetrics(),
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        connected: false,
        latency: performance.now() - start,
        stats: this.getMetrics(),
        errors,
      };
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.resetMetrics();
  }

  // Optional methods with default implementations
  async flush?(): Promise<void> {
    throw new Error('Flush operation not supported by this adapter');
  }

  async clear?(): Promise<void> {
    throw new Error('Clear operation not supported by this adapter');
  }

  async exists?(key: string): Promise<boolean> {
    this.validateKey(key);
    const value = await this.get(key);
    return value !== null;
  }

  async ttl?(key: string): Promise<number> {
    throw new Error('TTL operation not supported by this adapter');
  }

  async mget?<T>(keys: string[]): Promise<(T | null)[]> {
    // Default implementation using individual gets
    const promises = keys.map(key => this.get<T>(key));
    return Promise.all(promises);
  }

  async mset?<T>(entries: [string, T, number?][]): Promise<void> {
    // Default implementation using individual sets
    const promises = entries.map(([key, value, ttl]) => this.set(key, value, ttl));
    await Promise.all(promises);
  }

  async invalidateByPattern?(pattern: string): Promise<number> {
    throw new Error('Pattern invalidation not supported by this adapter');
  }

  async invalidateByTags?(tags: string[]): Promise<number> {
    throw new Error('Tag invalidation not supported by this adapter');
  }
}