/**
 * Basic Socket.IO Service Tests
 * 
 * Simple tests to verify Socket.IO service functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SocketIOService } from '../socketio-service.js';
import { featureFlagService } from '../feature-flags.js';

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

describe('SocketIOService - Basic Tests', () => {
  let socketIOService: SocketIOService;

  beforeEach(() => {
    socketIOService = new SocketIOService();
  });

  afterEach(async () => {
    if (socketIOService) {
      await socketIOService.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should create Socket.IO service instance', () => {
      expect(socketIOService).toBeDefined();
    });

    it('should provide stats method', () => {
      const stats = socketIOService.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.activeConnections).toBe('number');
      expect(typeof stats.totalConnections).toBe('number');
    });

    it('should provide health status method', () => {
      const health = socketIOService.getHealthStatus();
      expect(health).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(typeof health.isHealthy).toBe('boolean');
    });

    it('should provide metrics method', () => {
      const metrics = socketIOService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.connections).toBeDefined();
      expect(metrics.messages).toBeDefined();
    });
  });

  describe('API Compatibility', () => {
    it('should maintain broadcastBillUpdate method signature', () => {
      expect(() => {
        socketIOService.broadcastBillUpdate(123, {
          type: 'status_change',
          data: { status: 'passed' }
        });
      }).not.toThrow();
    });

    it('should maintain sendUserNotification method signature', () => {
      expect(() => {
        socketIOService.sendUserNotification('test-user', {
          type: 'info',
          title: 'Test',
          message: 'Test message'
        });
      }).not.toThrow();
    });

    it('should maintain broadcastToAll method signature', () => {
      expect(() => {
        socketIOService.broadcastToAll({
          type: 'announcement',
          data: { message: 'Test announcement' }
        });
      }).not.toThrow();
    });

    it('should maintain utility methods', () => {
      expect(Array.isArray(socketIOService.getUserSubscriptions('test-user'))).toBe(true);
      expect(typeof socketIOService.isUserConnected('test-user')).toBe('boolean');
      expect(typeof socketIOService.getConnectionCount('test-user')).toBe('number');
      expect(Array.isArray(socketIOService.getAllConnectedUsers())).toBe(true);
      expect(Array.isArray(socketIOService.getBillSubscribers(123))).toBe(true);
    });
  });

  describe('Feature Flag Integration', () => {
    it('should work with feature flag service', () => {
      featureFlagService.setFlag('test_socketio_flag', {
        name: 'test_socketio_flag',
        enabled: true,
        rolloutPercentage: 100,
        fallbackEnabled: true
      });

      const isEnabled = featureFlagService.isEnabled('test_socketio_flag');
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should record metrics', () => {
      featureFlagService.recordResponseTime('test_metric', 100);
      const metrics = featureFlagService.getMetrics('test_metric');
      expect(metrics).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should handle cleanup gracefully', () => {
      expect(() => {
        socketIOService.cleanup();
      }).not.toThrow();
    });

    it('should handle shutdown gracefully', async () => {
      await expect(socketIOService.shutdown()).resolves.not.toThrow();
    });
  });
});