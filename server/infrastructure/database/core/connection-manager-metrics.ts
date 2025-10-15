import { getMonitoringService, MonitoringService } from '../../monitoring/monitoring';
import { CircuitBreakerState } from './connection-manager';

/**
 * Connection Manager Metrics Collector
 *
 * Handles metrics emission for connection pool performance and observability.
 * Integrates with the existing monitoring infrastructure to provide comprehensive
 * metrics for connection acquisition times, pool utilization, and circuit breaker state.
 */
export class ConnectionManagerMetrics {
  private monitoring: MonitoringService;
  private acquisitionTimes: number[] = [];
  private readonly maxAcquisitionTimes = 1000; // Keep last 1000 acquisition times for percentiles

  constructor(monitoring?: MonitoringService) {
    this.monitoring = monitoring || getMonitoringService();
  }

  /**
   * Records a successful connection acquisition with timing
   */
  recordConnectionAcquired(acquisitionTimeMs: number): void {
    // Record the timing
    this.recordAcquisitionTime(acquisitionTimeMs);

    // Emit counter metric
    this.monitoring.recordDatabaseMetric('connection.acquired', 1, {
      acquisitionTimeMs,
      timestamp: Date.now()
    });

    // Update gauge metrics
    this.updatePoolGauges();
  }

  /**
   * Records a connection release
   */
  recordConnectionReleased(): void {
    this.monitoring.recordDatabaseMetric('connection.released', 1, {
      timestamp: Date.now()
    });

    // Update gauge metrics
    this.updatePoolGauges();
  }

  /**
   * Records a failed connection acquisition
   */
  recordConnectionFailed(error?: Error): void {
    this.monitoring.recordDatabaseMetric('connection.failed', 1, {
      error: error?.message,
      timestamp: Date.now()
    });

    // Update gauge metrics
    this.updatePoolGauges();
  }

  /**
   * Records circuit breaker state change
   */
  recordCircuitBreakerStateChange(oldState: CircuitBreakerState, newState: CircuitBreakerState): void {
    this.monitoring.recordDatabaseMetric('circuit_breaker.state_change', 1, {
      oldState,
      newState,
      timestamp: Date.now()
    });

    // Record current state as gauge (0=CLOSED, 1=OPEN, 2=HALF_OPEN)
    const stateValue = newState === 'CLOSED' ? 0 : newState === 'OPEN' ? 1 : 2;
    this.monitoring.recordDatabaseMetric('circuit_breaker.state', stateValue, {
      state: newState,
      timestamp: Date.now()
    });
  }

  /**
   * Records circuit breaker failure count
   */
  recordCircuitBreakerFailure(failureCount: number): void {
    this.monitoring.recordDatabaseMetric('circuit_breaker.failures', failureCount, {
      timestamp: Date.now()
    });
  }

