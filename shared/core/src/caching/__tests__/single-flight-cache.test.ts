/**
 * Single Flight Cache Tests
 * 
 * Comprehensive tests for circuit breaker patterns, single-flight request deduplication,
 * graceful degradation, and error handling mechanisms
 */

import { SingleFlightCache } from '../single-flight-cache';
import type { CacheService, CacheMetrics } from '../types';
import { logger } from '../../observability/logging';

// Mock cache adapter for testing
class MockCacheAdapter implements CacheService {
  private data = new Map<string, any>();
  private shouldFail = false;
  private failureCount = 0;
  private responseDelay = 0;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    avgResponseTime: 0,
    errors: 0,
  };

  async get<T>(key: string): Promise<T | null> {
    await this.simulateDelay();
    this.metrics.operations++;
    
    if (this.shouldFail) {
      this.failureCount++;
      this.metrics.errors++;
      throw new Error(`Cache failure ${this.failureCount}`);
    }

    const value = this.data.get(key);
    if (value !== undefined) {
      this.metrics.hits++;
      return value;
    }
    
    this.metrics.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    await this.simulateDelay();
    this.metrics.operations++;
    
    if (this.shouldFail) {
      this.failureCount++;
      this.metrics.errors++;
      throw new Error(`Cache failure ${this.failureCount}`);
    }

    this.data.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.simulateDelay();
    this.metrics.operations++;
    
    if (this.shouldFail) {
      this.failureCount++;
      this.metrics.errors++;
      throw new Error(`Cache failure ${this.failureCount}`);
    }

    this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    await this.simulateDelay();
    return this.data.has(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    await this.simulateDelay();
    return keys.map(key => this.data.get(key) || null);
  }

  async mset<T>(entries: [string, T, number?][]): Promise<void> {
    await this.simulateDelay();
    entries.forEach(([key, value]) => this.data.set(key, value));
  }

  getMetrics(): CacheMetrics {
    this.metrics.hitRate = this.metrics.operations > 0 
      ? (this.metrics.hits / this.metrics.operations) * 100 
      : 0;
    return { ...this.metrics };
  }

  // Test utilities
  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
    if (!shouldFail) {
      this.failureCount = 0;
    }
  }

  setResponseDelay(delayMs: number): void {
    this.responseDelay = delayMs;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  clear(): void {
    this.data.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      operations: 0,
      avgResponseTime: 0,
      errors: 0,
    };
  }

  private async simulateDelay(): Promise<void> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }
  }
}

