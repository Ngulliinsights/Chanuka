/**
 * Redis Cache Adapter
 * 
 * Enhanced Redis implementation with improved type safety,
 * performance optimizations, and error handling
 */

import Redis, { RedisOptions } from 'ioredis';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { BaseCacheAdapter } from '../base-adapter';
import type {
  CacheOptions,
  CacheHealthStatus,
  CompressionOptions,
  CacheConfig
} from '../types';

// Promisified compression functions
const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface RedisAdapterConfig extends CacheConfig {
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
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private compressionOptions: CompressionOptions;

  constructor(protected override config: RedisAdapterConfig) {
    super({
      enableMetrics: config.enableMetrics,
      // Only pass keyPrefix if it's defined, avoiding the undefined assignment issue
      ...(config.keyPrefix !== undefined && { keyPrefix: config.keyPrefix }),
    });

    this.compressionOptions = {
      enabled: config.enableCompression ?? false,
      threshold: config.compressionThreshold ?? 1024,
      algorithm: 'gzip',
      level: 6,
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with optimized settings
   * The definite assignment assertion (!) on client is safe because
   * this method is called in the constructor and always assigns the client
   */
  private initializeRedis(): void {
    const redisOptions: RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: this.config.enableOfflineQueue ?? false,
      lazyConnect: this.config.lazyConnect ?? true,
      keepAlive: this.config.keepAlive ?? 30000,
      family: this.config.family ?? 4,
      db: this.config.db ?? 0,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };

    this.client = new Redis(this.config.redisUrl, redisOptions);
    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers with proper error tracking
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.connected = true;
      this.emitCacheEvent('circuit_breaker_close', 'redis_connection');
    });

    this.client.on('ready', () => {
      this.connected = true;
    });

    this.client.on('error', (error) => {
      this.connected = false;
      this.metrics.errors++;
      this.emitCacheEvent('error', 'redis_connection', { error });
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      this.emitCacheEvent('circuit_breaker_open', 'redis_reconnecting');
    });

    this.client.on('end', () => {
      this.connected = false;
    });
  }

  /**
   * Connect to Redis with connection pooling
   */
  async connect(): Promise<void> {
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
  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
      }
      this.connected = false;
    } catch (error) {
      this.emitCacheEvent('error', 'redis_disconnect', { 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
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
    this.validateKey(key);
    
    return this.measureOperation(async () => {
      if (!this.connected) {
        this.recordMiss(key, 'L2');
        return null;
      }

      try {
        const formattedKey = this.formatKey(key);
        const data = await this.client.getBuffer(formattedKey);
        
        if (!data) {
          this.recordMiss(key, 'L2');
          return null;
        }

        this.recordHit(key, 'L2');

        // Handle decompression if needed
        let parsed: string;
        if (this.compressionOptions.enabled && data[0] === 0x1f && data[1] === 0x8b) {
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
          this.recordMiss(key, 'L2');
          return null;
        }
      } catch (error) {
        this.recordMiss(key, 'L2');
        this.metrics.errors++;
        throw error;
      }
    }, 'hit', key, 'L2');
  }

  /**
   * Set value in Redis with automatic compression
   */
  override async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    this.validateKey(key);
    const validatedTtl = this.validateTtl(ttlSec);

    return this.measureOperation(async () => {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }

      try {
        const serialized = JSON.stringify(value);
        const originalSize = this.calculateSize(serialized);
        let data: Buffer = Buffer.from(serialized, 'utf8');
        
        // Apply compression if enabled and data exceeds threshold
        if (this.compressionOptions.enabled && 
            this.shouldCompress(serialized, this.compressionOptions.threshold)) {
          data = await compressAsync(data);
        }

        const formattedKey = this.formatKey(key);
        
        if (validatedTtl > 0) {
          await this.client.setex(formattedKey, validatedTtl, data);
        } else {
          await this.client.set(formattedKey, data);
        }

        this.recordSet(key, originalSize, 'L2');
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    }, 'set', key, 'L2');
  }

  /**
   * Delete value from Redis
   */
  override async del(key: string): Promise<void> {
    this.validateKey(key);

    return this.measureOperation(async () => {
      if (!this.connected) {
        return;
      }

      try {
        const formattedKey = this.formatKey(key);
        await this.client.del(formattedKey);
        this.recordDelete(key, 'L2');
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    }, 'delete', key, 'L2');
  }

  /**
   * Check if key exists in Redis
   */
  override async exists(key: string): Promise<boolean> {
    this.validateKey(key);

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
    this.validateKey(key);

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
  async expire(key: string, seconds: number): Promise<boolean> {
    this.validateKey(key);
    const validatedTtl = this.validateTtl(seconds);

    if (!this.connected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.client.expire(formattedKey, validatedTtl);
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
    
    keys.forEach(key => this.validateKey(key));

    return this.measureOperation(async () => {
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
             this.recordMiss(key, 'L2');
             return null;
           }

           this.recordHit(key, 'L2');

           try {
             // Handle decompression
             let parsed: string;
             if (this.compressionOptions.enabled && value[0] === 0x1f && value[1] === 0x8b) {
               const decompressed = await decompressAsync(value);
               parsed = decompressed.toString('utf8');
             } else {
               parsed = value.toString('utf8');
             }

             return JSON.parse(parsed) as T;
           } catch (parseError) {
             // Remove corrupted data
             this.del(key);
             this.recordMiss(key, 'L2');
             return null;
           }
         }));
      } catch (error) {
        keys.forEach(key => this.recordMiss(key, 'L2'));
        this.metrics.errors++;
        throw error;
      }
    }, 'hit', `mget:${keys.length}`, 'L2');
  }

  /**
   * Set multiple values in Redis using pipeline
   */
  override async mset<T>(entries: [string, T, number?][]): Promise<void> {
    if (entries.length === 0) return;
    
    entries.forEach(([key]) => this.validateKey(key));

    return this.measureOperation(async () => {
      if (!this.connected) {
        throw new Error('Redis not connected');
      }

      try {
        const pipeline = this.client.pipeline();

        for (const [key, value, ttl] of entries) {
          const validatedTtl = ttl !== undefined ? this.validateTtl(ttl) : 0;
          const serialized = JSON.stringify(value);
          let data: Buffer = Buffer.from(serialized, 'utf8');
          
          // Apply compression if needed
          if (this.compressionOptions.enabled && 
              this.shouldCompress(serialized, this.compressionOptions.threshold)) {
            data = await compressAsync(data);
          }

          const formattedKey = this.formatKey(key);
          
          if (validatedTtl > 0) {
            pipeline.setex(formattedKey, validatedTtl, data);
          } else {
            pipeline.set(formattedKey, data);
          }

          this.recordSet(key, this.calculateSize(serialized), 'L2');
        }

        await pipeline.exec();
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    }, 'set', `mset:${entries.length}`, 'L2');
  }

  /**
   * Invalidate cache by pattern using SCAN
   */
  override async invalidateByPattern(pattern: string): Promise<number> {
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
  override async invalidateByTags(tags: string[]): Promise<number> {
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
  override async flush(): Promise<void> {
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
  async warmUp(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    if (entries.length === 0) return;

    try {
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        // Create properly typed entries array without undefined ttl values
        const msetEntries: [string, any, number?][] = batch.map(({ key, value, options }) => {
          const entry: [string, any, number?] = options?.ttl !== undefined 
            ? [key, value, options.ttl]
            : [key, value];
          return entry;
        });
        
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
      return errors.length > 0
        ? {
            connected: this.connected,
            latency,
            memory,
            stats: this.getMetrics(),
            errors,
          }
        : {
            connected: this.connected,
            latency,
            memory,
            stats: this.getMetrics(),
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
  override destroy(): void {
    super.destroy();
    this.disconnect();
  }
}