  /**
   * Updates pool gauge metrics (size, active connections, waiting requests)
   */
  updatePoolGauges(
    poolSize?: number,
    activeConnections?: number,
    waitingRequests?: number
  ): void {
    if (poolSize !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.size', poolSize, {
        timestamp: Date.now()
      });
    }

    if (activeConnections !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.active_connections', activeConnections, {
        timestamp: Date.now()
      });
    }

    if (waitingRequests !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.waiting_requests', waitingRequests, {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Records health status update
   */
  recordHealthStatus(isHealthy: boolean, totalConnections: number, idleConnections: number, waitingClients: number): void {
    this.monitoring.recordDatabaseMetric('pool.health_status', isHealthy ? 1 : 0, {
      totalConnections,
      idleConnections,
      waitingClients,
      timestamp: Date.now()
    });

    // Update gauges with current values
    this.updatePoolGauges(totalConnections, totalConnections - idleConnections, waitingClients);
  }

  /**
   * Records pool statistics
   */
  recordPoolStatistics(stats: {
    queries: number;
    connections: number;
    idleConnections: number;
    totalConnections: number;
    waitingClients: number;
    avgQueryTime?: number;
    maxQueryTime?: number;
    minQueryTime?: number;
  }): void {
    this.monitoring.recordDatabaseMetric('pool.queries_total', stats.queries, {
      timestamp: Date.now()
    });

    this.monitoring.recordDatabaseMetric('pool.connections_total', stats.connections, {
      timestamp: Date.now()
    });

    if (stats.avgQueryTime !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.query_time_avg', stats.avgQueryTime, {
        timestamp: Date.now()
      });
    }

    if (stats.maxQueryTime !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.query_time_max', stats.maxQueryTime, {
        timestamp: Date.now()
      });
    }

    if (stats.minQueryTime !== undefined) {
      this.monitoring.recordDatabaseMetric('pool.query_time_min', stats.minQueryTime, {
        timestamp: Date.now()
      });
    }

    // Update gauges
    this.updatePoolGauges(stats.totalConnections, stats.connections, stats.waitingClients);
  }

  /**
   * Gets timing percentiles for connection acquisition
   */
  getAcquisitionTimePercentiles(): { p50: number; p95: number; p99: number; avg: number } {
    if (this.acquisitionTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }

    const sorted = [...this.acquisitionTimes].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;

    const p50 = this.getPercentile(sorted, 50);
    const p95 = this.getPercentile(sorted, 95);
    const p99 = this.getPercentile(sorted, 99);

    return { p50, p95, p99, avg };
  }

  /**
   * Records acquisition timing and emits percentile metrics
   */
  private recordAcquisitionTime(acquisitionTimeMs: number): void {
    // Add to our sliding window
    this.acquisitionTimes.push(acquisitionTimeMs);
    if (this.acquisitionTimes.length > this.maxAcquisitionTimes) {
      this.acquisitionTimes.shift();
    }

    // Record the individual timing
    this.monitoring.recordDatabaseMetric('connection.acquisition_time', acquisitionTimeMs, {
      timestamp: Date.now()
    });

    // Calculate and record percentiles periodically (every 10 acquisitions)
    if (this.acquisitionTimes.length % 10 === 0) {
      const percentiles = this.getAcquisitionTimePercentiles();

      this.monitoring.recordDatabaseMetric('connection.acquisition_time_avg', percentiles.avg, {
        timestamp: Date.now()
      });

      this.monitoring.recordDatabaseMetric('connection.acquisition_time_p95', percentiles.p95, {
        timestamp: Date.now()
      });

      this.monitoring.recordDatabaseMetric('connection.acquisition_time_p99', percentiles.p99, {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculates percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Gets total metrics counts for reporting
   */
  getMetricsSummary(): {
    totalAcquisitions: number;
    totalReleases: number;
    totalFailures: number;
    currentAcquisitionTimes: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const acquisitions = this.monitoring.getMetrics('connection.acquired', oneHourAgo);
    const releases = this.monitoring.getMetrics('connection.released', oneHourAgo);
    const failures = this.monitoring.getMetrics('connection.failed', oneHourAgo);

    return {
      totalAcquisitions: acquisitions.length,
      totalReleases: releases.length,
      totalFailures: failures.length,
      currentAcquisitionTimes: this.acquisitionTimes.length
    };
  }

  /**
   * Records shutdown completion metrics
   */
  recordShutdownCompleted(durationMs: number, forcedClosures: number): void {
    this.monitoring.recordDatabaseMetric('shutdown.duration', durationMs, {
      timestamp: Date.now()
    });

    this.monitoring.recordDatabaseMetric('shutdown.forced_closures', forcedClosures, {
      timestamp: Date.now()
    });

    this.monitoring.recordDatabaseMetric('shutdown.completed', 1, {
      durationMs,
      forcedClosures,
      timestamp: Date.now()
    });
  }

  /**
   * Records shutdown started metrics
   */
  recordShutdownStarted(timeoutMs: number): void {
    this.monitoring.recordDatabaseMetric('shutdown.started', 1, {
      timeoutMs,
      timestamp: Date.now()
    });
  }

  /**
   * Resets metrics (useful for testing)
   */
  reset(): void {
    this.acquisitionTimes = [];
  }
}