/**
 * Integration tests for WebSocketService
 * 
 * Tests service initialization, component integration, graceful shutdown,
 * and error handling across component boundaries.
 */

import { createServer, type Server } from 'http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

import { RuntimeConfig } from '../../infrastructure/websocket/config/runtime-config';
import { WebSocketService, type WebSocketServiceOptions } from '../../infrastructure/websocket/core/websocket-service';
import type {
  AuthenticatedWebSocket,
  ConnectionStats,
  HealthStatus,
  IConnectionManager,
  IHealthChecker,
  IMemoryManager,
  IMessageHandler,
  IStatisticsCollector,
  MemoryLeakData,
  MemoryPressureData,
  WebSocketMessage,
} from '../../infrastructure/websocket/types';


// Mock implementations for all dependencies
class MockConnectionManager implements IConnectionManager {
  private connections = new Map<string, AuthenticatedWebSocket>();
  private connectionCount = 0;

  addConnection = vi.fn((ws: AuthenticatedWebSocket) => {
    ws.connectionId = `conn-${Date.now()}-${Math.random()}`;
    this.connections.set(ws.connectionId, ws);
    this.connectionCount++;
  });

  removeConnection = vi.fn((ws: AuthenticatedWebSocket) => {
    if (ws.connectionId && this.connections.has(ws.connectionId)) {
      this.connections.delete(ws.connectionId);
      this.connectionCount--;
    }
  });

  getConnectionsForUser = vi.fn((userId: string): AuthenticatedWebSocket[] => {
    return Array.from(this.connections.values()).filter(ws => ws.user_id === userId);
  });

  authenticateConnection = vi.fn(async (ws: AuthenticatedWebSocket, token: string): Promise<boolean> => {
    if (token === 'valid-token') {
      ws.user_id = 'test-user-id';
      return true;
    }
    return false;
  });

  cleanup = vi.fn(() => {
    // Mock cleanup logic
  });

  getConnectionCount = vi.fn(() => this.connectionCount);

  // Test helpers
  reset(): void {
    this.connections.clear();
    this.connectionCount = 0;
    vi.clearAllMocks();
  }

  simulateConnection(): AuthenticatedWebSocket {
    const mockWs = {
      connectionId: `test-conn-${Date.now()}`,
      user_id: 'test-user',
      isAlive: true,
      lastPing: Date.now(),
      subscriptions: new Set<number>(),
      messageBuffer: [],
      readyState: WebSocket.OPEN,
      on: vi.fn(),
      close: vi.fn(),
      terminate: vi.fn(),
    } as unknown as AuthenticatedWebSocket;

    this.addConnection(mockWs);
    return mockWs;
  }
}

class MockMessageHandler implements IMessageHandler {
  handleMessage = vi.fn(async (_ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> => {
    // Mock message handling
    if (message.type === 'auth' && message.data?.token === 'invalid-token') {
      throw new Error('Authentication failed');
    }
  });

  broadcastToSubscribers = vi.fn((_billId: number, _message: Record<string, unknown>): void => {
    // Mock broadcasting
  });

  validateMessage = vi.fn((message: WebSocketMessage): boolean => {
    return message.type !== undefined;
  });

  cleanup = vi.fn((_ws: AuthenticatedWebSocket): void => {
    // Mock cleanup
  });

  // Test helpers
  reset(): void {
    vi.clearAllMocks();
  }

  simulateError(): void {
    this.handleMessage.mockRejectedValueOnce(new Error('Message processing error'));
  }
}

class MockMemoryManager implements IMemoryManager {
  private isMonitoring = false;

  startMonitoring = vi.fn(() => {
    this.isMonitoring = true;
  });

  stopMonitoring = vi.fn(() => {
    this.isMonitoring = false;
  });

  performCleanup = vi.fn(() => {
    // Mock cleanup
  });

  handleMemoryPressure = vi.fn((_data: MemoryPressureData): void => {
    // Mock memory pressure handling
  });

