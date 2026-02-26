/**
 * Observability Module Types
 * 
 * Unified type definitions for error monitoring, performance tracking,
 * telemetry, and analytics across the application.
 * 
 * Requirements: 4.2, 11.1
 */

/**
 * Core observability interface providing unified access to all observability capabilities
 * Requirements: 11.1
 */
export interface IObservability {
  /**
   * Track an error with context
   * Requirements: 11.2
   */
  trackError(error: Error, context: ErrorContext): void;

  /**
   * Track a performance metric
   * Requirements: 11.3
   */
  trackPerformance(metric: PerformanceMetric): void;

  /**
   * Track an analytics event
   * Requirements: 11.4
   */
  trackEvent(event: AnalyticsEvent): void;

  /**
   * Send telemetry data
   * Requirements: 11.5
   */
  sendTelemetry(data: TelemetryData): Promise<void>;

  /**
   * Get current observability metrics
   */
  getMetrics(): ObservabilityMetrics;
}

/**
 * Error context for tracking errors with additional metadata
 * Requirements: 11.2
 */
export interface ErrorContext {
  /** Component where the error occurred */
  component: string;
  /** Operation being performed when error occurred */
  operation: string;
  /** Optional user ID for tracking */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Performance metric for tracking application performance
 * Requirements: 11.3
 */
export interface PerformanceMetric {
  /** Metric name */
  name: string;
  /** Metric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Timestamp when metric was recorded */
  timestamp: Date;
  /** Optional category for grouping metrics */
  category?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Analytics event for tracking user behavior
 * Requirements: 11.4
 */
export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Timestamp when event occurred */
  timestamp?: Date;
  /** Optional user ID */
  userId?: string;
  /** Optional session ID */
  sessionId?: string;
}

/**
 * Telemetry data for system diagnostics
 * Requirements: 11.5
 */
export interface TelemetryData {
  /** Telemetry type */
  type: string;
  /** Telemetry payload */
  payload: Record<string, unknown>;
  /** Timestamp */
  timestamp?: Date;
}

/**
 * Aggregated observability metrics
 */
export interface ObservabilityMetrics {
  /** Error tracking metrics */
  errors: {
    total: number;
    byComponent: Record<string, number>;
    recent: Array<{ error: Error; context: ErrorContext; timestamp: Date }>;
  };
  /** Performance metrics */
  performance: {
    averages: Record<string, number>;
    recent: PerformanceMetric[];
  };
  /** Analytics metrics */
  analytics: {
    eventCount: number;
    recentEvents: AnalyticsEvent[];
  };
  /** Telemetry metrics */
  telemetry: {
    dataPointsSent: number;
    lastSent?: Date;
  };
}
