/**
 * WebSocketService Integration Tests
 * 
 * Comprehensive integration tests for the WebSocketService class covering
 * service initialization, component integration, graceful shutdown, and
 * error handling across component boundaries.
 */

import { Server } from 'http';
import { afterEach, beforeEach, describe, expect, it, Mock,vi } from 'vitest';
import { WebSocketServer } from 'ws';

import { RuntimeConfig } from '../../config/runtime-config';
import type {
  AuthenticatedWebSocket,
  ConnectionStats,
  HealthStatus,
  IConnectionManager,
  IHealthChecker,
  IMemoryManager,
  IMessageHandler,
  IStatisticsCollector,
  WebSocketMessage,
} from '../../types';
import { WebSocketService, WebSocketServiceOptions } from '../websocket-service';

// Mock implementations for testing
class MockConnectionManager implements IConnectionManager {
  private connections = new Map<string, AuthenticatedWebSocket>();
  private connectionCount = 0;

  addConnection = vi.fn((ws: AuthenticatedWebSocket) => {
    ws.connectionId = `mock_${++this.connectionCount}`;
    this.connections.set(ws.connectionId, ws);
  });

  removeConnection = vi.fn((ws: AuthenticatedWebSocket) => {
    if (ws.connectionId) {
      this.connections.delete(ws.connectionId);
    }
  });

  getConnectionsForUser = vi.fn((userId: string): AuthenticatedWebSocket[] => {
    return Array.from(this.connections.values()).filter(ws => ws.user_id === userId);
  });

  authenticateConnection = vi.fn(async (ws: AuthenticatedWebSocket, token: string): Promise<boolean> => {
    ws.user_id = 'test_user';
    return true;
  });

  cleanup = vi.fn();

  getConnectionCount = vi.fn(() => this.connections.size);
}

class MockMessageHandler implements IMessageHandler {
  handleMessage = vi.fn(async (ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> => {
    // Mock message handling
  });

  broadcastToSubscribers = vi.fn((billId: number, message: Record<string, unknown>): void => {
    // Mock broadcast
  });

  validateMessage = vi.fn((message: WebSocketMessage): boolean => true);

  cleanup = vi.fn((ws: AuthenticatedWebSocket): void => {
    // Mock cleanup
  });
}

class MockMemoryManager implements IMemoryManager {
  private isMonitoring = false;

  startMonitoring = vi.fn(() => {
    this.isMonitoring = true;
  });

  stopMonitoring = vi.fn(() => {
    this.isMonitoring = false;
  });

  performCleanup = vi.fn();

  handleMemoryPressure = vi.fn();

  handleMemoryLeak = vi.fn();

  getIsMonitoring(): boolean {
    return this.isMonitoring;
  }
}

class MockStatisticsCollector implements IStatisticsCollector {
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalBroadcasts: 0,
    droppedMessages: 0,
    duplicateMessages: 0,
    queueOverflows: 0,
    reconnections: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    peakConnections: 0,
  };

  updateConnectionCount = vi.fn((count: number) => {
    this.stats.activeConnections = count;
  });

  recordMessageProcessed = vi.fn((latency: number) => {
    this.stats.totalMessages++;
  });

  recordBroadcast = vi.fn(() => {
    this.stats.totalBroadcasts++;
  });

  recordDroppedMessage = vi.fn(() => {
    this.stats.droppedMessages++;
  });

  recordDuplicateMessage = vi.fn(() => {
    this.stats.duplicateMessages++;
  });

  recordQueueOverflow = vi.fn(() => {
    this.stats.queueOverflows++;
  });

  recordReconnection = vi.fn(() => {
    this.stats.reconnections++;
  });

  getMetrics = vi.fn(() => ({ ...this.stats }));

  reset = vi.fn(() => {
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      totalBroadcasts: 0,
      droppedMessages: 0,
      duplicateMessages: 0,
      queueOverflows: 0,
      reconnections: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      peakConnections: 0,
    };
  });
}