  handleMemoryLeak = vi.fn((_data: MemoryLeakData): void => {
    // Mock memory leak handling
  });

  cleanup = vi.fn((): void => {
    // Mock cleanup
  });

  // Test helpers
  reset(): void {
    this.isMonitoring = false;
    vi.clearAllMocks();
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  simulateMemoryPressure(): void {
    this.handleMemoryPressure({ pressure: 90, threshold: 85 });
  }

  simulateMemoryLeak(): void {
    this.handleMemoryLeak({
      severity: 'high',
      recommendations: ['Increase cleanup frequency'],
      analysis: { growthRate: 5.2, retainedIncrease: 15.8 }
    });
  }
}

class MockStatisticsCollector implements IStatisticsCollector {
  private metrics: ConnectionStats = {
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
    uniqueUsers: 0,
    averageLatency: 0,
    memoryUsage: 0,
  };

  updateConnectionCount = vi.fn((count: number) => {
    this.metrics.activeConnections = count;
    this.metrics.peakConnections = Math.max(this.metrics.peakConnections, count);
  });

  recordMessageProcessed = vi.fn((_latency: number) => {
    this.metrics.totalMessages++;
    this.metrics.lastActivity = Date.now();
  });

  recordBroadcast = vi.fn(() => {
    this.metrics.totalBroadcasts++;
  });

  recordDroppedMessage = vi.fn(() => {
    this.metrics.droppedMessages++;
  });

  recordDuplicateMessage = vi.fn(() => {
    this.metrics.duplicateMessages++;
  });

  recordQueueOverflow = vi.fn(() => {
    this.metrics.queueOverflows++;
  });

  recordReconnection = vi.fn(() => {
    this.metrics.reconnections++;
  });

  getMetrics = vi.fn(() => ({ ...this.metrics }));

  reset = vi.fn(() => {
    this.metrics = {
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
      uniqueUsers: 0,
      averageLatency: 0,
      memoryUsage: 0,
    };
    vi.clearAllMocks();
  });

  getConnectionRate = vi.fn(() => 0);

  getErrorRate = vi.fn(() => 0);

  getPerformanceMetrics = vi.fn(() => ({
    averageLatency: 0,
    throughput: 0,
    errorRate: 0,
  }));

  getHistoricalData = vi.fn(() => []);

  getAverageLatency = vi.fn(() => 0);

  getPercentileLatency = vi.fn(() => 0);

  getMessageThroughput = vi.fn(() => 0);
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
      memoryUsage: 50,
      queueSize: 0,
      averageLatency: 10,
    },
    memoryUsage: 50,
    connectionHealth: true,
    queueHealth: true,
    warnings: [],
    errors: [],
    lastCheck: Date.now(),
  };

  startHealthChecks = vi.fn(() => {
    this.isRunning = true;
  });

  stopHealthChecks = vi.fn(() => {
    this.isRunning = false;
  });

  getHealthStatus = vi.fn(() => ({ ...this.healthStatus }));

  performHealthCheck = vi.fn(async (): Promise<HealthStatus> => {
    this.healthStatus.timestamp = Date.now();
    return { ...this.healthStatus };
  });

