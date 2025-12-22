/**
 * Backward Compatibility Tests for WebSocket Service
 * 
 * Tests that the modularized WebSocket service maintains the same API
 * and behavior as the original monolithic implementation.
 */

import { createServer, type Server } from 'http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as WebSocket from 'ws';

import {
  createWebSocketService,
  type BackwardCompatibleWebSocketService,
} from '../../infrastructure/websocket/index.js';

describe('WebSocket Service Backward Compatibility', () => {
  let service: BackwardCompatibleWebSocketService;
  let httpServer: Server;
  let wsClient: WebSocket;
  let serverPort: number;

  beforeEach(async () => {
    // Set up test environment
    process.env.JWT_SECRET = 'test-jwt-secret-for-backward-compatibility';
    process.env.NODE_ENV = 'test';

    // Create HTTP server
    httpServer = createServer();
    
    // Get available port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        serverPort = typeof address === 'object' && address ? address.port : 3001;
        resolve();
      });
    });

    // Create service instance using factory function
    service = createWebSocketService();
    
    // Initialize service with HTTP server
    service.initialize(httpServer);

    // Give service time to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Close WebSocket client if connected
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Shutdown service
    if (service) {
      await service.shutdown();
    }

    // Close HTTP server
    if (httpServer && httpServer.listening) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }

    // Clean up environment
    delete process.env.JWT_SECRET;
  });

  describe('Service Initialization and Shutdown', () => {
    it('should initialize service with HTTP server', () => {
      // Service should be initialized in beforeEach
      expect(service).toBeDefined();
      expect(httpServer.listening).toBe(true);
    });

    it('should shutdown gracefully', async () => {
      await expect(service.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      await service.shutdown();
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Statistics API Compatibility', () => {
    it('should provide getStats() method with expected structure', () => {
      const stats = service.getStats();

      // Verify all expected properties exist
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

      // Verify data types
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.activeConnections).toBe('number');
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.uptime).toBe('number');
    });

    it('should provide getMetrics() method with categorized structure', () => {
      const metrics = service.getMetrics();

      // Verify expected categories
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('messages');
      expect(metrics).toHaveProperty('performance');

      // Verify connections category
      expect(metrics.connections).toHaveProperty('total');
      expect(metrics.connections).toHaveProperty('active');
      expect(metrics.connections).toHaveProperty('peak');
      expect(metrics.connections).toHaveProperty('unique_users');

      // Verify messages category
      expect(metrics.messages).toHaveProperty('total');
      expect(metrics.messages).toHaveProperty('broadcasts');
      expect(metrics.messages).toHaveProperty('dropped');
      expect(metrics.messages).toHaveProperty('duplicates');
      expect(metrics.messages).toHaveProperty('queue_overflows');

      // Verify performance category
      expect(metrics.performance).toHaveProperty('average_latency');
      expect(metrics.performance).toHaveProperty('memory_usage');
      expect(metrics.performance).toHaveProperty('reconnections');
    });

    it('should track connection statistics correctly', () => {
      const initialStats = service.getStats();
      expect(initialStats.totalConnections).toBe(0);
      expect(initialStats.activeConnections).toBe(0);
    });
  });

  describe('Health Status API Compatibility', () => {
    it('should provide getHealthStatus() method with expected structure', () => {
      const health = service.getHealthStatus();

      // Verify all expected properties exist
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('connectionHealth');
      expect(health).toHaveProperty('queueHealth');
      expect(health).toHaveProperty('warnings');
      expect(health).toHaveProperty('errors');
      expect(health).toHaveProperty('lastCheck');

      // Verify data types
      expect(typeof health.isHealthy).toBe('boolean');
      expect(typeof health.status).toBe('string');
      expect(typeof health.uptime).toBe('number');
      expect(Array.isArray(health.warnings)).toBe(true);
      expect(Array.isArray(health.errors)).toBe(true);
    });

    it('should report healthy status initially', () => {
      const health = service.getHealthStatus();
      expect(health.isHealthy).toBe(true);
      expect(health.status).toBe('healthy');
    });
  });

  describe('User Connection API Compatibility', () => {
    it('should provide isUserConnected() method', () => {
      const isConnected = service.isUserConnected('test-user');
      expect(typeof isConnected).toBe('boolean');
      expect(isConnected).toBe(false); // No connections initially
    });

    it('should provide getConnectionCount() method', () => {
      const count = service.getConnectionCount('test-user');
      expect(typeof count).toBe('number');
      expect(count).toBe(0); // No connections initially
    });

    it('should provide getAllConnectedUsers() method', () => {
      const users = service.getAllConnectedUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(0); // No connections initially
    });

    it('should provide getUserSubscriptions() method', () => {
      const subscriptions = service.getUserSubscriptions('test-user');
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions).toHaveLength(0); // No subscriptions initially
    });
  });

  describe('Bill Subscription API Compatibility', () => {
    it('should provide getBillSubscribers() method', () => {
      const subscribers = service.getBillSubscribers(123);
      expect(Array.isArray(subscribers)).toBe(true);
      expect(subscribers).toHaveLength(0); // No subscribers initially
    });

    it('should provide broadcastBillUpdate() method', () => {
      const message = { type: 'status_change', data: { status: 'passed' } };
      
      // Should not throw when broadcasting to no subscribers
      expect(() => {
        service.broadcastBillUpdate(123, message);
      }).not.toThrow();
    });
  });

  describe('Messaging API Compatibility', () => {
    it('should provide sendUserNotification() method', () => {
      const message = { type: 'notification', content: 'Test notification' };
      
      // Should not throw when sending to non-existent user
      expect(() => {
        service.sendUserNotification('test-user', message);
      }).not.toThrow();
    });

    it('should provide broadcastToAll() method', () => {
      const message = { type: 'announcement', data: { content: 'Test broadcast' } };
      
      // Should not throw when broadcasting to no connections
      expect(() => {
        service.broadcastToAll(message);
      }).not.toThrow();
    });
  });

  describe('Memory Analysis API Compatibility', () => {
    it('should provide forceMemoryAnalysis() method with expected structure', () => {
      const analysis = service.forceMemoryAnalysis();

      // Verify expected structure
      expect(analysis).toHaveProperty('process');
      expect(analysis).toHaveProperty('service');
      expect(analysis).toHaveProperty('analysis');

      // Verify process memory info
      expect(analysis.process).toHaveProperty('rss');
      expect(analysis.process).toHaveProperty('heapTotal');
      expect(analysis.process).toHaveProperty('heapUsed');
      expect(analysis.process).toHaveProperty('external');
      expect(analysis.process).toHaveProperty('arrayBuffers');

      // Verify service info
      expect(analysis.service).toHaveProperty('connections');
      expect(analysis.service).toHaveProperty('memoryUsage');
      expect(analysis.service).toHaveProperty('averageLatency');

      // Verify analysis info
      expect(analysis.analysis).toHaveProperty('heapUsedPercent');
      expect(analysis.analysis).toHaveProperty('timestamp');

      // Verify data types
      expect(typeof (analysis.process as any).rss).toBe('number');
      expect(typeof (analysis.process as any).heapTotal).toBe('number');
      expect(typeof (analysis.process as any).heapUsed).toBe('number');
      expect(typeof (analysis.analysis as any).heapUsedPercent).toBe('number');
    });

    it('should calculate heap usage percentage correctly', () => {
      const analysis = service.forceMemoryAnalysis();
      const processInfo = analysis.process as any;
      const analysisInfo = analysis.analysis as any;
      const { heapUsed, heapTotal } = processInfo;
      const expectedPercent = (heapUsed / heapTotal) * 100;
      
      expect(analysisInfo.heapUsedPercent).toBeCloseTo(expectedPercent, 2);
    });
  });

  describe('Cleanup API Compatibility', () => {
    it('should provide cleanup() method', () => {
      expect(() => {
        service.cleanup();
      }).not.toThrow();
    });
  });

  describe('Configuration Support', () => {
    it('should support default configuration options', () => {
      // Service should initialize with default configuration
      const stats = service.getStats();
      expect(stats).toBeDefined();
      
      const health = service.getHealthStatus();
      expect(health).toBeDefined();
    });

    it('should maintain consistent behavior across method calls', () => {
      // Multiple calls should return consistent data structures
      const stats1 = service.getStats();
      const stats2 = service.getStats();
      
      expect(Object.keys(stats1)).toEqual(Object.keys(stats2));
      
      const health1 = service.getHealthStatus();
      const health2 = service.getHealthStatus();
      
      expect(Object.keys(health1)).toEqual(Object.keys(health2));
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle invalid user IDs gracefully', () => {
      expect(() => {
        service.isUserConnected('');
        service.getConnectionCount('');
        service.getUserSubscriptions('');
        service.sendUserNotification('', {});
      }).not.toThrow();
    });

    it('should handle invalid bill IDs gracefully', () => {
      expect(() => {
        service.getBillSubscribers(-1);
        service.getBillSubscribers(0);
        service.broadcastBillUpdate(-1, {});
      }).not.toThrow();
    });

    it('should handle null/undefined parameters gracefully', () => {
      expect(() => {
        service.isUserConnected(null as any);
        service.getConnectionCount(undefined as any);
        service.sendUserNotification('test', null as any);
        service.broadcastBillUpdate(123, undefined as any);
      }).not.toThrow();
    });
  });

  describe('Service State Consistency', () => {
    it('should maintain consistent state across API calls', () => {
      const initialStats = service.getStats();
      const initialHealth = service.getHealthStatus();
      
      // Perform various operations
      service.isUserConnected('test-user');
      service.getBillSubscribers(123);
      service.broadcastBillUpdate(456, { test: 'data' });
      
      const finalStats = service.getStats();
      const finalHealth = service.getHealthStatus();
      
      // Core counters should remain consistent for operations that don't change state
      expect(finalStats.totalConnections).toBe(initialStats.totalConnections);
      expect(finalStats.activeConnections).toBe(initialStats.activeConnections);
      expect(finalHealth.status).toBe(initialHealth.status);
    });

    it('should provide monotonic timestamps', () => {
      const stats1 = service.getStats();
      
      // Wait a small amount
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Small delay
      }
      
      const stats2 = service.getStats();
      
      // Start time should be consistent
      expect(stats2.startTime).toBe(stats1.startTime);
      
      // Uptime should increase
      expect(stats2.uptime as number).toBeGreaterThanOrEqual(stats1.uptime as number);
    });
  });

  describe('Method Return Type Consistency', () => {
    it('should return consistent types for statistics methods', () => {
      const stats = service.getStats();
      const metrics = service.getMetrics();
      
      // All numeric fields should be numbers
      Object.values(stats).forEach(value => {
        expect(typeof value).toBe('number');
      });
      
      // Nested metrics should have numeric values
      Object.values(metrics).forEach(category => {
        if (typeof category === 'object' && category !== null) {
          Object.values(category).forEach(value => {
            expect(typeof value).toBe('number');
          });
        }
      });
    });

    it('should return consistent types for health methods', () => {
      const health = service.getHealthStatus();
      
      expect(typeof health.isHealthy).toBe('boolean');
      expect(typeof health.status).toBe('string');
      expect(typeof health.uptime).toBe('number');
      expect(Array.isArray(health.warnings)).toBe(true);
      expect(Array.isArray(health.errors)).toBe(true);
    });

    it('should return consistent types for user methods', () => {
      const isConnected = service.isUserConnected('test');
      const connectionCount = service.getConnectionCount('test');
      const subscriptions = service.getUserSubscriptions('test');
      const allUsers = service.getAllConnectedUsers();
      const subscribers = service.getBillSubscribers(123);
      
      expect(typeof isConnected).toBe('boolean');
      expect(typeof connectionCount).toBe('number');
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(Array.isArray(allUsers)).toBe(true);
      expect(Array.isArray(subscribers)).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should respond to API calls within reasonable time', async () => {
      const operations = [
        () => service.getStats(),
        () => service.getHealthStatus(),
        () => service.getMetrics(),
        () => service.isUserConnected('test'),
        () => service.getConnectionCount('test'),
        () => service.getUserSubscriptions('test'),
        () => service.getBillSubscribers(123),
        () => service.forceMemoryAnalysis(),
      ];

      for (const operation of operations) {
        const start = Date.now();
        operation();
        const duration = Date.now() - start;
        
        // API calls should complete within 100ms
        expect(duration).toBeLessThan(100);
      }
    });

    it('should handle rapid successive calls efficiently', () => {
      const start = Date.now();
      
      // Make 100 rapid calls
      for (let i = 0; i < 100; i++) {
        service.getStats();
        service.getHealthStatus();
        service.isUserConnected(`user-${i}`);
      }
      
      const duration = Date.now() - start;
      
      // 300 calls should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});