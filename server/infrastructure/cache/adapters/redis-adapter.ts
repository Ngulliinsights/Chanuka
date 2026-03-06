/**
 * Redis Cache Adapter
 * 
 * Production-ready Redis caching implementation with:
 * - Connection pooling and automatic reconnection
 * - Compression for large values
 * - TTL management
 * - Health checks and metrics
 * - Error handling with graceful degradation
 * - Batch operations support
 */

import Redis, { RedisOptions } from 'ioredis';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import { logger } from '@server/infrastructure/observability';
import { Result, ok, err } from '@shared/core/primitives/types/result';
import type { CacheAdapter, CacheMetrics, HealthStatus } from '../interfaces';

const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface RedisCacheConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  enableCompression?: boolean;
  compressionThreshold?: number; // bytes
  connectionTimeout?: number;
  commandTimeout?: number;
  enableOfflineQueue?: boolean;
  lazyConnect?: boolean;
}

export class RedisCacheAdapter implements CacheAdapter {
  private client: Redis;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    compressions: 0,
    decompressions: 0,
    bytesRead: 0,
    bytesWritten: 0,
    startTime: Date.now(),
  };

  constructor(private config: RedisCacheConfig = {}) {
    this.client = this.createClient();
    this.setupEventHandlers();
  }

  /**
   * Create Redis client with configuration
   */
  private createClient(): Redis {
    const redisUrl = this.config.url || process.env.REDIS_URL;
    
    if (redisUrl) {
      // Use URL-based configuration
      const options: RedisOptions = {
        maxRetriesPerRequest: this.config.maxRetries ?? 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * (this.config.retryDelayMs ?? 50), 2000);
          return delay;
        },
        enableOfflineQueue: this.config.enableOfflineQueue ?? false,
        lazyConnect: this.config.lazyConnect ?? true,
        connectTimeout: this.config.connectionTimeout ?? 10000,
        commandTimeout: this.config.commandTimeout ?? 5000,
        enableReadyCheck: true,
        autoResubscribe: false,
        autoResendUnfulfilledCommands: true,
        keyPrefix: this.config.keyPrefix ?? 'cache:',
      };

      return new Redis(redisUrl, options);
    }

    // Use host/port configuration
    const options: RedisOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
      password: this.config.password,
      db: this.config.db ?? 0,
      keyPrefix: this.config.keyPrefix ?? 'cache:',
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * (this.config.retryDelayMs ?? 50), 2000);
        return delay;
      },
      enableOfflineQueue: this.config.enableOfflineQueue ?? false,
      lazyConnect: this.config.lazyConnect ?? true,
      connectTimeout: this.config.connectionTimeout ?? 10000,
      commandTimeout: this.config.commandTimeout ?? 5000,
      enableReadyCheck: true,
      autoResubscribe: false,
      autoResendUnfulfilledCommands: true,
    };

    return new Redis(options);
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info({ component: 'RedisCacheAdapter' }, 'Redis cache connected');
    });

    this.client.on('ready', () => {
      this.connected = true;
      logger.info({ component: 'RedisCacheAdapter' }, 'Redis cache ready');
    });

    this.client.on('error', (error) => {
      this.connected = false;
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter' }, 'Redis cache error', error);
    });

    this.client.on('close', () => {
      this.connected = false;
      logger.warn({ component: 'RedisCacheAdapter' }, 'Redis cache connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info({ component: 'RedisCacheAdapter' }, 'Redis cache reconnecting');
    });
  }

  /**
   * Connect to Redis
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
        logger.info({ component: 'RedisCacheAdapter' }, 'Redis cache connection established');
      })
      .catch((error) => {
        this.connectionPromise = null;
        logger.error({ component: 'RedisCacheAdapter' }, 'Failed to connect to Redis cache', error);
        throw error;
      });

    return this.connectionPromise;
  }

  /**
   * Initialize the cache adapter (CacheAdapter interface method)
   */
  async initialize(): Promise<Result<void>> {
    try {
      await this.connect();
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
      }
      this.connected = false;
      logger.info({ component: 'RedisCacheAdapter' }, 'Redis cache disconnected');
    } catch (error) {
      logger.error({ component: 'RedisCacheAdapter' }, 'Error disconnecting Redis cache', error instanceof Error ? error : new Error(String(error)));
      // Force disconnect
      this.client.disconnect();
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client.status === 'ready';
  }

  /**
   * Serialize and optionally compress value
   */
  private async serializeValue(value: unknown): Promise<string> {
    const serialized = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');
    this.stats.bytesWritten += sizeBytes;

    // Compress if enabled and value exceeds threshold
    if (
      this.config.enableCompression &&
      sizeBytes > (this.config.compressionThreshold ?? 1024)
    ) {
      try {
        const compressed = await compressAsync(Buffer.from(serialized, 'utf8'));
        this.stats.compressions++;
        return `gzip:${compressed.toString('base64')}`;
      } catch (error) {
        logger.warn({ component: 'RedisCacheAdapter', size: sizeBytes }, 'Compression failed, storing uncompressed');
        return serialized;
      }
    }

    return serialized;
  }

  /**
   * Deserialize and decompress value
   */
  private async deserializeValue(value: string): Promise<unknown> {
    const sizeBytes = Buffer.byteLength(value, 'utf8');
    this.stats.bytesRead += sizeBytes;

    // Check if compressed
    if (value.startsWith('gzip:')) {
      try {
        const compressed = Buffer.from(value.slice(5), 'base64');
        const decompressed = await decompressAsync(compressed);
        this.stats.decompressions++;
        return JSON.parse(decompressed.toString('utf8'));
      } catch (error) {
        logger.error({ component: 'RedisCacheAdapter' }, 'Decompression failed', error instanceof Error ? error : new Error(String(error)));
        throw new Error('Failed to decompress cached value');
      }
    }

    return JSON.parse(value);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<Result<T | null>> {
    if (!this.isConnected()) {
      this.stats.errors++;
      return ok(null);
    }

    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return ok(null);
      }

      this.stats.hits++;
      const deserialized = await this.deserializeValue(value) as T;
      return ok(deserialized);
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', key }, 'Error getting cache value', error instanceof Error ? error : new Error(String(error)));
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<Result<void>> {
    if (!this.isConnected()) {
      this.stats.errors++;
      return err(new Error('Redis not connected'));
    }

    try {
      const serialized = await this.serializeValue(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.stats.sets++;
      return ok(undefined);
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', key }, 'Error setting cache value', error instanceof Error ? error : new Error(String(error)));
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<Result<void>> {
    if (!this.isConnected()) {
      this.stats.errors++;
      return err(new Error('Redis not connected'));
    }

    try {
      await this.client.del(key);
      this.stats.deletes++;
      return ok(undefined);
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', key }, 'Error deleting cache value', error instanceof Error ? error : new Error(String(error)));
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', key }, 'Error checking cache key', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Check if key exists (CacheAdapter interface method)
   */
  async exists(key: string): Promise<Result<boolean>> {
    try {
      const result = await this.has(key);
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<Result<void>> {
    if (!this.isConnected()) {
      this.stats.errors++;
      return err(new Error('Redis not connected'));
    }

    try {
      // Use SCAN to find all keys with our prefix
      const prefix = this.config.keyPrefix ?? 'cache:';
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, foundKeys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      // Delete in batches
      if (keys.length > 0) {
        const pipeline = this.client.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
        this.stats.deletes += keys.length;
      }

      logger.info({ component: 'RedisCacheAdapter', count: keys.length }, 'Cache cleared');
      return ok(undefined);
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter' }, 'Error clearing cache', error instanceof Error ? error : new Error(String(error)));
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get multiple values
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    if (!this.isConnected() || keys.length === 0) {
      return new Map();
    }

    try {
      const values = await this.client.mget(...keys);
      const result = new Map<string, T>();

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        const key = keys[i];
        if (value !== null && value !== undefined && key !== undefined) {
          this.stats.hits++;
          result.set(key, await this.deserializeValue(value) as T);
        } else {
          this.stats.misses++;
        }
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', keyCount: keys.length }, 'Error getting multiple cache values', error instanceof Error ? error : new Error(String(error)));
      return new Map();
    }
  }

  /**
   * Set multiple values
   */
  async setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected() || entries.size === 0) {
      return;
    }

    try {
      const pipeline = this.client.pipeline();

      for (const [key, value] of entries) {
        const serialized = await this.serializeValue(value);
        if (ttlSeconds && ttlSeconds > 0) {
          pipeline.setex(key, ttlSeconds, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      this.stats.sets += entries.size;
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', entryCount: entries.size }, 'Error setting multiple cache values', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete multiple values
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (!this.isConnected() || keys.length === 0) {
      return;
    }

    try {
      await this.client.del(...keys);
      this.stats.deletes += keys.length;
    } catch (error) {
      this.stats.errors++;
      logger.error({ component: 'RedisCacheAdapter', keyCount: keys.length }, 'Error deleting multiple cache values', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetrics {
    const uptime = Date.now() - this.stats.startTime;
    const totalOperations = this.stats.hits + this.stats.misses;
    const hitRate = totalOperations > 0 ? this.stats.hits / totalOperations : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate * 100, // Convert to percentage
      averageLatency: 0, // Would need to track operation times
      errors: this.stats.errors,
      totalOperations: this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes,
      entryCount: 0, // Redis doesn't provide easy count without DBSIZE
      memoryUsage: this.stats.bytesRead + this.stats.bytesWritten,
      lastUpdated: new Date(),
      additional: {
        compressions: this.stats.compressions,
        decompressions: this.stats.decompressions,
        bytesRead: this.stats.bytesRead,
        bytesWritten: this.stats.bytesWritten,
        uptime,
      },
    };
  }

  /**
   * Get current performance metrics (CacheAdapter interface method)
   */
  getMetrics(): CacheMetrics {
    return this.getStats();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      compressions: 0,
      decompressions: 0,
      bytesRead: 0,
      bytesWritten: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    const timestamp = new Date();

    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          latency: Date.now() - start,
          details: {
            connected: false,
            lastError: {
              message: 'Not connected to Redis',
              timestamp,
            },
          },
          timestamp,
        };
      }

      // Test Redis ping
      const pingResult = await this.client.ping();
      if (pingResult !== 'PONG') {
        return {
          status: 'unhealthy',
          latency: Date.now() - start,
          details: {
            connected: true,
            lastError: {
              message: 'Redis ping failed',
              timestamp,
            },
          },
          timestamp,
        };
      }

      // Test set/get operation
      const testKey = '__health_check__';
      const testValue = Date.now().toString();
      await this.client.setex(testKey, 10, testValue);
      const retrieved = await this.client.get(testKey);
      await this.client.del(testKey);

      if (retrieved !== testValue) {
        return {
          status: 'unhealthy',
          latency: Date.now() - start,
          details: {
            connected: true,
            lastError: {
              message: 'Redis set/get test failed',
              timestamp,
            },
          },
          timestamp,
        };
      }

      return {
        status: 'healthy',
        latency: Date.now() - start,
        details: {
          connected: true,
        },
        timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        details: {
          connected: false,
          lastError: {
            message: error instanceof Error ? error.message : String(error),
            timestamp,
          },
        },
        timestamp,
      };
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<Result<void>> {
    try {
      logger.info({ component: 'RedisCacheAdapter', stats: this.getStats() }, 'Shutting down Redis cache adapter');
      await this.disconnect();
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
