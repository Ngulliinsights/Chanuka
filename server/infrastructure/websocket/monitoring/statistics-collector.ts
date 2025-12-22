/**
 * Statistics Collector for WebSocket Service
 * Tracks connection metrics, latency, and performance statistics
 */

import type { ConnectionStats, IStatisticsCollector } from '../types';
import { CircularBuffer } from '../utils/circular-buffer';

/**
 * Latency measurement data point
 */
interface LatencyDataPoint {
  timestamp: number;
  latency: number;
}

/**
 * Connection event data point
 */
interface ConnectionEvent {
  timestamp: number;
  type: 'connect' | 'disconnect';
  count: number;
}

/**
 * StatisticsCollector class for tracking WebSocket service metrics
 * Uses CircularBuffer for efficient historical data storage
 */
export class StatisticsCollector implements IStatisticsCollector {
  private stats: ConnectionStats;
  private latencyHistory: CircularBuffer<LatencyDataPoint>;
  private connectionHistory: CircularBuffer<ConnectionEvent>;

  constructor(maxHistorySize: number = 1000) {
    this.latencyHistory = new CircularBuffer<LatencyDataPoint>(maxHistorySize);
    this.connectionHistory = new CircularBuffer<ConnectionEvent>(maxHistorySize);

    this.stats = {
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
  }

  /**
   * Update the current connection count
   * @param count Current number of active connections
   */
  updateConnectionCount(count: number): void {
    const previousCount = this.stats.activeConnections;
    this.stats.activeConnections = count;
    this.stats.lastActivity = Date.now();

    // Update peak connections
    if (count > this.stats.peakConnections) {
      this.stats.peakConnections = count;
    }

    // Record connection event in history
    const eventType = count > previousCount ? 'connect' : 'disconnect';
    this.connectionHistory.push({
      timestamp: Date.now(),
      type: eventType,
      count: count,
    });

    // Update total connections if this is a new connection
    if (count > previousCount) {
      this.stats.totalConnections += (count - previousCount);
    }
  }

  /**
   * Record a processed message with its latency
   * @param latency Message processing latency in milliseconds
   */
  recordMessageProcessed(latency: number): void {
    this.stats.totalMessages++;
    this.stats.lastActivity = Date.now();

    // Store latency data point
    this.latencyHistory.push({
      timestamp: Date.now(),
      latency: latency,
    });
  }

  /**
   * Record a broadcast operation
   */
  recordBroadcast(): void {
    this.stats.totalBroadcasts++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * Record a dropped message
   */
  recordDroppedMessage(): void {
    this.stats.droppedMessages++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * Record a duplicate message detection
   */
  recordDuplicateMessage(): void {
    this.stats.duplicateMessages++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * Record a queue overflow event
   */
  recordQueueOverflow(): void {
    this.stats.queueOverflows++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * Record a reconnection event
   */
  recordReconnection(): void {
    this.stats.reconnections++;
    this.stats.lastActivity = Date.now();
  }

  /**
   * Get current metrics snapshot
   * @returns Current connection statistics
   */
  getMetrics(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get average latency over the specified time window
   * @param windowMs Time window in milliseconds (default: 5 minutes)
   * @returns Average latency in milliseconds
   */
  getAverageLatency(windowMs: number = 5 * 60 * 1000): number {
    const cutoffTime = Date.now() - windowMs;
    const recentLatencies = this.latencyHistory
      .filter(point => point.timestamp >= cutoffTime)
      .map(point => point.latency);

    if (recentLatencies.length === 0) {
      return 0;
    }

    const sum = recentLatencies.reduce((acc, latency) => acc + latency, 0);
    return sum / recentLatencies.length;
  }

  /**
   * Get percentile latency over the specified time window
   * @param percentile Percentile to calculate (0-100)
   * @param windowMs Time window in milliseconds (default: 5 minutes)
   * @returns Percentile latency in milliseconds
   */
  getPercentileLatency(percentile: number, windowMs: number = 5 * 60 * 1000): number {
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const cutoffTime = Date.now() - windowMs;
    const recentLatencies = this.latencyHistory
      .filter(point => point.timestamp >= cutoffTime)
      .map(point => point.latency)
      .sort((a, b) => a - b);

    if (recentLatencies.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentile / 100) * recentLatencies.length) - 1;
    return recentLatencies[Math.max(0, index)]!;
  }

  /**
   * Get connection rate over the specified time window
   * @param windowMs Time window in milliseconds (default: 1 minute)
   * @returns Connections per second
   */
  getConnectionRate(windowMs: number = 60 * 1000): number {
    const cutoffTime = Date.now() - windowMs;
    const recentConnections = this.connectionHistory
      .filter(event => event.timestamp >= cutoffTime && event.type === 'connect');

    return (recentConnections.length / windowMs) * 1000; // Convert to per second
  }

  /**
   * Get message throughput over the specified time window
   * @param windowMs Time window in milliseconds (default: 1 minute)
   * @returns Messages per second
   */
  getMessageThroughput(windowMs: number = 60 * 1000): number {
    const cutoffTime = Date.now() - windowMs;
    const recentMessages = this.latencyHistory
      .filter(point => point.timestamp >= cutoffTime);

    return (recentMessages.length / windowMs) * 1000; // Convert to per second
  }

  /**
   * Get uptime in milliseconds
   * @returns Service uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.stats.startTime;
  }

  /**
   * Get error rate over the specified time window
   * @param windowMs Time window in milliseconds (default: 5 minutes)
   * @returns Error rate as a percentage (0-100)
   */
  getErrorRate(windowMs: number = 5 * 60 * 1000): number {
    const cutoffTime = Date.now() - windowMs;
    const recentMessages = this.latencyHistory
      .filter(point => point.timestamp >= cutoffTime).length;

    if (recentMessages === 0) {
      return 0;
    }

    // Count errors in the same time window
    const recentErrors = this.stats.droppedMessages + this.stats.queueOverflows;
    return (recentErrors / (recentMessages + recentErrors)) * 100;
  }

  /**
   * Get detailed performance metrics
   * @returns Detailed performance statistics
   */
  getPerformanceMetrics(): {
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    connectionRate: number;
    errorRate: number;
    uptime: number;
  } {
    return {
      averageLatency: this.getAverageLatency(),
      p50Latency: this.getPercentileLatency(50),
      p95Latency: this.getPercentileLatency(95),
      p99Latency: this.getPercentileLatency(99),
      throughput: this.getMessageThroughput(),
      connectionRate: this.getConnectionRate(),
      errorRate: this.getErrorRate(),
      uptime: this.getUptime(),
    };
  }

  /**
   * Get historical data for charting/visualization
   * @param timeWindow Time window in milliseconds (default: 1 hour)
   * @returns Historical data points
   */
  getHistoricalData(timeWindow: number = 60 * 60 * 1000): Array<{
    timestamp: number;
    connections: number;
    latency: number;
    throughput: number;
  }> {
    const cutoffTime = Date.now() - timeWindow;

    // Get filtered data
    const latencyData = this.latencyHistory.filter(point => point.timestamp >= cutoffTime);
    const connectionData = this.connectionHistory.filter(event => event.timestamp >= cutoffTime);

    // Combine data into the expected format
    const combinedData: Array<{
      timestamp: number;
      connections: number;
      latency: number;
      throughput: number;
    }> = [];

    // Create time-based buckets (every 5 minutes)
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    const buckets = new Map<number, {
      latencies: number[];
      connectionCount: number;
      messageCount: number;
    }>();

    // Process latency data
    latencyData.forEach(point => {
      const bucketTime = Math.floor(point.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { latencies: [], connectionCount: 0, messageCount: 0 });
      }
      buckets.get(bucketTime)!.latencies.push(point.latency);
      buckets.get(bucketTime)!.messageCount++;
    });

    // Process connection data
    connectionData.forEach(event => {
      const bucketTime = Math.floor(event.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { latencies: [], connectionCount: 0, messageCount: 0 });
      }
      buckets.get(bucketTime)!.connectionCount = Math.max(
        buckets.get(bucketTime)!.connectionCount,
        event.count
      );
    });

    // Convert buckets to result format
    Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([timestamp, data]) => {
        const avgLatency = data.latencies.length > 0
          ? data.latencies.reduce((sum, lat) => sum + lat, 0) / data.latencies.length
          : 0;
        const throughput = data.messageCount / (bucketSize / 1000); // messages per second

        combinedData.push({
          timestamp,
          connections: data.connectionCount,
          latency: avgLatency,
          throughput,
        });
      });

    return combinedData;
  }

  /**
   * Reset all statistics (useful for testing or service restart)
   */
  reset(): void {
    this.stats = {
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

    this.latencyHistory.clear();
    this.connectionHistory.clear();
  }

  /**
   * Get buffer utilization statistics
   * @returns Buffer utilization information
   */
  getBufferStats(): {
    latencyBuffer: {
      size: number;
      capacity: number;
      utilization: number;
    };
    connectionBuffer: {
      size: number;
      capacity: number;
      utilization: number;
    };
  } {
    const latencyStats = this.latencyHistory.getStats();
    const connectionStats = this.connectionHistory.getStats();

    return {
      latencyBuffer: {
        size: latencyStats.size,
        capacity: latencyStats.capacity,
        utilization: latencyStats.utilizationPercent,
      },
      connectionBuffer: {
        size: connectionStats.size,
        capacity: connectionStats.capacity,
        utilization: connectionStats.utilizationPercent,
      },
    };
  }
}