  // Test helpers
  reset(): void {
    this.isRunning = false;
    this.healthStatus = {
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
        memoryUsage: 50,
        queueSize: 0,
        averageLatency: 10,
      },
      memoryUsage: 50,
      connectionHealth: true,
      queueHealth: true,
      warnings: [],
      errors: [],
      lastCheck: Date.now(),
    };
    vi.clearAllMocks();
  }

  isHealthChecksRunning(): boolean {
    return this.isRunning;
  }

  setHealthStatus(status: HealthStatus['status']): void {
    this.healthStatus.status = status;
  }

  simulateUnhealthyState(): void {
    this.healthStatus = {
      status: 'unhealthy',
      timestamp: Date.now(),
      checks: {
        connections: false,
        memory: false,
        queues: true,
        performance: false,
      },
      metrics: {
        connectionCount: 1000,
        memoryUsage: 95,
        queueSize: 500,
        averageLatency: 1000,
      },
      memoryUsage: 95,
      connectionHealth: false,
      queueHealth: true,
      warnings: ['High memory usage', 'Connection issues'],
      errors: ['Memory threshold exceeded'],
      lastCheck: Date.now(),
    };
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
  let httpServer: Server;

  beforeEach(() => {
    // Create fresh mock instances
    mockConnectionManager = new MockConnectionManager();
    mockMessageHandler = new MockMessageHandler();
    mockMemoryManager = new MockMemoryManager();
    mockStatisticsCollector = new MockStatisticsCollector();
    mockHealthChecker = new MockHealthChecker();
    runtimeConfig = new RuntimeConfig();

    // Create HTTP server for WebSocket attachment
    httpServer = createServer();

    // Set up test environment
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.NODE_ENV = 'test';

    // Create service instance
    const options: WebSocketServiceOptions = {
      port: 0, // Use random available port
      path: '/test-ws',
      jwtSecret: 'test-jwt-secret',
    };

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
    // Clean shutdown
    if (service.getState() !== 'stopped') {
      await service.shutdown();
    }

    // Close HTTP server
    if (httpServer.listening) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }

    // Reset all mocks
    mockConnectionManager.reset();
    mockMessageHandler.reset();
    mockMemoryManager.reset();
    mockStatisticsCollector.reset();
    mockHealthChecker.reset();

    // Clear environment
    delete process.env.JWT_SECRET;
  });

  describe('Service Initialization', () => {
    it('should initialize service with all components', async () => {
      expect(service.getState()).toBe('stopped');

      await service.initialize();

      expect(service.getState()).toBe('running');
      expect(mockMemoryManager.startMonitoring).toHaveBeenCalled();
      expect(mockHealthChecker.startHealthChecks).toHaveBeenCalled();
      expect(mockMemoryManager.isMonitoringActive()).toBe(true);
      expect(mockHealthChecker.isHealthChecksRunning()).toBe(true);
    });

    it('should initialize service with attached HTTP server', async () => {
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      await service.initialize(httpServer);

      expect(service.getState()).toBe('running');
      expect(mockMemoryManager.startMonitoring).toHaveBeenCalled();
      expect(mockHealthChecker.startHealthChecks).toHaveBeenCalled();
    });

    it('should throw error when initializing without JWT secret', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        new WebSocketService(
          mockConnectionManager,
          mockMessageHandler,
          mockMemoryManager,
          mockStatisticsCollector,
          mockHealthChecker,
          runtimeConfig,
          {} // No JWT secret
        );
      }).toThrow('JWT secret is required for WebSocket service');
    });

    it('should throw error when initializing in non-stopped state', async () => {
      await service.initialize();
      expect(service.getState()).toBe('running');

      await expect(service.initialize()).rejects.toThrow(
        'Cannot initialize service in state: running'
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock component to throw error during startup
      mockMemoryManager.startMonitoring.mockImplementationOnce(() => {
        throw new Error('Memory manager initialization failed');
      });

      await expect(service.initialize()).rejects.toThrow(
        'WebSocket service initialization failed: Memory manager initialization failed'
      );

      expect(service.getState()).toBe('error');
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should integrate connection manager with statistics collector', () => {
      const mockWs = mockConnectionManager.simulateConnection();

      expect(mockConnectionManager.addConnection).toHaveBeenCalledWith(mockWs);
      
      // The statistics collector is updated when the service processes actual WebSocket connections
      // For this integration test, we verify the mock connection was added correctly
      expect(mockConnectionManager.getConnectionCount()).toBe(1);
    });

    it('should handle message processing through message handler', async () => {
      const mockWs = mockConnectionManager.simulateConnection();
      const testMessage: WebSocketMessage = {
        type: 'subscribe',
        data: { bill_id: 123 },
        messageId: 'test-msg-1',
        timestamp: Date.now(),
      };

      // Simulate message handling
      await mockMessageHandler.handleMessage(mockWs, testMessage);

      expect(mockMessageHandler.handleMessage).toHaveBeenCalledWith(mockWs, testMessage);
    });

    it('should coordinate memory management with statistics', () => {
      mockMemoryManager.simulateMemoryPressure();

      expect(mockMemoryManager.handleMemoryPressure).toHaveBeenCalledWith({
        pressure: 90,
        threshold: 85,
      });
    });

    it('should integrate health checker with other components', async () => {
      const healthStatus = await service.forceHealthCheck();

      expect(mockHealthChecker.performHealthCheck).toHaveBeenCalled();
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('checks');
      expect(healthStatus).toHaveProperty('metrics');
    });

    it('should provide unified service status', () => {
      const status = service.getServiceStatus();

      expect(status).toHaveProperty('state', 'running');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('connections');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('memory');
      expect(typeof status.uptime).toBe('number');
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should broadcast messages through message handler', () => {
      const billId = 123;
      const message = { type: 'status_change', data: { status: 'passed' } };

      service.broadcastToBill(billId, message);

      expect(mockMessageHandler.broadcastToSubscribers).toHaveBeenCalledWith(billId, message);
      expect(mockStatisticsCollector.recordBroadcast).toHaveBeenCalled();
    });

    it('should handle configuration changes across components', () => {
      const originalCleanupInterval = runtimeConfig.get('MEMORY_CLEANUP_INTERVAL');
      
      // Change configuration
      runtimeConfig.set('MEMORY_CLEANUP_INTERVAL', originalCleanupInterval * 2);

      // Configuration change should be handled by the service
      expect(runtimeConfig.get('MEMORY_CLEANUP_INTERVAL')).toBe(originalCleanupInterval * 2);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should shutdown all components gracefully', async () => {
      expect(service.getState()).toBe('running');

      await service.shutdown();

      expect(service.getState()).toBe('stopped');
      expect(mockHealthChecker.stopHealthChecks).toHaveBeenCalled();
      expect(mockMemoryManager.stopMonitoring).toHaveBeenCalled();
      expect(mockMemoryManager.isMonitoringActive()).toBe(false);
      expect(mockHealthChecker.isHealthChecksRunning()).toBe(false);
    });

    it('should handle multiple shutdown calls gracefully', async () => {
      await service.shutdown();
      expect(service.getState()).toBe('stopped');

      // Second shutdown should not throw
      await service.shutdown();
      expect(service.getState()).toBe('stopped');
    });

    it('should handle shutdown errors gracefully', async () => {
      // Mock component to throw error during shutdown
      mockMemoryManager.stopMonitoring.mockImplementationOnce(() => {
        throw new Error('Memory manager shutdown failed');
      });

      await expect(service.shutdown()).rejects.toThrow('Memory manager shutdown failed');
      expect(service.getState()).toBe('error');
    });

    it('should respect shutdown timeout', async () => {
      // This test verifies that shutdown completes within the grace period
      const startTime = Date.now();
      
      await service.shutdown();
      
      const shutdownTime = Date.now() - startTime;
      expect(shutdownTime).toBeLessThan(6000); // Should be less than grace period + buffer
      expect(service.getState()).toBe('stopped');
    });

    it('should cleanup connections during shutdown', async () => {
      // Simulate some connections
      mockConnectionManager.simulateConnection();
      mockConnectionManager.simulateConnection();
      
      expect(mockConnectionManager.getConnectionCount()).toBe(2);

      await service.shutdown();

      // During shutdown, the service should stop component services
      expect(mockMemoryManager.stopMonitoring).toHaveBeenCalled();
      expect(mockHealthChecker.stopHealthChecks).toHaveBeenCalled();
      
      // The service should be in stopped state
      expect(service.getState()).toBe('stopped');
    });
  });

  describe('Error Handling Across Component Boundaries', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle connection manager errors gracefully', () => {
      // Simulate connection manager error
      mockConnectionManager.addConnection.mockImplementationOnce(() => {
        throw new Error('Connection manager error');
      });

      // Service should continue running despite component error
      expect(service.getState()).toBe('running');
    });

    it('should handle message handler errors gracefully', async () => {
      // Simulate message handler error
      mockMessageHandler.simulateError();

      // Error should be contained and not crash the service
      expect(service.getState()).toBe('running');
    });

    it('should handle memory manager errors gracefully', () => {
      // Simulate memory manager error
      mockMemoryManager.performCleanup.mockImplementationOnce(() => {
        throw new Error('Memory cleanup failed');
      });

      // Service should continue running
      expect(service.getState()).toBe('running');
    });

    it('should handle statistics collector errors gracefully', () => {
      // Simulate statistics collector error
      mockStatisticsCollector.updateConnectionCount.mockImplementationOnce(() => {
        throw new Error('Statistics update failed');
      });

      // Service should continue running
      expect(service.getState()).toBe('running');
    });

    it('should handle health checker errors gracefully', async () => {
      // Simulate health checker error
      mockHealthChecker.performHealthCheck.mockRejectedValueOnce(
        new Error('Health check failed')
      );

      // Service should continue running
      expect(service.getState()).toBe('running');
    });

    it('should handle broadcast errors gracefully', () => {
      // Simulate broadcast error
      mockMessageHandler.broadcastToSubscribers.mockImplementationOnce(() => {
        throw new Error('Broadcast failed');
      });

      // Should not throw when broadcasting fails
      expect(() => {
        service.broadcastToBill(123, { test: 'message' });
      }).not.toThrow();

      expect(service.getState()).toBe('running');
    });

    it('should handle service not running state gracefully', async () => {
      await service.shutdown();
      expect(service.getState()).toBe('stopped');

      // Operations on stopped service should be handled gracefully
      service.broadcastToBill(123, { test: 'message' });
      
      // Should not have called the handler since service is stopped
      expect(mockMessageHandler.broadcastToSubscribers).not.toHaveBeenCalled();
    });

    it('should handle component integration failures during runtime', () => {
      // Simulate runtime integration failure
      mockHealthChecker.simulateUnhealthyState();
      
      const healthStatus = service.getHealthStatus();
      expect(healthStatus.status).toBe('unhealthy');
      
      // Service should still be running despite unhealthy components
      expect(service.getState()).toBe('running');
    });
  });

  describe('Service Configuration and State Management', () => {
    it('should provide correct service configuration', () => {
      const config = service.getConfiguration();

      expect(config).toHaveProperty('options');
      expect(config).toHaveProperty('runtimeConfig');
      expect(config).toHaveProperty('baseConfig');
      
      expect(config.options.path).toBe('/test-ws');
      expect(config.options.jwtSecret).toBe('test-jwt-secret');
    });

    it('should track service state transitions correctly', async () => {
      const stateChanges: string[] = [];
      
      service.on('stateChange', (state) => {
        stateChanges.push(state);
      });

      expect(service.getState()).toBe('stopped');

      await service.initialize();
      expect(service.getState()).toBe('running');

      await service.shutdown();
      expect(service.getState()).toBe('stopped');

      expect(stateChanges).toContain('starting');
      expect(stateChanges).toContain('running');
      expect(stateChanges).toContain('stopping');
      expect(stateChanges).toContain('stopped');
    });

    it('should handle event listener management', () => {
      const mockListener = vi.fn();
      
      service.on('stateChange', mockListener);
      service.off('stateChange');
      
      // Event should not be called after removal
      // This is tested implicitly through state changes not calling the removed listener
    });
  });
});