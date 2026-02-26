/**
 * Observability Module
 * 
 * Unified observability infrastructure consolidating error monitoring,
 * performance tracking, telemetry, and analytics.
 * 
 * Requirements: 4.1, 11.1
 */

// Export types
export type {
  IObservability,
  ErrorContext,
  PerformanceMetric,
  AnalyticsEvent,
  TelemetryData,
  ObservabilityMetrics,
} from './types';

// Export sub-modules
export * from './error-monitoring';
export * from './performance';
export * from './telemetry';
export * from './analytics';

// Import sub-module functions
import { trackError as trackErrorImpl } from './error-monitoring';
import { trackPerformance as trackPerformanceImpl } from './performance';
import { trackEvent as trackEventImpl } from './analytics';
import { sendTelemetry as sendTelemetryImpl } from './telemetry';
import type { ErrorContext, PerformanceMetric, AnalyticsEvent, TelemetryData, ObservabilityMetrics } from './types';

/**
 * Unified observability service
 * Requirements: 11.1
 */
export const observability = {
  /**
   * Track an error with context
   * Requirements: 11.2
   */
  trackError: (error: Error, context: ErrorContext): void => {
    trackErrorImpl(error, context);
  },

  /**
   * Track a performance metric
   * Requirements: 11.3
   */
  trackPerformance: (metric: PerformanceMetric): void => {
    trackPerformanceImpl(metric).catch(err => {
      console.error('Failed to track performance metric:', err);
    });
  },

  /**
   * Track an analytics event
   * Requirements: 11.4
   */
  trackEvent: (event: AnalyticsEvent): void => {
    trackEventImpl(event);
  },

  /**
   * Send telemetry data
   * Requirements: 11.5
   */
  sendTelemetry: async (data: TelemetryData): Promise<void> => {
    await sendTelemetryImpl(data);
  },

  /**
   * Get current observability metrics
   */
  getMetrics: (): ObservabilityMetrics => {
    // This would aggregate metrics from all sub-modules
    // For now, return a basic structure
    return {
      errors: { total: 0, byComponent: {}, recent: [] },
      performance: { averages: {}, recent: [] },
      analytics: { eventCount: 0, recentEvents: [] },
      telemetry: { dataPointsSent: 0 },
    };
  },
};

/**
 * Initialize the observability module with configuration
 * Requirements: 11.1
 */
export function initializeObservability(config: {
  errorMonitoring?: {
    enabled?: boolean;
    sentryDsn?: string;
    environment?: string;
  };
  performance?: {
    enabled?: boolean;
    budgets?: Record<string, { budget: number; warning: number; description?: string }>;
    webVitalsEnabled?: boolean;
  };
  analytics?: {
    enabled?: boolean;
    debugMode?: boolean;
    flushInterval?: number;
    enablePerformanceTracking?: boolean;
    enableErrorTracking?: boolean;
    enableJourneyTracking?: boolean;
  };
  telemetry?: {
    enabled?: boolean;
    aggregationInterval?: number;
    endpoint?: string;
  };
}): void {
  // Initialize sub-modules
  if (config.errorMonitoring) {
    const { initializeErrorMonitoring } = require('./error-monitoring');
    initializeErrorMonitoring(config.errorMonitoring);
  }

  if (config.performance) {
    const { initializePerformanceMonitoring } = require('./performance');
    initializePerformanceMonitoring(config.performance);
  }

  if (config.analytics) {
    const { initializeAnalyticsTracking } = require('./analytics');
    initializeAnalyticsTracking(config.analytics);
  }

  if (config.telemetry) {
    const { initializeTelemetry } = require('./telemetry');
    initializeTelemetry(config.telemetry);
  }

  console.log('✅ Observability module initialized');
}
