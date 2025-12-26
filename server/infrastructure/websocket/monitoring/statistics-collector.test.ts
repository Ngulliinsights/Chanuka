/**
 * Unit tests for StatisticsCollector
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { StatisticsCollector } from './statistics-collector';

describe('StatisticsCollector', () => {
  let statisticsCollector: StatisticsCollector;
  const maxHistorySize = 100;

  beforeEach(() => {
    statisticsCollector = new StatisticsCollector(maxHistorySize);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const metrics = statisticsCollector.getMetrics();
      
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.totalMessages).toBe(0);
      expect(metrics.totalBroadcasts).toBe(0);
      expect(metrics.droppedMessages).toBe(0);
      expect(metrics.duplicateMessages).toBe(0);
      expect(metrics.queueOverflows).toBe(0);
      expect(metrics.reconnections).toBe(0);
      expect(metrics.peakConnections).toBe(0);
      expect(metrics.startTime).toBeDefined();
      expect(metrics.lastActivity).toBeDefined();
    });

    it('should initialize with custom history size', () => {
      const customSize = 500;
      const collector = new StatisticsCollector(customSize);
      const bufferStats = collector.getBufferStats();
      
      expect(bufferStats.latencyBuffer.capacity).toBe(customSize);
      expect(bufferStats.connectionBuffer.capacity).toBe(customSize);
    });
  });

  describe('updateConnectionCount', () => {
    it('should update active connection count', () => {
      statisticsCollector.updateConnectionCount(10);
      const metrics = statisticsCollector.getMetrics();
      
      expect(metrics.activeConnections).toBe(10);
      expect(metrics.totalConnections).toBe(10);
    });

    it('should update peak connections', () => {
      statisticsCollector.updateConnectionCount(5);
      statisticsCollector.updateConnectionCount(15);
      statisticsCollector.updateConnectionCount(10);
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.peakConnections).toBe(15);
    });

    it('should track connection increases', () => {
      statisticsCollector.updateConnectionCount(5);
      statisticsCollector.updateConnectionCount(8);
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.totalConnections).toBe(8);
      expect(metrics.activeConnections).toBe(8);
    });

    it('should handle connection decreases', () => {
      statisticsCollector.updateConnectionCount(10);
      statisticsCollector.updateConnectionCount(7);
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.totalConnections).toBe(10); // Total should not decrease
      expect(metrics.activeConnections).toBe(7);
    });

    it('should update last activity timestamp', () => {
      const initialTime = Date.now();
      vi.setSystemTime(initialTime);
      
      statisticsCollector.updateConnectionCount(5);
      const metrics = statisticsCollector.getMetrics();
      
      expect(metrics.lastActivity).toBe(initialTime);
    });
  });

  describe('recordMessageProcessed', () => {
    it('should increment message count and record latency', () => {
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.recordMessageProcessed(200);
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.totalMessages).toBe(2);
    });

    it('should update last activity timestamp', () => {
      const testTime = Date.now();
      vi.setSystemTime(testTime);
      
      statisticsCollector.recordMessageProcessed(100);
      const metrics = statisticsCollector.getMetrics();
      
      expect(metrics.lastActivity).toBe(testTime);
    });
  });

  describe('record methods', () => {
    it('should record broadcasts', () => {
      statisticsCollector.recordBroadcast();
      statisticsCollector.recordBroadcast();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.totalBroadcasts).toBe(2);
    });

    it('should record dropped messages', () => {
      statisticsCollector.recordDroppedMessage();
      statisticsCollector.recordDroppedMessage();
      statisticsCollector.recordDroppedMessage();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.droppedMessages).toBe(3);
    });

    it('should record duplicate messages', () => {
      statisticsCollector.recordDuplicateMessage();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.duplicateMessages).toBe(1);
    });

    it('should record queue overflows', () => {
      statisticsCollector.recordQueueOverflow();
      statisticsCollector.recordQueueOverflow();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.queueOverflows).toBe(2);
    });

    it('should record reconnections', () => {
      statisticsCollector.recordReconnection();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.reconnections).toBe(1);
    });
  });

  describe('getAverageLatency', () => {
    it('should return 0 when no latency data exists', () => {
      const avgLatency = statisticsCollector.getAverageLatency();
      expect(avgLatency).toBe(0);
    });

    it('should calculate average latency correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.recordMessageProcessed(200);
      statisticsCollector.recordMessageProcessed(300);
      
      const avgLatency = statisticsCollector.getAverageLatency();
      expect(avgLatency).toBe(200);
    });

    it('should respect time window', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Record old latency
      statisticsCollector.recordMessageProcessed(1000);
      
      // Move time forward beyond window
      vi.setSystemTime(baseTime + 10 * 60 * 1000); // 10 minutes later
      
      // Record new latency
      statisticsCollector.recordMessageProcessed(100);
      
      // Should only include recent latency
      const avgLatency = statisticsCollector.getAverageLatency(5 * 60 * 1000); // 5 minute window
      expect(avgLatency).toBe(100);
    });
  });

  describe('getPercentileLatency', () => {
    it('should throw error for invalid percentile', () => {
      expect(() => statisticsCollector.getPercentileLatency(-1)).toThrow();
      expect(() => statisticsCollector.getPercentileLatency(101)).toThrow();
    });

    it('should return 0 when no data exists', () => {
      const p95 = statisticsCollector.getPercentileLatency(95);
      expect(p95).toBe(0);
    });

    it('should calculate percentiles correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Record latencies: 100, 200, 300, 400, 500
      for (let i = 1; i <= 5; i++) {
        statisticsCollector.recordMessageProcessed(i * 100);
      }
      
      const p50 = statisticsCollector.getPercentileLatency(50);
      const p95 = statisticsCollector.getPercentileLatency(95);
      
      expect(p50).toBe(300); // 50th percentile
      expect(p95).toBe(500); // 95th percentile
    });
  });

  describe('getConnectionRate', () => {
    it('should return 0 when no connection events exist', () => {
      const rate = statisticsCollector.getConnectionRate();
      expect(rate).toBe(0);
    });

    it('should calculate connection rate correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Simulate 3 connections in 1 minute
      statisticsCollector.updateConnectionCount(1);
      vi.setSystemTime(baseTime + 20000);
      statisticsCollector.updateConnectionCount(2);
      vi.setSystemTime(baseTime + 40000);
      statisticsCollector.updateConnectionCount(3);
      
      const rate = statisticsCollector.getConnectionRate(60000); // 1 minute window
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('getMessageThroughput', () => {
    it('should return 0 when no messages processed', () => {
      const throughput = statisticsCollector.getMessageThroughput();
      expect(throughput).toBe(0);
    });

    it('should calculate throughput correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Process 5 messages in 1 minute
      for (let i = 0; i < 5; i++) {
        statisticsCollector.recordMessageProcessed(100);
        vi.setSystemTime(baseTime + (i + 1) * 12000); // 12 seconds apart
      }
      
      const throughput = statisticsCollector.getMessageThroughput(60000); // 1 minute window
      expect(throughput).toBeCloseTo(5 / 60, 2); // 5 messages per 60 seconds
    });
  });

  describe('getUptime', () => {
    it('should calculate uptime correctly', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      const collector = new StatisticsCollector();
      
      vi.setSystemTime(startTime + 60000); // 1 minute later
      
      const uptime = collector.getUptime();
      expect(uptime).toBe(60000);
    });
  });

  describe('getErrorRate', () => {
    it('should return 0 when no messages or errors', () => {
      const errorRate = statisticsCollector.getErrorRate();
      expect(errorRate).toBe(0);
    });

    it('should calculate error rate correctly', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Process 10 messages
      for (let i = 0; i < 10; i++) {
        statisticsCollector.recordMessageProcessed(100);
      }
      
      // Record 2 errors
      statisticsCollector.recordDroppedMessage();
      statisticsCollector.recordQueueOverflow();
      
      const errorRate = statisticsCollector.getErrorRate();
      expect(errorRate).toBeCloseTo(16.67, 1); // 2 errors out of 12 total operations
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return comprehensive performance metrics', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Add some test data
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.recordMessageProcessed(200);
      statisticsCollector.updateConnectionCount(5);
      
      const metrics = statisticsCollector.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('p50Latency');
      expect(metrics).toHaveProperty('p95Latency');
      expect(metrics).toHaveProperty('p99Latency');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('connectionRate');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('uptime');
      
      expect(metrics.averageLatency).toBe(150);
    });
  });

  describe('getHistoricalData', () => {
    it('should return historical data within time window', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.updateConnectionCount(5);
      
      vi.setSystemTime(baseTime + 30000); // 30 seconds later
      
      const historical = statisticsCollector.getHistoricalData(60000); // 1 minute window
      
      expect(historical.latency).toHaveLength(1);
      expect(historical.connections).toHaveLength(1);
      expect(historical.latency[0].latency).toBe(100);
    });

    it('should filter out data outside time window', () => {
      const baseTime = Date.now();
      vi.setSystemTime(baseTime);
      
      // Old data
      statisticsCollector.recordMessageProcessed(100);
      
      vi.setSystemTime(baseTime + 2 * 60 * 1000); // 2 minutes later
      
      // New data
      statisticsCollector.recordMessageProcessed(200);
      
      const historical = statisticsCollector.getHistoricalData(60000); // 1 minute window
      
      expect(historical.latency).toHaveLength(1);
      expect(historical.latency[0].latency).toBe(200);
    });
  });

  describe('reset', () => {
    it('should reset all statistics to initial values', () => {
      // Add some data
      statisticsCollector.updateConnectionCount(10);
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.recordBroadcast();
      statisticsCollector.recordDroppedMessage();
      
      // Reset
      statisticsCollector.reset();
      
      const metrics = statisticsCollector.getMetrics();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.totalMessages).toBe(0);
      expect(metrics.totalBroadcasts).toBe(0);
      expect(metrics.droppedMessages).toBe(0);
      expect(metrics.peakConnections).toBe(0);
    });

    it('should clear historical data', () => {
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.updateConnectionCount(5);
      
      statisticsCollector.reset();
      
      const historical = statisticsCollector.getHistoricalData();
      expect(historical.latency).toHaveLength(0);
      expect(historical.connections).toHaveLength(0);
    });
  });

  describe('getBufferStats', () => {
    it('should return buffer utilization statistics', () => {
      statisticsCollector.recordMessageProcessed(100);
      statisticsCollector.updateConnectionCount(5);
      
      const bufferStats = statisticsCollector.getBufferStats();
      
      expect(bufferStats.latencyBuffer.size).toBe(1);
      expect(bufferStats.latencyBuffer.capacity).toBe(maxHistorySize);
      expect(bufferStats.latencyBuffer.utilization).toBe(1);
      
      expect(bufferStats.connectionBuffer.size).toBe(1);
      expect(bufferStats.connectionBuffer.capacity).toBe(maxHistorySize);
      expect(bufferStats.connectionBuffer.utilization).toBe(1);
    });
  });
});