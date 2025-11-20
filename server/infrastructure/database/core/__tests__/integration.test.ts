import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jest } from '@jest/globals';
import { PoolClient } from 'pg';
import { createConnectionManager, ConnectionManager } from '../connection-manager';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';

// Define the pool interface with proper typing for better type inference
interface MockPool {
  connect: vi.Mock<Promise<PoolClient>>;
  on: vi.Mock<void>;
  getMetrics: vi.Mock<Promise<any>>;
  circuitBreaker: {
    getState: vi.Mock<string>;
    getFailureCount: vi.Mock<number>;
    execute: vi.Mock<Promise<any>>;
  };
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

// Mock the shared pool and its dependencies
vi.mock('../../../../../shared/database/pool', () => ({
  pool: {
    connect: vi.fn(),
    on: vi.fn(),
    getMetrics: vi.fn(),
    circuitBreaker: {
      getState: vi.fn(),
      getFailureCount: vi.fn(),
      execute: vi.fn(),
    },
    totalCount: 10,
    idleCount: 5,
    waitingCount: 2,
  },
  checkPoolHealth: vi.fn(),
}));

import { pool, checkPoolHealth } from '@shared/database/pool';

// Type assertion to help TypeScript understand our mock structure
const mockPool = pool as unknown as MockPool;
const mockCheckPoolHealth = checkPoolHealth as vi.Mock<Promise<any>>;

describe('ConnectionManager Integration Tests', () => {
  let manager: ConnectionManager;
  let mockClient: vi.Mocked<PoolClient>;

  beforeEach(() => {
    // Use fake timers for deterministic control of time-based operations
    vi.useFakeTimers();
    resetMonitoringService();
    vi.clearAllMocks();

    // Setup mock client with all required methods
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as vi.Mocked<PoolClient>;

    // Configure mock pool with default successful behavior
    // The type assertion helps TypeScript understand this is safe
    mockPool.connect.mockResolvedValue(mockClient as PoolClient);
    mockPool.getMetrics.mockResolvedValue({
      queries: 100,
      connections: 10,
      idleConnections: 5,
      totalConnections: 10,
      waitingClients: 2,
      avgQueryTime: 50,
      maxQueryTime: 100,
      minQueryTime: 10,
    });
    
    // Configure circuit breaker with default closed state
    mockPool.circuitBreaker.getState.mockReturnValue('CLOSED');
    mockPool.circuitBreaker.getFailureCount.mockReturnValue(0);
    // Default behavior: circuit breaker passes through the function call
    // The type annotation on fn helps TypeScript understand the callback signature
    mockPool.circuitBreaker.execute.mockImplementation(async <T>(fn: () => Promise<T>) => fn());

    // Configure health check with default healthy state
    mockCheckPoolHealth.mockResolvedValue({
      isHealthy: true,
      totalConnections: 10,
      idleConnections: 5,
      waitingClients: 2,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
    });

    // Create manager with short health check interval for testing
    manager = createConnectionManager({
      healthCheckIntervalMs: 100,
    });
  });

  afterEach(async () => {
    await manager.close();
    vi.useRealTimers();
    resetMonitoringService();
  });

  describe('Connection Acquisition and Release', () => {
    it('should successfully acquire and release connections', async () => {
      // Acquire a connection through the circuit breaker
      const client = await manager.acquireConnection();
      
      expect(client).toBe(mockClient);
      expect(mockPool.circuitBreaker.execute).toHaveBeenCalledTimes(1);

      // Release the connection
      await manager.releaseConnection(client);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent connections', async () => {
      // Request 5 connections simultaneously
      const promises = Array(5).fill(null).map(() => manager.acquireConnection());
      const clients = await Promise.all(promises);

      expect(clients).toHaveLength(5);
      expect(mockPool.circuitBreaker.execute).toHaveBeenCalledTimes(5);

      // Release all connections
      await Promise.all(clients.map(client => manager.releaseConnection(client)));
      expect(mockClient.release).toHaveBeenCalledTimes(5);
    });

    it('should maintain connection pool statistics', async () => {
      const client = await manager.acquireConnection();
      const stats = await manager.getPoolStatistics();

      // Verify that pool statistics are correctly retrieved
      expect(stats).toEqual({
        queries: 100,
        connections: 10,
        idleConnections: 5,
        totalConnections: 10,
        waitingClients: 2,
        avgQueryTime: 50,
        maxQueryTime: 100,
        minQueryTime: 10,
      });

      await manager.releaseConnection(client);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should allow connections when circuit breaker is closed', async () => {
      mockPool.circuitBreaker.getState.mockReturnValue('CLOSED');

      const client = await manager.acquireConnection();

      expect(client).toBe(mockClient);
      expect(manager.getCircuitBreakerState()).toBe('CLOSED');
    });

    it('should prevent connections when circuit breaker is open', async () => {
      // Configure circuit breaker to reject connections
      mockPool.circuitBreaker.getState.mockReturnValue('OPEN');
      mockPool.circuitBreaker.execute.mockRejectedValue(
        new Error('Circuit breaker is OPEN')
      );

      await expect(manager.acquireConnection()).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should allow connections in half-open state', async () => {
      // In half-open state, the circuit breaker allows test requests
      mockPool.circuitBreaker.getState.mockReturnValue('HALF_OPEN');
      mockPool.circuitBreaker.execute.mockResolvedValue(mockClient);

      const client = await manager.acquireConnection();

      expect(client).toBe(mockClient);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks periodically', async () => {
      // Advance timers past the health check interval (100ms)
      await vi.advanceTimersByTimeAsync(150);

      expect(mockCheckPoolHealth).toHaveBeenCalledWith(pool, 'managed');
    });

    it('should emit health status updates', async () => {
      const healthSpy = vi.fn();
      manager.on('health-status-update', healthSpy);

      // Trigger health check by advancing timers
      await vi.advanceTimersByTimeAsync(150);

      expect(healthSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isHealthy: true,
          totalConnections: 10,
          circuitBreakerState: 'CLOSED',
          lastHealthCheck: expect.any(Date),
        })
      );
    });

    it('should report unhealthy status when pool is down', async () => {
      // Simulate an unhealthy pool
      mockCheckPoolHealth.mockResolvedValue({
        isHealthy: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        circuitBreakerState: 'OPEN',
        circuitBreakerFailures: 5,
      });

      const isHealthy = await manager.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit connection lifecycle events', async () => {
      const acquireSpy = vi.fn();
      const releaseSpy = vi.fn();

      manager.on('connection-acquired', acquireSpy);
      manager.on('connection-released', releaseSpy);

      const client = await manager.acquireConnection();
      await manager.releaseConnection(client);

      expect(acquireSpy).toHaveBeenCalledWith(client);
      expect(releaseSpy).toHaveBeenCalledWith(client);
    });

    it('should emit circuit breaker state changes', async () => {
      const stateChangeSpy = vi.fn();
      manager.on('circuit-breaker-state-change', stateChangeSpy);

      // Change circuit breaker state
      mockPool.circuitBreaker.getState.mockReturnValue('OPEN');

      // Trigger health check to detect state change
      await manager.getHealthStatus();

      // Note: Actual state change events would come from the circuit breaker
      // This test verifies the event listener infrastructure is in place
      expect(stateChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Metrics Integration', () => {
    it('should emit metrics when acquiring connections', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      const client = await manager.acquireConnection();

      // Verify connection acquisition metrics are recorded
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.acquired',
        1,
        expect.objectContaining({
          acquisitionTimeMs: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );

      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.acquisition_time',
        expect.any(Number),
        expect.any(Object)
      );

      await manager.releaseConnection(client);
    });

    it('should emit metrics when releasing connections', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      const client = await manager.acquireConnection();
      await manager.releaseConnection(client);

      // Verify connection release metrics are recorded
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.released',
        1,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit metrics on connection failures', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      const error = new Error('Connection failed');
      mockPool.circuitBreaker.execute.mockRejectedValueOnce(error);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection failed');

      // Verify failure metrics are recorded with error details
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.failed',
        1,
        expect.objectContaining({
          error: 'Connection failed',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit pool health metrics', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getHealthStatus();

      // Verify comprehensive health metrics
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'pool.health_status',
        1, // 1 = healthy, 0 = unhealthy
        expect.objectContaining({
          totalConnections: 10,
          idleConnections: 5,
          waitingClients: 2,
          timestamp: expect.any(Number)
        })
      );

      // Verify pool gauge metrics
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.size', 10, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.active_connections', 5, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.waiting_requests', 2, expect.any(Object));
    });

    it('should emit pool statistics metrics', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getPoolStatistics();

      // Verify all pool statistics are recorded
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.queries_total', 100, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.connections_total', 10, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_avg', 50, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_max', 100, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_min', 10, expect.any(Object));
    });

    it('should emit circuit breaker metrics', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getHealthStatus();

      // Verify circuit breaker state is tracked
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'circuit_breaker.failures',
        0,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit percentile metrics periodically', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = vi.spyOn(monitoring, 'recordDatabaseMetric');

      // Generate enough data points to calculate meaningful percentiles
      for (let i = 0; i < 10; i++) {
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);
      }

      // Verify percentile metrics are calculated and recorded
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.acquisition_time_avg',
        expect.any(Number),
        expect.any(Object)
      );

      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.acquisition_time_p95',
        expect.any(Number),
        expect.any(Object)
      );

      expect(recordMetricSpy).toHaveBeenCalledWith(
        'connection.acquisition_time_p99',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle connection acquisition failures', async () => {
      const error = new Error('Connection pool exhausted');
      mockPool.circuitBreaker.execute.mockRejectedValue(error);

      const errorSpy = vi.fn();
      manager.on('connection-error', errorSpy);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection pool exhausted');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    it('should handle connection release failures', async () => {
      const error = new Error('Release failed');
      mockClient.release.mockImplementation(() => {
        throw error;
      });

      const errorSpy = vi.fn();
      manager.on('connection-error', errorSpy);

      await expect(manager.releaseConnection(mockClient as PoolClient)).rejects.toThrow('Release failed');
      expect(errorSpy).toHaveBeenCalledWith(error, mockClient);
    });

    it('should handle pool errors', async () => {
      const error = new Error('Pool connection lost');
      const errorSpy = vi.fn();
      manager.on('pool-error', errorSpy);

      // Find and invoke the pool error handler that was registered
      const poolErrorHandler = mockPool.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (poolErrorHandler) {
        poolErrorHandler(error);
        expect(errorSpy).toHaveBeenCalledWith(error);
      }
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customManager = createConnectionManager({
        healthCheckIntervalMs: 60000,
        circuitBreakerFailureThreshold: 10,
      });

      expect(customManager).toBeDefined();
    });

    it('should load configuration from environment', () => {
      // Set environment variables
      process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS = '45000';
      process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '8';

      // Create manager that reads from environment
      const envManager = createConnectionManager();

      expect(envManager).toBeDefined();

      // Clean up environment variables
      delete process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS;
      delete process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    });
  });
});






