describe('SingleFlightCache', () => {
  let mockAdapter: MockCacheAdapter;
  let cache: SingleFlightCache;

  beforeEach(() => {
    mockAdapter = new MockCacheAdapter();
    cache = new SingleFlightCache(mockAdapter, {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 1000,
      slowCallThreshold: 100,
      slowCallRateThreshold: 0.5,
      successThreshold: 2,
      enableGracefulDegradation: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Single Flight Pattern', () => {
    it('should prevent duplicate concurrent requests', async () => {
      await mockAdapter.set('test-key', 'test-value');
      
      // Start multiple concurrent requests
      const promises = Array(5).fill(0).map(() => cache.get('test-key'));
      
      const results = await Promise.all(promises);
      
      // All should return the same value
      results.forEach(result => {
        expect(result).toBe('test-value');
      });
      
      // Should only make one actual request to the adapter
      const metrics = mockAdapter.getMetrics();
      expect(metrics.operations).toBe(2); // 1 set + 1 get
    });

    it('should handle concurrent requests with different keys independently', async () => {
      await mockAdapter.set('key1', 'value1');
      await mockAdapter.set('key2', 'value2');
      
      const promises = [
        ...Array(3).fill(0).map(() => cache.get('key1')),
        ...Array(3).fill(0).map(() => cache.get('key2')),
      ];
      
      const results = await Promise.all(promises);
      
      // First 3 should be value1, last 3 should be value2
      expect(results.slice(0, 3)).toEqual(['value1', 'value1', 'value1']);
      expect(results.slice(3, 6)).toEqual(['value2', 'value2', 'value2']);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit breaker after threshold failures', async () => {
      mockAdapter.setFailureMode(true);
      const initialFailureCount = mockAdapter.getFailureCount();
      
      // Trigger failures to open circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Circuit should be open now
      const state = cache.getCircuitBreakerState('test-key');
      expect(state?.state).toBe('open');
      
      // Next request should return fallback without calling adapter
      const result = await cache.get('test-key');
      expect(result).toBeNull(); // Fallback value
      
      // Should not have made additional calls to adapter after circuit opened
      expect(mockAdapter.getFailureCount()).toBe(initialFailureCount + 3);
    });

    it('should transition to half-open after timeout', async () => {
      // Configure short timeout for testing
      cache = new SingleFlightCache(mockAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 100, // 100ms
      });

      mockAdapter.setFailureMode(true);
      
      // Trigger failures to open circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(cache.getCircuitBreakerState('test-key')?.state).toBe('open');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Next request should transition to half-open
      mockAdapter.setFailureMode(false);
      await mockAdapter.set('test-key', 'test-value');
      
      const result = await cache.get('test-key');
      expect(result).toBe('test-value');
      
      const state = cache.getCircuitBreakerState('test-key');
      expect(state?.state).toBe('half-open');
    });

    it('should close circuit breaker after successful operations in half-open state', async () => {
      // Configure for quick testing
      cache = new SingleFlightCache(mockAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 100,
        successThreshold: 2,
      });

      mockAdapter.setFailureMode(true);
      
      // Open circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Wait for timeout and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockAdapter.setFailureMode(false);
      await mockAdapter.set('test-key', 'test-value');
      
      // Make successful requests to close circuit
      await cache.get('test-key'); // First success (half-open)
      await cache.get('test-key'); // Second success (should close)
      
      const state = cache.getCircuitBreakerState('test-key');
      expect(state?.state).toBe('closed');
    });

    it('should adapt threshold based on slow calls', async () => {
      mockAdapter.setResponseDelay(200); // Slow responses
      await mockAdapter.set('test-key', 'test-value');
      
      // Make several slow calls to create circuit breaker state
      for (let i = 0; i < 5; i++) {
        await cache.get('test-key');
      }
      
      const stats = cache.getCircuitBreakerStats();
      expect(stats.slowCallRate).toBeGreaterThan(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should store successful results in fallback cache', async () => {
      await mockAdapter.set('test-key', 'test-value');
      
      // Get value successfully (should be stored in fallback cache)
      const result1 = await cache.get('test-key');
      expect(result1).toBe('test-value');
      
      // Now make adapter fail
      mockAdapter.setFailureMode(true);
      
      // Should still return cached value from fallback
      const result2 = await cache.get('test-key');
      expect(result2).toBe('test-value');
    });

    it('should return fallback value when circuit is open', async () => {
      // Configure custom fallback value
      cache = new SingleFlightCache(mockAdapter, {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
        enableGracefulDegradation: true,
        fallbackOptions: {
          enableFallback: true,
          fallbackValue: 'fallback-value',
          fallbackTtl: 300,
        },
      });

      mockAdapter.setFailureMode(true);
      
      // Open circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Should return fallback value
      const result = await cache.get('test-key');
      expect(result).toBe('fallback-value');
    });

    it('should expire fallback cache entries', async () => {
      // Configure short TTL for testing
      cache = new SingleFlightCache(mockAdapter, {
        enableGracefulDegradation: true,
        fallbackOptions: {
          enableFallback: true,
          fallbackValue: null,
          fallbackTtl: 0.1, // 0.1 seconds
        },
      });

      await mockAdapter.set('test-key', 'test-value');
      await cache.get('test-key'); // Store in fallback cache
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      mockAdapter.setFailureMode(true);
      
      // Should return null (expired fallback) without throwing
      try {
        const result = await cache.get('test-key');
        expect(result).toBeNull();
      } catch (error) {
        // If it throws, it means graceful degradation didn't work
        // The fallback should have been returned instead
        expect(error).toBeNull(); // This will fail and show the actual error
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle adapter errors gracefully', async () => {
      // Disable graceful degradation for this test to see actual errors
      cache = new SingleFlightCache(mockAdapter, {
        enableGracefulDegradation: false,
      });

      mockAdapter.setFailureMode(true);
      
      await expect(cache.get('test-key')).rejects.toThrow('Cache failure');
      await expect(cache.set('test-key', 'value')).rejects.toThrow('Cache failure');
      await expect(cache.del('test-key')).rejects.toThrow('Cache failure');
    });

    it('should provide comprehensive health status', async () => {
      const health = await cache.getHealth();
      
      expect(health).toHaveProperty('connected');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('stats');
    });

    it('should provide degradation status information', () => {
      const status = cache.getDegradationStatus();
      
      expect(status).toHaveProperty('degradationMode');
      expect(status).toHaveProperty('fallbackCacheSize');
      expect(status).toHaveProperty('circuitBreakerCount');
      expect(status).toHaveProperty('openCircuitBreakers');
    });

    it('should provide circuit breaker statistics', async () => {
      mockAdapter.setFailureMode(true);
      
      // Create some circuit breaker activity
      try {
        await cache.get('key1');
      } catch (error) {
        // Expected
      }
      
      const stats = cache.getCircuitBreakerStats();
      
      expect(stats).toHaveProperty('totalCircuitBreakers');
      expect(stats).toHaveProperty('openCircuitBreakers');
      expect(stats).toHaveProperty('halfOpenCircuitBreakers');
      expect(stats).toHaveProperty('closedCircuitBreakers');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('slowCallRate');
    });

    it('should reset circuit breakers on manual command', async () => {
      mockAdapter.setFailureMode(true);
      
      // Open circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(cache.getCircuitBreakerState('test-key')?.state).toBe('open');
      
      // Reset circuit breaker
      cache.resetCircuitBreaker('test-key');
      
      expect(cache.getCircuitBreakerState('test-key')).toBeNull();
    });

    it('should reset all circuit breakers', async () => {
      mockAdapter.setFailureMode(true);
      
      // Create multiple circuit breakers
      for (const key of ['key1', 'key2', 'key3']) {
        for (let i = 0; i < 3; i++) {
          try {
            await cache.get(key);
          } catch (error) {
            // Expected to fail
          }
        }
      }
      
      expect(cache.getCircuitBreakerStats().totalCircuitBreakers).toBe(3);
      
      // Reset all
      cache.resetAllCircuitBreakers();
      
      expect(cache.getCircuitBreakerStats().totalCircuitBreakers).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    it('should handle mget with circuit breaker protection', async () => {
      await mockAdapter.set('key1', 'value1');
      await mockAdapter.set('key2', 'value2');
      
      const results = await cache.mget(['key1', 'key2', 'key3']);
      
      expect(results).toEqual(['value1', 'value2', null]);
    });

    it('should handle mset with circuit breaker protection', async () => {
      await cache.mset([
        ['key1', 'value1'],
        ['key2', 'value2', 300],
      ]);
      
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');
      
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });

    it('should filter out blocked keys in batch operations', async () => {
      mockAdapter.setFailureMode(true);
      
      // Open circuit breaker for key1
      for (let i = 0; i < 3; i++) {
        try {
          await cache.get('key1');
        } catch (error) {
          // Expected to fail
        }
      }
      
      mockAdapter.setFailureMode(false);
      await mockAdapter.set('key2', 'value2');
      
      // mget should skip blocked key1 but return key2
      const results = await cache.mget(['key1', 'key2']);
      expect(results).toEqual([null, 'value2']);
    });
  });

  describe('Configuration Options', () => {
    it('should work with circuit breaker disabled', async () => {
      cache = new SingleFlightCache(mockAdapter, {
        enableCircuitBreaker: false,
      });

      mockAdapter.setFailureMode(true);
      
      // Should always try the operation even after failures
      for (let i = 0; i < 5; i++) {
        try {
          await cache.get('test-key');
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(mockAdapter.getFailureCount()).toBe(5);
    });

    it('should work with graceful degradation disabled', async () => {
      cache = new SingleFlightCache(mockAdapter, {
        enableGracefulDegradation: false,
      });

      await mockAdapter.set('test-key', 'test-value');
      await cache.get('test-key');
      
      mockAdapter.setFailureMode(true);
      
      // Should not return fallback value
      await expect(cache.get('test-key')).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      cache.destroy();
      
      const status = cache.getDegradationStatus();
      expect(status.circuitBreakerCount).toBe(0);
      expect(status.fallbackCacheSize).toBe(0);
    });

    it('should clear fallback cache manually', async () => {
      await mockAdapter.set('test-key', 'test-value');
      await cache.get('test-key'); // Store in fallback cache
      
      expect(cache.getDegradationStatus().fallbackCacheSize).toBeGreaterThan(0);
      
      cache.clearFallbackCache();
      
      expect(cache.getDegradationStatus().fallbackCacheSize).toBe(0);
    });

    it('should allow manual degradation mode control', () => {
      expect(cache.getDegradationStatus().degradationMode).toBe(false);
      
      cache.setDegradationMode(true);
      expect(cache.getDegradationStatus().degradationMode).toBe(true);
      
      cache.setDegradationMode(false);
      expect(cache.getDegradationStatus().degradationMode).toBe(false);
    });
  });
});






