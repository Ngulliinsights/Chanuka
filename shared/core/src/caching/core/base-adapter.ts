/**
 * Base Cache Adapter
 * 
 * Abstract base class providing common functionality for all cache adapters
 */

import { EventEmitter } from 'events';
import { 
  CacheAdapter, 
  CacheAdapterConfig, 
  CacheMetrics, 
  CacheHealthStatus,
  CacheEvent,
  CacheEventType,
  CacheEventEmitter
} from './interfaces.js';

export abstract class BaseCacheAdapter extends EventEmitter implements CacheAdapter, CacheEventEmitter {
  public readonly name: string;
  public readonly version: string;
  public readonly config: CacheAdapterConfig;
  
  protected metrics: CacheMetrics;
  protected startTime: number;
  protected connected: boolean = false;

  constructor(name: string, version: string, config: CacheAdapterConfig) {
    super();
    this.name = name;
    this.version = version;
    this.config = {
      keyPrefix: '',
      defaultTtlSec: 300, // 5 minutes
      maxMemoryMB: 100,
      enableMetrics: true,
      enableCompression: false,
      compressionThreshold: 1024, // 1KB
      ...config
    };
    
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }

  // Abstract methods that must be implemented by concrete adapters
  abstract get<T = any>(key: string): Promise<T | null>;
  abstract set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  abstract del(key: string): Promise<boolean>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear?(): Promise<void>;

  // Default implementations for optional methods
  async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    const results = await Promise.all(keys.map(key => this.get<T>(key)));
    return results;
  }

  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    await Promise.all(entries.map(({ key, value, ttl }) => 
      this.set(key, value, ttl || this.config.defaultTtlSec)
    ));
  }

  async mdel(keys: string[]): Promise<number> {
    const results = await Promise.all(keys.map(key => this.del(key)));
    return results.filter(Boolean).length;
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, delta: number = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  async ttl(key: string): Promise<number> {
    // Default implementation returns -1 (no TTL support)
    // Concrete adapters should override this if they support TTL queries
    return -1;
  }

  // Health and metrics
  async getHealth(): Promise<CacheHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic operations
      const testKey = `${this.config.keyPrefix}health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      const latency = Date.now() - startTime;
      
      return {
        status: result === 'test' ? 'healthy' : 'degraded',
        latency,
        memoryUsage: this.getMemoryUsage(),
        connectionStatus: this.connected ? 'connected' : 'disconnected',
        uptime: Date.now() - this.startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        connectionStatus: 'disconnected',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        uptime: Date.now() - this.startTime
      };
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Event system
  emit(event_type: CacheEventType, data: Omit<CacheEvent, 'type' | 'timestamp'>): boolean {
    const event: CacheEvent = {
      type: event_type,
      timestamp: Date.now(),
      ...data
    };
    return super.emit(event_type, event);
  }

  // Lifecycle methods
  async connect(): Promise<void> {
    this.connected = true;
    this.emit('circuit_close', { key: 'connection' });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emit('circuit_open', { key: 'connection' });
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }

  // Protected utility methods
  protected formatKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}${key}` : key;
  }

  protected updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete' | 'error', latency?: number): void {
    if (!this.config.enableMetrics) return;

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

    // Update latency metrics
    if (latency !== undefined) {
      this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
      this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
      this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
    }
  }

  protected async measureLatency<T>(operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      this.updateMetrics('hit', Date.now() - start);
      return result;
    } catch (error) {
      this.updateMetrics('error', Date.now() - start);
      throw error;
    }
  }

  protected getMemoryUsage(): number {
    // Default implementation - concrete adapters should override
    return 0;
  }

  protected shouldCompress(data: any): boolean {
    if (!this.config.enableCompression) return false;
    
    const size = this.estimateSize(data);
    return size >= (this.config.compressionThreshold || 1024);
  }

  protected estimateSize(data: any): number {
    // Rough estimation of data size
    if (typeof data === 'string') return data.length;
    if (typeof data === 'number') return 8;
    if (typeof data === 'boolean') return 1;
    if (data === null || data === undefined) return 0;
    
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  protected serialize(data: any): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new Error(`Failed to serialize data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected deserialize<T>(data: string): T {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to deserialize data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      minLatency: Infinity,
      avgResponseTime: 0
    };
  }
}
