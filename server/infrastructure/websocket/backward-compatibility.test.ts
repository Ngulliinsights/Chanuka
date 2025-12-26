/**
 * Backward Compatibility Tests for WebSocket Service
 * 
 * Tests that the new modular WebSocket service maintains the same API
 * and behavior as the original monolithic service.
 */

import { Server } from 'http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

import { BackwardCompatibleWebSocketService,createWebSocketService } from './index';

// Mock WebSocket for testing
vi.mock('ws', () => ({
  default: {
    WebSocketServer: vi.fn(),
    OPEN: 1,
    CLOSED: 3,
  },
  WebSocketServer: vi.fn(),
}));

// Mock HTTP server
const mockServer = {
  on: vi.fn(),
  listen: vi.fn(),
  close: vi.fn(),
} as unknown as Server;

describe('BackwardCompatibleWebSocketService', () => {
  let service: BackwardCompatibleWebSocketService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createWebSocketService();
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
  });

  describe('API Compatibility', () => {
    it('should have all required methods from original service', () => {
      // Test that all expected methods exist
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.shutdown).toBe('function');
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getHealthStatus).toBe('function');
      expect(typeof service.getUserSubscriptions).toBe('function');
      expect(typeof service.isUserConnected).toBe('function');
      expect(typeof service.getConnectionCount).toBe('function');
      expect(typeof service.getAllConnectedUsers).toBe('function');
      expect(typeof service.getBillSubscribers).toBe('function');
      expect(typeof service.broadcastBillUpdate).toBe('function');
      expect(typeof service.sendUserNotification).toBe('function');
      expect(typeof service.forceMemoryAnalysis).toBe('function');
      expect(typeof service.broadcastToAll).toBe('function');
      expect(typeof service.getMetrics).toBe('function');
      expect(typeof service.cleanup).toBe('function');
    });

    it('should accept Server instance in initialize method', () => {
      expect(() => {
        service.initialize(mockServer);
      }).not.toThrow();
    });

    it('should return Promise<void> from shutdown method', async () => {
      const result = service.shutdown();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('Statistics API', () => {
    it('should return stats object with expected properties', () => {
      const stats = service.getStats();
      
      expect(stats).toBeTypeOf('object');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('totalBroadcasts');
      expect(stats).toHaveProperty('droppedMessages');
      expect(stats).toHaveProperty('duplicateMessages');
      expect(stats).toHaveProperty('queueOverflows');
      expect(stats).toHaveProperty('reconnections');
      expect(stats).toHaveProperty('startTime');
      expect(stats).toHaveProperty('lastActivity');
      expect(stats).toHaveProperty('peakConnections');
      expect(stats).toHaveProperty('uniqueUsers');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('uptime');
    });

    it('should return health status object with expected properties', () => {
      const health = service.getHealthStatus();
      
      expect(health).toBeTypeOf('object');
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('connectionHealth');
      expect(health).toHaveProperty('queueHealth');
      expect(health).toHaveProperty('warnings');
      expect(health).toHaveProperty('errors');
      expect(health).toHaveProperty('lastCheck');
    });

    it('should return metrics object with expected structure', () => {
      const metrics = service.getMetrics();
      
      expect(metrics).toBeTypeOf('object');
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('messages');
      expect(metrics).toHaveProperty('performance');
      
      // Check connections metrics
      expect(metrics.connections).toHaveProperty('total');
      expect(metrics.connections).toHaveProperty('active');
      expect(metrics.connections).toHaveProperty('peak');
      expect(metrics.connections).toHaveProperty('unique_users');
      
      // Check messages metrics
      expect(metrics.messages).toHaveProperty('total');
      expect(metrics.messages).toHaveProperty('broadcasts');
      expect(metrics.messages).toHaveProperty('dropped');
      expect(metrics.messages).toHaveProperty('duplicates');
      expect(metrics.messages).toHaveProperty('queue_overflows');
      
      // Check performance metrics
      expect(metrics.performance).toHaveProperty('average_latency');
      expect(metrics.performance).toHaveProperty('memory_usage');
      expect(metrics.performance).toHaveProperty('reconnections');
    });
  });

  describe('User Management API', () => {
    it('should return empty array for getUserSubscriptions with non-existent user', () => {
      const subscriptions = service.getUserSubscriptions('non-existent-user');
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions).toHaveLength(0);
    });

    it('should return false for isUserConnected with non-existent user', () => {
      const isConnected = service.isUserConnected('non-existent-user');
      expect(isConnected).toBe(false);
    });

    it('should return 0 for getConnectionCount with non-existent user', () => {
      const count = service.getConnectionCount('non-existent-user');
      expect(count).toBe(0);
    });

    it('should return empty array for getAllConnectedUsers initially', () => {
      const users = service.getAllConnectedUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(0);
    });

    it('should return empty array for getBillSubscribers with non-existent bill', () => {
      const subscribers = service.getBillSubscribers(999999);
      expect(Array.isArray(subscribers)).toBe(true);
      expect(subscribers).toHaveLength(0);
    });
  });

  describe('Broadcasting API', () => {
    it('should not throw when broadcasting to bill with no subscribers', () => {
      expect(() => {
        service.broadcastBillUpdate(123, {
          type: 'test',
          data: { message: 'test' }
        });
      }).not.toThrow();
    });

    it('should not throw when sending notification to non-existent user', () => {
      expect(() => {
        service.sendUserNotification('non-existent-user', {
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test'
        });
      }).not.toThrow();
    });

    it('should not throw when broadcasting to all clients', () => {
      expect(() => {
        service.broadcastToAll({
          type: 'announcement',
          data: { message: 'System maintenance in 5 minutes' }
        });
      }).not.toThrow();
    });
  });

  describe('Memory Analysis API', () => {
    it('should return memory analysis object with expected structure', () => {
      const analysis = service.forceMemoryAnalysis();
      
      expect(analysis).toBeTypeOf('object');
      expect(analysis).toHaveProperty('process');
      expect(analysis).toHaveProperty('service');
      expect(analysis).toHaveProperty('analysis');
      
      // Check process memory info
      expect(analysis.process).toHaveProperty('rss');
      expect(analysis.process).toHaveProperty('heapTotal');
      expect(analysis.process).toHaveProperty('heapUsed');
      expect(analysis.process).toHaveProperty('external');
      expect(analysis.process).toHaveProperty('arrayBuffers');
      
      // Check service memory info
      expect(analysis.service).toHaveProperty('connections');
      expect(analysis.service).toHaveProperty('memoryUsage');
      expect(analysis.service).toHaveProperty('averageLatency');
      
      // Check analysis info
      expect(analysis.analysis).toHaveProperty('heapUsedPercent');
      expect(analysis.analysis).toHaveProperty('timestamp');
      
      // Verify data types
      expect(typeof analysis.analysis.heapUsedPercent).toBe('number');
      expect(typeof analysis.analysis.timestamp).toBe('string');
    });
  });

  describe('Cleanup API', () => {
    it('should not throw when calling cleanup', () => {
      expect(() => {
        service.cleanup();
      }).not.toThrow();
    });
  });

  describe('Configuration Compatibility', () => {
    it('should work with default configuration', () => {
      const defaultService = createWebSocketService();
      expect(defaultService).toBeInstanceOf(BackwardCompatibleWebSocketService);
    });

    it('should maintain configuration options through service lifecycle', () => {
      // Test that configuration is maintained through initialization
      service.initialize(mockServer);
      
      const stats1 = service.getStats();
      const health1 = service.getHealthStatus();
      
      // Configuration should be consistent
      expect(stats1).toBeDefined();
      expect(health1).toBeDefined();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle invalid user IDs gracefully', () => {
      expect(() => service.getUserSubscriptions('')).not.toThrow();
      expect(() => service.isUserConnected('')).not.toThrow();
      expect(() => service.getConnectionCount('')).not.toThrow();
      expect(() => service.sendUserNotification('', {})).not.toThrow();
    });

    it('should handle invalid bill IDs gracefully', () => {
      expect(() => service.getBillSubscribers(-1)).not.toThrow();
      expect(() => service.getBillSubscribers(0)).not.toThrow();
      expect(() => service.broadcastBillUpdate(-1, {})).not.toThrow();
    });

    it('should handle empty or invalid messages gracefully', () => {
      expect(() => service.broadcastBillUpdate(123, {})).not.toThrow();
      expect(() => service.sendUserNotification('user', {})).not.toThrow();
      expect(() => service.broadcastToAll({ type: '', data: {} })).not.toThrow();
    });
  });

  describe('Service State Management', () => {
    it('should handle multiple initialize calls gracefully', () => {
      service.initialize(mockServer);
      expect(() => service.initialize(mockServer)).not.toThrow();
    });

    it('should handle shutdown before initialize', async () => {
      const newService = createWebSocketService();
      await expect(newService.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      await service.shutdown();
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Data Type Compatibility', () => {
    it('should return correct data types for all methods', () => {
      // String methods
      expect(typeof service.getUserSubscriptions('test')).toBe('object');
      expect(Array.isArray(service.getUserSubscriptions('test'))).toBe(true);
      expect(typeof service.isUserConnected('test')).toBe('boolean');
      expect(typeof service.getConnectionCount('test')).toBe('number');
      expect(Array.isArray(service.getAllConnectedUsers())).toBe(true);
      expect(Array.isArray(service.getBillSubscribers(123))).toBe(true);
      
      // Object methods
      expect(typeof service.getStats()).toBe('object');
      expect(typeof service.getHealthStatus()).toBe('object');
      expect(typeof service.getMetrics()).toBe('object');
      expect(typeof service.forceMemoryAnalysis()).toBe('object');
    });

    it('should return arrays with correct element types', () => {
      const subscriptions = service.getUserSubscriptions('test');
      subscriptions.forEach(sub => expect(typeof sub).toBe('number'));
      
      const users = service.getAllConnectedUsers();
      users.forEach(user => expect(typeof user).toBe('string'));
      
      const subscribers = service.getBillSubscribers(123);
      subscribers.forEach(subscriber => expect(typeof subscriber).toBe('string'));
    });
  });
});

describe('createWebSocketService Factory', () => {
  it('should create a BackwardCompatibleWebSocketService instance', () => {
    const service = createWebSocketService();
    expect(service).toBeInstanceOf(BackwardCompatibleWebSocketService);
  });

  it('should create different instances on multiple calls', () => {
    const service1 = createWebSocketService();
    const service2 = createWebSocketService();
    expect(service1).not.toBe(service2);
  });

  it('should create instances with working APIs', () => {
    const service = createWebSocketService();
    
    // Test that basic methods work
    expect(() => service.getStats()).not.toThrow();
    expect(() => service.getHealthStatus()).not.toThrow();
    expect(() => service.getMetrics()).not.toThrow();
    expect(() => service.forceMemoryAnalysis()).not.toThrow();
  });
});

describe('Integration with Original Service Behavior', () => {
  let service: BackwardCompatibleWebSocketService;

  beforeEach(() => {
    service = createWebSocketService();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should maintain consistent behavior across service lifecycle', () => {
    // Initial state
    const initialStats = service.getStats();
    const initialHealth = service.getHealthStatus();
    
    // Initialize service
    service.initialize(mockServer);
    
    // State after initialization
    const postInitStats = service.getStats();
    const postInitHealth = service.getHealthStatus();
    
    // Basic structure should remain consistent
    expect(Object.keys(initialStats)).toEqual(Object.keys(postInitStats));
    expect(Object.keys(initialHealth)).toEqual(Object.keys(postInitHealth));
  });

  it('should handle rapid successive API calls', () => {
    // Simulate rapid API calls that might occur in production
    for (let i = 0; i < 100; i++) {
      expect(() => service.getStats()).not.toThrow();
      expect(() => service.getUserSubscriptions(`user-${i}`)).not.toThrow();
      expect(() => service.isUserConnected(`user-${i}`)).not.toThrow();
      expect(() => service.getBillSubscribers(i)).not.toThrow();
    }
  });

  it('should maintain performance characteristics', () => {
    // Test that API calls complete in reasonable time
    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      service.getStats();
      service.getHealthStatus();
      service.getUserSubscriptions(`user-${i % 10}`);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });
});