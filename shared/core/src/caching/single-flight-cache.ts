/**
 * Single Flight Cache
 * 
 * Wrapper that prevents duplicate concurrent requests and implements
 * circuit breaker patterns for cache operations with adaptive thresholds,
 * graceful degradation, and comprehensive error handling
 * Based on patterns from refined_cross_cutting.ts
 */

import { logger } from '../../utils/logger';
import type {
  CacheService,
  CacheMetrics,
  CacheHealthStatus,
  CircuitBreakerState,
  SingleFlightOptions
} from './types';

interface AdaptiveCircuitBreakerState extends CircuitBreakerState {
  successes: number;
  responseTimeWindow: number[];
  adaptiveThreshold: number;
  slowCallThreshold: number;
  slowCallRateThreshold: number;
}

interface FallbackOptions {
  enableFallback: boolean;
  fallbackValue: any;
  fallbackTtl: number;
}

export class SingleFlightCache implements CacheService {
  private pending = new Map<string, Promise<any>>();
  private circuitBreakers = new Map<string, AdaptiveCircuitBreakerState>();
  private options: SingleFlightOptions & {
    slowCallThreshold: number;
    slowCallRateThreshold: number;
    successThreshold: number;
    enableGracefulDegradation: boolean;
    fallbackOptions: FallbackOptions;
  };
  private fallbackCache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private degradationMode = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds

  constructor(
    private adapter: CacheService,
    options: Partial<SingleFlightOptions & {
      slowCallThreshold?: number;
      slowCallRateThreshold?: number;
      successThreshold?: number;
      enableGracefulDegradation?: boolean;
      fallbackOptions?: Partial<FallbackOptions>;
    }> = {}
  ) {
    this.options = {
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      slowCallThreshold: options.slowCallThreshold || 5000, // 5 seconds
      slowCallRateThreshold: options.slowCallRateThreshold || 0.5, // 50%
      successThreshold: options.successThreshold || 3,
      enableGracefulDegradation: options.enableGracefulDegradation !== false,
      fallbackOptions: {
        enableFallback: options.fallbackOptions?.enableFallback !== false,
        fallbackValue: options.fallbackOptions?.fallbackValue || null,
        fallbackTtl: options.fallbackOptions?.fallbackTtl || 300, // 5 minutes
      },
    };

    // Start periodic health checks
    this.startHealthMonitoring();
  }

  /**
   * Get value with single-flight and circuit breaker protection
   */
  async get<T>(key: string): Promise<T | null> {
    // Check circuit breaker and fallback cache
    if (this.isCircuitOpen(key)) {
      return this.getFallbackValue<T>(key);
    }

    // Check if operation is already pending
    const pendingKey = `get:${key}`;
    if (this.pending.has(pendingKey)) {
      return this.pending.get(pendingKey);
    }

    // Create and store the promise
    const promise = this.executeWithCircuitBreaker(key, () => this.adapter.get<T>(key));
    this.pending.set(pendingKey, promise);
    
    try {
      const result = await promise;
      
      // Store successful result in fallback cache for graceful degradation
      if (result !== null && this.options.enableGracefulDegradation) {
        this.storeFallbackValue(key, result, this.options.fallbackOptions.fallbackTtl);
      }
      
      return result;
    } catch (error) {
      // Return fallback value on error if graceful degradation is enabled
      if (this.options.enableGracefulDegradation) {
        const fallback = this.getFallbackValue<T>(key);
        if (fallback !== null || this.options.fallbackOptions.enableFallback) {
          return fallback;
        }
      }
      throw error;
    } finally {
      this.pending.delete(pendingKey);
    }
  }

