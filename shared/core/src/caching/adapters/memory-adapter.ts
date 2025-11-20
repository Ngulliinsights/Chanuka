/**
 * Memory Cache Adapter
 * 
 * High-performance in-memory cache with LRU eviction and TTL support
 */

import { BaseCacheAdapter } from '/core/base-adapter.js';
import { CacheAdapterConfig } from '/core/interfaces.js';

export interface MemoryAdapterConfig extends CacheAdapterConfig {
  maxSize?: number;
  cleanupInterval?: number;
  enableLRU?: boolean;
}

interface CacheEntry {
  value: any;
  expires_at?: number;
  accessedAt: number;
  created_at: number;
}

export class MemoryAdapter extends BaseCacheAdapter {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private cleanupTimer: NodeJS.Timeout | undefined;
  private readonly maxSize: number;
  private readonly cleanupInterval: number;
  private readonly enableLRU: boolean;

  constructor(config: MemoryAdapterConfig = {}) {
    super('MemoryAdapter', '1.0.0', config);

    this.maxSize = config.maxSize || 10000;
    this.cleanupInterval = config.cleanupInterval || 60000; // 1 minute
    this.enableLRU = config.enableLRU !== false;

    this.startCleanupTimer();
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const entry = this.cache.get(formattedKey);

      if (!entry) {
        this.updateMetrics('miss');
        this.emit('miss', { key: formattedKey });
        return null;
      }

      // Check if expired
      if (entry.expires_at && Date.now() > entry.expires_at) {
        this.cache.delete(formattedKey);
        this.removeFromAccessOrder(formattedKey);
        this.updateMetrics('miss');
        this.emit('expire', { key: formattedKey });
        return null;
      }

      // Update access time and order for LRU
      entry.accessedAt = Date.now();
      if (this.enableLRU) {
        this.updateAccessOrder(formattedKey);
      }

      this.updateMetrics('hit');
      this.emit('hit', { key: formattedKey });
      return entry.value;
    });
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const now = Date.now();

      const entry: CacheEntry = {
        value,
        accessedAt: now,
        created_at: now,
        ...(ttlSeconds && { expires_at: now + (ttlSeconds * 1000) }),
      };

      // Check if we need to evict entries
      if (this.cache.size >= this.maxSize && !this.cache.has(formattedKey)) {
        await this.evictLRU();
      }

      this.cache.set(formattedKey, entry);

      if (this.enableLRU) {
        this.updateAccessOrder(formattedKey);
      }

      this.updateMetrics('set');
      this.emit('set', { key: formattedKey, metadata: { ttl: ttlSeconds } });
    });
  }

  async del(key: string): Promise<boolean> {
    return this.measureLatency(async () => {
      const formattedKey = this.formatKey(key);
      const existed = this.cache.delete(formattedKey);

      if (existed) {
        this.removeFromAccessOrder(formattedKey);
        this.updateMetrics('delete');
        this.emit('delete', { key: formattedKey });
      }

      return existed;
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);

    if (!entry) return false;

    // Check if expired
    if (entry.expires_at && Date.now() > entry.expires_at) {
      this.cache.delete(formattedKey);
      this.removeFromAccessOrder(formattedKey);
      return false;
    }

    return true;
  }

  override async ttl(key: string): Promise<number> {
    const formattedKey = this.formatKey(key);
    const entry = this.cache.get(formattedKey);

    if (!entry) return -2; // Key doesn't exist
    if (!entry.expires_at) return -1; // No expiration

    const remaining = Math.ceil((entry.expires_at - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.keyCount = 0;
    this.emit('delete', { key: '*' });
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());

    if (!pattern) return keys;

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    let deleted = 0;

    for (const key of keys) {
      if (await this.del(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  // Override to provide accurate memory usage
  protected override getMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of Array.from(this.cache)) {
      totalSize += (key as string).length;
      totalSize += this.estimateSize(entry.value);
      totalSize += 32; // Overhead for entry metadata
    }

    return Math.round(totalSize / (1024 * 1024)); // Convert to MB
  }

  override async connect(): Promise<void> {
    await super.connect();
    this.startCleanupTimer();
  }

  override async disconnect(): Promise<void> {
    await super.disconnect();
    this.stopCleanupTimer();
  }

  override async destroy(): Promise<void> {
    this.stopCleanupTimer();
    await this.clear();
    await super.destroy();
  }

  // Private methods
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) return;

    // Remove least recently used item
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      await this.del(lruKey);
      this.emit('evict', { key: lruKey, metadata: { reason: 'lru' } });
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of Array.from(this.cache)) {
      if (entry.expires_at && now > entry.expires_at) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.emit('expire', { key });
    }

    // Update metrics
    this.metrics.keyCount = this.cache.size;
    this.metrics.memoryUsage = this.getMemoryUsage();
  }
}


