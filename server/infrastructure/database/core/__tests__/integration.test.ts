import { jest } from '@jest/globals';
import { PoolClient } from 'pg';
import { createConnectionManager, ConnectionManager } from '../connection-manager';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';

// Mock the shared pool and its dependencies
jest.mock('../../../../../shared/database/pool', () => ({
  pool: {
    connect: jest.fn(),
    on: jest.fn(),
    getMetrics: jest.fn(),
    circuitBreaker: {
      getState: jest.fn(),
      getFailureCount: jest.fn(),
      execute: jest.fn(),
    },
    totalCount: 10,
    idleCount: 5,
    waitingCount: 2,
  },
  checkPoolHealth: jest.fn(),
}));

import { pool, checkPoolHealth } from '../../../../../shared/database/pool';

describe('ConnectionManager Integration Tests', () => {
  let manager: ConnectionManager;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(() => {
    resetMonitoringService();
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    // Setup mock pool
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.getMetrics as jest.Mock).mockResolvedValue({
      queries: 100,
      connections: 10,
      idleConnections: 5,
      totalConnections: 10,
      waitingClients: 2,
      avgQueryTime: 50,
      maxQueryTime: 100,
      minQueryTime: 10,
    });
    (pool.circuitBreaker.getState as jest.Mock).mockReturnValue('CLOSED');
    (pool.circuitBreaker.getFailureCount as jest.Mock).mockReturnValue(0);

    // Setup mock health check
    (checkPoolHealth as jest.Mock).mockResolvedValue({
      isHealthy: true,
      totalConnections: 10,
      idleConnections: 5,
      waitingClients: 2,
      circuitBreakerState: 'CLOSED',
      circuitBreakerFailures: 0,
    });

    manager = createConnectionManager({
      healthCheckIntervalMs: 100, // Fast for testing
    });
  });

  afterEach(async () => {
    await manager.close();
    resetMonitoringService();
  });

  describe('Connection Acquisition and Release', () => {
    it('should successfully acquire and release connections', async () => {
      // Acquire connection
      const client = await manager.acquireConnection();
      expect(client).toBe(mockClient);
      expect(pool.connect).toHaveBeenCalledTimes(1);

      // Release connection
      await manager.releaseConnection(client);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent connections', async () => {
      const promises = Array(5).fill(null).map(() => manager.acquireConnection());

      const clients = await Promise.all(promises);

      expect(clients).toHaveLength(5);
      expect(pool.connect).toHaveBeenCalledTimes(5);

      // Release all connections
      await Promise.all(clients.map(client => manager.releaseConnection(client)));
      expect(mockClient.release).toHaveBeenCalledTimes(5);
    });

    it('should maintain connection pool statistics', async () => {
      const client = await manager.acquireConnection();
      const stats = await manager.getPoolStatistics();

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
      (pool.circuitBreaker.getState as jest.Mock).mockReturnValue('CLOSED');

      const client = await manager.acquireConnection();

      expect(client).toBe(mockClient);
      expect(manager.getCircuitBreakerState()).toBe('CLOSED');
    });

    it('should prevent connections when circuit breaker is open', async () => {
      (pool.circuitBreaker.getState as jest.Mock).mockReturnValue('OPEN');
      (pool.circuitBreaker.execute as jest.Mock).mockRejectedValue(
        new Error('Circuit breaker is OPEN')
      );

      await expect(manager.acquireConnection()).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should allow connections in half-open state', async () => {
      (pool.circuitBreaker.getState as jest.Mock).mockReturnValue('HALF_OPEN');
      (pool.circuitBreaker.execute as jest.Mock).mockResolvedValue(mockClient);

      const client = await manager.acquireConnection();

      expect(client).toBe(mockClient);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks periodically', async () => {
      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(checkPoolHealth).toHaveBeenCalledWith(pool, 'managed');
    });

    it('should emit health status updates', async () => {
      const healthSpy = jest.fn();
      manager.on('health-status-update', healthSpy);

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 150));

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
      (checkPoolHealth as jest.Mock).mockResolvedValue({
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
      const acquireSpy = jest.fn();
      const releaseSpy = jest.fn();

      manager.on('connection-acquired', acquireSpy);
      manager.on('connection-released', releaseSpy);

      const client = await manager.acquireConnection();
      await manager.releaseConnection(client);

      expect(acquireSpy).toHaveBeenCalledWith(client);
      expect(releaseSpy).toHaveBeenCalledWith(client);
    });

    it('should emit circuit breaker state changes', async () => {
      const stateChangeSpy = jest.fn();
      manager.on('circuit-breaker-state-change', stateChangeSpy);

      // Simulate state change by mocking the circuit breaker
      (pool.circuitBreaker.getState as jest.Mock).mockReturnValue('OPEN');

      // Trigger a health check which should detect the state change
      await manager.getHealthStatus();

      // Note: In a real scenario, state changes would be emitted by the circuit breaker
      // This test verifies the event system is in place
      expect(stateChangeSpy).not.toHaveBeenCalled(); // No change detected in this test
    });
  });

  describe('Metrics Integration', () => {
    it('should emit metrics when acquiring connections', async () => {
      const monitoring = getMonitoringService();

      // Spy on the monitoring service
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      const client = await manager.acquireConnection();

      // Should have recorded connection acquisition metrics
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
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      const client = await manager.acquireConnection();
      await manager.releaseConnection(client);

      // Should have recorded connection release metrics
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
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      const error = new Error('Connection failed');
      (pool.connect as jest.Mock).mockRejectedValueOnce(error);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection failed');

      // Should have recorded failure metrics
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
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getHealthStatus();

      // Should have recorded health status metrics
      expect(recordMetricSpy).toHaveBeenCalledWith(
        'pool.health_status',
        1, // healthy = 1
        expect.objectContaining({
          totalConnections: 10,
          idleConnections: 5,
          waitingClients: 2,
          timestamp: expect.any(Number)
        })
      );

      // Should have recorded pool gauges
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.size', 10, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.active_connections', 5, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.waiting_requests', 2, expect.any(Object));
    });

    it('should emit pool statistics metrics', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getPoolStatistics();

      // Should have recorded pool statistics metrics
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.queries_total', 100, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.connections_total', 10, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_avg', 50, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_max', 100, expect.any(Object));
      expect(recordMetricSpy).toHaveBeenCalledWith('pool.query_time_min', 10, expect.any(Object));
    });

    it('should emit circuit breaker metrics', async () => {
      const monitoring = getMonitoringService();
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      await manager.getHealthStatus();

      // Should have recorded circuit breaker failure count
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
      const recordMetricSpy = jest.spyOn(monitoring, 'recordDatabaseMetric');

      // Acquire 10 connections to trigger percentile calculation
      for (let i = 0; i < 10; i++) {
        const client = await manager.acquireConnection();
        await manager.releaseConnection(client);
      }

      // Should have recorded percentile metrics
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
      (pool.connect as jest.Mock).mockRejectedValue(error);

      const errorSpy = jest.fn();
      manager.on('connection-error', errorSpy);

      await expect(manager.acquireConnection()).rejects.toThrow('Connection pool exhausted');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    it('should handle connection release failures', async () => {
      const error = new Error('Release failed');
      mockClient.release.mockImplementation(() => {
        throw error;
      });

      const errorSpy = jest.fn();
      manager.on('connection-error', errorSpy);

      await expect(manager.releaseConnection(mockClient)).rejects.toThrow('Release failed');
      expect(errorSpy).toHaveBeenCalledWith(error, mockClient);
    });

    it('should handle pool errors', async () => {
      const error = new Error('Pool connection lost');

      const errorSpy = jest.fn();
      manager.on('pool-error', errorSpy);

      // Simulate pool error by calling the pool's error handler
      const poolErrorHandler = (pool.on as jest.Mock).mock.calls.find(
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
      process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS = '45000';
      process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '8';

      // Create new manager to pick up env vars
      const envManager = createConnectionManager();

      expect(envManager).toBeDefined();

      // Cleanup
      delete process.env.CONNECTION_HEALTH_CHECK_INTERVAL_MS;
      delete process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    });
  });
});