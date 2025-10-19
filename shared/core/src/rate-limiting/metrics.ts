/**
 * Rate Limiting Metrics Collection
 * 
 * Comprehensive metrics tracking for rate limiting operations
 * Based on requirements from tasks.md
 */

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  avgProcessingTime: number;
  errorCount: number;
  algorithmStats: Record<string, AlgorithmStats>;
  recentEvents: RateLimitEvent[];
  windowMs: number;
  timestamp: number;
}

export interface AlgorithmStats {
  total: number;
  blocked: number;
  avgResponseTime: number;
  errorCount: number;
}

export interface RateLimitEvent {
  allowed: boolean;
  key: string;
  algorithm: string;
  remaining: number;
  processingTime: number;
  timestamp: number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

export class RateLimitMetricsCollector {
  private events: RateLimitEvent[] = [];
  private errors: Array<{ message: string; timestamp: number }> = [];
  private readonly maxEvents: number;
  private readonly maxErrors: number;

  constructor(options: { maxEvents?: number; maxErrors?: number } = {}) {
    this.maxEvents = options.maxEvents || 1000;
    this.maxErrors = options.maxErrors || 100;
  }

  /**
   * Record a rate limit event
   */
  recordEvent(event: Omit<RateLimitEvent, 'timestamp'>): void {
    const timestampedEvent: RateLimitEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(timestampedEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Record an error
   */
  recordError(message: string): void {
    this.errors.push({
      message,
      timestamp: Date.now()
    });

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * Get comprehensive metrics for a time window
   */
  getMetrics(windowMs: number = 60000): RateLimitMetrics {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter events within the window
    const recentEvents = this.events.filter(event => 
      event.timestamp >= windowStart
    );

    // Calculate overall stats
    const totalRequests = recentEvents.length;
    const blockedRequests = recentEvents.filter(event => !event.allowed).length;
    const blockRate = totalRequests > 0 ? blockedRequests / totalRequests : 0;
    
    const totalProcessingTime = recentEvents.reduce((sum, event) => 
      sum + event.processingTime, 0
    );
    const avgProcessingTime = totalRequests > 0 ? totalProcessingTime / totalRequests : 0;

    // Calculate algorithm-specific stats
    const algorithmStats: Record<string, AlgorithmStats> = {};
    
    for (const event of recentEvents) {
      if (!algorithmStats[event.algorithm]) {
        algorithmStats[event.algorithm] = {
          total: 0,
          blocked: 0,
          avgResponseTime: 0,
          errorCount: 0
        };
      }

      const stats = algorithmStats[event.algorithm];
      stats.total++;
      
      if (!event.allowed) {
        stats.blocked++;
      }
      
      // Update average response time
      stats.avgResponseTime = (
        (stats.avgResponseTime * (stats.total - 1)) + event.processingTime
      ) / stats.total;
    }

    // Count recent errors
    const recentErrors = this.errors.filter(error => 
      error.timestamp >= windowStart
    );

    return {
      totalRequests,
      blockedRequests,
      blockRate,
      avgProcessingTime,
      errorCount: recentErrors.length,
      algorithmStats,
      recentEvents: recentEvents.slice(-50), // Last 50 events for debugging
      windowMs,
      timestamp: now
    };
  }

  /**
   * Get top blocked IPs
   */
  getTopBlockedIPs(windowMs: number = 60000, limit: number = 10): Array<{
    ip: string;
    blockedCount: number;
    totalCount: number;
    blockRate: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const recentEvents = this.events.filter(event => 
      event.timestamp >= windowStart && event.ip
    );

    const ipStats = new Map<string, { blocked: number; total: number }>();

    for (const event of recentEvents) {
      if (!event.ip) continue;

      const stats = ipStats.get(event.ip) || { blocked: 0, total: 0 };
      stats.total++;
      
      if (!event.allowed) {
        stats.blocked++;
      }
      
      ipStats.set(event.ip, stats);
    }

    return Array.from(ipStats.entries())
      .map(([ip, stats]) => ({
        ip,
        blockedCount: stats.blocked,
        totalCount: stats.total,
        blockRate: stats.total > 0 ? stats.blocked / stats.total : 0
      }))
      .sort((a, b) => b.blockedCount - a.blockedCount)
      .slice(0, limit);
  }

  /**
   * Get rate limiting patterns by path
   */
  getPathStats(windowMs: number = 60000): Array<{
    path: string;
    method: string;
    totalRequests: number;
    blockedRequests: number;
    blockRate: number;
    avgProcessingTime: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const recentEvents = this.events.filter(event => 
      event.timestamp >= windowStart && event.path && event.method
    );

    const pathStats = new Map<string, {
      total: number;
      blocked: number;
      totalProcessingTime: number;
    }>();

    for (const event of recentEvents) {
      if (!event.path || !event.method) continue;

      const key = `${event.method} ${event.path}`;
      const stats = pathStats.get(key) || { 
        total: 0, 
        blocked: 0, 
        totalProcessingTime: 0 
      };
      
      stats.total++;
      stats.totalProcessingTime += event.processingTime;
      
      if (!event.allowed) {
        stats.blocked++;
      }
      
      pathStats.set(key, stats);
    }

    return Array.from(pathStats.entries())
      .map(([pathMethod, stats]) => {
        const [method, path] = pathMethod.split(' ', 2);
        return {
          path,
          method,
          totalRequests: stats.total,
          blockedRequests: stats.blocked,
          blockRate: stats.total > 0 ? stats.blocked / stats.total : 0,
          avgProcessingTime: stats.total > 0 ? stats.totalProcessingTime / stats.total : 0
        };
      })
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.events = [];
    this.errors = [];
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): {
    eventsCount: number;
    errorsCount: number;
    estimatedMemoryKB: number;
  } {
    const eventSize = JSON.stringify(this.events[0] || {}).length;
    const errorSize = JSON.stringify(this.errors[0] || {}).length;
    
    const estimatedMemoryKB = Math.round(
      (this.events.length * eventSize + this.errors.length * errorSize) / 1024
    );

    return {
      eventsCount: this.events.length,
      errorsCount: this.errors.length,
      estimatedMemoryKB
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const metrics = this.getMetrics();

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(metrics);
    }

    return JSON.stringify(metrics, null, 2);
  }

  private formatPrometheusMetrics(metrics: RateLimitMetrics): string {
    const lines: string[] = [];
    
    lines.push('# HELP rate_limit_total_requests Total number of rate limit checks');
    lines.push('# TYPE rate_limit_total_requests counter');
    lines.push(`rate_limit_total_requests ${metrics.totalRequests}`);
    
    lines.push('# HELP rate_limit_blocked_requests Number of blocked requests');
    lines.push('# TYPE rate_limit_blocked_requests counter');
    lines.push(`rate_limit_blocked_requests ${metrics.blockedRequests}`);
    
    lines.push('# HELP rate_limit_block_rate Rate of blocked requests (0-1)');
    lines.push('# TYPE rate_limit_block_rate gauge');
    lines.push(`rate_limit_block_rate ${metrics.blockRate}`);
    
    lines.push('# HELP rate_limit_avg_processing_time_ms Average processing time in milliseconds');
    lines.push('# TYPE rate_limit_avg_processing_time_ms gauge');
    lines.push(`rate_limit_avg_processing_time_ms ${metrics.avgProcessingTime}`);

    // Algorithm-specific metrics
    for (const [algorithm, stats] of Object.entries(metrics.algorithmStats)) {
      lines.push(`rate_limit_algorithm_requests{algorithm="${algorithm}"} ${stats.total}`);
      lines.push(`rate_limit_algorithm_blocked{algorithm="${algorithm}"} ${stats.blocked}`);
      lines.push(`rate_limit_algorithm_avg_time{algorithm="${algorithm}"} ${stats.avgResponseTime}`);
    }

    return lines.join('\n');
  }
}

// Global metrics collector instance
let globalMetricsCollector: RateLimitMetricsCollector | null = null;

/**
 * Get or create the global metrics collector
 */
export function getMetricsCollector(): RateLimitMetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new RateLimitMetricsCollector();
  }
  return globalMetricsCollector;
}

/**
 * Reset the global metrics collector
 */
export function resetMetricsCollector(): void {
  globalMetricsCollector = null;
}











































