import { Event } from './schemas';
import { loggingService } from './service';
import { logger } from '../utils/logger';

/**
 * Telemetry Aggregator
 * 
 * Collects and aggregates metrics and events from across the system.
 * Provides real-time statistics and insights into system behavior.
 */
export class TelemetryAggregator {
  private static instance: TelemetryAggregator;
  private metrics: Map<string, MetricAggregation> = new Map();
  private events: Event[] = [];
  private readonly maxEvents = 1000; // Keep last 1000 events in memory

  private constructor() {
    // Initialize with default metric types
    this.initializeMetrics();
    
    // Start periodic reporting
    this.startPeriodicReporting();
  }

  static getInstance(): TelemetryAggregator {
    if (!TelemetryAggregator.instance) {
      TelemetryAggregator.instance = new TelemetryAggregator();
    }
    return TelemetryAggregator.instance;
  }

  /**
   * Record a new event with associated metrics
   */
  recordEvent(event: Event): void {
    // Store event
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Update metrics based on event type
    this.updateMetrics(event);

    // Report significant events immediately
    if (this.isSignificantEvent(event)) {
      this.reportSignificantEvent(event);
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): SystemMetrics {
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      metrics: {}
    };

    for (const [key, aggregation] of this.metrics.entries()) {
      metrics.metrics[key] = {
        count: aggregation.count,
        sum: aggregation.sum,
        min: aggregation.min,
        max: aggregation.max,
        avg: aggregation.sum / aggregation.count,
        rate: aggregation.count / (Date.now() - aggregation.firstSeen) * 1000
      };
    }

    return metrics;
  }

  /**
   * Get recent events, optionally filtered
   */
  getEvents(options: EventFilterOptions = {}): Event[] {
    let filteredEvents = this.events;

    if (options.type) {
      filteredEvents = filteredEvents.filter(e => e.type === options.type);
    }

    if (options.module) {
      filteredEvents = filteredEvents.filter(e => e.module === options.module);
    }

    if (options.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= options.since);
    }

    if (options.limit) {
      filteredEvents = filteredEvents.slice(0, options.limit);
    }

    return filteredEvents;
  }

  private initializeMetrics(): void {
    // HTTP metrics
    this.metrics.set('http.requests', this.createMetricAggregation());
    this.metrics.set('http.response_time', this.createMetricAggregation());
    this.metrics.set('http.errors', this.createMetricAggregation());

    // Database metrics
    this.metrics.set('db.operations', this.createMetricAggregation());
    this.metrics.set('db.query_time', this.createMetricAggregation());
    this.metrics.set('db.errors', this.createMetricAggregation());

    // Cache metrics
    this.metrics.set('cache.operations', this.createMetricAggregation());
    this.metrics.set('cache.hits', this.createMetricAggregation());
    this.metrics.set('cache.misses', this.createMetricAggregation());

    // Security metrics
    this.metrics.set('security.auth_attempts', this.createMetricAggregation());
    this.metrics.set('security.auth_failures', this.createMetricAggregation());
  }

  private createMetricAggregation(): MetricAggregation {
    return {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    };
  }

  private updateMetrics(event: Event): void {
    switch (event.type) {
      case 'http':
        this.updateHttpMetrics(event);
        break;
      case 'database':
        this.updateDatabaseMetrics(event);
        break;
      case 'cache':
        this.updateCacheMetrics(event);
        break;
      case 'security':
        this.updateSecurityMetrics(event);
        break;
    }
  }

  private updateMetricValue(key: string, value: number): void {
    const metric = this.metrics.get(key);
    if (metric) {
      metric.count++;
      metric.sum += value;
      metric.min = Math.min(metric.min, value);
      metric.max = Math.max(metric.max, value);
      metric.lastSeen = Date.now();
    }
  }

  private updateHttpMetrics(event: Event): void {
    if (event.type === 'http') {
      this.updateMetricValue('http.requests', 1);
      this.updateMetricValue('http.response_time', event.data.duration);
      if (event.data.statusCode >= 400) {
        this.updateMetricValue('http.errors', 1);
      }
    }
  }

  private updateDatabaseMetrics(event: Event): void {
    if (event.type === 'database') {
      this.updateMetricValue('db.operations', 1);
      this.updateMetricValue('db.query_time', event.data.duration);
      if (!event.data.success) {
        this.updateMetricValue('db.errors', 1);
      }
    }
  }

  private updateCacheMetrics(event: Event): void {
    if (event.type === 'cache') {
      this.updateMetricValue('cache.operations', 1);
      if (event.data.hit) {
        this.updateMetricValue('cache.hits', 1);
      } else {
        this.updateMetricValue('cache.misses', 1);
      }
    }
  }

  private updateSecurityMetrics(event: Event): void {
    if (event.type === 'security') {
      this.updateMetricValue('security.auth_attempts', 1);
      if (!event.data.success) {
        this.updateMetricValue('security.auth_failures', 1);
      }
    }
  }

  private isSignificantEvent(event: Event): boolean {
    // Define criteria for significant events
    return (
      (event.type === 'error') ||
      (event.type === 'security' && !event.data.success) ||
      (event.type === 'http' && event.data.statusCode >= 500) ||
      (event.type === 'database' && !event.data.success)
    );
  }

  private reportSignificantEvent(event: Event): void {
    loggingService.warn('Significant event detected', {
      module: 'TelemetryAggregator',
      event
    });
  }

  private startPeriodicReporting(): void {
    // Report metrics every minute
    setInterval(() => {
      const metrics = this.getMetrics();
      loggingService.info('System metrics', {
        module: 'TelemetryAggregator',
        metrics
      });
    }, 60000);
  }
}

interface MetricAggregation {
  count: number;
  sum: number;
  min: number;
  max: number;
  firstSeen: number;
  lastSeen: number;
}

interface EventFilterOptions {
  type?: Event['type'];
  module?: string;
  since?: Date;
  limit?: number;
}

interface SystemMetrics {
  timestamp: Date;
  metrics: Record<string, {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    rate: number;
  }>;
}

// Export singleton instance
export const telemetryAggregator = TelemetryAggregator.getInstance();







