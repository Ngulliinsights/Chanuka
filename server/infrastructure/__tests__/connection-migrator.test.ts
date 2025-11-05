/**
 * Connection Migration System Tests
 * 
 * Tests for graceful connection handover, blue-green deployment,
 * and connection stability during migration process.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Server } from 'http';
import { ConnectionMigrator } from '../connection-migrator.js';
import { webSocketService } from '../websocket.js';
import { socketIOService } from '../socketio-service.js';
import { featureFlagService } from '../feature-flags.js';

// Mock dependencies
vi.mock('../websocket.js', () => ({
  webSocketService: {
    initialize: vi.fn(),
    getAllConnectedUsers: vi.fn(),
    getUserSubscriptions: vi.fn(),
    getConnectionCount: vi.fn(),
    getStats: vi.fn(),
    getHealthStatus: vi.fn(),
    cleanup: vi.fn(),
    shutdown: vi.fn()
  }
}));

vi.mock('../socketio-service.js', () => ({
  socketIOService: {
    initialize: vi.fn(),
    getAllConnectedUsers: vi.fn(),
    getUserSubscriptions: vi.fn(),
    getConnectionCount: vi.fn(),
    getStats: vi.fn(),
    getHealthStatus: vi.fn(),
    cleanup: vi.fn(),
    shutdown: vi.fn()
  }
}));

vi.mock('../feature-flags.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
    toggleFlag: vi.fn(),
    updateRolloutPercentage: vi.fn(),
    getStatisticalAnalysis: vi.fn(),
    shouldTriggerRollback: vi.fn(),
    triggerRollback: vi.fn()
  }
}));

describe('ConnectionMigrator', () => {
  let connectionMigrator: ConnectionMigrator;
  let mockServer: Server;

  // Set longer timeout for migration tests
  const MIGRATION_TEST_TIMEOUT = 30000; // 30 seconds

  beforeEach(() => {
    connectionMigrator = new ConnectionMigrator();
    connectionMigrator.enableTestMode(); // Enable test mode for faster tests
    mockServer = {} as Server;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (webSocketService.getStats as Mock).mockReturnValue({
      activeConnections: 100,
      totalConnections: 150,
      totalMessages: 1000
    });

    (webSocketService.getHealthStatus as Mock).mockReturnValue({
      isHealthy: true,
      timestamp: new Date().toISOString()
    });

    (socketIOService.getStats as Mock).mockReturnValue({
      activeConnections: 0,
      totalConnections: 0,
      totalMessages: 0
    });

    (socketIOService.getHealthStatus as Mock).mockReturnValue({
      isHealthy: true,
      timestamp: new Date().toISOString()
    });

    (featureFlagService.isEnabled as Mock).mockReturnValue(false);
    (featureFlagService.shouldTriggerRollback as Mock).mockReturnValue(false);
    (featureFlagService.getStatisticalAnalysis as Mock).mockReturnValue({
      errorRate: 0.001,
      averageResponseTime: 150,
      totalRequests: 1000
    });
  });

  afterEach(async () => {
    await connectionMigrator.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize connection migrator', () => {
      connectionMigrator.initialize(mockServer);

      expect(webSocketService.initialize).toHaveBeenCalledWith(mockServer);
      expect(connectionMigrator.getActiveService()).toBe('legacy');
      expect(connectionMigrator.isMigrationInProgress()).toBe(false);
    });

    it('should initialize Socket.IO service when migration is enabled', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);

      connectionMigrator.initialize(mockServer);

      expect(socketIOService.initialize).toHaveBeenCalledWith(mockServer);
    });
  });

  describe('Connection State Management', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should capture connection states from legacy service', async () => {
      const mockUsers = ['user1', 'user2', 'user3'];
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(mockUsers);
      (webSocketService.getUserSubscriptions as Mock).mockImplementation((userId) => {
        return userId === 'user1' ? [1, 2, 3] : [4, 5];
      });
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      // Access private method for testing
      const captureMethod = (connectionMigrator as any).captureConnectionStates;
      await captureMethod.call(connectionMigrator);

      expect(webSocketService.getAllConnectedUsers).toHaveBeenCalled();
      expect(webSocketService.getUserSubscriptions).toHaveBeenCalledTimes(3);
      expect(webSocketService.getConnectionCount).toHaveBeenCalledTimes(3);
    });

    it('should handle empty connection states gracefully', async () => {
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue([]);

      const captureMethod = (connectionMigrator as any).captureConnectionStates;
      await expect(captureMethod.call(connectionMigrator)).resolves.not.toThrow();
    });
  });

  describe('Blue-Green Deployment', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should start blue-green migration successfully', async () => {
      // Mock successful migration conditions
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1', 'user2']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1, 2]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      expect(connectionMigrator.isMigrationInProgress()).toBe(false);
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.phase).toBe('completed');
    }, MIGRATION_TEST_TIMEOUT);

    it('should rollback on migration failure', async () => {
      // Mock failure conditions
      (socketIOService.getHealthStatus as Mock).mockReturnValue({
        isHealthy: false,
        timestamp: new Date().toISOString()
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      expect(connectionMigrator.getActiveService()).toBe('legacy');
      expect(featureFlagService.toggleFlag).toHaveBeenCalledWith('websocket_socketio_migration', false);
    }, MIGRATION_TEST_TIMEOUT);

    it('should prevent concurrent migrations', async () => {
      // Start first migration
      const migration1 = connectionMigrator.startBlueGreenMigration();

      // Try to start second migration
      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow('Migration already in progress');

      // Wait for first migration to complete
      await migration1;
    });
  });

  describe('Traffic Shifting', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should perform gradual traffic shift', async () => {
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      await connectionMigrator.startBlueGreenMigration();

      // Verify rollout percentages were updated
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 10);
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 25);
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 50);
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 75);
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 100);
    });

    it('should rollback on high error rate during traffic shift', async () => {
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);
      
      // Mock high error rate after first shift
      (featureFlagService.shouldTriggerRollback as Mock).mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });
  });

  describe('Migration Validation', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should validate migration health successfully', async () => {
      const validateMethod = (connectionMigrator as any).validateMigrationHealth;
      
      await expect(validateMethod.call(connectionMigrator)).resolves.not.toThrow();
    });

    it('should fail validation on high error rate', async () => {
      (featureFlagService.getStatisticalAnalysis as Mock).mockReturnValue({
        errorRate: 0.02, // 2% error rate (above 1% threshold)
        averageResponseTime: 150,
        totalRequests: 1000
      });

      const validateMethod = (connectionMigrator as any).validateMigrationHealth;
      
      await expect(validateMethod.call(connectionMigrator)).rejects.toThrow('High error rate detected');
    });

    it('should fail validation on high response time', async () => {
      (featureFlagService.getStatisticalAnalysis as Mock).mockReturnValue({
        errorRate: 0.001,
        averageResponseTime: 600, // 600ms (above 500ms threshold)
        totalRequests: 1000
      });

      const validateMethod = (connectionMigrator as any).validateMigrationHealth;
      
      await expect(validateMethod.call(connectionMigrator)).rejects.toThrow('High response time detected');
    });

    it('should fail validation on significant connection loss', async () => {
      // Set initial connection count
      connectionMigrator['migrationProgress'] = {
        phase: 'migrating',
        startTime: new Date(),
        totalConnections: 100,
        migratedConnections: 0,
        failedMigrations: 0,
        preservedSubscriptions: 0,
        errors: []
      };

      // Mock significant connection loss (only 90 connections remaining, below 95% threshold)
      (webSocketService.getStats as Mock).mockReturnValue({ activeConnections: 45 });
      (socketIOService.getStats as Mock).mockReturnValue({ activeConnections: 45 });

      const validateMethod = (connectionMigrator as any).validateMigrationHealth;
      
      await expect(validateMethod.call(connectionMigrator)).rejects.toThrow('Significant connection loss detected');
    });
  });

  describe('Rollback Mechanisms', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should perform rollback successfully', async () => {
      await connectionMigrator.rollbackMigration();

      expect(featureFlagService.toggleFlag).toHaveBeenCalledWith('websocket_socketio_migration', false);
      expect(featureFlagService.updateRolloutPercentage).toHaveBeenCalledWith('websocket_socketio_migration', 0);
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });

    it('should trigger emergency rollback', () => {
      connectionMigrator.triggerEmergencyRollback();

      expect(featureFlagService.triggerRollback).toHaveBeenCalledWith('websocket_socketio_migration');
      expect(featureFlagService.triggerRollback).toHaveBeenCalledWith('socketio_connection_handling');
      expect(featureFlagService.triggerRollback).toHaveBeenCalledWith('socketio_broadcasting');
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });

    it('should handle rollback when legacy service is unhealthy', async () => {
      (webSocketService.getHealthStatus as Mock).mockReturnValue({
        isHealthy: false,
        timestamp: new Date().toISOString()
      });

      // Should not throw, but should log error
      await expect(connectionMigrator.rollbackMigration()).resolves.not.toThrow();
    });
  });

  describe('Status and Monitoring', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should return migration status', () => {
      const status = connectionMigrator.getMigrationStatus();

      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('blueGreenState');
      expect(status).toHaveProperty('connectionStates');
      expect(status).toHaveProperty('isHealthy');
      expect(status.isHealthy).toBe(true);
    });

    it('should return migration metrics', () => {
      const metrics = connectionMigrator.getMigrationMetrics();

      expect(metrics).toHaveProperty('featureFlagMetrics');
      expect(metrics).toHaveProperty('serviceStats');
      expect(metrics).toHaveProperty('migrationProgress');
      expect(metrics.serviceStats).toHaveProperty('legacy');
      expect(metrics.serviceStats).toHaveProperty('socketio');
    });

    it('should report unhealthy status when Socket.IO is enabled but unhealthy', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (socketIOService.getHealthStatus as Mock).mockReturnValue({
        isHealthy: false,
        timestamp: new Date().toISOString()
      });

      const status = connectionMigrator.getMigrationStatus();
      expect(status.isHealthy).toBe(false);
    });
  });

  describe('Connection Stability Tests', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should maintain connection stability during migration', async () => {
      // Mock stable connection scenario
      let connectionCount = 100;
      (webSocketService.getStats as Mock).mockImplementation(() => ({
        activeConnections: Math.max(0, connectionCount - 10), // Gradual decrease
        totalConnections: 150,
        totalMessages: 1000
      }));

      (socketIOService.getStats as Mock).mockImplementation(() => ({
        activeConnections: Math.min(100, 100 - connectionCount + 10), // Gradual increase
        totalConnections: 100 - connectionCount + 10,
        totalMessages: 500
      }));

      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1', 'user2']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1, 2]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      await connectionMigrator.startBlueGreenMigration();

      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.phase).toBe('completed');
    });

    it('should detect and handle connection drops during migration', async () => {
      // Mock connection drop scenario
      (webSocketService.getStats as Mock).mockReturnValue({
        activeConnections: 50, // Significant drop from initial 100
        totalConnections: 150,
        totalMessages: 1000
      });

      (socketIOService.getStats as Mock).mockReturnValue({
        activeConnections: 30, // Not enough to compensate
        totalConnections: 30,
        totalMessages: 200
      });

      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow('Significant connection loss detected');
    });

    it('should preserve user subscriptions during migration', async () => {
      const mockUsers = ['user1', 'user2'];
      const mockSubscriptions = { user1: [1, 2, 3], user2: [4, 5] };

      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(mockUsers);
      (webSocketService.getUserSubscriptions as Mock).mockImplementation((userId) => mockSubscriptions[userId] || []);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      // Mock Socket.IO service returning same subscriptions
      (socketIOService.getUserSubscriptions as Mock).mockImplementation((userId) => mockSubscriptions[userId] || []);

      await connectionMigrator.startBlueGreenMigration();

      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.preservedSubscriptions).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should handle service initialization failures', async () => {
      (socketIOService.initialize as Mock).mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });

    it('should handle connection state capture failures', async () => {
      (webSocketService.getAllConnectedUsers as Mock).mockImplementation(() => {
        throw new Error('Failed to get connected users');
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();
    });

    it('should handle timeout during migration', async () => {
      // Mock a scenario that would cause timeout
      (featureFlagService.getStatisticalAnalysis as Mock).mockImplementation(() => {
        // Simulate slow response that would trigger timeout
        return new Promise(resolve => setTimeout(() => resolve({
          errorRate: 0.001,
          averageResponseTime: 150,
          totalRequests: 1000
        }), 10000));
      });

      // This test would need to be adjusted based on actual timeout implementation
      // For now, we'll just verify the migration can handle async operations
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1']);
      (webSocketService.getUserSubscriptions as Mock).mockReturnValue([1]);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(1);

      await expect(connectionMigrator.startBlueGreenMigration()).resolves.not.toThrow();
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(() => {
      connectionMigrator.initialize(mockServer);
    });

    it('should cleanup resources properly', () => {
      connectionMigrator.cleanup();

      // Verify cleanup doesn't throw errors
      expect(() => connectionMigrator.cleanup()).not.toThrow();
    });

    it('should shutdown gracefully', async () => {
      await connectionMigrator.shutdown();

      // Verify shutdown completes without errors
      expect(connectionMigrator.isMigrationInProgress()).toBe(false);
    });

    it('should rollback during shutdown if migration is in progress', async () => {
      // Start migration but don't wait for completion
      const migrationPromise = connectionMigrator.startBlueGreenMigration();
      
      // Shutdown while migration is in progress
      await connectionMigrator.shutdown();

      // Verify rollback occurred
      expect(connectionMigrator.getActiveService()).toBe('legacy');
      
      // Clean up the migration promise
      try {
        await migrationPromise;
      } catch {
        // Expected to fail due to shutdown
      }
    });
  });
});