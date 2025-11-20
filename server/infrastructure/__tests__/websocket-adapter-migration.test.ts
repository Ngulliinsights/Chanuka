/**
 * WebSocket Adapter Migration Integration Tests
 * 
 * Tests the integration between WebSocket adapter and connection migrator
 * for seamless migration management.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Server } from 'http';
import { WebSocketAdapter } from '../websocket-adapter.js';
import { connectionMigrator } from '../connection-migrator.js';
import { webSocketService } from '../websocket.js';
import { socketIOService } from '../socketio-service.js';
import { featureFlagService } from '../feature-flags.js';

// Mock dependencies
vi.mock('../websocket.js', () => ({
  webSocketService: {
    initialize: vi.fn(),
    getStats: vi.fn(),
    getHealthStatus: vi.fn(),
    broadcastBillUpdate: vi.fn(),
    sendUserNotification: vi.fn(),
    broadcastToAll: vi.fn(),
    getUserSubscriptions: vi.fn(),
    isUserConnected: vi.fn(),
    getConnectionCount: vi.fn(),
    getAllConnectedUsers: vi.fn(),
    getBillSubscribers: vi.fn(),
    cleanup: vi.fn(),
    shutdown: vi.fn()
  }
}));

vi.mock('../socketio-service.js', () => ({
  socketIOService: {
    initialize: vi.fn(),
    getStats: vi.fn(),
    getHealthStatus: vi.fn(),
    broadcastBillUpdate: vi.fn(),
    sendUserNotification: vi.fn(),
    broadcastToAll: vi.fn(),
    getUserSubscriptions: vi.fn(),
    isUserConnected: vi.fn(),
    getConnectionCount: vi.fn(),
    getAllConnectedUsers: vi.fn(),
    getBillSubscribers: vi.fn(),
    cleanup: vi.fn(),
    shutdown: vi.fn()
  }
}));

vi.mock('../feature-flags.js', () => ({
  featureFlagService: {
    isEnabled: vi.fn(),
    getFlag: vi.fn(),
    getStatisticalAnalysis: vi.fn(),
    getAllFlags: vi.fn(),
    getAllMetrics: vi.fn()
  }
}));

vi.mock('../connection-migrator.js', () => ({
  connectionMigrator: {
    initialize: vi.fn(),
    startBlueGreenMigration: vi.fn(),
    triggerEmergencyRollback: vi.fn(),
    getMigrationStatus: vi.fn(),
    getMigrationMetrics: vi.fn(),
    getActiveService: vi.fn(),
    isMigrationInProgress: vi.fn(),
    shutdown: vi.fn()
  }
}));

describe('WebSocket Adapter Migration Integration', () => {
  let webSocketAdapter: WebSocketAdapter;
  let mockServer: Server;

  beforeEach(() => {
    webSocketAdapter = new WebSocketAdapter();
    mockServer = {} as Server;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (webSocketService.getStats as Mock).mockReturnValue({
      activeConnections: 50,
      totalConnections: 100,
      totalMessages: 1000,
      totalBroadcasts: 50,
      peakConnections: 75
    });

    (socketIOService.getStats as Mock).mockReturnValue({
      activeConnections: 25,
      totalConnections: 30,
      totalMessages: 500,
      totalBroadcasts: 25,
      peakConnections: 30
    });

    (featureFlagService.isEnabled as Mock).mockReturnValue(false);
    (featureFlagService.getFlag as Mock).mockReturnValue({
      rolloutPercentage: 0
    });
    (featureFlagService.getStatisticalAnalysis as Mock).mockReturnValue({
      errorRate: 0.001,
      averageResponseTime: 150
    });

    (connectionMigrator.getMigrationStatus as Mock).mockReturnValue({
      progress: null,
      blueGreenState: {
        activeService: 'legacy',
        standbyService: 'socketio',
        migrationInProgress: false,
        trafficSplitPercentage: 0
      },
      connectionStates: 0,
      isHealthy: true
    });

    (connectionMigrator.getActiveService as Mock).mockReturnValue('legacy');
    (connectionMigrator.isMigrationInProgress as Mock).mockReturnValue(false);
  });

  afterEach(async () => {
    await webSocketAdapter.shutdown();
  });

  describe('Initialization with Connection Migrator', () => {
    it('should initialize adapter through connection migrator', () => {
      webSocketAdapter.initialize(mockServer);

      expect(connectionMigrator.initialize).toHaveBeenCalledWith(mockServer);
    });

    it('should handle initialization errors gracefully', () => {
      (connectionMigrator.initialize as Mock).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      expect(() => webSocketAdapter.initialize(mockServer)).toThrow('Initialization failed');
    });

    it('should prevent double initialization', () => {
      webSocketAdapter.initialize(mockServer);
      webSocketAdapter.initialize(mockServer);

      expect(connectionMigrator.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Migration Management', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should start migration through connection migrator', async () => {
      (connectionMigrator.startBlueGreenMigration as Mock).mockResolvedValue(undefined);

      await webSocketAdapter.startMigration();

      expect(connectionMigrator.startBlueGreenMigration).toHaveBeenCalled();
    });

    it('should handle migration failures', async () => {
      const migrationError = new Error('Migration failed');
      (connectionMigrator.startBlueGreenMigration as Mock).mockRejectedValue(migrationError);

      await expect(webSocketAdapter.startMigration()).rejects.toThrow('Migration failed');
    });

    it('should trigger emergency rollback', () => {
      webSocketAdapter.triggerEmergencyRollback();

      expect(connectionMigrator.triggerEmergencyRollback).toHaveBeenCalled();
    });

    it('should get migration status', () => {
      const mockStatus = {
        progress: {
          phase: 'completed',
          migratedConnections: 50
        },
        blueGreenState: {
          activeService: 'socketio'
        }
      };

      (connectionMigrator.getMigrationStatus as Mock).mockReturnValue(mockStatus);

      const status = webSocketAdapter.getMigrationStatus();

      expect(status).toEqual(mockStatus);
      expect(connectionMigrator.getMigrationStatus).toHaveBeenCalled();
    });

    it('should get migration metrics', () => {
      const mockMetrics = {
        featureFlagMetrics: { errorRate: 0.001 },
        serviceStats: { legacy: {}, socketio: {} },
        migrationProgress: { phase: 'completed' }
      };

      (connectionMigrator.getMigrationMetrics as Mock).mockReturnValue(mockMetrics);

      const metrics = webSocketAdapter.getMigrationMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(connectionMigrator.getMigrationMetrics).toHaveBeenCalled();
    });
  });

  describe('Statistics Integration', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should include migration status in stats when migration is disabled', () => {
      const stats = webSocketAdapter.getStats();

      expect(stats).toHaveProperty('migration');
      expect(stats.migration).toHaveProperty('status');
      expect(stats.migration).toHaveProperty('activeService');
      expect(stats.migration.enabled).toBe(false);
      expect(stats.migration.activeService).toBe('legacy');
    });

    it('should include migration status in stats when migration is enabled', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (featureFlagService.getFlag as Mock).mockReturnValue({
        rolloutPercentage: 50
      });

      const stats = webSocketAdapter.getStats();

      expect(stats.migration.enabled).toBe(true);
      expect(stats.migration.rolloutPercentage).toBe(50);
      expect(stats).toHaveProperty('socketio');
      expect(stats.combined.activeConnections).toBe(75); // 50 + 25
    });

    it('should handle stats errors gracefully', () => {
      (webSocketService.getStats as Mock).mockImplementation(() => {
        throw new Error('Stats error');
      });

      // Should not throw, should return fallback stats
      expect(() => webSocketAdapter.getStats()).not.toThrow();
    });
  });

  describe('Service Routing During Migration', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should route to legacy service when migration is disabled', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(false);

      webSocketAdapter.broadcastBillUpdate(123, {
        type: 'status_change',
        data: { status: 'passed' }
      });

      expect(webSocketService.broadcastBillUpdate).toHaveBeenCalledWith(123, {
        type: 'status_change',
        data: { status: 'passed' }
      });
      expect(socketIOService.broadcastBillUpdate).not.toHaveBeenCalled();
    });

    it('should route to both services during partial migration', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValueOnce(true) // socketio_broadcasting
        .mockReturnValueOnce(true); // websocket_socketio_migration check
      
      (featureFlagService.getFlag as Mock).mockReturnValue({
        rolloutPercentage: 50 // Partial rollout
      });

      webSocketAdapter.broadcastBillUpdate(123, {
        type: 'status_change',
        data: { status: 'passed' }
      });

      // Should broadcast to both services during transition
      expect(webSocketService.broadcastBillUpdate).toHaveBeenCalled();
      expect(socketIOService.broadcastBillUpdate).toHaveBeenCalled();
    });

    it('should handle service routing errors with fallback', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (socketIOService.broadcastBillUpdate as Mock).mockImplementation(() => {
        throw new Error('Socket.IO error');
      });

      // Should fallback to legacy service on error
      webSocketAdapter.broadcastBillUpdate(123, {
        type: 'status_change',
        data: { status: 'passed' }
      });

      expect(webSocketService.broadcastBillUpdate).toHaveBeenCalled();
    });
  });

  describe('User Connection Management', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should check user connection across both services', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (webSocketService.isUserConnected as Mock).mockReturnValue(false);
      (socketIOService.isUserConnected as Mock).mockReturnValue(true);

      const isConnected = webSocketAdapter.isUserConnected('user123');

      expect(isConnected).toBe(true);
      expect(webSocketService.isUserConnected).toHaveBeenCalledWith('user123');
      expect(socketIOService.isUserConnected).toHaveBeenCalledWith('user123');
    });

    it('should sum connection counts from both services', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (webSocketService.getConnectionCount as Mock).mockReturnValue(2);
      (socketIOService.getConnectionCount as Mock).mockReturnValue(3);

      const totalCount = webSocketAdapter.getConnectionCount('user123');

      expect(totalCount).toBe(5);
    });

    it('should merge connected users from both services', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (webSocketService.getAllConnectedUsers as Mock).mockReturnValue(['user1', 'user2', 'user3']);
      (socketIOService.getAllConnectedUsers as Mock).mockReturnValue(['user2', 'user3', 'user4']);

      const allUsers = webSocketAdapter.getAllConnectedUsers();

      expect(allUsers).toEqual(['user1', 'user2', 'user3', 'user4']);
      expect(allUsers.length).toBe(4); // Deduplicated
    });

    it('should merge bill subscribers from both services', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (webSocketService.getBillSubscribers as Mock).mockReturnValue(['user1', 'user2']);
      (socketIOService.getBillSubscribers as Mock).mockReturnValue(['user2', 'user3']);

      const subscribers = webSocketAdapter.getBillSubscribers(123);

      expect(subscribers).toEqual(['user1', 'user2', 'user3']);
      expect(subscribers.length).toBe(3); // Deduplicated
    });
  });

  describe('Health Status Integration', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should report healthy when both services are healthy', () => {
      (webSocketService.getHealthStatus as Mock).mockReturnValue({ isHealthy: true });
      (socketIOService.getHealthStatus as Mock).mockReturnValue({ isHealthy: true });
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);

      const health = webSocketAdapter.getHealthStatus();

      expect(health.overall.isHealthy).toBe(true);
      expect(health.legacy.isHealthy).toBe(true);
      expect(health.socketio.isHealthy).toBe(true);
    });

    it('should report unhealthy when Socket.IO is enabled but unhealthy', () => {
      (webSocketService.getHealthStatus as Mock).mockReturnValue({ isHealthy: true });
      (socketIOService.getHealthStatus as Mock).mockReturnValue({ isHealthy: false });
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);

      const health = webSocketAdapter.getHealthStatus();

      expect(health.overall.isHealthy).toBe(false);
      expect(health.legacy.isHealthy).toBe(true);
      expect(health.socketio.isHealthy).toBe(false);
    });

    it('should include migration information in health status', () => {
      (featureFlagService.isEnabled as Mock).mockReturnValue(true);
      (featureFlagService.getFlag as Mock).mockReturnValue({ rolloutPercentage: 75 });

      const health = webSocketAdapter.getHealthStatus();

      expect(health.migration.enabled).toBe(true);
      expect(health.migration.rolloutPercentage).toBe(75);
      expect(health.migration.autoRollbackEnabled).toBe(true);
    });
  });

  describe('Cleanup and Shutdown Integration', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should cleanup both services', () => {
      webSocketAdapter.cleanup();

      // Cleanup is handled by individual services, not the migrator
      expect(webSocketService.cleanup).toHaveBeenCalled();
      expect(socketIOService.cleanup).toHaveBeenCalled();
    });

    it('should shutdown through connection migrator', async () => {
      (connectionMigrator.shutdown as Mock).mockResolvedValue(undefined);

      await webSocketAdapter.shutdown();

      expect(connectionMigrator.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      const shutdownError = new Error('Shutdown failed');
      (connectionMigrator.shutdown as Mock).mockRejectedValue(shutdownError);

      await expect(webSocketAdapter.shutdown()).rejects.toThrow('Shutdown failed');
    });
  });

  describe('Migration State Transitions', () => {
    beforeEach(() => {
      webSocketAdapter.initialize(mockServer);
    });

    it('should reflect migration state in adapter methods', () => {
      // Initially legacy
      (connectionMigrator.getActiveService as Mock).mockReturnValue('legacy');
      expect(webSocketAdapter.getMigrationStatus().blueGreenState?.activeService).toBe('legacy');

      // After migration
      (connectionMigrator.getActiveService as Mock).mockReturnValue('socketio');
      (connectionMigrator.getMigrationStatus as Mock).mockReturnValue({
        blueGreenState: { activeService: 'socketio' }
      });
      
      expect(webSocketAdapter.getMigrationStatus().blueGreenState?.activeService).toBe('socketio');
    });

    it('should handle migration in progress state', () => {
      (connectionMigrator.isMigrationInProgress as Mock).mockReturnValue(true);
      (connectionMigrator.getMigrationStatus as Mock).mockReturnValue({
        progress: { phase: 'migrating' },
        blueGreenState: { migrationInProgress: true }
      });

      const status = webSocketAdapter.getMigrationStatus();
      expect(status.blueGreenState?.migrationInProgress).toBe(true);
      expect(status.progress?.phase).toBe('migrating');
    });

    it('should handle rollback state', () => {
      (connectionMigrator.getMigrationStatus as Mock).mockReturnValue({
        progress: { phase: 'rolled_back' },
        blueGreenState: { 
          activeService: 'legacy',
          migrationInProgress: false 
        }
      });

      const status = webSocketAdapter.getMigrationStatus();
      expect(status.progress?.phase).toBe('rolled_back');
      expect(status.blueGreenState?.activeService).toBe('legacy');
    });
  });
});
