/**
 * Caching Service Tests
 * Tests for the unified caching service implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CachingService,
  createCachingService,
  CachingServiceRegistry,
  ICachingService,
  CacheOperationError
} from './caching-service';
import type { CacheConfig } from './interfaces';

describe('CachingService', () => {
  let service: ICachingService;

  beforeEach(async () => {
    const config: CacheConfig = {
      type: 'memory',
      defaultTtl: 3600,
      maxMemoryMB: 100,
      keyPrefix: 'test:',
      enableMetrics: true
    };

    const result = await createCachingService(config);
    if (result.isErr()) {
      throw result.error;
    }
    service = result.value;
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const setResult = await service.set('key1', 'value1');
      expect(setResult.isOk()).toBe(true);

      const getResult = await service.get<string>('key1');
      expect(getResult.isOk()).toBe(true);
      expect(getResult.value).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const getResult = await service.get<string>('non-existent');
      expect(getResult.isOk()).toBe(true);
      expect(getResult.value).toBeNull();
    });

    it('should delete a value', async () => {
      await service.set('key2', 'value2');
      
      const deleteResult = await service.delete('key2');
      expect(deleteResult.isOk()).toBe(true);

      const getResult = await service.get<string>('key2');
      expect(getResult.isOk()).toBe(true);
      expect(getResult.value).toBeNull();
    });

    it('should check if key exists', async () => {
      await service.set('key3', 'value3');

      const existsResult = await service.exists('key3');
      expect(existsResult.isOk()).toBe(true);
      expect(existsResult.value).toBe(true);

      const notExistsResult = await service.exists('non-existent');
      expect(notExistsResult.isOk()).toBe(true);
      expect(notExistsResult.value).toBe(false);
    });

    it('should clear all entries', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');
      await service.set('key3', 'value3');

      const clearResult = await service.clear();
      expect(clearResult.isOk()).toBe(true);

      const get1 = await service.get<string>('key1');
      const get2 = await service.get<string>('key2');
      const get3 = await service.get<string>('key3');

      expect(get1.value).toBeNull();
      expect(get2.value).toBeNull();
      expect(get3.value).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await service.set('batch1', 'value1');
      await service.set('batch2', 'value2');
      await service.set('batch3', 'value3');

      const result = await service.getMany<string>(['batch1', 'batch2', 'batch3', 'non-existent']);
      expect(result.isOk()).toBe(true);

      const values = result.value!;
      expect(values.get('batch1')).toBe('value1');
      expect(values.get('batch2')).toBe('value2');
      expect(values.get('batch3')).toBe('value3');
      expect(values.get('non-existent')).toBeNull();
    });

    it('should set multiple values', async () => {
      const entries = new Map<string, string>([
        ['multi1', 'value1'],
        ['multi2', 'value2'],
        ['multi3', 'value3']
      ]);

      const setResult = await service.setMany(entries);
      expect(setResult.isOk()).toBe(true);

      const get1 = await service.get<string>('multi1');
      const get2 = await service.get<string>('multi2');
      const get3 = await service.get<string>('multi3');

      expect(get1.value).toBe('value1');
      expect(get2.value).toBe('value2');
      expect(get3.value).toBe('value3');
    });

    it('should delete multiple values', async () => {
      await service.set('del1', 'value1');
      await service.set('del2', 'value2');
      await service.set('del3', 'value3');

      const deleteResult = await service.deleteMany(['del1', 'del2', 'del3']);
      expect(deleteResult.isOk()).toBe(true);

      const get1 = await service.get<string>('del1');
      const get2 = await service.get<string>('del2');
      const get3 = await service.get<string>('del3');

      expect(get1.value).toBeNull();
      expect(get2.value).toBeNull();
      expect(get3.value).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await service.set('cached-key', 'cached-value');

      let factoryCalled = false;
      const result = await service.getOrSet(
        'cached-key',
        async () => {
          factoryCalled = true;
          return 'factory-value';
        }
      );

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('cached-value');
      expect(factoryCalled).toBe(false);
    });

    it('should call factory and cache result if not exists', async () => {
      let factoryCalled = false;
      const result = await service.getOrSet(
        'new-key',
        async () => {
          factoryCalled = true;
          return 'factory-value';
        }
      );

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('factory-value');
      expect(factoryCalled).toBe(true);

      // Verify it was cached
      const getResult = await service.get<string>('new-key');
      expect(getResult.value).toBe('factory-value');
    });

    it('should handle factory errors', async () => {
      const result = await service.getOrSet(
        'error-key',
        async () => {
          throw new Error('Factory error');
        }
      );

      expect(result.isErr()).toBe(true);
    });
  });

  describe('TTL Operations', () => {
    it('should set value with custom TTL', async () => {
      const setResult = await service.set('ttl-key', 'ttl-value', { ttl: 1 });
      expect(setResult.isOk()).toBe(true);

      const getResult1 = await service.get<string>('ttl-key');
      expect(getResult1.value).toBe('ttl-value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const getResult2 = await service.get<string>('ttl-key');
      expect(getResult2.value).toBeNull();
    });
  });

  describe('Health and Metrics', () => {
    it('should perform health check', async () => {
      const health = await service.healthCheck();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should get metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalOperations).toBe('number');
    });

    it('should get config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.type).toBe('memory');
    });

    it('should check if ready', () => {
      const ready = service.isReady();
      expect(ready).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if not initialized', async () => {
      const uninitializedService = new CachingService({
        type: 'memory',
        defaultTtl: 3600
      });

      await expect(async () => {
        await uninitializedService.get('key');
      }).rejects.toThrow(CacheOperationError);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await service.set('key', 'value');
      
      const shutdownResult = await service.shutdown();
      expect(shutdownResult.isOk()).toBe(true);
      expect(service.isReady()).toBe(false);
    });

    it('should allow multiple shutdown calls', async () => {
      const result1 = await service.shutdown();
      expect(result1.isOk()).toBe(true);

      const result2 = await service.shutdown();
      expect(result2.isOk()).toBe(true);
    });
  });
});

describe('CachingServiceRegistry', () => {
  it('should register and create service', async () => {
    const mockFactory = async (config: CacheConfig) => {
      return await createCachingService(config);
    };

    CachingServiceRegistry.register('test-type', mockFactory);

    const types = CachingServiceRegistry.getRegisteredTypes();
    expect(types).toContain('test-type');

    const result = await CachingServiceRegistry.create('test-type', {
      type: 'memory',
      defaultTtl: 3600
    });

    expect(result.isOk()).toBe(true);
    
    if (result.isOk()) {
      await result.value.shutdown();
    }
  });

  it('should return error for unregistered type', async () => {
    const result = await CachingServiceRegistry.create('non-existent-type', {
      type: 'memory',
      defaultTtl: 3600
    });

    expect(result.isErr()).toBe(true);
  });

  it('should get registered types', () => {
    const types = CachingServiceRegistry.getRegisteredTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types).toContain('default');
  });
});

describe('createCachingService', () => {
  it('should create and initialize service', async () => {
    const result = await createCachingService({
      type: 'memory',
      defaultTtl: 3600,
      maxMemoryMB: 50
    });

    expect(result.isOk()).toBe(true);
    
    if (result.isOk()) {
      expect(result.value.isReady()).toBe(true);
      await result.value.shutdown();
    }
  });

  it('should handle initialization errors', async () => {
    // Test with invalid config
    const result = await createCachingService({
      type: 'invalid-type' as any,
      defaultTtl: 3600
    });

    expect(result.isErr()).toBe(true);
  });
});
