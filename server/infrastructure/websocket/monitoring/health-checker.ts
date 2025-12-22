/**
 * Health Checker for WebSocket Service
 * Monitors system health and provides status reporting
 */

import { HealthStatus, IHealthChecker, IStatisticsCollector, IConnectionManager, IOperationQueueManager } from '../types';

/**
 * Health check thresholds configuration
 */
interface HealthThresholds {
  maxConnectionCount: number;
  maxMemoryUsagePercent: number;
  maxQueueSize: number;
  maxAverageLatency: number;
  maxErrorRate: number;
}

/**
 * Default health check thresholds
 */
const DEFAULT_THRESHOLDS: HealthThresholds = {
  maxConnectionCount: 10000,
  maxMemoryUsagePercent: 85,
  maxQueueSize: 1000,
  maxAverageLatency: 1000, // 1 second
  maxErrorRate: 5, // 5%
};

/**
 * HealthChecker class for monitoring WebSocket service health
 * Integrates with connection and memory statistics to provide comprehensive health status
 */
export class HealthChecker implements IHealthChecker {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentStatus: HealthStatus;
  private readonly checkIntervalMs: number;
  private readonly thresholds: HealthThresholds;
  private readonly statisticsCollector: IStatisticsCollector;
  private readonly connectionManager: IConnectionManager;
  private readonly queueManager: IOperationQueueManager;
  private readonly logger: ((message: string, level?: string) => void) | undefined;

  constructor(
    statisticsCollector: IStatisticsCollector,
    connectionManager: IConnectionManager,
    queueManager: IOperationQueueManager,
    checkIntervalMs: number = 60000, // 1 minute default
    thresholds: Partial<HealthThresholds> = {},
    logger?: (message: string, level?: string) => void
  ) {
    this.statisticsCollector = statisticsCollector;
    this.connectionManager = connectionManager;
    this.queueManager = queueManager;
    this.checkIntervalMs = checkIntervalMs;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.logger = logger;

    // Initialize with unknown status
    this.currentStatus = {
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
      memoryUsage: 0,
      connectionHealth: true,
      queueHealth: true,
      warnings: [],
      errors: [],
      lastCheck: Date.now(),
    };
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      this.stopHealthChecks();
    }

