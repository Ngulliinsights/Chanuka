/**
 * Core Analytics Module
 *
 * Comprehensive analytics tracking system for user journey tracking,
 * performance monitoring, and engagement analytics across all personas
 *
 * Requirements: 11.1, 11.2, 11.3
 */

// Main analytics tracker
import { ComprehensiveAnalyticsTracker } from './comprehensive-tracker';
export { ComprehensiveAnalyticsTracker };
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsDashboardData,
  PagePerformanceMetrics,
  UserEngagementMetrics,
} from './comprehensive-tracker';

// Analytics provider
export {
  AnalyticsProvider,
  useAnalyticsContext,
  withAnalytics,
  AnalyticsStatus,
} from './AnalyticsProvider';

// Re-export existing analytics infrastructure
export { analyticsApiService } from '@client/features/analytics/services/api';
export { PerformanceMonitor } from '@client/infrastructure/performance/monitor';
export { ErrorAnalyticsService } from '@client/infrastructure/error/analytics';

// NOTE: Analytics hooks, UI components, and business logic types are available
// from @client/features/analytics - import directly from features layer
// This infrastructure module only exports the core tracking engine and provider

export type {
  PerformanceMetric,
  WebVitalsMetric,
  PerformanceStats,
  PerformanceAlert,
  PerformanceConfig,
} from '@client/infrastructure/performance/types';

/**
 * Analytics initialization utility
 *
 * Provides a simple way to initialize the comprehensive analytics system
 * with default configuration suitable for most use cases
 */
export const initializeAnalytics = (config?: {
  enabled?: boolean;
  debugMode?: boolean;
  flushInterval?: number;
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  enableJourneyTracking?: boolean;
}) => {
  const tracker = ComprehensiveAnalyticsTracker.getInstance();

  if (config?.enabled !== undefined) {
    tracker.setEnabled(config.enabled);
  }

  return tracker;
};

/**
 * Analytics configuration constants
 */
export const ANALYTICS_CONFIG = {
  DEFAULT_FLUSH_INTERVAL: 30000, // 30 seconds
  MAX_EVENTS_IN_MEMORY: 1000,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PERFORMANCE_THRESHOLDS: {
    PAGE_LOAD_TIME: 3000, // 3 seconds
    FIRST_CONTENTFUL_PAINT: 1800, // 1.8 seconds
    LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
    FIRST_INPUT_DELAY: 100, // 100ms
    CUMULATIVE_LAYOUT_SHIFT: 0.1,
  },
  PERSONA_CONFIGS: {
    PUBLIC: {
      trackingEnabled: true,
      detailedMetrics: false,
      realTimeUpdates: false,
    },
    CITIZEN: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
    EXPERT: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
    ADMIN: {
      trackingEnabled: true,
      detailedMetrics: true,
      realTimeUpdates: true,
    },
  },
} as const;
