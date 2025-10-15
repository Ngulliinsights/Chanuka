/**
 * Enhanced Monitoring System with Comprehensive Type Safety
 * 
 * This module provides a robust monitoring infrastructure that tracks metrics,
 * errors, and system health across different categories including database,
 * cache, static resources, fallback mechanisms, and system-level operations.
 */

import { EventEmitter } from 'events';

/**
 * Defines the categories of operations that can be monitored.
 * Each category represents a different layer or type of system operation.
 * 
 * - database: Database queries and connection operations
 * - cache: Caching layer operations (hits, misses, invalidations)
 * - fallback: Fallback mechanism activations when primary systems fail
 * - static: Static asset serving and CDN operations
 * - system: Core system operations (startup, shutdown, health checks)
 */
type MonitoringCategory = "database" | "cache" | "fallback" | "static" | "system";

/**
 * Represents the severity level of monitoring events.
 * Used for prioritizing alerts and determining response urgency.
 */
type SeverityLevel = "low" | "medium" | "high" | "critical";

/**
 * Structure for storing metric data points with metadata.
 * This allows for rich metric tracking with contextual information.
 */
interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
  category?: MonitoringCategory;
}

/**
 * Represents an error event with full context for debugging.
 * Captures not just the error itself but also the circumstances around it.
 */
interface ErrorEvent {
  message: string;
  stack?: string;
  name?: string;
  source: string;
  timestamp: number;
  severity: SeverityLevel;
  metadata?: Record<string, any>;
  category?: MonitoringCategory;
}

/**
 * Configuration for alert thresholds and monitoring behavior.
 * Allows fine-tuning of when and how alerts are triggered.
 */
interface AlertConfig {
  errorThreshold: number;
  responseTimeThreshold: number;
  memoryThreshold: number;
  cpuThreshold: number;
  cooldownPeriod: number; // Time in milliseconds before re-alerting
}

/**
 * Central monitoring service that provides comprehensive observability.
 * 
 * This class acts as a hub for all monitoring activities, collecting metrics,
 * tracking errors, and emitting alerts when thresholds are exceeded. It's
 * designed to be a singleton that can be accessed throughout your application.
 */
