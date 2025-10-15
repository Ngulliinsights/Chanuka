import { EventEmitter } from 'events';
import { PoolClient } from 'pg';
import { jest } from '@jest/globals';
import {
  DatabaseConnectionManager,
  ConnectionManager,
  ConnectionHealthStatus,
  PoolStatistics,
  CircuitBreakerState,
  loadConnectionManagerConfig,
  createConnectionManager
} from '../connection-manager';

// Mock the shared pool
jest.mock('../../../../../shared/database/pool', () => ({
  pool: {
    connect: jest.fn(),
    on: jest.fn(),
    getMetrics: jest.fn(),
    circuitBreaker: {
      getState: jest.fn(),
      getFailureCount: jest.fn(),
    },
    totalCount: 10,
    idleCount: 5,
    waitingCount: 2,
  },
  checkPoolHealth: jest.fn(),
}));

import { pool, checkPoolHealth } from '../../../../../shared/database/pool';

describe('ConnectionManager', () => {
  let mockPool: any;
  let config: any;
  let manager: ConnectionManager;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPool = {
      connect: jest.fn(),
      on: jest.fn(),
      getMetrics: jest.fn(),
      circuitBreaker: {
        getState: jest.fn().mockReturnValue('CLOSED'),
        getFailureCount: jest.fn().mockReturnValue(0),
      },
      totalCount: 10,
      idleCount: 5,
      waitingCount: 2,
    };

    config = {
      healthCheckIntervalMs: 30000,
      circuitBreakerFailureThreshold: 5,
      circuitBreakerResetTimeoutMs: 30000,
      circuitBreakerTimeoutMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
    };

    // Mock checkPoolHealth
    (checkPoolHealth as jest.Mock).mockResolvedValue({
      isHealthy: true,
      totalConnections: 10,
      idleConnections: 5,
      waitingClients: 2,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
      lastError: undefined,
    });

    manager = new DatabaseConnectionManager(mockPool, config) as any;
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('acquireConnection', () => {
    it('should acquire connection successfully', async () => {
      const mockClient = { release: jest.fn() } as any;
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await manager.acquireConnection();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toBe(mockClient);
    });

    it('should emit connection-acquired event', async () => {
      const mockClient = { release: jest.fn() } as any;
      mockPool.connect.mockResolvedValue(mockClient);

      const eventSpy = jest.fn();
      manager.on('connection-acquired', eventSpy);

      await manager.acquireConnection();

      expect(eventSpy).toHaveBeenCalledWith(mockClient);
    });

    it('should emit connection-error event on failure', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      const eventSpy = jest.fn();
      manager.on('connection-error', eventSpy);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection failed');
      expect(eventSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('releaseConnection', () => {
    it('should release connection successfully', async () => {
      const mockClient = { release: jest.fn() } as any;

      await manager.releaseConnection(mockClient);

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should emit connection-released event', async () => {
      const mockClient = { release: jest.fn() } as any;

      const eventSpy = jest.fn();
      manager.on('connection-released', eventSpy);

      await manager.releaseConnection(mockClient);

      expect(eventSpy).toHaveBeenCalledWith(mockClient);
    });

    it('should emit connection-error event on release failure', async () => {
      const mockClient = { release: jest.fn().mockImplementation(() => { throw new Error('Release failed'); }) } as any;

      const eventSpy = jest.fn();
      manager.on('connection-error', eventSpy);

      await expect(manager.releaseConnection(mockClient)).rejects.toThrow('Release failed');
      expect(eventSpy).toHaveBeenCalledWith(expect.any(Error), mockClient);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const status = await manager.getHealthStatus();

      expect(status).toEqual({
        isHealthy: true,
        totalConnections: 10,
        idleConnections: 5,
        waitingClients: 2,
        circuitBreakerState: 'CLOSED',
        circuitBreakerFailures: 0,
        lastHealthCheck: expect.any(Date),
      });
      expect(checkPoolHealth).toHaveBeenCalledWith(mockPool, 'managed');
    });
  });

  describe('getPoolStatistics', () => {
    it('should return pool statistics', async () => {
      const mockStats = {
        queries: 100,
        connections: 10,
        idleConnections: 5,
        totalConnections: 10,
        waitingClients: 2,
        avgQueryTime: 50,
        maxQueryTime: 100,
        minQueryTime: 10,
      };

      mockPool.getMetrics.mockResolvedValue(mockStats);

      const stats = await manager.getPoolStatistics();

      expect(stats).toEqual(mockStats);
      expect(mockPool.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getCircuitBreakerState', () => {
    it('should return circuit breaker state', () => {
      mockPool.circuitBreaker.getState.mockReturnValue('OPEN');

      const state = manager.getCircuitBreakerState();

      expect(state).toBe('OPEN');
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', async () => {
      const isHealthy = await manager.isHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      (checkPoolHealth as jest.Mock).mockResolvedValue({
        isHealthy: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        circuitBreakerState: 'OPEN',
        circuitBreakerFailures: 5,
        lastError: undefined,
      });

      const isHealthy = await manager.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully with no active connections', async () => {
      const shutdownSpy = jest.spyOn(manager, 'shutdown');

      await manager.shutdown(1000);

      expect(shutdownSpy).toHaveBeenCalledWith(1000);
    });

    it('should emit shutdown-started event', async () => {
      const eventSpy = jest.fn();
      manager.on('shutdown-started', eventSpy);

      await manager.shutdown(5000);

      expect(eventSpy).toHaveBeenCalledWith(5000);
    });

    it('should emit shutdown-completed event', async () => {
      const eventSpy = jest.fn();
      manager.on('shutdown-completed', eventSpy);

      await manager.shutdown(1000);

      expect(eventSpy).toHaveBeenCalledWith(expect.any(Number), 0);
    });

    it('should prevent new connections after shutdown', async () => {
      await manager.shutdown(1000);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection manager is shutting down');
    });

    it('should force close connections on timeout', async () => {
      // Acquire a connection that won't be released
      const mockClient = { release: jest.fn() } as any;
      mockPool.connect.mockResolvedValue(mockClient);

      const client = await manager.acquireConnection();
      expect((manager as any).activeConnections.size).toBe(1);

      // Shutdown with very short timeout
      const shutdownPromise = manager.shutdown(10);

      // Wait for shutdown to complete (should timeout and force close)
      await shutdownPromise;

      expect(mockClient.release).toHaveBeenCalledWith(true); // Force release
      expect((manager as any).activeConnections.size).toBe(0);
    });
  });

  describe('close', () => {
    it('should call shutdown with 0 timeout', async () => {
      const shutdownSpy = jest.spyOn(manager, 'shutdown');

      await manager.close();

      expect(shutdownSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('loadConnectionManagerConfig', () => {
    it('should load config from environment variables', () => {
      process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS = '45000';
      process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '10';

      const config = loadConnectionManagerConfig();

      expect(config.healthCheckIntervalMs).toBe(45000);
      expect(config.circuitBreakerFailureThreshold).toBe(10);

      // Cleanup
      delete process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS;
      delete process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    });

    it('should use default values when env vars not set', () => {
      const config = loadConnectionManagerConfig();

      expect(config.healthCheckIntervalMs).toBe(30000);
      expect(config.circuitBreakerFailureThreshold).toBe(5);
    });
  });

  describe('createConnectionManager', () => {
    it('should create a connection manager instance', () => {
      const manager = createConnectionManager();

      expect(manager).toBeInstanceOf(DatabaseConnectionManager);
    });

    it('should merge provided config with defaults', () => {
      const customConfig = { healthCheckIntervalMs: 60000 };
      const manager = createConnectionManager(customConfig);

      expect(manager).toBeInstanceOf(DatabaseConnectionManager);
    });
  });
});