    // Perform initial health check
    this.performHealthCheck().catch(error => {
      if (this.logger) this.logger(`Initial health check failed: ${error}`, 'error');
    });

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        if (this.logger) this.logger(`Health check failed: ${error}`, 'error');
        this.updateHealthStatus('unhealthy', {
          connections: false,
          memory: false,
          queues: false,
          performance: false,
        });
      }
    }, this.checkIntervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get current health status
   * @returns Current health status
   */
  getHealthStatus(): HealthStatus {
    return { ...this.currentStatus };
  }

  /**
   * Perform a comprehensive health check
   * @returns Promise resolving to health status
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const timestamp = Date.now();
    const checks = {
      connections: await this.checkConnections(),
      memory: await this.checkMemory(),
      queues: await this.checkQueues(),
      performance: await this.checkPerformance(),
    };

    const metrics = await this.gatherMetrics();
    
    // Determine overall health status
    const overallStatus = this.determineOverallStatus(checks);

    this.currentStatus = {
      status: overallStatus,
      timestamp,
      checks,
      metrics,
      memoryUsage: metrics.memoryUsage,
      connectionHealth: checks.connections,
      queueHealth: checks.queues,
      warnings: [],
      errors: [],
      lastCheck: timestamp,
    };

    return this.currentStatus;
  }

  /**
   * Check connection health
   * @returns true if connections are healthy
   */
  private async checkConnections(): Promise<boolean> {
    try {
      const connectionCount = this.connectionManager.getConnectionCount();
      const stats = this.statisticsCollector.getMetrics();

      // Check if connection count is within acceptable limits
      if (connectionCount > this.thresholds.maxConnectionCount) {
        return false;
      }

      // Check for excessive reconnections (more than 10% of total connections in last 5 minutes)
      const connectionRate = this.statisticsCollector.getConnectionRate(5 * 60 * 1000);
      const reconnectionThreshold = connectionCount * 0.1 / (5 * 60); // 10% per 5 minutes
      
      if (connectionRate > reconnectionThreshold && stats.reconnections > 0) {
        return false;
      }

      return true;
    } catch (error) {
      if (this.logger) this.logger(`Connection health check failed: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Check memory health
   * @returns true if memory usage is healthy
   */
  private async checkMemory(): Promise<boolean> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Check if memory usage is within acceptable limits
      if (memoryUsagePercent > this.thresholds.maxMemoryUsagePercent) {
        return false;
      }

      // Check for memory growth trend (simplified check)
      const stats = this.statisticsCollector.getMetrics();
      const uptime = Date.now() - stats.startTime;
      const memoryGrowthRate = usedMemory / (uptime / 1000); // bytes per second

      // If memory is growing faster than 1MB per minute, flag as unhealthy
      const maxGrowthRate = (1024 * 1024) / 60; // 1MB per minute
      if (memoryGrowthRate > maxGrowthRate && uptime > 5 * 60 * 1000) { // Only check after 5 minutes
        return false;
      }

      return true;
    } catch (error) {
      if (this.logger) this.logger(`Memory health check failed: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Check queue health
   * @returns true if queues are healthy
   */
  private async checkQueues(): Promise<boolean> {
    try {
      const queueSize = this.queueManager.getQueueSize();
      const stats = this.statisticsCollector.getMetrics();

      // Check if queue size is within acceptable limits
      if (queueSize > this.thresholds.maxQueueSize) {
        return false;
      }

      // Check for excessive queue overflows
      const errorRate = this.statisticsCollector.getErrorRate();
      if (stats.queueOverflows > 0 && errorRate > this.thresholds.maxErrorRate) {
        return false;
      }

      return true;
    } catch (error) {
      if (this.logger) this.logger(`Queue health check failed: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Check performance health
   * @returns true if performance is healthy
   */
  private async checkPerformance(): Promise<boolean> {
    try {
      const performanceMetrics = this.statisticsCollector.getPerformanceMetrics();

      // Check average latency
      if (performanceMetrics.averageLatency > this.thresholds.maxAverageLatency) {
        return false;
      }

      // Check error rate
      if (performanceMetrics.errorRate > this.thresholds.maxErrorRate) {
        return false;
      }

      // Check if throughput has dropped significantly (simplified check)
      const stats = this.statisticsCollector.getMetrics();
      const uptime = Date.now() - stats.startTime;
      
      if (uptime > 10 * 60 * 1000) { // Only check after 10 minutes
        const expectedThroughput = stats.totalMessages / (uptime / 1000); // messages per second
        const currentThroughput = performanceMetrics.throughput;
        
        // If current throughput is less than 50% of expected, flag as unhealthy
        if (currentThroughput < expectedThroughput * 0.5) {
          return false;
        }
      }

      return true;
    } catch (error) {
      if (this.logger) this.logger(`Performance health check failed: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Gather current metrics for health status
   * @returns Current system metrics
   */
  private async gatherMetrics(): Promise<HealthStatus['metrics']> {
    try {
      const connectionCount = this.connectionManager.getConnectionCount();
      const queueSize = this.queueManager.getQueueSize();
      const performanceMetrics = this.statisticsCollector.getPerformanceMetrics();
      
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      return {
        connectionCount,
        memoryUsage: memoryUsagePercent,
        queueSize,
        averageLatency: performanceMetrics.averageLatency,
      };
    } catch (error) {
      if (this.logger) this.logger(`Failed to gather metrics: ${error}`, 'error');
      return {
        connectionCount: 0,
        memoryUsage: 0,
        queueSize: 0,
        averageLatency: 0,
      };
    }
  }

  /**
   * Determine overall health status based on individual checks
   * @param checks Individual health check results
   * @returns Overall health status
   */
  private determineOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
    const failedChecks = Object.values(checks).filter(check => !check).length;

    if (failedChecks === 0) {
      return 'healthy';
    } else if (failedChecks <= 2) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Update health status manually (for external triggers)
   * @param status New health status
   * @param checks Optional check results
   */
  private updateHealthStatus(
    status: HealthStatus['status'],
    checks?: Partial<HealthStatus['checks']>
  ): void {
    this.currentStatus = {
      ...this.currentStatus,
      status,
      timestamp: Date.now(),
      checks: checks ? { ...this.currentStatus.checks, ...checks } : this.currentStatus.checks,
    };
  }

  /**
   * Get health check configuration
   * @returns Current thresholds and intervals
   */
  getConfiguration(): {
    thresholds: HealthThresholds;
    checkIntervalMs: number;
    isRunning: boolean;
  } {
    return {
      thresholds: { ...this.thresholds },
      checkIntervalMs: this.checkIntervalMs,
      isRunning: this.healthCheckInterval !== null,
    };
  }

  /**
   * Get health history summary
   * @returns Health status summary
   */
  getHealthSummary(): {
    currentStatus: HealthStatus['status'];
    lastCheckTime: number;
    uptime: number;
    checksPerformed: number;
  } {
    const stats = this.statisticsCollector.getMetrics();
    const uptime = Date.now() - stats.startTime;
    const checksPerformed = Math.floor(uptime / this.checkIntervalMs);

    return {
      currentStatus: this.currentStatus.status,
      lastCheckTime: this.currentStatus.timestamp,
      uptime,
      checksPerformed,
    };
  }

  /**
   * Force a health check (useful for testing or manual triggers)
   * @returns Promise resolving to health status
   */
  async forceHealthCheck(): Promise<HealthStatus> {
    return await this.performHealthCheck();
  }
}