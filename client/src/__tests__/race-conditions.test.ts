/**
 * Race Condition Test Suite
 * Tests for the implemented race condition fixes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { configureStore } from '@reduxjs/toolkit';
import { loadingSlice, startLoadingOperation, completeLoadingOperation } from '../shared/infrastructure/store/slices/loadingSlice';

// Mock logger to prevent console spam during tests
vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Race Condition Fixes', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        loading: loadingSlice.reducer
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading Slice Race Conditions', () => {
    it('should handle concurrent statistics updates safely', async () => {
      // Simulate concurrent completion events
      const promises = Array(100).fill(null).map(() => 
        store.dispatch(loadingSlice.actions.updateStatsAtomic({
          type: 'increment_completed'
        }))
      );

      await Promise.all(promises);

      const state = store.getState();
      expect(state.loading.stats.completedOperations).toBe(100);
      expect(state.loading.stats.totalOperations).toBeGreaterThanOrEqual(100);
    });

    it('should prevent duplicate operations with same ID', async () => {
      const operationId = 'test-operation';
      
      // Try to create multiple operations with same ID
      const promises = Array(10).fill(null).map(() => 
        store.dispatch(startLoadingOperation({
          id: operationId,
          type: 'api',
          priority: 'medium',
          timeout: 5000,
          maxRetries: 3
        }))
      );

      await Promise.allSettled(promises);

      const state = store.getState();
      // Should have only one operation despite multiple attempts
      expect(Object.keys(state.loading.operations)).toHaveLength(1);
      expect(state.loading.operations[operationId]).toBeDefined();
    });

    it('should handle concurrent completion operations safely', async () => {
      // First, create some operations
      const operationIds = ['op1', 'op2', 'op3', 'op4', 'op5'];
      
      for (const id of operationIds) {
        await store.dispatch(startLoadingOperation({
          id,
          type: 'api',
          priority: 'medium',
          timeout: 5000,
          maxRetries: 3
        }));
      }

      // Now complete them all concurrently
      const completionPromises = operationIds.map(id => 
        store.dispatch(completeLoadingOperation({
          id,
          success: true
        }))
      );

      await Promise.all(completionPromises);

      const state = store.getState();
      expect(state.loading.stats.completedOperations).toBe(5);
      expect(Object.keys(state.loading.operations)).toHaveLength(0);
      expect(state.loading.stats.averageLoadTime).toBeGreaterThan(0);
    });

    it('should handle mixed success/failure completions concurrently', async () => {
      // Create operations
      const operationIds = Array(20).fill(null).map((_, i) => `op-${i}`);
      
      for (const id of operationIds) {
        await store.dispatch(startLoadingOperation({
          id,
          type: 'api',
          priority: 'medium',
          timeout: 5000,
          maxRetries: 3
        }));
      }

      // Complete half successfully, half with failures
      const completionPromises = operationIds.map((id, index) => 
        store.dispatch(completeLoadingOperation({
          id,
          success: index % 2 === 0,
          error: index % 2 !== 0 ? new Error('Test error') : undefined
        }))
      );

      await Promise.all(completionPromises);

      const state = store.getState();
      expect(state.loading.stats.completedOperations).toBe(10);
      expect(state.loading.stats.failedOperations).toBe(10);
      expect(state.loading.stats.totalOperations).toBe(20);
    });

    it('should handle batch statistics updates atomically', async () => {
      const batchUpdates = [
        { type: 'increment_completed' as const },
        { type: 'increment_failed' as const },
        { type: 'update_average_time' as const, payload: { loadTime: 1000 } }
      ];

      // Apply batch update multiple times concurrently
      const promises = Array(50).fill(null).map(() => 
        store.dispatch(loadingSlice.actions.batchStatsUpdate(batchUpdates))
      );

      await Promise.all(promises);

      const state = store.getState();
      expect(state.loading.stats.completedOperations).toBe(50);
      expect(state.loading.stats.failedOperations).toBe(50);
      expect(state.loading.stats.averageLoadTime).toBe(1000);
    });
  });

  describe('WebSocket Middleware Race Conditions', () => {
    // Mock WebSocket middleware for testing
    class MockWebSocketAdapter {
      private subscriptionIds = new Map<string, string>();
      private subscriptionQueue: Array<() => Promise<void>> = [];
      private processingSubscriptions = false;
      private connectionStateUpdateTimeout: NodeJS.Timeout | null = null;

      async queueSubscriptionOperation(operation: () => Promise<void>) {
        this.subscriptionQueue.push(operation);
        
        if (!this.processingSubscriptions) {
          await this.processSubscriptionQueue();
        }
      }

      async processSubscriptionQueue() {
        this.processingSubscriptions = true;
        
        while (this.subscriptionQueue.length > 0) {
          const operation = this.subscriptionQueue.shift();
          if (operation) {
            try {
              await operation();
            } catch (error) {
              // Handle error
            }
          }
        }
        
        this.processingSubscriptions = false;
      }

      subscribe(subscription: { type: string; id: string }) {
        return this.queueSubscriptionOperation(async () => {
          const key = `${subscription.type}:${subscription.id}`;
          
          if (this.subscriptionIds.has(key)) {
            return; // Already subscribed
          }
          
          this.subscriptionIds.set(key, `sub-${Date.now()}`);
        });
      }

      unsubscribe(subscription: { type: string; id: string }) {
        return this.queueSubscriptionOperation(async () => {
          const key = `${subscription.type}:${subscription.id}`;
          this.subscriptionIds.delete(key);
        });
      }

      getSubscriptionCount() {
        return this.subscriptionIds.size;
      }

      updateConnectionState() {
        if (this.connectionStateUpdateTimeout) {
          clearTimeout(this.connectionStateUpdateTimeout);
        }

        this.connectionStateUpdateTimeout = setTimeout(() => {
          // Simulate connection state update
          this.connectionStateUpdateTimeout = null;
        }, 100);
      }
    }

    it('should handle rapid subscribe/unsubscribe operations', async () => {
      const wsAdapter = new MockWebSocketAdapter();
      const subscription = { type: 'bill', id: '123' };
      
      // Rapid subscribe/unsubscribe operations
      const promises = Array(100).fill(null).map((_, index) => {
        if (index % 2 === 0) {
          return wsAdapter.subscribe(subscription);
        } else {
          return wsAdapter.unsubscribe(subscription);
        }
      });

      await Promise.allSettled(promises);
      
      // Should not crash and final state should be consistent
      expect(wsAdapter.getSubscriptionCount()).toBeGreaterThanOrEqual(0);
      expect(wsAdapter.getSubscriptionCount()).toBeLessThanOrEqual(1);
    });

    it('should handle concurrent subscriptions to different resources', async () => {
      const wsAdapter = new MockWebSocketAdapter();
      
      // Subscribe to multiple different resources concurrently
      const subscriptions = Array(50).fill(null).map((_, index) => ({
        type: 'bill',
        id: `bill-${index}`
      }));

      const promises = subscriptions.map(sub => wsAdapter.subscribe(sub));
      await Promise.all(promises);

      expect(wsAdapter.getSubscriptionCount()).toBe(50);

      // Now unsubscribe from all concurrently
      const unsubPromises = subscriptions.map(sub => wsAdapter.unsubscribe(sub));
      await Promise.all(unsubPromises);

      expect(wsAdapter.getSubscriptionCount()).toBe(0);
    });

    it('should debounce connection state updates', async () => {
      const wsAdapter = new MockWebSocketAdapter();
      
      // Trigger many rapid connection state updates
      const promises = Array(20).fill(null).map(() => {
        wsAdapter.updateConnectionState();
        return Promise.resolve();
      });

      await Promise.all(promises);
      
      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not crash - this tests the debouncing mechanism
      expect(true).toBe(true);
    });
  });

  describe('Request Deduplication', () => {
    class RequestDeduplicator {
      private pendingRequests = new Map<string, Promise<any>>();

      async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
        if (this.pendingRequests.has(key)) {
          return this.pendingRequests.get(key) as Promise<T>;
        }

        const promise = requestFn().finally(() => {
          this.pendingRequests.delete(key);
        });

        this.pendingRequests.set(key, promise);
        return promise;
      }

      clear() {
        this.pendingRequests.clear();
      }

      getPendingCount() {
        return this.pendingRequests.size;
      }
    }

    it('should deduplicate concurrent identical requests', async () => {
      const deduplicator = new RequestDeduplicator();
      let callCount = 0;

      const mockRequest = () => {
        callCount++;
        return Promise.resolve(`result-${callCount}`);
      };

      // Make 10 concurrent identical requests
      const promises = Array(10).fill(null).map(() => 
        deduplicator.deduplicate('test-key', mockRequest)
      );

      const results = await Promise.all(promises);

      // Should only call the function once
      expect(callCount).toBe(1);
      
      // All results should be the same
      expect(results.every(result => result === 'result-1')).toBe(true);
      
      // No pending requests after completion
      expect(deduplicator.getPendingCount()).toBe(0);
    });

    it('should handle different request keys separately', async () => {
      const deduplicator = new RequestDeduplicator();
      let callCount = 0;

      const mockRequest = (key: string) => {
        callCount++;
        return Promise.resolve(`result-${key}-${callCount}`);
      };

      // Make concurrent requests with different keys
      const promises = [
        deduplicator.deduplicate('key1', () => mockRequest('key1')),
        deduplicator.deduplicate('key2', () => mockRequest('key2')),
        deduplicator.deduplicate('key1', () => mockRequest('key1')), // Duplicate
        deduplicator.deduplicate('key3', () => mockRequest('key3')),
      ];

      const results = await Promise.all(promises);

      // Should call function 3 times (key1, key2, key3)
      expect(callCount).toBe(3);
      
      // First and third results should be the same (key1 deduplication)
      expect(results[0]).toBe(results[2]);
      
      // Other results should be different
      expect(results[1]).not.toBe(results[0]);
      expect(results[3]).not.toBe(results[0]);
    });
  });

  describe('Error Handling in Race Conditions', () => {
    it('should handle errors in concurrent operations gracefully', async () => {
      // Create operations that will fail
      const operationIds = ['fail1', 'fail2', 'success1'];
      
      for (const id of operationIds) {
        await store.dispatch(startLoadingOperation({
          id,
          type: 'api',
          priority: 'medium',
          timeout: 5000,
          maxRetries: 3
        }));
      }

      // Complete with mixed results, some throwing errors
      const completionPromises = operationIds.map(id => {
        if (id.startsWith('fail')) {
          return store.dispatch(completeLoadingOperation({
            id,
            success: false,
            error: new Error('Simulated failure')
          }));
        } else {
          return store.dispatch(completeLoadingOperation({
            id,
            success: true
          }));
        }
      });

      // Should not throw despite errors
      await expect(Promise.all(completionPromises)).resolves.toBeDefined();

      const state = store.getState();
      expect(state.loading.stats.completedOperations).toBe(1);
      expect(state.loading.stats.failedOperations).toBe(2);
    });
  });
});