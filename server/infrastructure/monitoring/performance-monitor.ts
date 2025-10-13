import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '@shared/utils/logger';

interface PerformanceMetric {
  id: string;
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface RequestTrace {
  traceId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  dbQueries: QueryTrace[];
  customMetrics: PerformanceMetric[];
}

interface QueryTrace {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

interface PerformanceBaseline {
  endpoint: string;
  method: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestCount: number;
  errorRate: number;
  lastUpdated: Date;
}

class PerformanceMonitor {
  private traces: Map<string, RequestTrace> = new Map();
  private metrics: PerformanceMetric[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private readonly MAX_TRACES = 1000;
  private readonly MAX_METRICS = 5000;
  private readonly BASELINE_UPDATE_INTERVAL = 60000; // 1 minute

  constructor() {
    // Clean up old traces and metrics periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 300000); // 5 minutes

    // Update baselines periodically
    setInterval(() => {
      this.updateBaselines();
    }, this.BASELINE_UPDATE_INTERVAL);
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start request tracing
   */
  startTrace(req: Request): string {
    // Enforce traces limit before adding new trace
    this.enforceTracesLimit();

    const traceId = this.generateTraceId();
    const trace: RequestTrace = {
      traceId,
      method: req.method,
      url: req.originalUrl || req.url,
      startTime: performance.now(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id,
      dbQueries: [],
      customMetrics: []
    };

    this.traces.set(traceId, trace);

    // Add trace ID to request for downstream use
    (req as any).traceId = traceId;

    return traceId;
  }

  /**
   * End request tracing
   */
  endTrace(traceId: string, statusCode: number): RequestTrace | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.statusCode = statusCode;

    // Store completed trace for analysis
    this.recordCompletedTrace(trace);

    return trace;
  }

  /**
   * Add database query to current trace
   */
  addQueryTrace(traceId: string, query: string, duration: number, params?: any[]): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.dbQueries.push({
      query: query.substring(0, 500), // Truncate long queries
      duration,
      timestamp: new Date(),
      params: params?.slice(0, 10) // Limit params to prevent memory issues
    });
  }

  /**
   * Add custom performance metric
   */
  addCustomMetric(name: string, duration: number, metadata?: Record<string, any>, traceId?: string): void {
    const metric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      duration,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);

    // Also add to current trace if provided
    if (traceId) {
      const trace = this.traces.get(traceId);
      if (trace) {
        trace.customMetrics.push(metric);
      }
    }

    // Prevent memory leaks - enforce limit immediately
    this.enforceMetricsLimit();
  }

  /**
   * Get performance statistics for an endpoint
   */
  getEndpointStats(method: string, endpoint: string): PerformanceBaseline | null {
    const key = `${method}:${endpoint}`;
    return this.baselines.get(key) || null;
  }

  /**
   * Get recent traces
   */
  getRecentTraces(limit: number = 100): RequestTrace[] {
    const completedTraces = Array.from(this.traces.values())
      .filter(trace => trace.endTime !== undefined)
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, limit);

    return completedTraces;
  }

