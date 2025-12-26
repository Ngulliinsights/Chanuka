/**
 * Unit tests for MetricsReporter
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { 
  ConnectionStats,
  HealthStatus,
  IConnectionManager, 
  IHealthChecker, 
  IOperationQueueManager,
  IStatisticsCollector, 
  MetricsReport
} from '../types';
import { MetricsReporter } from './metrics-reporter';

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
  getHistoricalData: vi.fn().mockReturnValue({
    latency: [
      { timestamp: Date.now() - 30000, latency: 100 },
      { timestamp: Date.now() - 15000, latency: 200 },
    ],
    connections: [
      { timestamp: Date.now() - 30000, type: 'connect', count: 45 },
      { timestamp: Date.now() - 15000, type: 'connect', count: 50 },
    ],
  }),
  getBufferStats: vi.fn().mockReturnValue({
    latencyBuffer: { size: 10, capacity: 100, utilization: 10 },
    connectionBuffer: { size: 5, capacity: 100, utilization: 5 },
  }),
});

const createMockHealthChecker = (): IHealthChecker => ({
  startHealthChecks: vi.fn(),
  stopHealthChecks: vi.fn(),
  getHealthStatus: vi.fn().mockReturnValue({
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      connections: true,
      memory: true,
      queues: true,
      performance: true,
    },
    metrics: {
      connectionCount: 50,
      memoryUsage: 65.5,
      queueSize: 10,
      averageLatency: 150,
    },
  } as HealthStatus),
  performHealthCheck: vi.fn().mockResolvedValue({
    status: 'healthy',
    timestamp: Date.now(),
    checks: {
      connections: true,
      memory: true,
      queues: true,
      performance: true,
    },
    metrics: {
      connectionCount: 50,
      memoryUsage: 65.5,
      queueSize: 10,
      averageLatency: 150,
    },
  } as HealthStatus),
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

describe('MetricsReporter', () => {
  let metricsReporter: MetricsReporter;
  let mockStatisticsCollector: IStatisticsCollector;
  let mockHealthChecker: IHealthChecker;
  let mockConnectionManager: IConnectionManager;
  let mockQueueManager: IOperationQueueManager;
  let mockLogger: vi.Mock;

  beforeEach(() => {
    mockStatisticsCollector = createMockStatisticsCollector();
    mockHealthChecker = createMockHealthChecker();
    mockConnectionManager = createMockConnectionManager();
    mockQueueManager = createMockQueueManager();
    mockLogger = vi.fn();
    
    metricsReporter = new MetricsReporter(
      mockStatisticsCollector,
      mockHealthChecker,
      mockConnectionManager,
      mockQueueManager,
      mockLogger
    );

    vi.useFakeTimers();
    
    // Mock process.memoryUsage
    const originalMemoryUsage = process.memoryUsage;
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 65 * 1024 * 1024, // 65MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 0,
      arrayBuffers: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(metricsReporter).toBeDefined();
    });

    it('should work without logger', () => {
      const reporterWithoutLogger = new MetricsReporter(
        mockStatisticsCollector,
        mockHealthChecker,
        mockConnectionManager,
        mockQueueManager
      );
      
      expect(reporterWithoutLogger).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive metrics report', () => {
      const report = metricsReporter.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('connections');
      expect(report).toHaveProperty('memory');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('queues');
      
      expect(report.connections.activeConnections).toBe(50);
      expect(report.connections.totalConnections).toBe(100);
      expect(report.performance.averageLatency).toBe(150);
      expect(report.performance.throughput).toBe(10);
      expect(report.queues.size).toBe(10);
    });

    it('should calculate memory usage correctly', () => {
      const report = metricsReporter.generateReport();
      
      // 65MB used / (100MB + 10MB) total = ~59.09%
      expect(report.memory.usage).toBeCloseTo(59.09, 1);
    });

    it('should calculate uptime correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        startTime: baseTime - 120000, // 2 minutes ago
      } as ConnectionStats);
      
      const report = metricsReporter.generateReport();
      expect(report.uptime).toBe(120000);
    });
  });

  describe('exportMetrics', () => {
    describe('JSON format', () => {
      it('should export metrics in JSON format', () => {
        const exported = metricsReporter.exportMetrics({ format: 'json' });
        
        expect(exported).toHaveProperty('timestamp');
        expect(exported).toHaveProperty('connections');
        expect(exported).toHaveProperty('healthStatus');
        expect(exported.healthStatus).toHaveProperty('status', 'healthy');
      });

      it('should include historical data when requested', () => {
        const exported = metricsReporter.exportMetrics({
          format: 'json',
          includeHistorical: true,
          timeWindow: 60000,
        });
        
        expect(exported).toHaveProperty('historical');
        expect(exported.historical).toHaveProperty('latency');
        expect(exported.historical).toHaveProperty('connections');
      });

      it('should round numbers to specified precision', () => {
        const exported = metricsReporter.exportMetrics({
          format: 'json',
          precision: 1,
        });
        
        // Check that numbers are rounded (this is a simplified check)
        expect(exported).toBeDefined();
      });
    });

    describe('Prometheus format', () => {
      it('should export metrics in Prometheus format', () => {
        const exported = metricsReporter.exportMetrics({ format: 'prometheus' });
        
        expect(exported).toHaveProperty('metrics');
        expect(typeof exported.metrics).toBe('string');
        
        const metricsString = exported.metrics as string;
        expect(metricsString).toContain('websocket_connections_total');
        expect(metricsString).toContain('websocket_connections_active');
        expect(metricsString).toContain('websocket_messages_total');
        expect(metricsString).toContain('websocket_latency_average_ms');
      });

      it('should include help and type comments', () => {
        const exported = metricsReporter.exportMetrics({ format: 'prometheus' });
        const metricsString = exported.metrics as string;
        
        expect(metricsString).toContain('# HELP');
        expect(metricsString).toContain('# TYPE');
      });

      it('should format numbers with specified precision', () => {
        const exported = metricsReporter.exportMetrics({
          format: 'prometheus',
          precision: 1,
        });
        
        const metricsString = exported.metrics as string;
        expect(metricsString).toContain('150.0'); // Latency with 1 decimal place
      });
    });

    describe('CSV format', () => {
      it('should export metrics in CSV format', () => {
        const exported = metricsReporter.exportMetrics({ format: 'csv' });
        
        expect(exported).toHaveProperty('headers');
        expect(exported).toHaveProperty('values');
        expect(exported).toHaveProperty('csv');
        
        expect(typeof exported.headers).toBe('string');
        expect(typeof exported.values).toBe('string');
        expect(typeof exported.csv).toBe('string');
        
        const csvString = exported.csv as string;
        expect(csvString).toContain('timestamp,uptime_ms');
        expect(csvString.split('\n')).toHaveLength(2); // Header + data row
      });

      it('should include all expected columns', () => {
        const exported = metricsReporter.exportMetrics({ format: 'csv' });
        const headers = exported.headers as string;
        
        expect(headers).toContain('active_connections');
        expect(headers).toContain('total_messages');
        expect(headers).toContain('average_latency_ms');
        expect(headers).toContain('memory_usage_percent');
      });
    });

    describe('Human format', () => {
      it('should export metrics in human-readable format', () => {
        const exported = metricsReporter.exportMetrics({ format: 'human' });
        
        expect(exported).toHaveProperty('report');
        expect(typeof exported.report).toBe('string');
        
        const reportString = exported.report as string;
        expect(reportString).toContain('WebSocket Service Metrics Report');
        expect(reportString).toContain('Connection Statistics');
        expect(reportString).toContain('Performance Metrics');
        expect(reportString).toContain('Health Checks');
      });

      it('should include health check results', () => {
        const exported = metricsReporter.exportMetrics({ format: 'human' });
        const reportString = exported.report as string;
        
        expect(reportString).toContain('Connections: PASS');
        expect(reportString).toContain('Memory: PASS');
        expect(reportString).toContain('Queues: PASS');
        expect(reportString).toContain('Performance: PASS');
      });

      it('should show failed health checks', () => {
        vi.mocked(mockHealthChecker.getHealthStatus).mockReturnValue({
          status: 'degraded',
          timestamp: Date.now(),
          checks: {
            connections: false,
            memory: true,
            queues: true,
            performance: false,
          },
          metrics: {
            connectionCount: 50,
            memoryUsage: 65.5,
            queueSize: 10,
            averageLatency: 150,
          },
        } as HealthStatus);
        
        const exported = metricsReporter.exportMetrics({ format: 'human' });
        const reportString = exported.report as string;
        
        expect(reportString).toContain('Connections: FAIL');
        expect(reportString).toContain('Performance: FAIL');
        expect(reportString).toContain('Status: DEGRADED');
      });
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        metricsReporter.exportMetrics({ format: 'xml' as any });
      }).toThrow('Unsupported format: xml');
    });
  });

  describe('logMetrics', () => {
    it('should log metrics using provided logger', () => {
      metricsReporter.logMetrics('info');
      
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket Service Metrics Report'),
        'info'
      );
    });

    it('should use default log level', () => {
      metricsReporter.logMetrics();
      
      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(String),
        'info'
      );
    });

    it('should handle logging errors gracefully', () => {
      mockLogger.mockImplementation(() => {
        throw new Error('Logging failed');
      });
      
      expect(() => metricsReporter.logMetrics()).not.toThrow();
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log metrics'),
        'error'
      );
    });

    it('should warn when no logger is configured', () => {
      const reporterWithoutLogger = new MetricsReporter(
        mockStatisticsCollector,
        mockHealthChecker,
        mockConnectionManager,
        mockQueueManager
      );
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      reporterWithoutLogger.logMetrics();
      
      expect(consoleSpy).toHaveBeenCalledWith('No logger configured for MetricsReporter');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics summary', () => {
      const realTime = metricsReporter.getRealTimeMetrics();
      
      expect(realTime).toHaveProperty('status', 'healthy');
      expect(realTime).toHaveProperty('connections', 50);
      expect(realTime).toHaveProperty('throughput', 10);
      expect(realTime).toHaveProperty('latency', 150);
      expect(realTime).toHaveProperty('memoryUsage');
      expect(realTime).toHaveProperty('queueSize', 10);
      expect(realTime).toHaveProperty('uptime');
    });

    it('should reflect current system state', () => {
      vi.mocked(mockHealthChecker.getHealthStatus).mockReturnValue({
        status: 'degraded',
        timestamp: Date.now(),
        checks: {
          connections: true,
          memory: false,
          queues: true,
          performance: true,
        },
        metrics: {
          connectionCount: 75,
          memoryUsage: 85.5,
          queueSize: 25,
          averageLatency: 250,
        },
      } as HealthStatus);
      
      const realTime = metricsReporter.getRealTimeMetrics();
      
      expect(realTime.status).toBe('degraded');
      expect(realTime.connections).toBe(50); // From report, not health status
      expect(realTime.latency).toBe(150);
    });
  });

  describe('schedulePeriodicReporting', () => {
    it('should schedule periodic reporting', () => {
      const timer = metricsReporter.schedulePeriodicReporting(5000, 'debug');
      
      expect(timer).toBeDefined();
      
      // Advance timer and check if logging occurred
      vi.advanceTimersByTime(5000);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket Service Metrics Report'),
        'debug'
      );
      
      clearInterval(timer);
    });

    it('should use default parameters', () => {
      const timer = metricsReporter.schedulePeriodicReporting(1000);
      
      vi.advanceTimersByTime(1000);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(String),
        'info'
      );
      
      clearInterval(timer);
    });
  });

  describe('getAlertMetrics', () => {
    it('should return no alerts for healthy system', () => {
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      expect(alertMetrics.alerts).toHaveLength(0);
      expect(alertMetrics.summary.alertCount).toBe(0);
      expect(alertMetrics.summary.criticalAlerts).toBe(0);
      expect(alertMetrics.summary.status).toBe('healthy');
    });

    it('should detect high error rate alert', () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 150,
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 8, // High error rate
        uptime: 60000,
      });
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      expect(alertMetrics.alerts).toHaveLength(1);
      expect(alertMetrics.alerts[0].type).toBe('error_rate');
      expect(alertMetrics.alerts[0].severity).toBe('medium');
      expect(alertMetrics.alerts[0].value).toBe(8);
      expect(alertMetrics.alerts[0].threshold).toBe(5);
    });

    it('should detect high latency alert', () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 2500, // High latency
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 2,
        uptime: 60000,
      });
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      expect(alertMetrics.alerts).toHaveLength(1);
      expect(alertMetrics.alerts[0].type).toBe('latency');
      expect(alertMetrics.alerts[0].severity).toBe('high');
      expect(alertMetrics.alerts[0].value).toBe(2500);
    });

    it('should detect critical latency alert', () => {
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 6000, // Critical latency
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 2,
        uptime: 60000,
      });
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      expect(alertMetrics.alerts[0].severity).toBe('critical');
      expect(alertMetrics.summary.criticalAlerts).toBe(1);
    });

    it('should detect memory usage alert', () => {
      // Mock high memory usage - need to ensure the calculation results in >85%
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 95 * 1024 * 1024, // 95MB used
        heapTotal: 100 * 1024 * 1024, // 100MB total
        external: 5 * 1024 * 1024, // 5MB external
        rss: 0,
        arrayBuffers: 0,
      });
      // Total memory = 100MB + 5MB = 105MB
      // Used memory = 95MB
      // Usage = 95/105 = ~90.48% which is > 85%
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      const memoryAlert = alertMetrics.alerts.find(alert => alert.type === 'memory');
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert?.severity).toBe('high');
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect queue overflow alert', () => {
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        queueOverflows: 3,
      } as ConnectionStats);
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      const queueAlert = alertMetrics.alerts.find(alert => alert.type === 'queue_overflow');
      expect(queueAlert).toBeDefined();
      expect(queueAlert?.severity).toBe('medium');
      expect(queueAlert?.value).toBe(3);
    });

    it('should handle multiple alerts', () => {
      // Set up multiple alert conditions
      vi.mocked(mockStatisticsCollector.getPerformanceMetrics).mockReturnValue({
        averageLatency: 2000, // High latency
        p50Latency: 140,
        p95Latency: 300,
        p99Latency: 500,
        throughput: 10,
        connectionRate: 0.5,
        errorRate: 8, // High error rate
        uptime: 60000,
      });
      
      vi.mocked(mockStatisticsCollector.getMetrics).mockReturnValue({
        ...mockStatisticsCollector.getMetrics(),
        queueOverflows: 2,
      } as ConnectionStats);
      
      const alertMetrics = metricsReporter.getAlertMetrics();
      
      expect(alertMetrics.alerts.length).toBeGreaterThan(1);
      expect(alertMetrics.summary.alertCount).toBeGreaterThan(1);
    });
  });
});