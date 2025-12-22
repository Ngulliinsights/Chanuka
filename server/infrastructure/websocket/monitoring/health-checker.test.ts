/**
 * Unit tests for HealthChecker
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { IStatisticsCollector, IConnectionManager, IOperationQueueManager, ConnectionStats } from '../types';
import { HealthChecker } from './health-checker';

// Mock implementations
const createMockStatisticsCollector = (): IStatisticsCollector => ({
  updateConnectionCount: vi.fn(),
  recordMessageProcessed: vi.fn(),
  recordBroadcast: vi.fn(),
  recordDroppedMessage: vi.fn(),
  recordDuplicateMessage: vi.fn(),
  recordQueueOverflow: vi.fn(),
  recordReconnection: vi.fn(),
  getMetrics: vi.fn().mockReturnValue({
    totalConnections: 100,
    activeConnections: 50,
    totalMessages: 1000,
    totalBroadcasts: 100,
    droppedMessages: 5,
    duplicateMessages: 2,
    queueOverflows: 0, // Changed from 1 to 0
    reconnections: 3,
    startTime: Date.now() - 60000,
    lastActivity: Date.now(),
    peakConnections: 75,
  } as ConnectionStats),
  reset: vi.fn(),
  getAverageLatency: vi.fn().mockReturnValue(150),
  getPercentileLatency: vi.fn().mockReturnValue(200),
  getConnectionRate: vi.fn().mockReturnValue(0.5),
  getMessageThroughput: vi.fn().mockReturnValue(10),
  getUptime: vi.fn().mockReturnValue(60000),
  getErrorRate: vi.fn().mockReturnValue(2.5),
  getPerformanceMetrics: vi.fn().mockReturnValue({
    averageLatency: 150,
    p50Latency: 140,
    p95Latency: 300,
    p99Latency: 500,
    throughput: 10,
    connectionRate: 0.5,
    errorRate: 2.5,
    uptime: 60000,
  }),
  getHistoricalData: vi.fn().mockReturnValue({ latency: [], connections: [] }),
  getBufferStats: vi.fn().mockReturnValue({
    latencyBuffer: { size: 10, capacity: 100, utilization: 10 },
    connectionBuffer: { size: 5, capacity: 100, utilization: 5 },
  }),
});

const createMockConnectionManager = (): IConnectionManager => ({
  addConnection: vi.fn(),
  removeConnection: vi.fn(),
  getConnectionsForUser: vi.fn().mockReturnValue([]),
  authenticateConnection: vi.fn().mockResolvedValue(true),
  cleanup: vi.fn(),
  getConnectionCount: vi.fn().mockReturnValue(50),
});

const createMockQueueManager = (): IOperationQueueManager => ({
  enqueue: vi.fn().mockReturnValue(true),
  processQueue: vi.fn().mockResolvedValue(undefined),
  getQueueSize: vi.fn().mockReturnValue(10),
  clear: vi.fn(),
});

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;
  let mockStatisticsCollector: IStatisticsCollector;
  let mockConnectionManager: IConnectionManager;
  let mockQueueManager: IOperationQueueManager;

  beforeEach(() => {
    mockStatisticsCollector = createMockStatisticsCollector();
    mockConnectionManager = createMockConnectionManager();
    mockQueueManager = createMockQueueManager();
    
    healthChecker = new HealthChecker(
      mockStatisticsCollector,
      mockConnectionManager,
      mockQueueManager,
      1000 // 1 second interval for testing
    );
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    healthChecker.stopHealthChecks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const status = healthChecker.getHealthStatus();
      
      expect(status.status).toBe('healthy');
      expect(status.checks.connections).toBe(true);
      expect(status.checks.memory).toBe(true);
      expect(status.checks.queues).toBe(true);
      expect(status.checks.performance).toBe(true);
    });

    it('should accept custom thresholds', () => {
      const customThresholds = {
        maxConnectionCount: 5000,
        maxMemoryUsagePercent: 90,
        maxQueueSize: 500,
        maxAverageLatency: 2000,
        maxErrorRate: 10,
      };

      const customHealthChecker = new HealthChecker(
        mockStatisticsCollector,
        mockConnectionManager,
        mockQueueManager,
        1000,
        customThresholds
      );

      const config = customHealthChecker.getConfiguration();
      expect(config.thresholds.maxConnectionCount).toBe(5000);
      expect(config.thresholds.maxMemoryUsagePercent).toBe(90);
    });
  });

  describe('startHealthChecks', () => {
    it('should start periodic health checks', async () => {
      healthChecker.startHealthChecks();
      
      const config = healthChecker.getConfiguration();
      expect(config.isRunning).toBe(true);
      
      // Advance timer to trigger health check once
      vi.advanceTimersByTime(1000);
      
      expect(mockConnectionManager.getConnectionCount).toHaveBeenCalled();
    });

    it('should perform initial health check', async () => {
      const performHealthCheckSpy = vi.spyOn(healthChecker, 'performHealthCheck');
      
      healthChecker.startHealthChecks();
      
      expect(performHealthCheckSpy).toHaveBeenCalled();
    });

    it('should stop existing health checks before starting new ones', () => {
      healthChecker.startHealthChecks();
      const stopSpy = vi.spyOn(healthChecker, 'stopHealthChecks');
      
      healthChecker.startHealthChecks();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('stopHealthChecks', () => {
    it('should stop periodic health checks', () => {
      healthChecker.startHealthChecks();
      healthChecker.stopHealthChecks();
      
      const config = healthChecker.getConfiguration();
      expect(config.isRunning).toBe(false);
    });

    it('should handle stopping when not running', () => {
      expect(() => healthChecker.stopHealthChecks()).not.toThrow();
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      // Mock normal memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 0,
        arrayBuffers: 0,
      });

      const status = await healthChecker.performHealthCheck();
      
      expect(status.status).toBe('healthy');
      expect(status.checks.connections).toBe(true);
      expect(status.checks.memory).toBe(true);
      expect(status.checks.queues).toBe(true);
      expect(status.checks.performance).toBe(true);

      process.memoryUsage = originalMemoryUsage;
    });

    it('should return degraded status when some checks fail', async () => {
      // Mock high connection count to fail connection check
      vi.mocked(mockConnectionManager.getConnectionCount).mockReturnValue(15000);
      
      const status = await healthChecker.performHealthCheck();
      
      expect(status.status).toBe('degraded');
      expect(status.checks.connections).toBe(false);
    });

    it('should return unhealthy status when many checks fail', async () => {
      // Mock multiple failures
      vi.mocked(mockConnectionManager.getConnectionCount).mockReturnValue(15000);
      vi.mocked(mockQueueManager.getQueueSize).mockReturnValue(2000);
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 5000, // High latency
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 15, // High error rate
        uptime: 60000,
      });
      
      const status = await healthChecker.performHealthCheck();
      
      expect(status.status).toBe('unhealthy');
      expect(status.checks.connections).toBe(false);
      expect(status.checks.queues).toBe(false);
      expect(status.checks.performance).toBe(false);
    });

    it('should include current metrics in status', async () => {
      const status = await healthChecker.performHealthCheck();
      
      expect(status.metrics.connectionCount).toBe(50);
      expect(status.metrics.queueSize).toBe(10);
      expect(status.metrics.averageLatency).toBe(150);
      expect(status.metrics.memoryUsage).toBeGreaterThan(0);
    });

    it('should update timestamp', async () => {
      const beforeTime = Date.now();
      const status = await healthChecker.performHealthCheck();
      const afterTime = Date.now();
      
      expect(status.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(status.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('connection health check', () => {
    it('should pass when connection count is within limits', async () => {
      vi.mocked(mockConnectionManager.getConnectionCount).mockReturnValue(5000);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.connections).toBe(true);
    });

    it('should fail when connection count exceeds limit', async () => {
      vi.mocked(mockConnectionManager.getConnectionCount).mockReturnValue(15000);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.connections).toBe(false);
    });

    it('should fail when reconnection rate is too high', async () => {
      vi.mocked(mockConnectionManager.getConnectionCount).mockReturnValue(100);
      vi.mocked(mockStatisticsCollector.getConnectionRate).mockReturnValue(50); // Very high rate
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        reconnections: 10,
      } as ConnectionStats);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.connections).toBe(false);
    });
  });

  describe('memory health check', () => {
    it('should pass when memory usage is normal', async () => {
      // Mock normal memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 0,
        arrayBuffers: 0,
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.memory).toBe(true);
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should fail when memory usage is too high', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 95 * 1024 * 1024, // 95MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 0,
        arrayBuffers: 0,
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.memory).toBe(false);
      
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('queue health check', () => {
    it('should pass when queue size is normal', async () => {
      vi.mocked(mockQueueManager.getQueueSize).mockReturnValue(500);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.queues).toBe(true);
    });

    it('should fail when queue size exceeds limit', async () => {
      vi.mocked(mockQueueManager.getQueueSize).mockReturnValue(1500);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.queues).toBe(false);
    });

    it('should fail when queue overflows and error rate is high', async () => {
      vi.mocked(mockQueueManager.getQueueSize).mockReturnValue(500);
      vi.mocked(mockStatisticsCollector.getErrorRate).mockReturnValue(10);
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        queueOverflows: 5,
      } as ConnectionStats);
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.queues).toBe(false);
    });
  });

  describe('performance health check', () => {
    it('should pass when performance metrics are normal', async () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 500,
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 2,
        uptime: 60000,
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.performance).toBe(true);
    });

    it('should fail when latency is too high', async () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 2000, // High latency
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 2,
        uptime: 60000,
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.performance).toBe(false);
    });

    it('should fail when error rate is too high', async () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 500,
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 10, // High error rate
        uptime: 60000,
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.performance).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      const status = healthChecker.getHealthStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('checks');
      expect(status).toHaveProperty('metrics');
    });

    it('should return a copy of the status', () => {
      const status1 = healthChecker.getHealthStatus();
      const status2 = healthChecker.getHealthStatus();
      
      expect(status1).not.toBe(status2); // Different objects
      expect(status1).toEqual(status2); // Same content
    });
  });

  describe('getConfiguration', () => {
    it('should return current configuration', () => {
      const config = healthChecker.getConfiguration();
      
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('checkIntervalMs');
      expect(config).toHaveProperty('isRunning');
      
      expect(config.checkIntervalMs).toBe(1000);
      expect(config.isRunning).toBe(false);
    });

    it('should reflect running state', () => {
      healthChecker.startHealthChecks();
      const config = healthChecker.getConfiguration();
      expect(config.isRunning).toBe(true);
    });
  });

  describe('getHealthSummary', () => {
    it('should return health summary', () => {
      const summary = healthChecker.getHealthSummary();
      
      expect(summary).toHaveProperty('currentStatus');
      expect(summary).toHaveProperty('lastCheckTime');
      expect(summary).toHaveProperty('uptime');
      expect(summary).toHaveProperty('checksPerformed');
    });

    it('should calculate checks performed correctly', () => {
      // Mock uptime of 5 minutes with 1 second intervals
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        startTime: Date.now() - 5 * 60 * 1000,
      } as ConnectionStats);
      
      const summary = healthChecker.getHealthSummary();
      expect(summary.checksPerformed).toBe(300); // 5 minutes * 60 seconds / 1 second interval
    });
  });

  describe('forceHealthCheck', () => {
    it('should perform health check immediately', async () => {
      const status = await healthChecker.forceHealthCheck();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('timestamp');
      expect(mockConnectionManager.getConnectionCount).toHaveBeenCalled();
    });

    it('should update current status', async () => {
      await healthChecker.forceHealthCheck();
      
      const currentStatus = healthChecker.getHealthStatus();
      expect(currentStatus.timestamp).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle connection check errors gracefully', async () => {
      vi.mocked(mockConnectionManager.getConnectionCount).mockImplementation(() => {
        throw new Error('Connection error');
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.connections).toBe(false);
    });

    it('should handle queue check errors gracefully', async () => {
      vi.mocked(mockQueueManager.getQueueSize).mockImplementation(() => {
        throw new Error('Queue error');
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.queues).toBe(false);
    });

    it('should handle performance check errors gracefully', async () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockImplementation(() => {
        throw new Error('Performance error');
      });
      
      const status = await healthChecker.performHealthCheck();
      expect(status.checks.performance).toBe(false);
    });
  });
});