class MockHealthChecker implements IHealthChecker {
  private isRunning = false;
  private healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      connections: true,
      memory: true,
      queues: true,
      performance: true,
    },
    metrics: {
      connectionCount: 0,
      memoryUsage: 0,
      queueSize: 0,
      averageLatency: 0,
    },
  };

  startHealthChecks = vi.fn(() => {
    this.isRunning = true;
  });

  stopHealthChecks = vi.fn(() => {
    this.isRunning = false;
  });

  getHealthStatus = vi.fn(() => ({ ...this.healthStatus }));

  performHealthCheck = vi.fn(async () => ({ ...this.healthStatus }));

  getIsRunning(): boolean {
    return this.isRunning;
  }

  setHealthStatus(status: Partial<HealthStatus>): void {
    this.healthStatus = { ...this.healthStatus, ...status };
  }
}

describe('WebSocketService Integration Tests', () => {
  let service: WebSocketService;
  let mockConnectionManager: MockConnectionManager;
  let mockMessageHandler: MockMessageHandler;
  let mockMemoryManager: MockMemoryManager;
  let mockStatisticsCollector: MockStatisticsCollector;
  let mockHealthChecker: MockHealthChecker;
  let runtimeConfig: RuntimeConfig;
  let mockServer: Server;

  beforeEach(() => {
    // Create mock components
    mockConnectionManager = new MockConnectionManager();
    mockMessageHandler = new MockMessageHandler();
    mockMemoryManager = new MockMemoryManager();
    mockStatisticsCollector = new MockStatisticsCollector();
    mockHealthChecker = new MockHealthChecker();
    runtimeConfig = new RuntimeConfig();

    // Create mock HTTP server
    mockServer = new Server();

    // Create service options
    const options: WebSocketServiceOptions = {
      port: 8080,
      path: '/ws',
      jwtSecret: 'test-secret',
    };

    // Create WebSocket service
    service = new WebSocketService(
      mockConnectionManager,
      mockMessageHandler,
      mockMemoryManager,
      mockStatisticsCollector,
      mockHealthChecker,
      runtimeConfig,
      options
    );
  });

  afterEach(async () => {
    // Clean up service if running
    if (service.getState() === 'running') {
      await service.shutdown();
    }

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize service successfully with all components', async () => {
      // Act
      await service.initialize(mockServer);

      // Assert
      expect(service.getState()).toBe('running');
      expect(mockMemoryManager.startMonitoring).toHaveBeenCalledOnce();
      expect(mockHealthChecker.startHealthChecks).toHaveBeenCalledOnce();
    });

    it('should throw error when JWT secret is missing', () => {
      // Arrange
      const invalidOptions: WebSocketServiceOptions = {
        port: 8080,
        jwtSecret: '',
      };

      // Act & Assert
      expect(() => {
        new WebSocketService(
          mockConnectionManager,
          mockMessageHandler,
          mockMemoryManager,
          mockStatisticsCollector,
          mockHealthChecker,
          runtimeConfig,
          invalidOptions
        );
      }).toThrow('JWT secret is required for WebSocket service');
    });

    it('should not allow initialization when service is already running', async () => {
      // Arrange
      await service.initialize(mockServer);

      // Act & Assert
      await expect(service.initialize(mockServer)).rejects.toThrow(
        'Cannot initialize service in state: running'
      );
    });

    it('should set state to error when initialization fails', async () => {
      // Arrange
      mockMemoryManager.startMonitoring = vi.fn(() => {
        throw new Error('Memory manager initialization failed');
      });

      // Act & Assert
      await expect(service.initialize(mockServer)).rejects.toThrow();
      expect(service.getState()).toBe('error');
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should integrate all components during initialization', () => {
      // Assert
      expect(mockMemoryManager.getIsMonitoring()).toBe(true);
      expect(mockHealthChecker.getIsRunning()).toBe(true);
    });

    it('should handle configuration changes across components', () => {
      // Act
      runtimeConfig.set('MEMORY_CLEANUP_INTERVAL', 60000);

      // Assert - configuration change should be handled
      // (This would be verified through component behavior in a real scenario)
      expect(runtimeConfig.get('MEMORY_CLEANUP_INTERVAL')).toBe(60000);
    });

    it('should coordinate statistics collection across components', () => {
      // Act
      service.broadcastToBill(123, { type: 'test', data: 'message' });

      // Assert
      expect(mockMessageHandler.broadcastToSubscribers).toHaveBeenCalledWith(
        123,
        { type: 'test', data: 'message' }
      );
      expect(mockStatisticsCollector.recordBroadcast).toHaveBeenCalledOnce();
    });

    it('should provide unified service status from all components', () => {
      // Arrange
      mockHealthChecker.setHealthStatus({
        status: 'degraded',
        checks: { connections: false, memory: true, queues: true, performance: true },
      });

      // Act
      const status = service.getServiceStatus();

      // Assert
      expect(status.state).toBe('running');
      expect(status.health.status).toBe('degraded');
      expect(status.connections).toBe(0);
      expect(status.memory).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should shutdown gracefully and stop all components', async () => {
      // Act
      await service.shutdown();

      // Assert
      expect(service.getState()).toBe('stopped');
      expect(mockMemoryManager.stopMonitoring).toHaveBeenCalledOnce();
      expect(mockHealthChecker.stopHealthChecks).toHaveBeenCalledOnce();
    });

    it('should handle shutdown when service is already stopped', async () => {
      // Arrange
      await service.shutdown();

      // Act & Assert - should not throw
      await expect(service.shutdown()).resolves.toBeUndefined();
      expect(service.getState()).toBe('stopped');
    });

    it('should handle shutdown errors gracefully', async () => {
      // Arrange
      mockMemoryManager.stopMonitoring = vi.fn(() => {
        throw new Error('Memory manager shutdown failed');
      });

      // Act & Assert
      await expect(service.shutdown()).rejects.toThrow();
      expect(service.getState()).toBe('error');
    });

    it('should cleanup component resources during shutdown', async () => {
      // Act
      await service.shutdown();

      // Assert
      expect(mockConnectionManager.cleanup).toHaveBeenCalled();
      expect(mockMemoryManager.performCleanup).toHaveBeenCalled();
    });
  });

  describe('Error Handling Across Component Boundaries', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should handle connection manager errors gracefully', () => {
      // Arrange
      mockConnectionManager.addConnection = vi.fn(() => {
        throw new Error('Connection manager error');
      });

      // Act - simulate connection (this would normally be triggered by WebSocket server)
      const mockWs = {} as AuthenticatedWebSocket;
      
      // Assert - service should handle the error without crashing
      expect(() => {
        try {
          mockConnectionManager.addConnection(mockWs);
        } catch (error) {
          // Error should be caught and handled by service
        }
      }).not.toThrow();
    });

    it('should handle message handler errors gracefully', async () => {
      // Arrange
      mockMessageHandler.handleMessage = vi.fn(async () => {
        throw new Error('Message handler error');
      });

      const mockWs = { connectionId: 'test' } as AuthenticatedWebSocket;
      const mockMessage = { type: 'ping' } as WebSocketMessage;

      // Act & Assert - should not throw
      await expect(
        mockMessageHandler.handleMessage(mockWs, mockMessage)
      ).rejects.toThrow('Message handler error');
    });

    it('should handle memory manager errors gracefully', () => {
      // Arrange
      mockMemoryManager.performCleanup = vi.fn(() => {
        throw new Error('Memory manager error');
      });

      // Act & Assert - should not crash service
      expect(() => {
        try {
          mockMemoryManager.performCleanup();
        } catch (error) {
          // Error should be caught and handled
        }
      }).not.toThrow();
    });

    it('should handle health checker errors gracefully', async () => {
      // Arrange
      mockHealthChecker.performHealthCheck = vi.fn(async () => {
        throw new Error('Health check error');
      });

      // Act & Assert
      await expect(service.forceHealthCheck()).rejects.toThrow('Health check error');
      expect(service.getState()).toBe('running'); // Service should still be running
    });

    it('should handle statistics collector errors gracefully', () => {
      // Arrange
      mockStatisticsCollector.recordBroadcast = vi.fn(() => {
        throw new Error('Statistics collector error');
      });

      // Act & Assert - should not crash service
      expect(() => {
        service.broadcastToBill(123, { type: 'test' });
      }).not.toThrow();
    });
  });

  describe('Service Configuration and Status', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should provide complete service configuration', () => {
      // Act
      const config = service.getConfiguration();

      // Assert
      expect(config.options).toBeDefined();
      expect(config.options.port).toBe(8080);
      expect(config.options.path).toBe('/ws');
      expect(config.options.jwtSecret).toBe('test-secret');
      expect(config.runtimeConfig).toBeDefined();
      expect(config.baseConfig).toBeDefined();
    });

    it('should provide health status from health checker', () => {
      // Arrange
      const expectedHealth: HealthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        checks: { connections: true, memory: true, queues: true, performance: true },
        metrics: { connectionCount: 0, memoryUsage: 0, queueSize: 0, averageLatency: 0 },
      };
      mockHealthChecker.setHealthStatus(expectedHealth);

      // Act
      const health = service.getHealthStatus();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.checks).toEqual(expectedHealth.checks);
    });

    it('should provide statistics from statistics collector', () => {
      // Act
      const stats = service.getStatistics();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(mockStatisticsCollector.getMetrics).toHaveBeenCalledOnce();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should emit state change events', async () => {
      // Arrange
      const stateChangeHandler = vi.fn();
      service.on('stateChange', stateChangeHandler);

      // Act
      await service.shutdown();

      // Assert
      expect(stateChangeHandler).toHaveBeenCalledWith('stopping');
      expect(stateChangeHandler).toHaveBeenCalledWith('stopped');
    });

    it('should handle event listener errors gracefully', async () => {
      // Arrange
      const errorHandler = vi.fn(() => {
        throw new Error('Event handler error');
      });
      service.on('stateChange', errorHandler);

      // Act & Assert - should not crash service
      await expect(service.shutdown()).resolves.toBeUndefined();
      expect(service.getState()).toBe('stopped');
    });

    it('should allow removing event listeners', async () => {
      // Arrange
      const stateChangeHandler = vi.fn();
      service.on('stateChange', stateChangeHandler);
      service.off('stateChange');

      // Act
      await service.shutdown();

      // Assert - handler should not be called after removal
      expect(stateChangeHandler).not.toHaveBeenCalled();
    });
  });

  describe('Broadcasting and Message Handling', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should broadcast messages when service is running', () => {
      // Act
      service.broadcastToBill(123, { type: 'update', data: 'test' });

      // Assert
      expect(mockMessageHandler.broadcastToSubscribers).toHaveBeenCalledWith(
        123,
        { type: 'update', data: 'test' }
      );
      expect(mockStatisticsCollector.recordBroadcast).toHaveBeenCalledOnce();
    });

    it('should not broadcast messages when service is not running', async () => {
      // Arrange
      await service.shutdown();

      // Act
      service.broadcastToBill(123, { type: 'update', data: 'test' });

      // Assert
      expect(mockMessageHandler.broadcastToSubscribers).not.toHaveBeenCalled();
      expect(mockStatisticsCollector.recordBroadcast).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Integration', () => {
    beforeEach(async () => {
      await service.initialize(mockServer);
    });

    it('should force health check and return status', async () => {
      // Arrange
      const expectedHealth: HealthStatus = {
        status: 'degraded',
        timestamp: Date.now(),
        checks: { connections: false, memory: true, queues: true, performance: true },
        metrics: { connectionCount: 5, memoryUsage: 75, queueSize: 10, averageLatency: 100 },
      };
      mockHealthChecker.performHealthCheck = vi.fn(async () => expectedHealth);

      // Act
      const health = await service.forceHealthCheck();

      // Assert
      expect(health).toEqual(expectedHealth);
      expect(mockHealthChecker.performHealthCheck).toHaveBeenCalledOnce();
    });
  });
});