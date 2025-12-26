/**
 * SubscriptionManager Unit Tests
 * 
 * Tests subscription tracking, management, batch operations, and cleanup functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedWebSocket } from '../../types';
import { SubscriptionManager } from '../subscription-manager';

// Mock WebSocket factory
const createMockWebSocket = (overrides: Partial<AuthenticatedWebSocket> = {}): AuthenticatedWebSocket => {
  return {
    readyState: 1, // OPEN
    OPEN: 1,
    CLOSED: 3,
    send: vi.fn(),
    close: vi.fn(),
    user_id: 'test_user',
    isAlive: true,
    lastPing: Date.now(),
    subscriptions: new Set<number>(),
    connectionId: `conn_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  } as unknown as AuthenticatedWebSocket;
};

describe('SubscriptionManager', () => {
  let subscriptionManager: SubscriptionManager;
  let mockWebSocket1: AuthenticatedWebSocket;
  let mockWebSocket2: AuthenticatedWebSocket;
  let mockWebSocket3: AuthenticatedWebSocket;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
    mockWebSocket1 = createMockWebSocket({ connectionId: 'ws1' });
    mockWebSocket2 = createMockWebSocket({ connectionId: 'ws2' });
    mockWebSocket3 = createMockWebSocket({ connectionId: 'ws3' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should subscribe WebSocket to a bill', () => {
      subscriptionManager.subscribe(mockWebSocket1, 123);

      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      expect(mockWebSocket1.subscriptions?.has(123)).toBe(true);

      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toContain(mockWebSocket1);
      expect(subscribers).toHaveLength(1);
    });

    it('should handle multiple subscriptions to same bill', () => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 123);

      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toContain(mockWebSocket1);
      expect(subscribers).toContain(mockWebSocket2);
      expect(subscribers).toHaveLength(2);
    });

    it('should handle same WebSocket subscribing to multiple bills', () => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 456);
      subscriptionManager.subscribe(mockWebSocket1, 789);

      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(true);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(true);

      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      expect(subscriptions).toContain(123);
      expect(subscriptions).toContain(456);
      expect(subscriptions).toContain(789);
      expect(subscriptions).toHaveLength(3);
    });

    it('should handle duplicate subscription gracefully', () => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 123); // Duplicate

      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toHaveLength(1); // Should not duplicate
      expect(subscribers).toContain(mockWebSocket1);
    });

    it('should reject invalid bill ID', () => {
      expect(() => {
        subscriptionManager.subscribe(mockWebSocket1, 0);
      }).toThrow('Invalid bill ID: 0');

      expect(() => {
        subscriptionManager.subscribe(mockWebSocket1, -1);
      }).toThrow('Invalid bill ID: -1');

      expect(() => {
        subscriptionManager.subscribe(mockWebSocket1, 1.5);
      }).toThrow('Invalid bill ID: 1.5');

      expect(() => {
        subscriptionManager.subscribe(mockWebSocket1, NaN);
      }).toThrow('Invalid bill ID: NaN');
    });

    it('should reject invalid WebSocket connection', () => {
      expect(() => {
        subscriptionManager.subscribe(null as any, 123);
      }).toThrow('Invalid or closed WebSocket connection');

      const closedWebSocket = createMockWebSocket({ readyState: 3 }); // CLOSED
      expect(() => {
        subscriptionManager.subscribe(closedWebSocket, 123);
      }).toThrow('Invalid or closed WebSocket connection');
    });

    it('should initialize WebSocket subscriptions set if not present', () => {
      const wsWithoutSubscriptions = createMockWebSocket({ subscriptions: undefined });
      
      subscriptionManager.subscribe(wsWithoutSubscriptions, 123);

      expect(wsWithoutSubscriptions.subscriptions).toBeDefined();
      expect(wsWithoutSubscriptions.subscriptions?.has(123)).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    beforeEach(() => {
      // Set up some initial subscriptions
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 456);
      subscriptionManager.subscribe(mockWebSocket2, 123);
    });

    it('should unsubscribe WebSocket from a bill', () => {
      subscriptionManager.unsubscribe(mockWebSocket1, 123);

      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
      expect(mockWebSocket1.subscriptions?.has(123)).toBe(false);

      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).not.toContain(mockWebSocket1);
      expect(subscribers).toContain(mockWebSocket2); // Other subscription should remain
    });

    it('should remove bill from tracking when no subscribers remain', () => {
      subscriptionManager.unsubscribe(mockWebSocket1, 123);
      subscriptionManager.unsubscribe(mockWebSocket2, 123);

      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toHaveLength(0);
      expect(subscriptionManager.getSubscribedBillsCount()).toBe(1); // Only bill 456 remains
    });

    it('should handle unsubscribe from non-subscribed bill gracefully', () => {
      expect(() => {
        subscriptionManager.unsubscribe(mockWebSocket1, 999); // Not subscribed
      }).not.toThrow();

      expect(subscriptionManager.isSubscribed(mockWebSocket1, 999)).toBe(false);
    });

    it('should reject invalid bill ID', () => {
      expect(() => {
        subscriptionManager.unsubscribe(mockWebSocket1, 0);
      }).toThrow('Invalid bill ID: 0');

      expect(() => {
        subscriptionManager.unsubscribe(mockWebSocket1, -1);
      }).toThrow('Invalid bill ID: -1');
    });

    it('should clean up connection tracking when no subscriptions remain', () => {
      subscriptionManager.unsubscribe(mockWebSocket1, 123);
      subscriptionManager.unsubscribe(mockWebSocket1, 456);

      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      expect(subscriptions).toHaveLength(0);
      expect(subscriptionManager.getActiveConnectionsCount()).toBe(1); // Only mockWebSocket2 remains
    });
  });

  describe('batch operations', () => {
    describe('batchSubscribe', () => {
      it('should subscribe to multiple bills at once', () => {
        const billIds = [123, 456, 789];
        
        subscriptionManager.batchSubscribe(mockWebSocket1, billIds);

        for (const billId of billIds) {
          expect(subscriptionManager.isSubscribed(mockWebSocket1, billId)).toBe(true);
          const subscribers = subscriptionManager.getSubscribers(billId);
          expect(subscribers).toContain(mockWebSocket1);
        }

        const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
        expect(subscriptions).toHaveLength(3);
      });

      it('should reject empty bill IDs array', () => {
        expect(() => {
          subscriptionManager.batchSubscribe(mockWebSocket1, []);
        }).toThrow('Bill IDs must be a non-empty array');
      });

      it('should reject non-array bill IDs', () => {
        expect(() => {
          subscriptionManager.batchSubscribe(mockWebSocket1, 'not-array' as any);
        }).toThrow('Bill IDs must be a non-empty array');

        expect(() => {
          subscriptionManager.batchSubscribe(mockWebSocket1, null as any);
        }).toThrow('Bill IDs must be a non-empty array');
      });

      it('should reject invalid WebSocket connection', () => {
        expect(() => {
          subscriptionManager.batchSubscribe(null as any, [123, 456]);
        }).toThrow('Invalid or closed WebSocket connection');

        const closedWebSocket = createMockWebSocket({ readyState: 3 });
        expect(() => {
          subscriptionManager.batchSubscribe(closedWebSocket, [123, 456]);
        }).toThrow('Invalid or closed WebSocket connection');
      });

      it('should validate all bill IDs before processing', () => {
        const billIds = [123, -1, 456]; // Contains invalid bill ID

        expect(() => {
          subscriptionManager.batchSubscribe(mockWebSocket1, billIds);
        }).toThrow('Invalid bill ID in batch: -1');

        // No subscriptions should be created
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
      });

      it('should continue processing on individual subscription errors', () => {
        // Mock console.error to avoid test output noise
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Create a scenario where one subscription might fail
        const billIds = [123, 456, 789];
        
        // Override subscribe method to simulate failure on second bill
        const originalSubscribe = subscriptionManager.subscribe;
        subscriptionManager.subscribe = vi.fn().mockImplementation((ws, billId) => {
          if (billId === 456) {
            throw new Error('Simulated subscription error');
          }
          return originalSubscribe.call(subscriptionManager, ws, billId);
        });

        subscriptionManager.batchSubscribe(mockWebSocket1, billIds);

        // Should have subscribed to bills 123 and 789, but not 456
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(true);

        consoleSpy.mockRestore();
      });
    });

    describe('batchUnsubscribe', () => {
      beforeEach(() => {
        // Set up initial subscriptions
        subscriptionManager.subscribe(mockWebSocket1, 123);
        subscriptionManager.subscribe(mockWebSocket1, 456);
        subscriptionManager.subscribe(mockWebSocket1, 789);
      });

      it('should unsubscribe from multiple bills at once', () => {
        const billIds = [123, 456];
        
        subscriptionManager.batchUnsubscribe(mockWebSocket1, billIds);

        expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(true); // Should remain
      });

      it('should reject empty bill IDs array', () => {
        expect(() => {
          subscriptionManager.batchUnsubscribe(mockWebSocket1, []);
        }).toThrow('Bill IDs must be a non-empty array');
      });

      it('should reject non-array bill IDs', () => {
        expect(() => {
          subscriptionManager.batchUnsubscribe(mockWebSocket1, 'not-array' as any);
        }).toThrow('Bill IDs must be a non-empty array');
      });

      it('should validate all bill IDs before processing', () => {
        const billIds = [123, -1, 456]; // Contains invalid bill ID

        expect(() => {
          subscriptionManager.batchUnsubscribe(mockWebSocket1, billIds);
        }).toThrow('Invalid bill ID in batch: -1');

        // Original subscriptions should remain unchanged
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(true);
      });

      it('should continue processing on individual unsubscription errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const billIds = [123, 456, 789];
        
        // Override unsubscribe method to simulate failure on second bill
        const originalUnsubscribe = subscriptionManager.unsubscribe;
        subscriptionManager.unsubscribe = vi.fn().mockImplementation((ws, billId) => {
          if (billId === 456) {
            throw new Error('Simulated unsubscription error');
          }
          return originalUnsubscribe.call(subscriptionManager, ws, billId);
        });

        subscriptionManager.batchUnsubscribe(mockWebSocket1, billIds);

        // Should have unsubscribed from bills 123 and 789, but not 456
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(true);
        expect(subscriptionManager.isSubscribed(mockWebSocket1, 789)).toBe(false);

        consoleSpy.mockRestore();
      });
    });
  });

  describe('getSubscribers', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 123);
      subscriptionManager.subscribe(mockWebSocket3, 456);
    });

    it('should return all subscribers for a bill', () => {
      const subscribers = subscriptionManager.getSubscribers(123);
      
      expect(subscribers).toContain(mockWebSocket1);
      expect(subscribers).toContain(mockWebSocket2);
      expect(subscribers).toHaveLength(2);
    });

    it('should return empty array for bill with no subscribers', () => {
      const subscribers = subscriptionManager.getSubscribers(999);
      expect(subscribers).toHaveLength(0);
    });

    it('should return empty array for invalid bill ID', () => {
      const subscribers = subscriptionManager.getSubscribers(-1);
      expect(subscribers).toHaveLength(0);
    });

    it('should filter out closed connections', () => {
      // Close one of the connections
      Object.defineProperty(mockWebSocket2, 'readyState', { value: 3, writable: true }); // CLOSED

      const subscribers = subscriptionManager.getSubscribers(123);
      
      expect(subscribers).toContain(mockWebSocket1);
      expect(subscribers).not.toContain(mockWebSocket2);
      expect(subscribers).toHaveLength(1);
    });

    it('should clean up closed connections from internal tracking', () => {
      // Close one connection
      Object.defineProperty(mockWebSocket2, 'readyState', { value: 3, writable: true }); // CLOSED

      const subscribersBefore = subscriptionManager.getSubscribers(123);
      expect(subscribersBefore).toHaveLength(1); // Only active connection

      // Internal cleanup should have occurred
      const stats = subscriptionManager.getStats();
      expect(stats.totalSubscriptions).toBe(2); // ws1->123, ws3->456
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 456);
      subscriptionManager.subscribe(mockWebSocket2, 123);
    });

    it('should clean up all subscriptions for a WebSocket', () => {
      subscriptionManager.cleanup(mockWebSocket1);

      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);

      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      expect(subscriptions).toHaveLength(0);

      // Other connections should remain unaffected
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(true);
    });

    it('should remove bills with no remaining subscribers', () => {
      subscriptionManager.cleanup(mockWebSocket2); // Remove ws2 from bill 123
      subscriptionManager.cleanup(mockWebSocket1); // Remove ws1 from bills 123 and 456

      expect(subscriptionManager.getSubscribedBillsCount()).toBe(0);
      expect(subscriptionManager.getTotalSubscriptions()).toBe(0);
    });

    it('should clear WebSocket subscriptions set', () => {
      expect(mockWebSocket1.subscriptions?.size).toBeGreaterThan(0);

      subscriptionManager.cleanup(mockWebSocket1);

      expect(mockWebSocket1.subscriptions?.size).toBe(0);
    });

    it('should handle cleanup of non-subscribed WebSocket gracefully', () => {
      const unsubscribedWebSocket = createMockWebSocket();

      expect(() => {
        subscriptionManager.cleanup(unsubscribedWebSocket);
      }).not.toThrow();
    });
  });

  describe('statistics and monitoring', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 456);
      subscriptionManager.subscribe(mockWebSocket2, 123);
      subscriptionManager.subscribe(mockWebSocket3, 789);
    });

    it('should return correct total subscriptions count', () => {
      expect(subscriptionManager.getTotalSubscriptions()).toBe(4);
    });

    it('should return correct subscribed bills count', () => {
      expect(subscriptionManager.getSubscribedBillsCount()).toBe(3); // Bills 123, 456, 789
    });

    it('should return correct active connections count', () => {
      expect(subscriptionManager.getActiveConnectionsCount()).toBe(3); // ws1, ws2, ws3
    });

    it('should provide comprehensive statistics', () => {
      const stats = subscriptionManager.getStats();

      expect(stats.totalSubscriptions).toBe(4);
      expect(stats.subscribedBills).toBe(3);
      expect(stats.activeConnections).toBe(3);
      expect(stats.averageSubscriptionsPerConnection).toBeCloseTo(4/3);
      expect(stats.averageSubscribersPerBill).toBeCloseTo(4/3);
    });

    it('should handle zero division in statistics', () => {
      const emptyManager = new SubscriptionManager();
      const stats = emptyManager.getStats();

      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.subscribedBills).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.averageSubscriptionsPerConnection).toBe(0);
      expect(stats.averageSubscribersPerBill).toBe(0);
    });
  });

  describe('performCleanup', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 456);
      subscriptionManager.subscribe(mockWebSocket3, 789);
    });

    it('should clean up closed connections', () => {
      // Close some connections
      Object.defineProperty(mockWebSocket1, 'readyState', { value: 3, writable: true }); // CLOSED
      Object.defineProperty(mockWebSocket3, 'readyState', { value: 3, writable: true }); // CLOSED

      subscriptionManager.performCleanup();

      // Only active connection should remain
      expect(subscriptionManager.getActiveConnectionsCount()).toBe(1);
      expect(subscriptionManager.getTotalSubscriptions()).toBe(1);
      expect(subscriptionManager.getSubscribedBillsCount()).toBe(1); // Only bill 456
    });

    it('should not affect open connections', () => {
      subscriptionManager.performCleanup();

      // All connections are open, so nothing should change
      expect(subscriptionManager.getActiveConnectionsCount()).toBe(3);
      expect(subscriptionManager.getTotalSubscriptions()).toBe(3);
      expect(subscriptionManager.getSubscribedBillsCount()).toBe(3);
    });
  });

  describe('isSubscribed', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
    });

    it('should return true for subscribed connection', () => {
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 123)).toBe(true);
    });

    it('should return false for non-subscribed connection', () => {
      expect(subscriptionManager.isSubscribed(mockWebSocket2, 123)).toBe(false);
      expect(subscriptionManager.isSubscribed(mockWebSocket1, 456)).toBe(false);
    });

    it('should return false for connection without subscriptions', () => {
      const newWebSocket = createMockWebSocket();
      expect(subscriptionManager.isSubscribed(newWebSocket, 123)).toBe(false);
    });
  });

  describe('getSubscriptionsForConnection', () => {
    beforeEach(() => {
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket1, 456);
      subscriptionManager.subscribe(mockWebSocket1, 789);
    });

    it('should return all subscriptions for a connection', () => {
      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket1);
      
      expect(subscriptions).toContain(123);
      expect(subscriptions).toContain(456);
      expect(subscriptions).toContain(789);
      expect(subscriptions).toHaveLength(3);
    });

    it('should return empty array for connection with no subscriptions', () => {
      const subscriptions = subscriptionManager.getSubscriptionsForConnection(mockWebSocket2);
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('edge cases and error conditions', () => {
    it('should handle WebSocket without connectionId', () => {
      const wsWithoutId = createMockWebSocket({ connectionId: undefined });
      
      expect(() => {
        subscriptionManager.subscribe(wsWithoutId, 123);
      }).not.toThrow();

      expect(subscriptionManager.isSubscribed(wsWithoutId, 123)).toBe(true);
    });

    it('should handle very large bill IDs', () => {
      const largeBillId = Number.MAX_SAFE_INTEGER;
      
      expect(() => {
        subscriptionManager.subscribe(mockWebSocket1, largeBillId);
      }).not.toThrow();

      expect(subscriptionManager.isSubscribed(mockWebSocket1, largeBillId)).toBe(true);
    });

    it('should handle concurrent operations gracefully', () => {
      // Simulate concurrent subscribe/unsubscribe operations
      subscriptionManager.subscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket2, 123);
      subscriptionManager.unsubscribe(mockWebSocket1, 123);
      subscriptionManager.subscribe(mockWebSocket3, 123);
      subscriptionManager.cleanup(mockWebSocket2);

      // Should end up with only mockWebSocket3 subscribed to bill 123
      const subscribers = subscriptionManager.getSubscribers(123);
      expect(subscribers).toContain(mockWebSocket3);
      expect(subscribers).toHaveLength(1);
    });
  });
});