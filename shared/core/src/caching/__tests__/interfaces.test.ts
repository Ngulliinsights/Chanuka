import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Test file to verify the supporting types are properly defined
 */

import { 
  HealthStatus, 
  CacheMetrics, 
  CacheConfig,
  MemoryCacheConfig,
  RedisCacheConfig,
  MultiTierCacheConfig
} from '../interfaces';

describe('Cache Supporting Types', () => {
  describe('HealthStatus', () => {
    it('should accept valid health status values', () => {
      const healthyStatus: HealthStatus = {
        status: 'healthy',
        latency: 5.2,
        details: {
          connected: true,
          memory: {
            used: 1024000,
            available: 8192000,
            percentage: 12.5
          }
        },
        timestamp: new Date()
      };

      const degradedStatus: HealthStatus = {
        status: 'degraded',
        latency: 150.7,
        details: {
          connected: true,
          lastError: {
            message: 'Connection timeout',
            timestamp: new Date(),
            code: 'TIMEOUT'
          }
        },
        timestamp: new Date()
      };

      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        latency: 5000,
        details: {
          connected: false,
          lastError: {
            message: 'Connection refused',
            timestamp: new Date(),
            code: 'ECONNREFUSED'
          }
        },
        timestamp: new Date()
      };

      expect(healthyStatus.status).toBe('healthy');
      expect(degradedStatus.status).toBe('degraded');
      expect(unhealthyStatus.status).toBe('unhealthy');
      expect(typeof healthyStatus.latency).toBe('number');
      expect(typeof degradedStatus.latency).toBe('number');
      expect(typeof unhealthyStatus.latency).toBe('number');
    });
  });

  describe('CacheMetrics', () => {
    it('should accept valid cache metrics', () => {
      const metrics: CacheMetrics = {
        hits: 1500,
        misses: 100,
        hitRate: 93.75,
        averageLatency: 2.5,
        errors: 0,
        totalOperations: 1600,
        entryCount: 850,
        memoryUsage: 2048000,
        lastUpdated: new Date(),
        additional: {
          compressionRatio: 0.65,
          connectionPoolSize: 10
        }
      };

      expect(metrics.hits).toBe(1500);
      expect(metrics.misses).toBe(100);
      expect(metrics.hitRate).toBe(93.75);
      expect(metrics.averageLatency).toBe(2.5);
      expect(metrics.errors).toBe(0);
      expect(metrics.totalOperations).toBe(1600);
      expect(metrics.entryCount).toBe(850);
      expect(metrics.memoryUsage).toBe(2048000);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
      expect(metrics.additional?.compressionRatio).toBe(0.65);
    });
  });

  describe('CacheConfig Union Type', () => {
    it('should accept valid memory cache config', () => {
      const memoryConfig: MemoryCacheConfig = {
        type: 'memory',
        name: 'test-memory-cache',
        defaultTtl: 3600,
        maxEntries: 10000,
        keyPrefix: 'test:',
        enableMetrics: true,
        enableLogging: false,
        maxMemoryMB: 100,
        evictionPolicy: 'lru',
        cleanupInterval: 300
      };

      expect(memoryConfig.type).toBe('memory');
      expect(memoryConfig.name).toBe('test-memory-cache');
      expect(memoryConfig.defaultTtl).toBe(3600);
      expect(memoryConfig.evictionPolicy).toBe('lru');
    });

    it('should accept valid Redis cache config', () => {
      const redisConfig: RedisCacheConfig = {
        type: 'redis',
        name: 'test-redis-cache',
        defaultTtl: 7200,
        host: 'localhost',
        port: 6379,
        password: 'secret',
        database: 1,
        connectTimeout: 5000,
        commandTimeout: 1000,
        maxRetries: 3,
        retryDelay: 1000,
        pool: {
          min: 2,
          max: 10,
          idleTimeout: 30000
        }
      };

      expect(redisConfig.type).toBe('redis');
      expect(redisConfig.host).toBe('localhost');
      expect(redisConfig.port).toBe(6379);
      expect(redisConfig.pool?.min).toBe(2);
      expect(redisConfig.pool?.max).toBe(10);
    });

    it('should accept valid multi-tier cache config', () => {
      const l1Config: MemoryCacheConfig = {
        type: 'memory',
        name: 'l1-cache',
        defaultTtl: 300,
        maxMemoryMB: 50,
        evictionPolicy: 'lru'
      };

      const l2Config: RedisCacheConfig = {
        type: 'redis',
        name: 'l2-cache',
        defaultTtl: 3600,
        host: 'localhost',
        port: 6379
      };

      const multiTierConfig: MultiTierCacheConfig = {
        type: 'multi-tier',
        name: 'test-multi-tier-cache',
        defaultTtl: 1800,
        l1Config,
        l2Config,
        writeStrategy: 'write-through',
        enablePromotion: true,
        promotionThreshold: 5
      };

      expect(multiTierConfig.type).toBe('multi-tier');
      expect(multiTierConfig.l1Config.type).toBe('memory');
      expect(multiTierConfig.l2Config.type).toBe('redis');
      expect(multiTierConfig.writeStrategy).toBe('write-through');
      expect(multiTierConfig.promotionThreshold).toBe(5);
    });

    it('should work with discriminated union type narrowing', () => {
      function processConfig(config: CacheConfig): string {
        switch (config.type) {
          case 'memory':
            // TypeScript should narrow config to MemoryCacheConfig
            return `Memory cache with ${config.maxMemoryMB}MB limit`;
          case 'redis':
            // TypeScript should narrow config to RedisCacheConfig
            return `Redis cache at ${config.host}:${config.port}`;
          case 'multi-tier':
            // TypeScript should narrow config to MultiTierCacheConfig
            return `Multi-tier cache with ${config.writeStrategy} strategy`;
          default:
            // This should never be reached with proper typing
            throw new Error(`Unsupported cache type: ${(config as any).type}`);
        }
      }

      const memoryConfig: MemoryCacheConfig = {
        type: 'memory',
        name: 'test',
        defaultTtl: 3600,
        maxMemoryMB: 100
      };

      const redisConfig: RedisCacheConfig = {
        type: 'redis',
        name: 'test',
        defaultTtl: 3600,
        host: 'localhost',
        port: 6379
      };

      const multiTierConfig: MultiTierCacheConfig = {
        type: 'multi-tier',
        name: 'test',
        defaultTtl: 3600,
        l1Config: memoryConfig,
        l2Config: redisConfig,
        writeStrategy: 'write-through'
      };

      expect(processConfig(memoryConfig)).toContain('Memory cache');
      expect(processConfig(redisConfig)).toContain('Redis cache');
      expect(processConfig(multiTierConfig)).toContain('Multi-tier cache');
    });
  });
});
