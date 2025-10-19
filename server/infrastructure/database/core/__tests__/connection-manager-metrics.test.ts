import { ConnectionManagerMetrics } from '../connection-manager-metrics';
import { getMonitoringService, resetMonitoringService } from '../../../monitoring/monitoring';

describe('ConnectionManagerMetrics', () => {
  let metrics: ConnectionManagerMetrics;
  let mockMonitoring: any;

  beforeEach(() => {
    resetMonitoringService();
    mockMonitoring = {
      recordDatabaseMetric: jest.fn(),
      getMetrics: jest.fn().mockReturnValue([]),
    };
    metrics = new ConnectionManagerMetrics(mockMonitoring);
  });

  afterEach(() => {
    resetMonitoringService();
  });

  describe('recordConnectionAcquired', () => {
    it('should record acquisition timing and emit metrics', () => {
      const acquisitionTime = 50;

      metrics.recordConnectionAcquired(acquisitionTime);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.acquired',
        1,
        expect.objectContaining({
          acquisitionTimeMs: acquisitionTime,
          timestamp: expect.any(Number)
        })
      );

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.acquisition_time',
        acquisitionTime,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should calculate and emit percentiles periodically', () => {
      // Record 10 acquisitions to trigger percentile calculation
      for (let i = 0; i < 10; i++) {
        metrics.recordConnectionAcquired(10 + i); // 10, 11, 12, ..., 19
      }

      // Should have called percentile metrics
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.acquisition_time_avg',
        expect.any(Number),
        expect.any(Object)
      );

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.acquisition_time_p95',
        expect.any(Number),
        expect.any(Object)
      );

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.acquisition_time_p99',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('recordConnectionReleased', () => {
    it('should record connection release', () => {
      metrics.recordConnectionReleased();

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.released',
        1,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('recordConnectionFailed', () => {
    it('should record connection failure with error details', () => {
      const error = new Error('Connection timeout');

      metrics.recordConnectionFailed(error);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.failed',
        1,
        expect.objectContaining({
          error: 'Connection timeout',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle undefined error', () => {
      metrics.recordConnectionFailed();

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'connection.failed',
        1,
        expect.objectContaining({
          error: undefined,
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('recordCircuitBreakerStateChange', () => {
    it('should record state change and current state', () => {
      metrics.recordCircuitBreakerStateChange('CLOSED', 'OPEN');

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'circuit_breaker.state_change',
        1,
        expect.objectContaining({
          oldState: 'CLOSED',
          newState: 'OPEN',
          timestamp: expect.any(Number)
        })
      );

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'circuit_breaker.state',
        1, // OPEN = 1
        expect.objectContaining({
          state: 'OPEN',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should map HALF_OPEN to correct value', () => {
      metrics.recordCircuitBreakerStateChange('OPEN', 'HALF_OPEN');

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'circuit_breaker.state',
        2, // HALF_OPEN = 2
        expect.objectContaining({
          state: 'HALF_OPEN'
        })
      );
    });
  });

  describe('recordCircuitBreakerFailure', () => {
    it('should record failure count', () => {
      metrics.recordCircuitBreakerFailure(5);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'circuit_breaker.failures',
        5,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('updatePoolGauges', () => {
    it('should record pool size gauge', () => {
      metrics.updatePoolGauges(20);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'pool.size',
        20,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should record active connections gauge', () => {
      metrics.updatePoolGauges(undefined, 15);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'pool.active_connections',
        15,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should record waiting requests gauge', () => {
      metrics.updatePoolGauges(undefined, undefined, 3);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'pool.waiting_requests',
        3,
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('recordHealthStatus', () => {
    it('should record health status and pool metrics', () => {
      metrics.recordHealthStatus(true, 20, 15, 2);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith(
        'pool.health_status',
        1, // healthy = 1
        expect.objectContaining({
          totalConnections: 20,
          idleConnections: 15,
          waitingClients: 2,
          timestamp: expect.any(Number)
        })
      );

      // Should also update gauges
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.size', 20, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.active_connections', 5, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.waiting_requests', 2, expect.any(Object));
    });
  });

  describe('recordPoolStatistics', () => {
    it('should record all pool statistics', () => {
      const stats = {
        queries: 100,
        connections: 10,
        idleConnections: 5,
        totalConnections: 20,
        waitingClients: 2,
        avgQueryTime: 50,
        maxQueryTime: 200,
        minQueryTime: 10
      };

      metrics.recordPoolStatistics(stats);

      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.queries_total', 100, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.connections_total', 10, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.query_time_avg', 50, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.query_time_max', 200, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.query_time_min', 10, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.size', 20, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.active_connections', 10, expect.any(Object));
      expect(mockMonitoring.recordDatabaseMetric).toHaveBeenCalledWith('pool.waiting_requests', 2, expect.any(Object));
    });
  });

  describe('getAcquisitionTimePercentiles', () => {
    it('should return zero percentiles when no data', () => {
      const percentiles = metrics.getAcquisitionTimePercentiles();

      expect(percentiles).toEqual({
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0
      });
    });

    it('should calculate correct percentiles', () => {
      // Add some test data
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach(time => {
        metrics.recordConnectionAcquired(time);
      });

      const percentiles = metrics.getAcquisitionTimePercentiles();

      expect(percentiles.avg).toBe(55); // (10+20+...+100)/10 = 550/10 = 55
      expect(percentiles.p50).toBe(55); // median of sorted array
      expect(percentiles.p95).toBeGreaterThan(90); // 95th percentile should be high
      expect(percentiles.p99).toBeGreaterThanOrEqual(99); // 99th percentile of small dataset
    });
  });

  describe('getMetricsSummary', () => {
    it('should return metrics summary', () => {
      mockMonitoring.getMetrics.mockImplementation((name: string) => {
        if (name === 'connection.acquired') return [{ value: 1 }, { value: 1 }];
        if (name === 'connection.released') return [{ value: 1 }];
        if (name === 'connection.failed') return [{ value: 1 }];
        return [];
      });

      const summary = metrics.getMetricsSummary();

      expect(summary).toEqual({
        totalAcquisitions: 2,
        totalReleases: 1,
        totalFailures: 1,
        currentAcquisitionTimes: 0 // No acquisitions recorded yet
      });
    });
  });

  describe('reset', () => {
    it('should clear acquisition times', () => {
      metrics.recordConnectionAcquired(100);
      expect(metrics.getAcquisitionTimePercentiles().avg).toBe(100);

      metrics.reset();
      expect(metrics.getAcquisitionTimePercentiles().avg).toBe(0);
    });
  });
});




































