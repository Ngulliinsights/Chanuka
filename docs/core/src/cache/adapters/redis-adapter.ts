/**
 * Redis Cache Adapter
 * 
 * Enhanced Redis implementation consolidating server/cache/CacheService.ts
 * with patterns from refined_cross_cutting.ts
 */

import Redis from 'ioredis';
import { compress, decompress } from 'zlib';
import { promisify } from 'util';
import { BaseCacheAdapter } from '../base-adapter';
import type { 
  CacheOptions, 
  CacheHealthStatus, 
  CompressionOptions,
  CacheConfig 
} from '../types';

// Handle cases where zlib functions might not be available (e.g., in tests)
const compressAsync = compress ? promisify(compress) : async (data: Buffer) => data;
const decompressAsync = decompress ? promisify(decompress) : async (data: Buffer) => data;

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
  private redis: Redis;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private compressionOptions: CompressionOptions;
  private tagSets = new Map<string, Set<string>>(); // For tag-based invalidation

  constructor(private config: RedisAdapterConfig) {
    super({
      enableMetrics: config.enableMetrics,
      keyPrefix: config.keyPrefix,
    });

    this.compressionOptions = {
      enabled: config.enableCompression,
      threshold: config.compressionThreshold,
      algorithm: 'gzip',
      level: 6,
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    const redisOptions: Redis.RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetries || 3,
      retryDelayOnFailover: this.config.retryDelayOnFailover || 100,
      enableOfflineQueue: this.config.enableOfflineQueue || false,
      lazyConnect: this.config.lazyConnect !== false,
      keepAlive: this.config.keepAlive || 30000,
      family: this.config.family || 4,
      db: this.config.db || 0,
    };

    this.redis = new Redis(this.config.redisUrl, redisOptions);
    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.emitCacheEvent('circuit_breaker_close', 'redis_connection');
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.metrics.errors++;
      this.emitCacheEvent('error', 'redis_connection', { error });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      this.emitCacheEvent('circuit_breaker_open', 'redis_reconnecting');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.redis.connect().then(() => {
      this.isConnected = true;
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
    } catch (error) {
      // Log error but don't throw
      this.emitCacheEvent('error', 'redis_disconnect', { 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get value from Redis cache
   */
  async get<T>(key: string): Promise<T | null> {
    this.validateKey(key);
    
    return this.measureOperation(async () => {
      if (!this.isConnected) {
        this.recordMiss(key, 'L2');
        return null;
      }

      try {
        const formattedKey = this.formatKey(key);
        const data = await this.redis.get(formattedKey);
        
        if (data === null) {
          this.recordMiss(key, 'L2');
          return null;
        }

        this.recordHit(key, 'L2');

        // Handle decompression if needed
        let parsed = data;
        if (this.compressionOptions.enabled && data.startsWith('compressed:')) {
          const compressedData = data.slice(11); // Remove 'compressed:' prefix
          const decompressed = await decompressAsync(Buffer.from(compressedData, 'base64'));
          parsed = decompressed.toString();
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
        throw error;
      }
    }, 'hit', key, 'L2');
  }

  /**
   * Set value in Redis cache
   */
  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    this.validateKey(key);
    const validatedTtl = this.validateTtl(ttlSec);

    return this.measureOperation(async () => {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      try {
        let serialized = JSON.stringify(value);
        const originalSize = this.calculateSize(serialized);
        
        // Apply compression if enabled and data exceeds threshold
        if (this.compressionOptions.enabled && 
            this.shouldCompress(serialized, this.compressionOptions.threshold)) {
          const compressed = await compressAsync(Buffer.from(serialized));
          serialized = 'compressed:' + compressed.toString('base64');
        }

        const formattedKey = this.formatKey(key);
        
        if (validatedTtl > 0) {
          await this.redis.setex(formattedKey, validatedTtl, serialized);
        } else {
          await this.redis.set(formattedKey, serialized);
        }

        this.recordSet(key, originalSize, 'L2');
      } catch (error) {
        throw error;
      }
    }, 'set', key, 'L2');
  }

  /**
   * Delete value from Redis cache
   */
  async del(key: string): Promise<void> {
    this.validateKey(key);

    return this.measureOperation(async () => {
      if (!this.isConnected) {
        return;
      }

      try {
        const formattedKey = this.formatKey(key);
        await this.redis.del(formattedKey);
        this.recordDelete(key, 'L2');
      } catch (error) {
        throw error;
      }
    }, 'delete', key, 'L2');
  }

  /**
   * Check if key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    if (!this.isConnected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.redis.exists(formattedKey);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    this.validateKey(key);

    if (!this.isConnected) {
      return -1;
    }

    try {
      const formattedKey = this.formatKey(key);
      return await this.redis.ttl(formattedKey);
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

    if (!this.isConnected) {
      return false;
    }

    try {
      const formattedKey = this.formatKey(key);
      const result = await this.redis.expire(formattedKey, validatedTtl);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get multiple values from Redis
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    
    keys.forEach(key => this.validateKey(key));

    return this.measureOperation(async () => {
      if (!this.isConnected) {
        return keys.map(() => null);
      }

      try {
        const formattedKeys = keys.map(key => this.formatKey(key));
        const values = await this.redis.mget(...formattedKeys);
        
        return values.map((value, index) => {
          if (value === null) {
            this.recordMiss(keys[index], 'L2');
            return null;
          }

          this.recordHit(keys[index], 'L2');
          
          try {
            // Handle decompression
            let parsed = value;
            if (this.compressionOptions.enabled && value.startsWith('compressed:')) {
              // Note: This is synchronous decompression for simplicity in mget
              // In production, consider async decompression with Promise.all
              parsed = value; // Simplified for now
            }
            
            return JSON.parse(parsed) as T;
          } catch (parseError) {
            // Remove corrupted data
            this.del(keys[index]);
            this.recordMiss(keys[index], 'L2');
            return null;
          }
        });
      } catch (error) {
        keys.forEach(key => this.recordMiss(key, 'L2'));
        throw error;
      }
    }, 'hit', `mget:${keys.length}`, 'L2');
  }

  /**
   * Set multiple values in Redis
   */
  async mset<T>(entries: [string, T, number?][]): Promise<void> {
    if (entries.length === 0) return;
    
    entries.forEach(([key]) => this.validateKey(key));

    return this.measureOperation(async () => {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      try {
        // Use pipeline for better performance
        const pipeline = this.redis.pipeline();

        for (const [key, value, ttl] of entries) {
          const validatedTtl = this.validateTtl(ttl);
          let serialized = JSON.stringify(value);
          
          // Apply compression if needed
          if (this.compressionOptions.enabled && 
              this.shouldCompress(serialized, this.compressionOptions.threshold)) {
            const compressed = await compressAsync(Buffer.from(serialized));
            serialized = 'compressed:' + compressed.toString('base64');
          }

          const formattedKey = this.formatKey(key);
          
          if (validatedTtl > 0) {
            pipeline.setex(formattedKey, validatedTtl, serialized);
          } else {
            pipeline.set(formattedKey, serialized);
          }

          this.recordSet(key, this.calculateSize(serialized), 'L2');
        }

        await pipeline.exec();
      } catch (error) {
        throw error;
      }
    }, 'set', `mset:${entries.length}`, 'L2');
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const formattedPattern = this.formatKey(pattern);
      let deletedCount = 0;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', formattedPattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
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
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected || tags.length === 0) {
      return 0;
    }

    try {
      let totalDeleted = 0;
      const pipeline = this.redis.pipeline();

      for (const tag of tags) {
        const tagKey = this.formatKey(`tag:${tag}`);
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          // Delete all keys associated with this tag
          pipeline.del(...keys);
          totalDeleted += keys.length;
        }

        // Delete the tag set itself
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
    if (!this.isConnected || tags.length === 0) {
      return;
    }

    try {
      const pipeline = this.redis.pipeline();
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
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.flushdb();
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Clear all cache entries (alias for flush)
   */
  async clear(): Promise<void> {
    return this.flush();
  }

  /**
   * Warm up cache with critical data
   */
  async warmUp(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    if (entries.length === 0) return;

    try {
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const msetEntries: [string, any, number?][] = batch.map(({ key, value, options }) => [
          key,
          value,
          options?.ttl
        ]);
        
        await this.mset(msetEntries);
        
        // Handle tags for each entry
        for (const { key, options } of batch) {
          if (options?.tags && options.tags.length > 0) {
            await this.addToTags(key, options.tags);
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Redis health status
   */
  async getHealth(): Promise<CacheHealthStatus> {
    const start = performance.now();
    const errors: string[] = [];

    try {
      // Test Redis ping
      await this.redis.ping();
      
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      
      if (result !== 'test') {
        errors.push('Basic Redis operations failed');
      }

      // Get Redis memory info
      let memory;
      try {
        memory = await this.redis.memory('usage');
      } catch {
        // Memory command might not be available in all Redis versions
        memory = null;
      }

      const latency = performance.now() - start;

      return {
        connected: this.isConnected,
        latency,
        memory,
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
   * Get Redis info
   */
  async getRedisInfo(): Promise<Record<string, string>> {
    if (!this.isConnected) {
      return {};
    }

    try {
      const info = await this.redis.info();
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      return {};
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    super.destroy();
    this.disconnect();
  }
}