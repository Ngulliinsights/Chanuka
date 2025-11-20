/**
 * Redis Cache Adapter
 * 
 * Enhanced Redis implementation with improved type safety,
 * performance optimizations, and error handling
 */

import Redis, { RedisOptions } from 'ioredis';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { BaseCacheAdapter } from '/core/base-adapter';
import type {
  CacheAdapterConfig,
  CacheHealthStatus
} from '../core/interfaces';

// Promisified compression functions
const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface RedisAdapterConfig extends CacheAdapterConfig {
  redisUrl: string;
  maxRetries?: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
  keepAlive?: number;
  family?: 4 | 6;
  db?: number;
}

export class RedisAdapter extends BaseCacheAdapter {
  private client!: Redis;
  protected override connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: RedisAdapterConfig) {
    super('RedisAdapter', '1.0.0', config);

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with optimized settings
   * The definite assignment assertion (!) on client is safe because
   * this method is called in the constructor and always assigns 
   */
  private initializeRedis(): void {
    const redisOptions: RedisOptions = {
      maxRetriesPerRequest: (this.config as any).maxRetries ?? 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: (this.config as any).enableOfflineQueue ?? false,
      lazyConnect: (this.config as any).lazyConnect ?? true,
      keepAlive: (this.config as any).keepAlive ?? 30000,
      family: (this.config as any).family ?? 4,
      db: (this.config as any).db ?? 0,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };

    this.client = new Redis((this.config as any).redisUrl, redisOptions);
    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers with proper error tracking
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.connected = true;
      this.emit('circuit_close', { key: 'redis_connection' });
    });

    this.client.on('ready', () => {
      this.connected = true;
    });

    this.client.on('error', (_error) => {
      this.connected = false;
      this.metrics.errors++;
      this.emit('error', { key: 'redis_connection' });
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      this.emit('circuit_open', { key: 'redis_reconnecting' });
    });

    this.client.on('end', () => {
      this.connected = false;
    });
  }

  /**
   * Connect to Redis with connection pooling
   */
  override async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.connected) {
      return Promise.resolve();
    }

    this.connectionPromise = this.client.connect()
      .then(() => {
        this.connected = true;
        this.connectionPromise = null;
      })
      .catch((error) => {
        this.connectionPromise = null;
        throw error;
      });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Redis gracefully
   */
  override async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
      }
      this.connected = false;
    } catch (error) {
      this.emit('error', { key: 'redis_disconnect' });
      // Force disconnect on error
      this.client.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check connection status - this method exists in base class
   */
  isConnected(): boolean {
    return this.connected && this.client.status === 'ready';
  }

  /**
   * Get value from Redis with automatic decompression
   */
  override async get<T>(key: string): Promise<T | null> {
    if (!this.connected) {
      this.updateMetrics('miss');
      return null;
    }

    try {
      const formattedKey = this.formatKey(key);
      const data = await this.client.getBuffer(formattedKey);

      if (!data) {
        this.updateMetrics('miss');
        return null;
      }

      this.updateMetrics('hit');

      // Handle decompression if needed
      let parsed: string;
      if (this.config.enableCompression && data[0] === 0x1f && data[1] === 0x8b) {
        // Gzip magic number detected
        const decompressed = await decompressAsync(data);
        parsed = decompressed.toString('utf8');
      } else {
        parsed = data.toString('utf8');
      }

      try {
        return JSON.parse(parsed) as T;
      } catch (parseError) {
        // Remove corrupted data
        await this.del(key);
        this.updateMetrics('miss');
        return null;
      }
    } catch (error) {
      this.updateMetrics('miss');
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Set value in Redis with automatic compression
   */
  override async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const serialized = JSON.stringify(value);
      let data: Buffer = Buffer.from(serialized, 'utf8');

      // Apply compression if enabled and data exceeds threshold
      if (this.config.enableCompression &&
          this.shouldCompress(data)) {
        data = await compressAsync(data);
      }

      const formattedKey = this.formatKey(key);

      if (ttlSec && ttlSec > 0) {
        await this.client.setex(formattedKey, ttlSec, data);
      } else {
        await this.client.set(formattedKey, data);
      }

      this.updateMetrics('set');
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Delete value from Redis
   */
  override async del(key: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.client.del(formattedKey);
      this.updateMetrics('delete');
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Check if key exists in Redis
   */
  override async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.client.exists(formattedKey);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  override async ttl(key: string): Promise<number> {
    if (!this.connected) {
      return -1;
    }

    try {
      const formattedKey = this.formatKey(key);
      return await this.client.ttl(formattedKey);
    } catch (error) {
      this.metrics.errors++;
      return -1;
    }
  }

  /**
   * Set expiration for a key
   */
  override async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.client.expire(formattedKey, seconds);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get multiple values from Redis with pipeline optimization
   */
  override async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    if (!this.connected) {
      return keys.map(() => null);
    }

    try {
      const formattedKeys = keys.map(key => this.formatKey(key));
      const values = await this.client.mgetBuffer(...formattedKeys);

      return await Promise.all(values.map(async (value, index) => {
         const key = keys[index];
         if (!key) {
           return null;
         }

         if (!value) {
           this.updateMetrics('miss');
           return null;
         }

         this.updateMetrics('hit');

         try {
           // Handle decompression
           let parsed: string;
           if (this.config.enableCompression && value[0] === 0x1f && value[1] === 0x8b) {
             const decompressed = await decompressAsync(value);
             parsed = decompressed.toString('utf8');
           } else {
             parsed = value.toString('utf8');
           }

           return JSON.parse(parsed) as T;
         } catch (parseError) {
           // Remove corrupted data
           this.del(key);
           this.updateMetrics('miss');
           return null;
         }
       }));
    } catch (error) {
      keys.forEach(() => this.updateMetrics('miss'));
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Set multiple values in Redis using pipeline
   */
  override async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    if (entries.length === 0) return;

    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const pipeline = this.client.pipeline();

      for (const { key, value, ttl } of entries) {
        const serialized = JSON.stringify(value);
        let data: Buffer = Buffer.from(serialized, 'utf8');

        // Apply compression if needed
        if (this.config.enableCompression && this.shouldCompress(data)) {
          data = await compressAsync(data);
        }

        const formattedKey = this.formatKey(key);

        if (ttl && ttl > 0) {
          pipeline.setex(formattedKey, ttl, data);
        } else {
          pipeline.set(formattedKey, data);
        }

        this.updateMetrics('set');
      }

      await pipeline.exec();
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern using SCAN
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    try {
      const formattedPattern = this.formatKey(pattern);
      let deletedCount = 0;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          formattedPattern,
          'COUNT',
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Invalidate cache by tags using Redis Sets
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.connected || tags.length === 0) {
      return 0;
    }

    try {
      let totalDeleted = 0;
      const pipeline = this.client.pipeline();

      for (const tag of tags) {
        const tagKey = this.formatKey(`tag:${tag}`);
        const keys = await this.client.smembers(tagKey);

        if (keys.length > 0) {
          pipeline.del(...keys);
          totalDeleted += keys.length;
        }

        pipeline.del(tagKey);
      }

      await pipeline.exec();
      return totalDeleted;
    } catch (error) {
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Add key to tag sets for invalidation
   */
  async addToTags(key: string, tags: string[]): Promise<void> {
    if (!this.connected || tags.length === 0) {
      return;
    }

    try {
      const pipeline = this.client.pipeline();
      const formattedKey = this.formatKey(key);
      
      for (const tag of tags) {
        const tagKey = this.formatKey(`tag:${tag}`);
        pipeline.sadd(tagKey, formattedKey);
      }
      
      await pipeline.exec();
    } catch (error) {
      this.metrics.errors++;
    }
  }

  /**
   * Clear all cache entries
   */
  async flush(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.flushdb();
      // Reset only the metrics that exist on the CacheMetrics type
      this.metrics.hits = 0;
      this.metrics.misses = 0;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Clear all cache entries (alias for flush)
   */
  override async clear(): Promise<void> {
    return this.flush();
  }

  /**
   * Warm up cache with critical data using batching
   */
  async warmUp(entries: Array<{ key: string; value: any; options?: any }>): Promise<void> {
    if (entries.length === 0) return;

    try {
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        // Create properly typed entries array without undefined ttl values
        const msetEntries: Array<{ key: string; value: any; ttl?: number }> = batch.map(({ key, value, options }) => ({
          key,
          value,
          ttl: options?.ttl
        }));

        await this.mset(msetEntries);

        // Handle tags for each entry
        const tagPromises = batch
          .filter(({ options }) => options?.tags && options.tags.length > 0)
          .map(({ key, options }) => {
            if (options?.tags) {
              return this.addToTags(key, options.tags);
            }
            return Promise.resolve();
          });

        await Promise.all(tagPromises);
      }
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get Redis health status with comprehensive checks
   */
  override async getHealth(): Promise<CacheHealthStatus> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      // Test Redis ping
      const pingResult = await this.client.ping();
      if (pingResult !== 'PONG') {
        errors.push('Redis ping failed');
      }
      
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      if (result !== 'test') {
        errors.push('Basic Redis operations failed');
      }

      // Get Redis memory info
      let memory: number | undefined;
      try {
        const info = await this.client.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        memory = match && match[1] ? parseInt(match[1], 10) : undefined;
      } catch {
        // Memory info might not be available
        memory = undefined;
      }

      const latency = performance.now() - start;

      // Return with explicit errors array or omit the property entirely
      const baseResult = {
        status: errors.length > 0 ? 'degraded' as const : 'healthy' as const,
        latency,
        uptime: Date.now() - this.startTime
      };

      if (memory !== undefined) {
        (baseResult as any).memoryUsage = memory;
      }

      if (errors.length > 0) {
        (baseResult as any).lastError = errors[0];
      }

      return baseResult;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        status: 'unhealthy' as const,
        latency: performance.now() - start,
        lastError: errors[0] || 'Unknown error',
        uptime: Date.now() - this.startTime
      };
    }
  }

  /**
   * Get Redis info parsed into key-value pairs
   */
  async getRedisInfo(): Promise<Record<string, string>> {
    if (!this.connected) {
      return {};
    }

    try {
      const info = await this.client.info();
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          if (key) {
            result[key] = valueParts.join(':');
          }
        }
      }

      return result;
    } catch (error) {
      this.metrics.errors++;
      return {};
    }
  }

  /**
   * Cleanup resources and disconnect
   */
  override async destroy(): Promise<void> {
    await super.destroy();
    await this.disconnect();
  }
}







































