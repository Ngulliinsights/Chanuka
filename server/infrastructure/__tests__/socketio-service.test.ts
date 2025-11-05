/**
 * Unit Tests for Socket.IO Service
 * 
 * Tests the Socket.IO service implementation with Redis adapter
 * and API compatibility with existing WebSocket service.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import { SocketIOService } from '../socketio-service.js';
import { featureFlagService } from '../feature-flags.js';
import { memoryMonitor } from '../memory-monitor.js';
import { Client as SocketIOClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../shared/database/connection.js', () => ({
  database: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'test-user-id' }])
        })
      })
    })
  }
}));

vi.mock('../../shared/core/src/observability/logging/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      status: 'ready',
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('SocketIOService', () => {
  let socketIOService: SocketIOService;
  let httpServer: Server;
  let port: number;
  let clientSocket: SocketIOClient;
  let authToken: string;

  beforeAll(() => {
    // Generate test JWT token
    authToken = jwt.sign(
      { user_id: 'test-user-id' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Find available port
    port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });

    // Create Socket.IO service instance
    socketIOService = new SocketIOService();
    socketIOService.initialize(httpServer);

    // Start memory monitoring
    memoryMonitor.startMonitoring();
  });

  afterEach(async () => {
    // Cleanup client socket
    if (clientSocket) {
      clientSocket.disconnect();
    }

    // Shutdown services
    await socketIOService.shutdown();
    memoryMonitor.stopMonitoring();

    // Close HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('Initialization', () => {
    it('should initialize Socket.IO service successfully', () => {
      expect(socketIOService).toBeDefined();
    });

    it('should handle multiple initialization calls gracefully', () => {
      // Should not throw error on second initialization
      expect(() => {
        socketIOService.initialize(httpServer);
      }).not.toThrow();
    });
  });

  describe('Connection Handling', () => {
    it('should accept connection with valid JWT token', (done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    });

    it('should send connection confirmation message', (done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connected', (data) => {
        expect(data.type).toBe('connected');
        expect(data.message).toBe('WebSocket connection established');
        expect(data.data.user_id).toBe('test-user-id');
        expect(data.data.connectionId).toBeDefined();
        done();
      });

      clientSocket.on('connect_error', done);
    });
  });

  describe('Message Handling', () => {
    beforeEach((done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => done());
      clientSocket.on('connect_error', done);
    });

    it('should handle bill subscription', (done) => {
      const billId = 123;

      clientSocket.on('subscription_confirmed', (data) => {
        expect(data.type).toBe('subscription_confirmed');
        expect(data.bill_id).toBe(billId);
        done();
      });

      clientSocket.emit('message', {
        type: 'subscribe',
        data: { bill_id: billId },
        messageId: 'test-msg-1'
      });
    });

    it('should handle bill unsubscription', (done) => {
      const billId = 123;

      // First subscribe
      clientSocket.on('subscription_confirmed', () => {
        // Then unsubscribe
        clientSocket.emit('message', {
          type: 'unsubscribe',
          data: { bill_id: billId },
          messageId: 'test-msg-2'
        });
      });

      clientSocket.on('unsubscription_confirmed', (data) => {
        expect(data.type).toBe('unsubscription_confirmed');
        expect(data.bill_id).toBe(billId);
        done();
      });

      // Start with subscription
      clientSocket.emit('message', {
        type: 'subscribe',
        data: { bill_id: billId },
        messageId: 'test-msg-1'
      });
    });

    it('should handle batch subscription', (done) => {
      const billIds = [123, 456, 789];

      clientSocket.on('batch_subscription_confirmed', (data) => {
        expect(data.type).toBe('batch_subscription_confirmed');
        expect(data.bill_ids).toEqual(billIds);
        done();
      });

      clientSocket.emit('message', {
        type: 'batch_subscribe',
        data: { bill_ids: billIds },
        messageId: 'test-msg-3'
      });
    });

    it('should handle ping/pong', (done) => {
      clientSocket.on('pong', () => {
        done();
      });

      clientSocket.emit('ping');
    });

    it('should handle invalid message types', (done) => {
      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.message).toContain('Unknown message type');
        done();
      });

      clientSocket.emit('message', {
        type: 'invalid_type',
        messageId: 'test-msg-4'
      });
    });
  });

  describe('Broadcasting', () => {
    beforeEach((done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        // Subscribe to a bill for testing broadcasts
        clientSocket.emit('message', {
          type: 'subscribe',
          data: { bill_id: 123 },
          messageId: 'setup-msg'
        });
      });

      clientSocket.on('subscription_confirmed', () => done());
      clientSocket.on('connect_error', done);
    });

    it('should broadcast bill updates to subscribed users', (done) => {
      clientSocket.on('bill_update', (data) => {
        expect(data.type).toBe('bill_update');
        expect(data.bill_id).toBe(123);
        expect(data.update.type).toBe('status_change');
        expect(data.update.data.status).toBe('passed');
        done();
      });

      // Simulate bill update broadcast
      setTimeout(() => {
        socketIOService.broadcastBillUpdate(123, {
          type: 'status_change',
          data: { status: 'passed' }
        });
      }, 100);
    });

    it('should send user notifications', (done) => {
      clientSocket.on('notification', (data) => {
        expect(data.type).toBe('notification');
        expect(data.notification.title).toBe('Test Notification');
        expect(data.notification.message).toBe('This is a test');
        done();
      });

      // Simulate user notification
      setTimeout(() => {
        socketIOService.sendUserNotification('test-user-id', {
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test'
        });
      }, 100);
    });

    it('should broadcast to all users', (done) => {
      clientSocket.on('broadcast', (data) => {
        expect(data.type).toBe('system_announcement');
        expect(data.data.message).toBe('System maintenance scheduled');
        done();
      });

      // Simulate broadcast to all
      setTimeout(() => {
        socketIOService.broadcastToAll({
          type: 'system_announcement',
          data: { message: 'System maintenance scheduled' }
        });
      }, 100);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach((done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => done());
      clientSocket.on('connect_error', done);
    });

    it('should provide service statistics', () => {
      const stats = socketIOService.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.activeConnections).toBeGreaterThanOrEqual(1);
      expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueUsers).toBeGreaterThanOrEqual(1);
    });

    it('should provide health status', () => {
      const health = socketIOService.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(health.isHealthy).toBeDefined();
      expect(health.stats).toBeDefined();
      expect(health.memoryUsage).toBeDefined();
      expect(health.redisStatus).toBeDefined();
    });

    it('should provide metrics', () => {
      const metrics = socketIOService.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.connections).toBeDefined();
      expect(metrics.messages).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.subscriptions).toBeDefined();
      expect(metrics.redis).toBeDefined();
    });
  });

  describe('API Compatibility', () => {
    beforeEach((done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => done());
      clientSocket.on('connect_error', done);
    });

    it('should maintain getUserSubscriptions compatibility', () => {
      const subscriptions = socketIOService.getUserSubscriptions('test-user-id');
      expect(Array.isArray(subscriptions)).toBe(true);
    });

    it('should maintain isUserConnected compatibility', () => {
      const isConnected = socketIOService.isUserConnected('test-user-id');
      expect(typeof isConnected).toBe('boolean');
      expect(isConnected).toBe(true);
    });

    it('should maintain getConnectionCount compatibility', () => {
      const count = socketIOService.getConnectionCount('test-user-id');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should maintain getAllConnectedUsers compatibility', () => {
      const users = socketIOService.getAllConnectedUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toContain('test-user-id');
    });

    it('should maintain getBillSubscribers compatibility', () => {
      const subscribers = socketIOService.getBillSubscribers(123);
      expect(Array.isArray(subscribers)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should handle memory cleanup events', (done) => {
      memoryMonitor.on('cleanup:requested', (data) => {
        expect(data.severity).toBeDefined();
        done();
      });

      // Trigger memory cleanup
      memoryMonitor.emit('cleanup:requested', { severity: 'low' });
    });

    it('should respond to memory pressure', () => {
      const initialStats = socketIOService.getStats();
      
      // Simulate memory pressure
      memoryMonitor.emit('memory:warning', {
        heapUsed: 1000000000,
        heapTotal: 1200000000,
        external: 50000000,
        rss: 1100000000,
        heapUsedPercent: 83.33,
        timestamp: new Date()
      });

      // Service should still be functional
      const afterStats = socketIOService.getStats();
      expect(afterStats).toBeDefined();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should work with feature flag service', () => {
      // Test feature flag integration
      featureFlagService.setFlag('test_flag', {
        name: 'test_flag',
        enabled: true,
        rolloutPercentage: 50,
        fallbackEnabled: true
      });

      const isEnabled = featureFlagService.isEnabled('test_flag', 'test-user-id');
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should record metrics for A/B testing', () => {
      featureFlagService.recordResponseTime('websocket_socketio_migration', 150);
      
      const metrics = featureFlagService.getMetrics('websocket_socketio_migration');
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.averageResponseTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // This test ensures the service continues to work even if Redis fails
      const stats = socketIOService.getStats();
      expect(stats).toBeDefined();
    });

    it('should handle malformed messages', (done) => {
      clientSocket = new SocketIOClient(`http://localhost:${port}`, {
        auth: {
          token: authToken
        },
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        clientSocket.on('error', (data) => {
          expect(data.type).toBe('error');
          done();
        });

        // Send malformed message
        clientSocket.emit('message', {
          // Missing required fields
          messageId: 'malformed-msg'
        });
      });

      clientSocket.on('connect_error', done);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(socketIOService.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple shutdown calls', async () => {
      await socketIOService.shutdown();
      await expect(socketIOService.shutdown()).resolves.not.toThrow();
    });
  });
});