  /**
   * Get performance metrics by name
   */
  getMetricsByName(name: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(metric => metric.name === name)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get system performance summary
   */
  getPerformanceSummary(): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
    recentErrors: Array<{ endpoint: string; statusCode: number; timestamp: Date }>;
  } {
    const completedTraces = Array.from(this.traces.values())
      .filter(trace => trace.endTime !== undefined);

    const totalRequests = completedTraces.length;
    const averageResponseTime = totalRequests > 0 
      ? completedTraces.reduce((sum, trace) => sum + (trace.duration || 0), 0) / totalRequests
      : 0;

    const errorTraces = completedTraces.filter(trace => 
      trace.statusCode && trace.statusCode >= 400
    );
    const errorRate = totalRequests > 0 ? (errorTraces.length / totalRequests) * 100 : 0;

    // Get slowest endpoints
    const endpointTimes = new Map<string, number[]>();
    completedTraces.forEach(trace => {
      const key = `${trace.method} ${trace.url}`;
      if (!endpointTimes.has(key)) {
        endpointTimes.set(key, []);
      }
      endpointTimes.get(key)!.push(trace.duration || 0);
    });

    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Get recent errors
    const recentErrors = errorTraces
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, 20)
      .map(trace => ({
        endpoint: `${trace.method} ${trace.url}`,
        statusCode: trace.statusCode || 0,
        timestamp: new Date(trace.startTime)
      }));

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      slowestEndpoints,
      recentErrors
    };
  }

  /**
   * Check for performance regressions
   */
  checkPerformanceRegressions(): Array<{
    endpoint: string;
    currentAvg: number;
    baselineAvg: number;
    regressionPercent: number;
  }> {
    const regressions: Array<{
      endpoint: string;
      currentAvg: number;
      baselineAvg: number;
      regressionPercent: number;
    }> = [];

    // Get recent traces for comparison
    const recentTraces = Array.from(this.traces.values())
      .filter(trace => trace.endTime && trace.endTime > Date.now() - 300000) // Last 5 minutes
      .filter(trace => trace.duration !== undefined);

    // Group by endpoint
    const endpointTimes = new Map<string, number[]>();
    recentTraces.forEach(trace => {
      const key = `${trace.method}:${trace.url}`;
      if (!endpointTimes.has(key)) {
        endpointTimes.set(key, []);
      }
      endpointTimes.get(key)!.push(trace.duration!);
    });

    // Compare with baselines
    endpointTimes.forEach((times, endpoint) => {
      const baseline = this.baselines.get(endpoint);
      if (!baseline || times.length < 5) return; // Need enough samples

      const currentAvg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const regressionPercent = ((currentAvg - baseline.averageResponseTime) / baseline.averageResponseTime) * 100;

      // Flag if performance degraded by more than 50%
      if (regressionPercent > 50) {
        regressions.push({
          endpoint,
          currentAvg,
          baselineAvg: baseline.averageResponseTime,
          regressionPercent
        });
      }
    });

    return regressions;
  }

  /**
   * Record completed trace for baseline calculations
   */
  private recordCompletedTrace(trace: RequestTrace): void {
    // Keep only recent completed traces
    if (this.traces.size > this.MAX_TRACES) {
      const oldestTraces = Array.from(this.traces.entries())
        .filter(([_, t]) => t.endTime !== undefined)
        .sort(([_, a], [__, b]) => (a.endTime || 0) - (b.endTime || 0))
        .slice(0, this.MAX_TRACES / 2);

      oldestTraces.forEach(([traceId]) => {
        this.traces.delete(traceId);
      });
    }
  }

  /**
   * Update performance baselines
   */
  private updateBaselines(): void {
    const cutoffTime = Date.now() - 3600000; // Last hour
    const recentTraces = Array.from(this.traces.values())
      .filter(trace => 
        trace.endTime && 
        trace.endTime > cutoffTime && 
        trace.duration !== undefined &&
        trace.statusCode && 
        trace.statusCode < 400 // Only successful requests
      );

    // Group by endpoint
    const endpointData = new Map<string, number[]>();
    recentTraces.forEach(trace => {
      const key = `${trace.method}:${trace.url}`;
      if (!endpointData.has(key)) {
        endpointData.set(key, []);
      }
      endpointData.get(key)!.push(trace.duration!);
    });

    // Calculate baselines
    endpointData.forEach((durations, endpoint) => {
      if (durations.length < 10) return; // Need enough samples

      durations.sort((a, b) => a - b);
      const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);

      const [method, url] = endpoint.split(':', 2);
      
      this.baselines.set(endpoint, {
        endpoint: url,
        method,
        averageResponseTime,
        p95ResponseTime: durations[p95Index],
        p99ResponseTime: durations[p99Index],
        requestCount: durations.length,
        errorRate: 0, // Will be calculated separately
        lastUpdated: new Date()
      });
    });
  }

  /**
   * Enforce metrics limit to prevent memory leaks
   */
  private enforceMetricsLimit(): void {
    if (this.metrics.length > this.MAX_METRICS) {
      // Keep most recent metrics, remove oldest ones
      const excessCount = this.metrics.length - this.MAX_METRICS;
      this.metrics = this.metrics.slice(excessCount);
    }
  }

  /**
   * Enforce traces limit to prevent memory leaks
   */
  private enforceTracesLimit(): void {
    if (this.traces.size > this.MAX_TRACES) {
      // Remove oldest completed traces first
      const completedTraces = Array.from(this.traces.entries())
        .filter(([_, trace]) => trace.endTime !== undefined)
        .sort(([_, a], [__, b]) => (a.endTime || 0) - (b.endTime || 0));

      const excessCount = this.traces.size - this.MAX_TRACES;
      for (let i = 0; i < Math.min(excessCount, completedTraces.length); i++) {
        this.traces.delete(completedTraces[i][0]);
      }

      // If still over limit, remove oldest active traces
      if (this.traces.size > this.MAX_TRACES) {
        const activeTraces = Array.from(this.traces.entries())
          .filter(([_, trace]) => trace.endTime === undefined)
          .sort(([_, a], [__, b]) => a.startTime - b.startTime);

        const remainingExcess = this.traces.size - this.MAX_TRACES;
        for (let i = 0; i < Math.min(remainingExcess, activeTraces.length); i++) {
          this.traces.delete(activeTraces[i][0]);
        }
      }
    }
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago

    // Clean old traces
    const tracesToDelete: string[] = [];
    this.traces.forEach((trace, traceId) => {
      if (trace.endTime && trace.endTime < cutoffTime) {
        tracesToDelete.push(traceId);
      }
    });
    tracesToDelete.forEach(traceId => this.traces.delete(traceId));

    // Clean old metrics
    const cutoffDate = new Date(cutoffTime);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffDate);

    // Enforce limits after cleanup
    this.enforceTracesLimit();
    this.enforceMetricsLimit();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Express middleware for automatic request tracing
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = performanceMonitor.startTrace(req);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    performanceMonitor.endTrace(traceId, res.statusCode);
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Utility function to measure async operations
 */
export async function measureAsync<T>(
  name: string, 
  operation: () => Promise<T>,
  traceId?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    performanceMonitor.addCustomMetric(name, duration, metadata, traceId);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.addCustomMetric(name, duration, { 
      ...metadata, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, traceId);
    throw error;
  }
}

/**
 * Utility function to measure synchronous operations
 */
export function measureSync<T>(
  name: string, 
  operation: () => T,
  traceId?: string,
  metadata?: Record<string, any>
): T {
  const startTime = performance.now();
  
  try {
    const result = operation();
    const duration = performance.now() - startTime;
    performanceMonitor.addCustomMetric(name, duration, metadata, traceId);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.addCustomMetric(name, duration, { 
      ...metadata, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, traceId);
    throw error;
  }
}