export class MonitoringService extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private errors: ErrorEvent[] = [];
  private alerts: Map<string, number> = new Map();
  private config: AlertConfig;
  private isHealthy: boolean = true;

  constructor(config?: Partial<AlertConfig>) {
    super();
    
    // Set up default configuration with reasonable thresholds
    // These can be overridden by passing custom config
    this.config = {
      errorThreshold: config?.errorThreshold ?? 10,
      responseTimeThreshold: config?.responseTimeThreshold ?? 1000,
      memoryThreshold: config?.memoryThreshold ?? 80,
      cpuThreshold: config?.cpuThreshold ?? 70,
      cooldownPeriod: config?.cooldownPeriod ?? 300000, // 5 minutes default
    };

    // Initialize monitoring loops for continuous health checking
    this.initializeMonitoring();
  }

  /**
   * Records a metric value with optional metadata.
   * 
   * This is your primary method for tracking quantitative data like response times,
   * request counts, cache hit rates, etc. The metadata parameter allows you to attach
   * contextual information that can help with later analysis.
   * 
   * @param name - The metric identifier (e.g., "api.response_time")
   * @param value - The numeric value to record
   * @param metadata - Optional contextual data about this metric
   * @param category - The operational category this metric belongs to
   */
  public recordMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>,
    category?: MonitoringCategory
  ): void {
    try {
      const metricData: MetricData = {
        name,
        value,
        timestamp: Date.now(),
        metadata,
        category,
      };

      // Organize metrics by name for efficient retrieval and aggregation
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      const metricArray = this.metrics.get(name);
      if (metricArray) {
        metricArray.push(metricData);
        
        // Keep only the last 1000 data points per metric to prevent memory bloat
        // This sliding window approach maintains recent history while controlling memory usage
        if (metricArray.length > 1000) {
          metricArray.shift();
        }
      }

      // Emit event for real-time metric subscribers
      this.emit('metric', metricData);

      // Check if this metric value triggers any alert thresholds
      this.checkThresholds(name, value, category);
    } catch (error) {
      // Handle any errors in the monitoring system itself gracefully
      // We use proper type narrowing here to safely extract error information
      const errorData = this.extractErrorData(error);
      
      // Log to console as fallback since our monitoring system had an issue
      console.error(`Error recording metric ${name}:`, errorData.message);
      if (errorData.stack) {
        console.error('Stack trace:', errorData.stack);
      }
      
      // Extract source information safely with type checking
      const source = this.extractErrorSource(error);
      this.trackError(source, 'medium', errorData.metadata);
    }
  }

  /**
   * Safely extracts structured error data from an unknown error value.
   * 
   * JavaScript allows throwing any value, not just Error objects, so we need
   * to handle various cases. This method normalizes whatever was thrown into
   * a consistent structure we can work with.
   * 
   * @param error - The caught error value (typed as unknown for safety)
   * @returns Structured error data with message, stack, and metadata
   */
  private extractErrorData(error: unknown): { 
    message: string; 
    stack?: string; 
    name?: string;
    metadata?: Record<string, any>;
  } {
    // Check if this is a standard Error instance
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        metadata: { errorType: 'Error' }
      };
    }
    
    // Check if this is an error-like object with a message property
    if (error && typeof error === 'object' && 'message' in error) {
      return {
        message: String(error.message),
        stack: 'stack' in error ? String(error.stack) : undefined,
        name: 'name' in error ? String(error.name) : undefined,
        metadata: { errorType: 'ErrorLike', original: error }
      };
    }
    
    // For any other thrown value, convert it to a string
    return {
      message: String(error),
      metadata: { errorType: 'Unknown', original: error }
    };
  }

  /**
   * Safely extracts the source information from an error.
   * 
   * Some errors include a 'source' property that indicates where they originated.
   * This method checks for that property using proper type guards and provides
   * a sensible fallback if it doesn't exist.
   * 
   * @param error - The caught error value
   * @returns The source string, or 'unknown' if not available
   */
  private extractErrorSource(error: unknown): string {
    if (error && typeof error === 'object' && 'source' in error) {
      return String(error.source);
    }
    return 'unknown';
  }

  /**
   * Tracks an error event with full context.
   * 
   * This method is your primary way to log errors in a structured way. Unlike
   * simple console.error calls, this captures errors with metadata that can be
   * aggregated, analyzed, and used to trigger alerts.
   * 
   * @param source - Where the error occurred (e.g., "database", "api_handler")
   * @param severity - How critical this error is
   * @param metadata - Additional context about the error
   * @param category - The operational category affected
   */
  public trackError(
    source: string,
    severity: SeverityLevel = 'medium',
    metadata?: Record<string, any>,
    category?: MonitoringCategory
  ): void {
    const errorEvent: ErrorEvent = {
      message: `Error from ${source}`,
      source,
      timestamp: Date.now(),
      severity,
      metadata,
      category,
    };

    // Store in our error log with a reasonable size limit
    this.errors.push(errorEvent);
    if (this.errors.length > 500) {
      this.errors.shift(); // Remove oldest error to prevent unbounded growth
    }

    // Emit for real-time error monitoring
    this.emit('error', errorEvent);

    // Check if error rate has exceeded threshold
    this.checkErrorThreshold();

    // Mark system as unhealthy if we're seeing critical errors
    if (severity === 'critical') {
      this.isHealthy = false;
      this.emit('health_degraded', { reason: 'critical_error', source });
    }
  }

  /**
   * Checks if metric values exceed configured thresholds.
   * 
   * This is the intelligence layer that decides when normal operation has
   * become abnormal and requires attention. It implements cooldown logic
   * to prevent alert fatigue from repeated notifications.
   */
  private checkThresholds(
    name: string,
    value: number,
    category?: MonitoringCategory
  ): void {
    const now = Date.now();
    const alertKey = `${category || 'general'}_${name}`;
    const lastAlert = this.alerts.get(alertKey) || 0;

    // Implement cooldown to prevent alert spam
    if (now - lastAlert < this.config.cooldownPeriod) {
      return; // Still in cooldown period, don't alert again
    }

    let shouldAlert = false;
    let alertMessage = '';

    // Check category-specific thresholds with domain knowledge
    if (name.includes('response_time') && value > this.config.responseTimeThreshold) {
      shouldAlert = true;
      alertMessage = `Response time exceeded threshold: ${value}ms > ${this.config.responseTimeThreshold}ms`;
    }

    if (name.includes('memory') && value > this.config.memoryThreshold) {
      shouldAlert = true;
      alertMessage = `Memory usage exceeded threshold: ${value}% > ${this.config.memoryThreshold}%`;
    }

    if (name.includes('cpu') && value > this.config.cpuThreshold) {
      shouldAlert = true;
      alertMessage = `CPU usage exceeded threshold: ${value}% > ${this.config.cpuThreshold}%`;
    }

    // Trigger alert if any threshold was exceeded
    if (shouldAlert) {
      this.alerts.set(alertKey, now);
      this.emit('alert', {
        category,
        metric: name,
        value,
        message: alertMessage,
        timestamp: now,
      });
    }
  }

  /**
   * Monitors the rate of errors and triggers alerts if threshold is exceeded.
   * 
   * This looks at errors in a time window to detect when something is going wrong.
   * A sudden spike in errors is often the first sign of a system problem.
   */
  private checkErrorThreshold(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Count recent errors to detect spikes
    const recentErrors = this.errors.filter(e => e.timestamp > oneMinuteAgo);

    if (recentErrors.length > this.config.errorThreshold) {
      const alertKey = 'error_rate';
      const lastAlert = this.alerts.get(alertKey) || 0;

      // Only alert if we're outside the cooldown period
      if (now - lastAlert >= this.config.cooldownPeriod) {
        this.alerts.set(alertKey, now);
        this.emit('alert', {
          category: 'system' as MonitoringCategory,
          metric: 'error_rate',
          value: recentErrors.length,
          message: `Error rate exceeded threshold: ${recentErrors.length} errors in last minute`,
          timestamp: now,
        });
      }
    }
  }

  /**
   * Initializes background monitoring tasks.
   * 
   * Sets up periodic health checks and cleanup routines that run throughout
   * the application's lifetime. These ensure the monitoring system itself
   * remains healthy and doesn't consume excessive resources.
   */
  private initializeMonitoring(): void {
    // Periodic health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Cleanup old data every 5 minutes to prevent memory leaks
    setInterval(() => {
      this.cleanupOldData();
    }, 300000);
  }

  /**
   * Performs a comprehensive system health check.
   * 
   * This examines various signals to determine overall system health,
   * including error rates, response times, and resource usage. It's the
   * method that ultimately determines if your system is "up" or not.
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // Analyze recent errors for patterns
    const recentErrors = this.errors.filter(e => e.timestamp > fiveMinutesAgo);
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');

    // System is unhealthy if we have multiple critical errors
    if (criticalErrors.length > 3) {
      this.isHealthy = false;
      this.emit('health_check', { 
        status: 'unhealthy', 
        reason: 'multiple_critical_errors',
        count: criticalErrors.length 
      });
      return;
    }

    // Check if error rate is concerning even without critical errors
    if (recentErrors.length > this.config.errorThreshold * 5) {
      this.isHealthy = false;
      this.emit('health_check', { 
        status: 'degraded', 
        reason: 'high_error_rate',
        errorCount: recentErrors.length 
      });
      return;
    }

    // If we reach here, system appears healthy
    this.isHealthy = true;
    this.emit('health_check', { 
      status: 'healthy',
      errorCount: recentErrors.length 
    });
  }

  /**
   * Removes old data to prevent unbounded memory growth.
   * 
   * Monitoring systems can accumulate a lot of data over time. This method
   * implements a retention policy that keeps recent data while discarding
   * old information that's no longer useful.
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Clean up old metrics
    for (const [name, dataPoints] of this.metrics.entries()) {
      const recentData = dataPoints.filter(d => d.timestamp > oneHourAgo);
      if (recentData.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, recentData);
      }
    }

    // Clean up old errors (keep last hour only)
    this.errors = this.errors.filter(e => e.timestamp > oneHourAgo);

    // Clean up old alert timestamps
    for (const [key, timestamp] of this.alerts.entries()) {
      if (now - timestamp > this.config.cooldownPeriod * 2) {
        this.alerts.delete(key);
      }
    }
  }

  /**
   * Retrieves metrics for analysis and reporting.
   * 
   * This is your query interface for metric data. You can retrieve all data
   * for a specific metric or filter to recent data only.
   * 
   * @param name - The metric name to retrieve
   * @param since - Optional timestamp to filter for recent data only
   * @returns Array of metric data points
   */
  public getMetrics(name: string, since?: number): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    
    if (since) {
      return metrics.filter(m => m.timestamp >= since);
    }
    
    return metrics;
  }

  /**
   * Retrieves error events for analysis.
   * 
   * Allows you to examine the error history, optionally filtered by severity,
   * category, or time period.
   * 
   * @param filters - Optional criteria to filter errors
   * @returns Array of matching error events
   */
  public getErrors(filters?: {
    severity?: SeverityLevel;
    category?: MonitoringCategory;
    since?: number;
  }): ErrorEvent[] {
    let filtered = [...this.errors];

    if (filters?.severity) {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }

    if (filters?.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters?.since != null) {
      filtered = filtered.filter(e => e.timestamp >= filters.since!);
    }

    return filtered;
  }

  /**
   * Returns the current health status of the system.
   * 
   * This is your go-to method for implementing health check endpoints
   * in your API. It provides a simple boolean that summarizes whether
   * your system is operating normally.
   * 
   * @returns True if system is healthy, false otherwise
   */
  public getHealthStatus(): boolean {
    return this.isHealthy;
  }

  /**
   * Provides detailed system statistics for dashboards and reporting.
   * 
   * This aggregates various metrics into a comprehensive snapshot of
   * system state, perfect for displaying in monitoring dashboards or
   * including in status reports.
   * 
   * @returns Object containing various system statistics
   */
  public getStats(): {
    totalMetrics: number;
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    isHealthy: boolean;
    activeAlerts: number;
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    // Aggregate errors by category and severity for quick overview
    for (const error of this.errors) {
      if (error.category) {
        errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      }
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    return {
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      totalErrors: this.errors.length,
      errorsByCategory,
      errorsBySeverity,
      isHealthy: this.isHealthy,
      activeAlerts: this.alerts.size,
    };
  }

  /**
   * Records operations specific to the system category.
   * 
   * These convenience methods provide a cleaner API for common monitoring
   * tasks within specific categories. They internally call recordMetric
   * with the appropriate category set.
   */
  public recordSystemMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, metadata, "system");
  }

  public recordDatabaseMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, metadata, "database");
  }

  public recordCacheMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, metadata, "cache");
  }

  public recordStaticMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, metadata, "static");
  }

  public recordFallbackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(name, value, metadata, "fallback");
  }

  /**
   * Category-specific error tracking methods.
   * 
   * These provide a convenient way to log errors with the category
   * automatically set, making your error tracking code more readable.
   */
  public trackSystemError(source: string, severity: SeverityLevel = 'medium', metadata?: Record<string, any>): void {
    this.trackError(source, severity, metadata, "system");
  }

  public trackDatabaseError(source: string, severity: SeverityLevel = 'medium', metadata?: Record<string, any>): void {
    this.trackError(source, severity, metadata, "database");
  }

  public trackCacheError(source: string, severity: SeverityLevel = 'medium', metadata?: Record<string, any>): void {
    this.trackError(source, severity, metadata, "cache");
  }

  public trackStaticError(source: string, severity: SeverityLevel = 'medium', metadata?: Record<string, any>): void {
    this.trackError(source, severity, metadata, "static");
  }

  public trackFallbackError(source: string, severity: SeverityLevel = 'medium', metadata?: Record<string, any>): void {
    this.trackError(source, severity, metadata, "fallback");
  }
}

/**
 * Factory function to create a singleton monitoring instance.
 * 
 * This ensures you have one central monitoring service throughout your
 * application, preventing duplicate metric collection and making it easy
 * to access monitoring from anywhere in your code.
 */
let monitoringInstance: MonitoringService | null = null;

export function getMonitoringService(config?: Partial<AlertConfig>): MonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService(config);
  }
  return monitoringInstance;
}

/**
 * Resets the singleton instance (useful for testing).
 * 
 * In test environments, you often want to start fresh between tests.
 * This function allows you to reset the monitoring state completely.
 */
export function resetMonitoringService(): void {
  if (monitoringInstance) {
    monitoringInstance.removeAllListeners();
    monitoringInstance = null;
  }
}