  /**
   * Set value with circuit breaker protection
   */
  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    return this.executeWithCircuitBreaker(key, () => this.adapter.set(key, value, ttlSec));
  }

  /**
   * Delete value with circuit breaker protection
   */
  async del(key: string): Promise<void> {
    return this.executeWithCircuitBreaker(key, () => this.adapter.del(key));
  }

  /**
   * Check existence with circuit breaker protection
   */
  async exists(key: string): Promise<boolean> {
    if (this.isCircuitOpen(key)) {
      return false;
    }

    try {
      return await this.executeWithCircuitBreaker(key, () => 
        this.adapter.exists ? this.adapter.exists(key) : this.adapter.get(key).then(v => v !== null)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get TTL with circuit breaker protection
   */
  async ttl(key: string): Promise<number> {
    if (this.isCircuitOpen(key)) {
      return -1;
    }

    try {
      return await this.executeWithCircuitBreaker(key, () => 
        this.adapter.ttl ? this.adapter.ttl(key) : Promise.resolve(-1)
      );
    } catch {
      return -1;
    }
  }

  /**
   * Get multiple values with single-flight protection
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    // Group keys by circuit breaker status
    const availableKeys: string[] = [];
    const blockedIndices: number[] = [];
    
    keys.forEach((key, index) => {
      if (this.isCircuitOpen(key)) {
        blockedIndices.push(index);
      } else {
        availableKeys.push(key);
      }
    });

    // If all keys are blocked, return nulls
    if (availableKeys.length === 0) {
      return keys.map(() => null);
    }

    // Check for pending operations
    const pendingKey = `mget:${availableKeys.join(',')}`;
    if (this.pending.has(pendingKey)) {
      return this.pending.get(pendingKey);
    }

    // Create and store the promise
    const promise = this.executeWithCircuitBreaker(
      availableKeys[0], // Use first key for circuit breaker
      () => this.adapter.mget ? this.adapter.mget<T>(availableKeys) : this.fallbackMget<T>(availableKeys)
    );
    
    this.pending.set(pendingKey, promise);
    
    try {
      const availableResults = await promise;
      
      // Reconstruct full results array
      const results: (T | null)[] = new Array(keys.length).fill(null);
      let availableIndex = 0;
      
      for (let i = 0; i < keys.length; i++) {
        if (!blockedIndices.includes(i)) {
          results[i] = availableResults[availableIndex++];
        }
      }
      
      return results;
    } finally {
      this.pending.delete(pendingKey);
    }
  }

  /**
   * Set multiple values with circuit breaker protection
   */
  async mset<T>(entries: [string, T, number?][]): Promise<void> {
    if (entries.length === 0) return;

    // Filter out keys with open circuit breakers
    const availableEntries = entries.filter(([key]) => !this.isCircuitOpen(key));
    
    if (availableEntries.length === 0) {
      return; // All keys are blocked
    }

    return this.executeWithCircuitBreaker(
      availableEntries[0][0], // Use first key for circuit breaker
      () => this.adapter.mset ? this.adapter.mset(availableEntries) : this.fallbackMset(availableEntries)
    );
  }

  /**
   * Clear cache with circuit breaker protection
   */
  async clear(): Promise<void> {
    if (this.adapter.clear) {
      return this.executeWithCircuitBreaker('clear', () => this.adapter.clear!());
    }
  }

  /**
   * Flush cache with circuit breaker protection
   */
  async flush(): Promise<void> {
    if (this.adapter.flush) {
      return this.executeWithCircuitBreaker('flush', () => this.adapter.flush!());
    }
  }

  /**
   * Invalidate by pattern with circuit breaker protection
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (this.isCircuitOpen(pattern)) {
      return 0;
    }

    try {
      return await this.executeWithCircuitBreaker(pattern, () => 
        this.adapter.invalidateByPattern ? this.adapter.invalidateByPattern(pattern) : Promise.resolve(0)
      );
    } catch {
      return 0;
    }
  }

  /**
   * Invalidate by tags with circuit breaker protection
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (tags.length === 0) return 0;
    
    const tagKey = tags.join(',');
    if (this.isCircuitOpen(tagKey)) {
      return 0;
    }

    try {
      return await this.executeWithCircuitBreaker(tagKey, () => 
        this.adapter.invalidateByTags ? this.adapter.invalidateByTags(tags) : Promise.resolve(0)
      );
    } catch {
      return 0;
    }
  }

  /**
   * Get metrics from underlying adapter
   */
  getMetrics(): CacheMetrics | undefined {
    return this.adapter.getMetrics?.();
  }

  // Circuit breaker implementation

  /**
   * Check if circuit breaker is open for a key
   */
  private isCircuitOpen(key: string): boolean {
    if (!this.options.enableCircuitBreaker) return false;
    
    const circuit = this.circuitBreakers.get(key);
    if (!circuit) return false;
    
    if (circuit.state === 'open') {
      if (Date.now() >= circuit.nextAttempt) {
        // Transition to half-open
        circuit.state = 'half-open';
        circuit.successes = 0;
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Execute operation with circuit breaker protection and adaptive thresholds
   */
  private async executeWithCircuitBreaker<T>(
    key: string, 
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = timeoutMs 
        ? await Promise.race([
            operation(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
            )
          ])
        : await operation();

      const duration = performance.now() - start;
      this.recordSuccess(key, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordFailure(key, duration);
      throw error;
    }
  }

  /**
   * Record successful operation with adaptive threshold adjustment
   */
  private recordSuccess(key: string, duration: number): void {
    if (!this.options.enableCircuitBreaker) return;
    
    let circuit = this.circuitBreakers.get(key);
    if (!circuit) {
      // Create circuit breaker on first operation
      circuit = this.createCircuitBreaker();
      this.circuitBreakers.set(key, circuit);
    }
    
    circuit.successes++;
    this.updateResponseTime(circuit, duration);
    
    if (circuit.state === 'half-open') {
      if (circuit.successes >= this.options.successThreshold) {
        // Transition back to closed
        circuit.state = 'closed';
        circuit.failures = 0;
        // Reduce adaptive threshold on successful recovery
        circuit.adaptiveThreshold = Math.max(
          this.options.circuitBreakerThreshold, 
          circuit.adaptiveThreshold - 1
        );
      }
    } else if (circuit.state === 'closed') {
      // Reset failure count on success
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  /**
   * Record failed operation with adaptive threshold adjustment
   */
  private recordFailure(key: string, duration: number): void {
    if (!this.options.enableCircuitBreaker) return;
    
    const circuit = this.circuitBreakers.get(key) || this.createCircuitBreaker();
    
    circuit.failures++;
    circuit.successes = 0;
    circuit.lastFailure = Date.now();
    this.updateResponseTime(circuit, duration);
    
    // Adaptive threshold based on slow calls
    const slowCallRate = this.calculateSlowCallRate(circuit);
    if (slowCallRate > circuit.slowCallRateThreshold) {
      circuit.adaptiveThreshold = Math.min(
        this.options.circuitBreakerThreshold * 2, 
        circuit.adaptiveThreshold + 1
      );
    }
    
    if (circuit.failures >= circuit.adaptiveThreshold) {
      circuit.state = 'open';
      circuit.nextAttempt = Date.now() + this.options.circuitBreakerTimeout;
    }
    
    this.circuitBreakers.set(key, circuit);
  }

  /**
   * Create new circuit breaker state
   */
  private createCircuitBreaker(): AdaptiveCircuitBreakerState {
    return {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      nextAttempt: 0,
      successes: 0,
      responseTimeWindow: [],
      adaptiveThreshold: this.options.circuitBreakerThreshold,
      slowCallThreshold: this.options.slowCallThreshold,
      slowCallRateThreshold: this.options.slowCallRateThreshold,
    };
  }

  /**
   * Update response time window for adaptive thresholds
   */
  private updateResponseTime(circuit: AdaptiveCircuitBreakerState, duration: number): void {
    circuit.responseTimeWindow.push(duration);
    if (circuit.responseTimeWindow.length > 100) {
      circuit.responseTimeWindow.shift();
    }
  }

  /**
   * Calculate slow call rate for adaptive thresholds
   */
  private calculateSlowCallRate(circuit: AdaptiveCircuitBreakerState): number {
    if (circuit.responseTimeWindow.length === 0) return 0;
    
    const slowCalls = circuit.responseTimeWindow.filter(
      time => time > circuit.slowCallThreshold
    ).length;
    
    return slowCalls / circuit.responseTimeWindow.length;
  }

  /**
   * Get circuit breaker state for a key
   */
  getCircuitBreakerState(key: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(key) || null;
  }

  /**
   * Get all circuit breaker states
   */
  getAllCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Reset circuit breaker for a key
   */
  resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  // Fallback implementations for adapters that don't support batch operations

  /**
   * Fallback mget implementation using individual gets
   */
  private async fallbackMget<T>(keys: string[]): Promise<(T | null)[]> {
    const promises = keys.map(key => this.adapter.get<T>(key));
    return Promise.all(promises);
  }

  /**
   * Fallback mset implementation using individual sets
   */
  private async fallbackMset<T>(entries: [string, T, number?][]): Promise<void> {
    const promises = entries.map(([key, value, ttl]) => this.adapter.set(key, value, ttl));
    await Promise.all(promises);
  }

  /**
   * Get health status with circuit breaker information
   */
  async getHealth(): Promise<CacheHealthStatus & { circuitBreakers?: Record<string, CircuitBreakerState> }> {
    try {
      const baseHealth = this.adapter.getHealth ? await this.adapter.getHealth() : {
        connected: true,
        latency: 0,
        stats: this.getMetrics() || {
          hits: 0,
          misses: 0,
          hitRate: 0,
          operations: 0,
          avgResponseTime: 0,
          errors: 0,
        },
      };

      const circuitBreakers: Record<string, CircuitBreakerState> = {};
      for (const [key, state] of this.circuitBreakers.entries()) {
        circuitBreakers[key] = state;
      }

      return {
        ...baseHealth,
        circuitBreakers: Object.keys(circuitBreakers).length > 0 ? circuitBreakers : undefined,
      };
    } catch (error) {
      return {
        connected: false,
        latency: -1,
        stats: this.getMetrics() || {
          hits: 0,
          misses: 0,
          hitRate: 0,
          operations: 0,
          avgResponseTime: 0,
          errors: 0,
        },
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  // Graceful degradation and fallback strategies

  /**
   * Get fallback value from local cache
   */
  private getFallbackValue<T>(key: string): T | null {
    if (!this.options.fallbackOptions.enableFallback) {
      return this.options.fallbackOptions.fallbackValue;
    }

    const fallback = this.fallbackCache.get(key);
    if (!fallback) {
      return this.options.fallbackOptions.fallbackValue;
    }

    // Check if fallback value is expired
    if (Date.now() - fallback.timestamp > fallback.ttl * 1000) {
      this.fallbackCache.delete(key);
      return this.options.fallbackOptions.fallbackValue;
    }

    return fallback.value;
  }

  /**
   * Store value in fallback cache for graceful degradation
   */
  private storeFallbackValue(key: string, value: any, ttlSec: number): void {
    if (!this.options.fallbackOptions.enableFallback) return;

    this.fallbackCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlSec,
    });

    // Cleanup expired entries periodically
    this.cleanupFallbackCache();
  }

  /**
   * Cleanup expired fallback cache entries
   */
  private cleanupFallbackCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Start health monitoring for automatic recovery
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health check and adjust degradation mode
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return;
    }

    this.lastHealthCheck = now;

    try {
      // Test basic cache operation
      const testKey = `health_check_${now}`;
      await this.adapter.set(testKey, 'test', 1);
      const result = await this.adapter.get(testKey);
      await this.adapter.del(testKey);

      if (result === 'test') {
        // Cache is healthy, exit degradation mode
        if (this.degradationMode) {
          this.degradationMode = false;
          // Reset some circuit breakers on recovery
          this.resetSomeCircuitBreakers();
        }
      } else {
        this.degradationMode = true;
      }
    } catch (error) {
      this.degradationMode = true;
    }
  }

  /**
   * Reset circuit breakers that have been open for a while
   */
  private resetSomeCircuitBreakers(): void {
    const now = Date.now();
    const resetThreshold = this.options.circuitBreakerTimeout * 2; // Reset after 2x timeout

    for (const [key, circuit] of this.circuitBreakers.entries()) {
      if (
        circuit.state === 'open' && 
        now - circuit.lastFailure > resetThreshold
      ) {
        circuit.state = 'closed';
        circuit.failures = 0;
        circuit.successes = 0;
        circuit.adaptiveThreshold = this.options.circuitBreakerThreshold;
      }
    }
  }

  /**
   * Get degradation status
   */
  getDegradationStatus(): {
    degradationMode: boolean;
    fallbackCacheSize: number;
    circuitBreakerCount: number;
    openCircuitBreakers: string[];
  } {
    const openCircuitBreakers: string[] = [];
    for (const [key, circuit] of this.circuitBreakers.entries()) {
      if (circuit.state === 'open') {
        openCircuitBreakers.push(key);
      }
    }

    return {
      degradationMode: this.degradationMode,
      fallbackCacheSize: this.fallbackCache.size,
      circuitBreakerCount: this.circuitBreakers.size,
      openCircuitBreakers,
    };
  }

  /**
   * Force degradation mode (for testing or emergency situations)
   */
  setDegradationMode(enabled: boolean): void {
    this.degradationMode = enabled;
  }

  /**
   * Clear fallback cache
   */
  clearFallbackCache(): void {
    this.fallbackCache.clear();
  }

  /**
   * Get comprehensive circuit breaker statistics
   */
  getCircuitBreakerStats(): {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    halfOpenCircuitBreakers: number;
    closedCircuitBreakers: number;
    avgResponseTime: number;
    slowCallRate: number;
  } {
    let openCount = 0;
    let halfOpenCount = 0;
    let closedCount = 0;
    let totalResponseTime = 0;
    let totalResponseCount = 0;
    let totalSlowCalls = 0;

    for (const circuit of this.circuitBreakers.values()) {
      switch (circuit.state) {
        case 'open':
          openCount++;
          break;
        case 'half-open':
          halfOpenCount++;
          break;
        case 'closed':
          closedCount++;
          break;
      }

      // Calculate response time stats
      if (circuit.responseTimeWindow.length > 0) {
        totalResponseTime += circuit.responseTimeWindow.reduce((a, b) => a + b, 0);
        totalResponseCount += circuit.responseTimeWindow.length;
        totalSlowCalls += circuit.responseTimeWindow.filter(
          time => time > circuit.slowCallThreshold
        ).length;
      }
    }

    return {
      totalCircuitBreakers: this.circuitBreakers.size,
      openCircuitBreakers: openCount,
      halfOpenCircuitBreakers: halfOpenCount,
      closedCircuitBreakers: closedCount,
      avgResponseTime: totalResponseCount > 0 ? totalResponseTime / totalResponseCount : 0,
      slowCallRate: totalResponseCount > 0 ? totalSlowCalls / totalResponseCount : 0,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pending.clear();
    this.circuitBreakers.clear();
    this.fallbackCache.clear();
    
    if (this.adapter && typeof (this.adapter as any).destroy === 'function') {
      (this.adapter as any).destroy();
    }
  }
}











































